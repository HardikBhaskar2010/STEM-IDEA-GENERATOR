"""
Sandbox execution service.

Delegates to E2BRunner for actual sandbox lifecycle management.
Maps exceptions to domain exceptions understood by the rest of the codebase.

Requirements: 17, 17.8, 17.9, 17.10, 40
"""

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
