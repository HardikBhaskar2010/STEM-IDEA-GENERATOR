"""
Agent tools for agentic project builder.

Provides seven agent tools that the LLM can invoke during debugging and
file creation. Each tool validates inputs, executes operations in the E2B
sandbox, logs invocations, and returns structured results.

Requirements: 5.1–5.7, 6.1, 8.1, 8.2
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional, Protocol, runtime_checkable

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Protocol (interface definition)
# ---------------------------------------------------------------------------


@runtime_checkable
class AgentTool(Protocol):
    """Protocol that all agent tools must satisfy.

    Requirements: 5.1–5.7
    """

    name: str
    description: str
    parameters: Dict[str, Any]  # JSON schema for parameters

    async def execute(self, **kwargs: Any) -> Dict[str, Any]:
        """Execute the tool operation and return a structured result."""
        ...


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def _get_sandbox_service():
    """Lazily import SandboxService to avoid circular imports."""
    from backend.services.sandbox_service import SandboxService  # noqa: PLC0415
    return SandboxService()


# ---------------------------------------------------------------------------
# Tool implementations
# ---------------------------------------------------------------------------


class FetchFileTool:
    """Retrieve file content from the E2B sandbox.

    Requirements: 5.1
    """

    name: str = "fetch_file"
    description: str = "Read the content of a file in the sandbox"
    parameters: Dict[str, Any] = {
        "type": "object",
        "properties": {
            "path": {"type": "string", "description": "Relative file path to read"},
            "sandbox_id": {"type": "string", "description": "E2B sandbox identifier"},
        },
        "required": ["path", "sandbox_id"],
    }

    async def execute(self, **kwargs: Any) -> Dict[str, Any]:
        """Read file content from the sandbox.

        Args:
            path: Relative file path.
            sandbox_id: E2B sandbox identifier.

        Returns:
            Dict with path, content, and line_count.

        Requirements: 5.1, 5.5, 5.6, 5.7
        """
        path: Optional[str] = kwargs.get("path")
        sandbox_id: Optional[str] = kwargs.get("sandbox_id")

        # Validate inputs (Req 5.5)
        if not path:
            logger.warning("[fetch_file] Missing required parameter: path")
            return {"error": "Missing required parameter: path"}
        if not sandbox_id:
            logger.warning("[fetch_file] Missing required parameter: sandbox_id")
            return {"error": "Missing required parameter: sandbox_id"}

        # Log invocation (Req 5.7)
        logger.info("[fetch_file] path=%s sandbox=%s", path, sandbox_id)

        try:
            service = _get_sandbox_service()
            content = await service.read_file(sandbox_id, path)
            result = {
                "path": path,
                "content": content,
                "line_count": len(content.splitlines()),
            }
            logger.info("[fetch_file] success: %s (%d lines)", path, result["line_count"])
            return result
        except Exception as exc:
            # Req 5.6 – descriptive error message
            logger.error("[fetch_file] failed path=%s: %s", path, exc)
            return {"error": f"Failed to read file {path}: {exc}"}


class EditFileTool:
    """Modify an existing file in the E2B sandbox.

    Requirements: 5.2
    """

    name: str = "edit_file"
    description: str = "Update the content of an existing file in the sandbox"
    parameters: Dict[str, Any] = {
        "type": "object",
        "properties": {
            "path": {"type": "string", "description": "Relative file path to edit"},
            "content": {"type": "string", "description": "New file content"},
            "sandbox_id": {"type": "string", "description": "E2B sandbox identifier"},
        },
        "required": ["path", "content", "sandbox_id"],
    }

    async def execute(self, **kwargs: Any) -> Dict[str, Any]:
        """Write new content to an existing file.

        Args:
            path: Relative file path.
            content: New file content.
            sandbox_id: E2B sandbox identifier.

        Returns:
            Dict with path and status.

        Requirements: 5.2, 5.5, 5.6, 5.7
        """
        path: Optional[str] = kwargs.get("path")
        content: Optional[str] = kwargs.get("content")
        sandbox_id: Optional[str] = kwargs.get("sandbox_id")

        if not path:
            return {"error": "Missing required parameter: path"}
        if content is None:
            return {"error": "Missing required parameter: content"}
        if not sandbox_id:
            return {"error": "Missing required parameter: sandbox_id"}

        logger.info("[edit_file] path=%s sandbox=%s (%d chars)", path, sandbox_id, len(content))

        try:
            service = _get_sandbox_service()
            await service.write_file(sandbox_id, path, content)
            result = {"path": path, "status": "updated", "chars_written": len(content)}
            logger.info("[edit_file] success: %s", path)
            return result
        except Exception as exc:
            logger.error("[edit_file] failed path=%s: %s", path, exc)
            return {"error": f"Failed to edit file {path}: {exc}"}


class CreateFileTool:
    """Create a new file in the E2B sandbox.

    Requirements: 5.3
    """

    name: str = "create_file"
    description: str = "Create a new file in the sandbox"
    parameters: Dict[str, Any] = {
        "type": "object",
        "properties": {
            "path": {"type": "string", "description": "Relative file path to create"},
            "content": {"type": "string", "description": "File content"},
            "sandbox_id": {"type": "string", "description": "E2B sandbox identifier"},
        },
        "required": ["path", "content", "sandbox_id"],
    }

    async def execute(self, **kwargs: Any) -> Dict[str, Any]:
        """Create a new file with the specified content.

        Args:
            path: Relative file path.
            content: File content.
            sandbox_id: E2B sandbox identifier.

        Returns:
            Dict with path and status.

        Requirements: 5.3, 5.5, 5.6, 5.7
        """
        path: Optional[str] = kwargs.get("path")
        content: Optional[str] = kwargs.get("content")
        sandbox_id: Optional[str] = kwargs.get("sandbox_id")

        if not path:
            return {"error": "Missing required parameter: path"}
        if content is None:
            return {"error": "Missing required parameter: content"}
        if not sandbox_id:
            return {"error": "Missing required parameter: sandbox_id"}

        logger.info("[create_file] path=%s sandbox=%s (%d chars)", path, sandbox_id, len(content))

        try:
            service = _get_sandbox_service()
            await service.create_file(sandbox_id, path, content)
            result = {"path": path, "status": "created", "chars_written": len(content)}
            logger.info("[create_file] success: %s", path)
            return result
        except Exception as exc:
            logger.error("[create_file] failed path=%s: %s", path, exc)
            return {"error": f"Failed to create file {path}: {exc}"}


class ListFilesTool:
    """Show the directory structure of the E2B sandbox.

    Requirements: 5.4
    """

    name: str = "list_files"
    description: str = "List files and directories in a sandbox path"
    parameters: Dict[str, Any] = {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "Directory path to list (default: '.')",
                "default": ".",
            },
            "sandbox_id": {"type": "string", "description": "E2B sandbox identifier"},
        },
        "required": ["sandbox_id"],
    }

    async def execute(self, **kwargs: Any) -> Dict[str, Any]:
        """List directory contents.

        Args:
            path: Directory path (default '.').
            sandbox_id: E2B sandbox identifier.

        Returns:
            Dict with path, files list, and count.

        Requirements: 5.4, 5.5, 5.6, 5.7
        """
        path: str = kwargs.get("path", ".")
        sandbox_id: Optional[str] = kwargs.get("sandbox_id")

        if not sandbox_id:
            return {"error": "Missing required parameter: sandbox_id"}

        logger.info("[list_files] path=%s sandbox=%s", path, sandbox_id)

        try:
            service = _get_sandbox_service()
            files = await service.list_directory(sandbox_id, path)
            result = {"path": path, "files": files, "count": len(files)}
            logger.info("[list_files] success: %s (%d items)", path, len(files))
            return result
        except Exception as exc:
            logger.error("[list_files] failed path=%s: %s", path, exc)
            return {"error": f"Failed to list directory {path}: {exc}"}


class RunCommandTool:
    """Execute a shell command in the E2B sandbox.

    Requirements: 6.1, 6.2, 6.3, 6.6
    """

    name: str = "run_command"
    description: str = "Execute a shell command in the sandbox"
    parameters: Dict[str, Any] = {
        "type": "object",
        "properties": {
            "command": {"type": "string", "description": "Shell command to execute"},
            "sandbox_id": {"type": "string", "description": "E2B sandbox identifier"},
            "timeout": {
                "type": "integer",
                "description": "Maximum execution time in seconds (default: 30)",
                "default": 30,
            },
        },
        "required": ["command", "sandbox_id"],
    }

    async def execute(self, **kwargs: Any) -> Dict[str, Any]:
        """Execute a shell command and return stdout, stderr, and exit code.

        Args:
            command: Shell command to run.
            sandbox_id: E2B sandbox identifier.
            timeout: Maximum execution time in seconds.

        Returns:
            Dict with command, stdout, stderr, exit_code, and duration_ms.

        Requirements: 6.1, 6.2, 6.3, 6.6, 5.5, 5.6, 5.7
        """
        command: Optional[str] = kwargs.get("command")
        sandbox_id: Optional[str] = kwargs.get("sandbox_id")
        timeout: int = int(kwargs.get("timeout", 30))

        if not command:
            return {"error": "Missing required parameter: command"}
        if not sandbox_id:
            return {"error": "Missing required parameter: sandbox_id"}

        logger.info("[run_command] cmd=%s sandbox=%s timeout=%ds", command[:80], sandbox_id, timeout)

        try:
            service = _get_sandbox_service()
            result = await service.run_command(sandbox_id, command, timeout=timeout)
            outcome = {
                "command": command,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "exit_code": result.exit_code,
                "duration_ms": result.duration_ms,
                "success": result.success,
            }
            logger.info(
                "[run_command] success: exit_code=%d duration=%dms",
                result.exit_code, result.duration_ms,
            )
            return outcome
        except Exception as exc:
            logger.error("[run_command] failed cmd=%s: %s", command[:80], exc)
            return {"error": f"Command execution failed: {exc}", "command": command}


class ReadLogsTool:
    """Retrieve recent error logs from the E2B sandbox.

    Requirements: 8.1, 8.3, 8.4
    """

    name: str = "read_logs"
    description: str = "Read recent error logs from the sandbox"
    parameters: Dict[str, Any] = {
        "type": "object",
        "properties": {
            "sandbox_id": {"type": "string", "description": "E2B sandbox identifier"},
            "lines": {
                "type": "integer",
                "description": "Number of log lines to retrieve (default: 50)",
                "default": 50,
            },
        },
        "required": ["sandbox_id"],
    }

    async def execute(self, **kwargs: Any) -> Dict[str, Any]:
        """Retrieve and format recent logs.

        Args:
            sandbox_id: E2B sandbox identifier.
            lines: Number of log lines to return.

        Returns:
            Dict with logs string and line_count.

        Requirements: 8.1, 8.3, 8.4, 5.7
        """
        sandbox_id: Optional[str] = kwargs.get("sandbox_id")
        lines: int = int(kwargs.get("lines", 50))

        if not sandbox_id:
            return {"error": "Missing required parameter: sandbox_id"}

        logger.info("[read_logs] sandbox=%s lines=%d", sandbox_id, lines)

        try:
            service = _get_sandbox_service()
            logs = await service.get_logs(sandbox_id, lines=lines)
            result = {"logs": logs, "line_count": len(logs.splitlines())}
            logger.info("[read_logs] success: %d lines returned", result["line_count"])
            return result
        except Exception as exc:
            logger.error("[read_logs] failed sandbox=%s: %s", sandbox_id, exc)
            return {"error": f"Failed to read logs: {exc}"}


class ReadConsoleTool:
    """Get console output from the last command execution.

    Requirements: 8.2, 8.4
    """

    name: str = "read_console"
    description: str = "Get console output from the last command execution"
    parameters: Dict[str, Any] = {
        "type": "object",
        "properties": {
            "sandbox_id": {"type": "string", "description": "E2B sandbox identifier"},
        },
        "required": ["sandbox_id"],
    }

    async def execute(self, **kwargs: Any) -> Dict[str, Any]:
        """Retrieve console output from the last command.

        Args:
            sandbox_id: E2B sandbox identifier.

        Returns:
            Dict with output string and char_count.

        Requirements: 8.2, 8.4, 5.7
        """
        sandbox_id: Optional[str] = kwargs.get("sandbox_id")

        if not sandbox_id:
            return {"error": "Missing required parameter: sandbox_id"}

        logger.info("[read_console] sandbox=%s", sandbox_id)

        try:
            service = _get_sandbox_service()
            output = await service.get_console_output(sandbox_id)
            result = {"output": output, "char_count": len(output)}
            logger.info("[read_console] success: %d chars", len(output))
            return result
        except Exception as exc:
            logger.error("[read_console] failed sandbox=%s: %s", sandbox_id, exc)
            return {"error": f"Failed to read console output: {exc}"}


# ---------------------------------------------------------------------------
# Tool registry
# ---------------------------------------------------------------------------


#: All available agent tools, keyed by name
ALL_TOOLS: Dict[str, AgentTool] = {
    tool.name: tool  # type: ignore[attr-defined]
    for tool in [
        FetchFileTool(),
        EditFileTool(),
        CreateFileTool(),
        ListFilesTool(),
        RunCommandTool(),
        ReadLogsTool(),
        ReadConsoleTool(),
    ]
}
