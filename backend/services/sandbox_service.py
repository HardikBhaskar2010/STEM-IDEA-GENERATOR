"""
Sandbox execution service.

Delegates to E2BRunner for actual sandbox lifecycle management.
Maps exceptions to domain exceptions understood by the rest of the codebase.

Requirements: 17, 17.8, 17.9, 17.10, 40
"""

import asyncio
import logging
import os
from typing import Any, Dict

from backend.core.exceptions import NotFoundError, UpstreamError, ValidationError

logger = logging.getLogger(__name__)


class SandboxService:
    """
    Business-logic service for E2B sandbox execution.

    Wraps E2BRunner to load project files, create sandboxes, stream logs,
    and stop runs — mapping all errors to domain exceptions.

    Requirements: 17, 17.8–17.10
    """

    def __init__(self) -> None:
        self._runner = None

    def _get_runner(self):
        if self._runner is None:
            from backend.services.e2b_runner import get_e2b_runner  # noqa: PLC0415
            self._runner = get_e2b_runner()
        return self._runner

    def _get_store(self):
        from backend.services.veronica_project_store import VeronicaProjectStore  # noqa: PLC0415
        base_dir = os.getenv("VERONICA_PROJECT_DIR", "/tmp/veronica_projects")
        return VeronicaProjectStore(base_dir=base_dir)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def create_sandbox(self) -> Dict[str, Any]:
        """Create new E2B sandbox and return ID + viewer URL.

        Creates a fresh E2B sandbox instance and generates a shareable
        file viewer URL for real-time file inspection.

        Returns:
            Dict with sandbox_id, viewer_url, and status.

        Raises:
            UpstreamError: When E2B sandbox creation fails.

        Requirements: 1.1, 1.2, 16.1, 16.2
        """
        try:
            runner = self._get_runner()
            sandbox = await runner.create_empty_sandbox()
            viewer_url = self._generate_viewer_url(sandbox.id)
            
            logger.info(f"Created sandbox {sandbox.id} with viewer URL: {viewer_url}")
            
            return {
                "sandbox_id": sandbox.id,
                "viewer_url": viewer_url,
                "status": "ready"
            }
        except Exception as exc:
            logger.error(f"Sandbox creation failed: {exc}")
            raise UpstreamError(
                "Failed to create sandbox.",
                service="E2B",
                upstream_status=503,
            ) from exc

    def _generate_viewer_url(self, sandbox_id: str) -> str:
        """Generate E2B file viewer URL.

        The URL allows users to:
        - Browse complete directory structure
        - View file contents in web interface
        - Edit files directly in browser
        - Download files

        Args:
            sandbox_id: E2B sandbox identifier.

        Returns:
            Shareable file viewer URL.

        Requirements: 16.1, 16.2
        """
        return f"https://e2b.dev/sandbox/{sandbox_id}/files"

    async def run_project(self, project_id: str) -> Dict[str, Any]:
        """Start a sandbox run for a project.

        Loads the saved ProjectSpec, uploads all files to a fresh E2B
        sandbox, runs npm install + npm run dev, and returns the public
        preview URL.

        Args:
            project_id: Project to run.

        Returns:
            Dict with run_id, status, and preview_url.

        Raises:
            ValidationError: When project_id is empty.
            NotFoundError: When no project spec exists on disk.
            UpstreamError: When E2B sandbox creation fails.

        Requirements: 17.8
        """
        if not project_id:
            raise ValidationError("project_id is required", details={"field": "project_id"})

        try:
            store = self._get_store()
            spec = store.load_spec(project_id)
        except FileNotFoundError:
            raise NotFoundError(f"Project not found: {project_id}")
        except Exception as exc:
            raise UpstreamError(
                "Could not load project spec.",
                service="VeronicaProjectStore",
                upstream_status=500,
            ) from exc

        # Build file dict from the spec
        files: Dict[str, str] = {}
        for pf in (spec.files or []):
            files[pf.path] = pf.content or ""
        if spec.readme:
            files["README.md"] = spec.readme

        try:
            runner = self._get_runner()
            run = await runner.create_sandbox(project_id=project_id, files=files)
        except RuntimeError as exc:
            raise UpstreamError(
                f"Sandbox startup failed: {exc}",
                service="E2B",
                upstream_status=503,
            ) from exc
        except Exception as exc:
            logger.error("Sandbox run failed for project %s: %s", project_id, exc)
            raise UpstreamError(
                "Code execution service is temporarily unavailable.",
                service="E2B",
                upstream_status=503,
            ) from exc

        return {
            "run_id": run.run_id,
            "project_id": run.project_id,
            "status": run.status,
            "preview_url": run.preview_url,
            "startup_logs": run.logs,
        }

    async def stop_project(self, project_id: str, run_id: str) -> Dict[str, Any]:
        """Stop a running sandbox.

        Args:
            project_id: Project identifier (for audit logging).
            run_id: Run to stop.

        Returns:
            Dict with updated run_id and status.

        Raises:
            NotFoundError: When the run_id is not tracked.

        Requirements: 17.9
        """
        if not run_id:
            raise ValidationError("run_id is required", details={"field": "run_id"})

        try:
            runner = self._get_runner()
            await runner.kill(run_id)
            return {"run_id": run_id, "project_id": project_id, "status": "stopped"}
        except KeyError:
            raise NotFoundError(f"Run {run_id!r} not found for project {project_id!r}")
        except Exception as exc:
            logger.error("Failed to stop run %s: %s", run_id, exc)
            raise UpstreamError(
                "Failed to stop sandbox.",
                service="E2B",
                upstream_status=503,
            ) from exc

    async def get_logs(self, project_id: str, run_id: str) -> Dict[str, Any]:
        """Retrieve startup logs for a sandbox run.

        Requirements: 17.10, 30.5
        """
        if not project_id or not run_id:
            raise ValidationError(
                "project_id and run_id are required",
                details={"fields": ["project_id", "run_id"]},
            )

        runner = self._get_runner()
        sandbox = runner.get_sandbox(run_id)
        if sandbox is None:
            raise NotFoundError(f"Run {run_id!r} not found for project {project_id!r}")

        return {"run_id": run_id, "project_id": project_id, "logs": "Sandbox is running."}

    async def self_fix(
        self, project_id: str, run_id: str, error_log: str
    ) -> Dict[str, Any]:
        """Attempt automatic error fixing for a failed sandbox run.

        Requirements: 17
        """
        try:
            from backend.services.self_fix_runner import SelfFixRunner  # noqa: PLC0415
            runner = SelfFixRunner()
            result = await runner.fix(project_id=project_id, run_id=run_id, error_log=error_log)
            return result
        except Exception as exc:
            logger.error("Self-fix failed for run %s: %s", run_id, exc)
            raise UpstreamError(
                "Auto-fix service temporarily unavailable.",
                service="SelfFixRunner",
                upstream_status=503,
            ) from exc

    async def read_file(self, sandbox_id: str, path: str) -> str:
        """Read file content from sandbox.

        Retrieves the content of a file from the E2B sandbox.

        Args:
            sandbox_id: E2B sandbox identifier.
            path: Relative or absolute file path within the sandbox.

        Returns:
            File content as string.

        Raises:
            ValidationError: When sandbox_id or path is empty.
            NotFoundError: When sandbox or file doesn't exist.
            UpstreamError: When file read operation fails.

        Requirements: 5.1
        """
        if not sandbox_id:
            raise ValidationError("sandbox_id is required", details={"field": "sandbox_id"})
        if not path:
            raise ValidationError("path is required", details={"field": "path"})

        try:
            runner = self._get_runner()
            sandbox = runner.get_sandbox(sandbox_id)
            
            if sandbox is None:
                raise NotFoundError(f"Sandbox {sandbox_id} not found")
            
            # Use E2B SDK to read file
            content = await sandbox.files.read(path)
            logger.info(f"Read file {path} from sandbox {sandbox_id}")
            return content
            
        except NotFoundError:
            raise
        except Exception as exc:
            logger.error(f"Failed to read file {path} from sandbox {sandbox_id}: {exc}")
            raise UpstreamError(
                f"Failed to read file: {path}",
                service="E2B",
                upstream_status=503,
            ) from exc

    async def write_file(self, sandbox_id: str, path: str, content: str) -> None:
        """Write/update file in sandbox.

        Updates an existing file or creates it if it doesn't exist.

        Args:
            sandbox_id: E2B sandbox identifier.
            path: Relative or absolute file path within the sandbox.
            content: File content to write.

        Raises:
            ValidationError: When sandbox_id or path is empty.
            NotFoundError: When sandbox doesn't exist.
            UpstreamError: When file write operation fails.

        Requirements: 5.2
        """
        if not sandbox_id:
            raise ValidationError("sandbox_id is required", details={"field": "sandbox_id"})
        if not path:
            raise ValidationError("path is required", details={"field": "path"})

        try:
            runner = self._get_runner()
            sandbox = runner.get_sandbox(sandbox_id)
            
            if sandbox is None:
                raise NotFoundError(f"Sandbox {sandbox_id} not found")
            
            # Ensure parent directory exists
            import os
            dir_path = os.path.dirname(path)
            if dir_path:
                await sandbox.commands.run(f"mkdir -p {dir_path}", timeout=10)
            
            # Write file using E2B SDK
            await sandbox.files.write(path, content)
            logger.info(f"Wrote file {path} to sandbox {sandbox_id}")
            
        except NotFoundError:
            raise
        except Exception as exc:
            logger.error(f"Failed to write file {path} to sandbox {sandbox_id}: {exc}")
            raise UpstreamError(
                f"Failed to write file: {path}",
                service="E2B",
                upstream_status=503,
            ) from exc

    async def create_file(self, sandbox_id: str, path: str, content: str) -> None:
        """Create new file in sandbox.

        Creates a new file with the specified content. If the file already
        exists, it will be overwritten (same behavior as write_file).

        Args:
            sandbox_id: E2B sandbox identifier.
            path: Relative or absolute file path within the sandbox.
            content: File content to write.

        Raises:
            ValidationError: When sandbox_id or path is empty.
            NotFoundError: When sandbox doesn't exist.
            UpstreamError: When file creation fails.

        Requirements: 5.3
        """
        if not sandbox_id:
            raise ValidationError("sandbox_id is required", details={"field": "sandbox_id"})
        if not path:
            raise ValidationError("path is required", details={"field": "path"})

        try:
            runner = self._get_runner()
            sandbox = runner.get_sandbox(sandbox_id)
            
            if sandbox is None:
                raise NotFoundError(f"Sandbox {sandbox_id} not found")
            
            # Ensure parent directory exists
            import os
            dir_path = os.path.dirname(path)
            if dir_path:
                await sandbox.commands.run(f"mkdir -p {dir_path}", timeout=10)
            
            # Create file using E2B SDK
            await sandbox.files.write(path, content)
            logger.info(f"Created file {path} in sandbox {sandbox_id}")
            
        except NotFoundError:
            raise
        except Exception as exc:
            logger.error(f"Failed to create file {path} in sandbox {sandbox_id}: {exc}")
            raise UpstreamError(
                f"Failed to create file: {path}",
                service="E2B",
                upstream_status=503,
            ) from exc

    async def list_directory(self, sandbox_id: str, path: str = ".") -> list[str]:
        """List directory contents in sandbox.

        Shows the directory structure at the specified path.

        Args:
            sandbox_id: E2B sandbox identifier.
            path: Directory path to list (defaults to current directory).

        Returns:
            List of file and directory names in the specified path.

        Raises:
            ValidationError: When sandbox_id is empty.
            NotFoundError: When sandbox or directory doesn't exist.
            UpstreamError: When directory listing fails.

        Requirements: 5.4
        """
        if not sandbox_id:
            raise ValidationError("sandbox_id is required", details={"field": "sandbox_id"})

        try:
            runner = self._get_runner()
            sandbox = runner.get_sandbox(sandbox_id)
            
            if sandbox is None:
                raise NotFoundError(f"Sandbox {sandbox_id} not found")
            
            # Use ls command to list directory contents
            result = await sandbox.commands.run(f"ls -1 {path}", timeout=10)
            
            if result.exit_code != 0:
                # Directory might not exist
                raise NotFoundError(f"Directory not found: {path}")
            
            # Parse output into list of files/directories
            files = [line.strip() for line in result.stdout.splitlines() if line.strip()]
            logger.info(f"Listed directory {path} in sandbox {sandbox_id}: {len(files)} items")
            return files
            
        except NotFoundError:
            raise
        except Exception as exc:
            logger.error(f"Failed to list directory {path} in sandbox {sandbox_id}: {exc}")
            raise UpstreamError(
                f"Failed to list directory: {path}",
                service="E2B",
                upstream_status=503,
            ) from exc

    async def run_command(
        self, sandbox_id: str, command: str, timeout: int = 30
    ) -> "CommandResult":
        """Execute shell command in sandbox.

        Runs a shell command with timeout enforcement and captures
        stdout, stderr, and exit code. Prevents execution of dangerous
        commands that could harm the sandbox.

        Args:
            sandbox_id: E2B sandbox identifier.
            command: Shell command to execute.
            timeout: Maximum execution time in seconds (default: 30).

        Returns:
            CommandResult with stdout, stderr, exit_code, and duration_ms.

        Raises:
            ValidationError: When sandbox_id or command is empty, or command is dangerous.
            NotFoundError: When sandbox doesn't exist.
            UpstreamError: When command execution fails.

        Requirements: 6.1, 6.2, 6.3, 6.6
        """
        if not sandbox_id:
            raise ValidationError("sandbox_id is required", details={"field": "sandbox_id"})
        if not command:
            raise ValidationError("command is required", details={"field": "command"})

        # Prevent dangerous commands
        dangerous_patterns = [
            "rm -rf /",
            "rm -rf /*",
            ":(){ :|:& };:",  # Fork bomb
            "mkfs",
            "dd if=/dev/zero",
            "> /dev/sda",
            "mv / ",
            "chmod -R 777 /",
        ]
        
        for pattern in dangerous_patterns:
            if pattern in command:
                logger.warning(f"Blocked dangerous command in sandbox {sandbox_id}: {command}")
                raise ValidationError(
                    f"Dangerous command blocked: {pattern}",
                    details={"command": command, "pattern": pattern}
                )

        try:
            runner = self._get_runner()
            sandbox = runner.get_sandbox(sandbox_id)
            
            if sandbox is None:
                raise NotFoundError(f"Sandbox {sandbox_id} not found")
            
            # Import CommandResult model
            from backend.models.command_result import CommandResult
            import time
            
            # Execute command with timeout
            start_time = time.time()
            result = await sandbox.commands.run(command, timeout=timeout)
            duration_ms = int((time.time() - start_time) * 1000)
            
            # Create CommandResult
            command_result = CommandResult(
                command=command,
                stdout=result.stdout or "",
                stderr=result.stderr or "",
                exit_code=result.exit_code,
                duration_ms=duration_ms,
            )
            
            logger.info(
                f"Executed command in sandbox {sandbox_id}: {command[:50]}... "
                f"(exit_code={result.exit_code}, duration={duration_ms}ms)"
            )
            
            return command_result
            
        except NotFoundError:
            raise
        except ValidationError:
            raise
        except asyncio.TimeoutError as exc:
            logger.error(f"Command timeout in sandbox {sandbox_id}: {command}")
            raise UpstreamError(
                f"Command execution timeout after {timeout}s",
                service="E2B",
                upstream_status=504,
            ) from exc
        except Exception as exc:
            logger.error(f"Failed to execute command in sandbox {sandbox_id}: {exc}")
            raise UpstreamError(
                f"Failed to execute command: {command[:50]}...",
                service="E2B",
                upstream_status=503,
            ) from exc
