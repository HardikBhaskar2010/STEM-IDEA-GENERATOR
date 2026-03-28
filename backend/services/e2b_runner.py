"""
E2B Async Sandbox Runner.

Handles creating E2B sandboxes, uploading project files, running
npm install + npm run dev, and streaming logs back to the frontend.

Uses the async E2B SDK so it never blocks the FastAPI event loop.
"""

from __future__ import annotations

import asyncio
import logging
import os
from dataclasses import dataclass, field
from typing import AsyncIterator, Dict, Optional

logger = logging.getLogger(__name__)

# In-memory registry of active sandboxes: sandbox_id → sandbox object
_active_sandboxes: Dict[str, object] = {}


@dataclass
class SandboxRun:
    run_id: str
    project_id: str
    status: str = "starting"
    preview_url: Optional[str] = None
    logs: list[str] = field(default_factory=list)


class E2BRunner:
    """
    Async wrapper around the E2B SDK for running Veronica web projects
    in a cloud sandbox with live preview URLs.
    """

    def __init__(self) -> None:
        self._api_key = os.getenv("E2B_API_KEY", "")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def create_sandbox(
        self, project_id: str, files: Dict[str, str]
    ) -> SandboxRun:
        """
        Upload project files into a fresh E2B sandbox, run npm install,
        start the Vite dev server, and return a public preview URL.

        Args:
            project_id: Veronica project UUID (for tracking).
            files: Mapping of relative path → file content.

        Returns:
            SandboxRun with run_id, status, and preview_url.
        """
        from e2b import AsyncSandbox  # noqa: PLC0415

        logs: list[str] = []

        try:
            # Create sandbox (takes ~200ms)
            sandbox = await AsyncSandbox.create(api_key=self._api_key, timeout=300)
            run_id = sandbox.sandbox_id
            _active_sandboxes[run_id] = sandbox

            logger.info("E2B sandbox created: %s for project %s", run_id, project_id)
            logs.append(f"✅ Sandbox {run_id[:8]}... created")

            work_dir = "/home/user/project"

            # Upload all files concurrently
            upload_tasks = []
            for rel_path, content in files.items():
                full_path = f"{work_dir}/{rel_path}"
                # Ensure parent directory exists
                dir_path = "/".join(full_path.split("/")[:-1])
                upload_tasks.append(
                    self._upload_file(sandbox, full_path, dir_path, content)
                )

            await asyncio.gather(*upload_tasks)
            logs.append(f"📦 Uploaded {len(files)} files")

            # Detect if this is a Node.js project
            has_package_json = "package.json" in files

            preview_url: Optional[str] = None

            if has_package_json:
                # npm install
                logs.append("⬇️  Running npm install...")
                result = await sandbox.commands.run(
                    "npm install --prefer-offline --no-audit --no-fund 2>&1",
                    cwd=work_dir,
                    timeout=120,
                )
                if result.exit_code != 0:
                    logs.append(f"⚠️  npm install warning: {result.stdout[-500:]}")
                else:
                    logs.append("✅ npm install complete")

                # Start Vite dev server in background on port 5173
                logs.append("🚀 Starting dev server...")
                await sandbox.commands.run(
                    "npm run dev -- --host 0.0.0.0 --port 5173 &",
                    cwd=work_dir,
                    timeout=10,
                    background=True,
                )

                # Wait for server to boot
                await asyncio.sleep(4)

                # Get public preview URL
                try:
                    host = sandbox.get_host(5173)
                    preview_url = f"https://{host}"
                    logs.append(f"🌐 Preview ready: {preview_url}")
                except Exception as e:
                    logger.warning("Could not get E2B host URL: %s", e)
                    logs.append("⚠️  Preview URL not available yet")
            else:
                logs.append("ℹ️  No package.json found — skipping npm install")

            return SandboxRun(
                run_id=run_id,
                project_id=project_id,
                status="running",
                preview_url=preview_url,
                logs=logs,
            )

        except Exception as exc:
            logger.error("E2B sandbox creation failed: %s", exc, exc_info=True)
            # Clean up if we partially created a sandbox
            raise RuntimeError(f"Sandbox startup failed: {exc}") from exc

    async def kill(self, run_id: str) -> None:
        """Kill a running sandbox by run_id."""
        sandbox = _active_sandboxes.pop(run_id, None)
        if sandbox is None:
            raise KeyError(f"No active sandbox with id: {run_id}")
        try:
            await sandbox.kill()
            logger.info("E2B sandbox killed: %s", run_id)
        except Exception as exc:
            logger.warning("Error killing sandbox %s: %s", run_id, exc)

    async def stream_logs(self, run_id: str, command: str = "cat /proc/1/fd/1") -> AsyncIterator[str]:
        """
        Stream stdout from a running sandbox as async iterator.
        Yields log lines.
        """
        sandbox = _active_sandboxes.get(run_id)
        if sandbox is None:
            yield f"data: Sandbox {run_id} not found or already stopped\n\n"
            return

        try:
            # Run a log-tail command inside the sandbox
            result = await sandbox.commands.run(
                "tail -f /tmp/dev-server.log 2>/dev/null || echo 'No logs yet'",
                timeout=30,
            )
            for line in (result.stdout or "").splitlines():
                yield f"data: {line}\n\n"
        except Exception as exc:
            yield f"data: Log stream error: {exc}\n\n"

    def get_sandbox(self, run_id: str):
        """Retrieve an active sandbox object by run_id."""
        return _active_sandboxes.get(run_id)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    async def _upload_file(sandbox, full_path: str, dir_path: str, content: str) -> None:
        """Create parent directories and write a file into the sandbox."""
        try:
            await sandbox.commands.run(f"mkdir -p {dir_path}", timeout=10)
            await sandbox.files.write(full_path, content)
        except Exception as exc:
            logger.warning("Failed to upload %s: %s", full_path, exc)


# Module-level singleton
_runner: Optional[E2BRunner] = None


def get_e2b_runner() -> E2BRunner:
    """Return the module-level E2BRunner singleton."""
    global _runner
    if _runner is None:
        _runner = E2BRunner()
    return _runner
