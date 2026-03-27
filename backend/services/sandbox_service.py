"""
Sandbox execution service.

Thin wrapper around the existing ``SandboxManager`` that enforces input
validation and maps ``KeyError`` / other exceptions to domain exceptions
understood by the rest of the codebase.

Requirements: 17, 17.8, 17.9, 17.10, 40
"""

import logging
import os
from typing import Any, Dict

from backend.core.exceptions import NotFoundError, UpstreamError, ValidationError

logger = logging.getLogger(__name__)


class SandboxService:
    """
    Pure business-logic service for sandbox execution.

    Delegates to the existing :class:`~backend.services.sandbox_manager.SandboxManager`
    for container lifecycle management — does not re-implement that logic.

    Requirements: 17, 17.8–17.10
    """

    def __init__(self) -> None:
        self._manager = None

    def _get_manager(self):
        """Lazy-load the SandboxManager singleton."""
        if self._manager is None:
            from backend.services.sandbox_manager import get_sandbox_manager  # noqa: PLC0415
            self._manager = get_sandbox_manager()
        return self._manager

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def run_project(self, project_id: str) -> Dict[str, Any]:
        """Start a sandbox run for a project.

        Args:
            project_id: Project to run.

        Returns:
            Dict with ``run_id``, ``status``, and ``preview_url``.

        Raises:
            ValidationError: When ``project_id`` is empty.
            UpstreamError: When the sandbox manager fails to start the run.

        Requirements: 17.8
        """
        if not project_id:
            raise ValidationError(
                "project_id is required", details={"field": "project_id"}
            )
        try:
            manager = self._get_manager()
            run = manager.create_run(project_id)
            return {
                "run_id": run.run_id,
                "status": run.status,
                "preview_url": run.preview_url,
                "project_id": run.project_id,
            }
        except Exception as exc:
            logger.error("Sandbox run failed for project %s: %s", project_id, exc)
            raise UpstreamError(
                "Code execution service is temporarily unavailable.",
                service="E2B",
                upstream_status=503,
            ) from exc

    async def stop_project(self, project_id: str, run_id: str) -> Dict[str, Any]:
        """Stop a running sandbox.

        Args:
            project_id: Project identifier (for audit logging).
            run_id: Run to stop.

        Returns:
            Dict with updated ``run_id`` and ``status``.

        Raises:
            NotFoundError: When the run_id is not tracked.

        Requirements: 17.9
        """
        if not run_id:
            raise ValidationError("run_id is required", details={"field": "run_id"})
        try:
            manager = self._get_manager()
            run = manager.stop_run(run_id)
            return {"run_id": run.run_id, "status": run.status}
        except KeyError:
            raise NotFoundError(f"Run {run_id} not found for project {project_id}")
        except Exception as exc:
            logger.error("Failed to stop run %s: %s", run_id, exc)
            raise UpstreamError(
                "Failed to stop sandbox.",
                service="E2B",
                upstream_status=503,
            ) from exc

    async def get_logs(self, project_id: str, run_id: str) -> Dict[str, Any]:
        """Retrieve logs for a sandbox run.

        Args:
            project_id: Project identifier.
            run_id: Run identifier.

        Returns:
            Dict with ``run_id`` and ``logs`` string.

        Raises:
            NotFoundError: When the run_id is unknown.
            ValidationError: When either argument is empty.

        Requirements: 17.10, 30.5
        """
        if not project_id or not run_id:
            raise ValidationError(
                "project_id and run_id are required",
                details={"fields": ["project_id", "run_id"]},
            )
        try:
            manager = self._get_manager()
            logs = manager.get_logs(run_id)
            return {"run_id": run_id, "logs": logs}
        except KeyError:
            raise NotFoundError(f"Run {run_id} not found for project {project_id}")
        except Exception as exc:
            logger.error("Failed to get logs for run %s: %s", run_id, exc)
            raise UpstreamError(
                "Log retrieval temporarily unavailable.",
                service="E2B",
                upstream_status=503,
            ) from exc

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
