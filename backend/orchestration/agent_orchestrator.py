"""
Agent workflow orchestrator.

Coordinates AI agent jobs and DevLab jobs by delegating to the existing
``agent_orchestrator`` service and ``job_system`` infrastructure.  Routers
call this class — never the underlying services directly.

Requirements: 18, 18.7, 18.8, 18.9, 40
"""

import logging
from typing import Any, Dict

from backend.core.exceptions import NotFoundError, UpstreamError, ValidationError
from backend.integrations.openrouter.client import OpenRouterClient

logger = logging.getLogger(__name__)


class AgentWorkflowOrchestrator:
    """
    Orchestrates AI agent execution workflows.

    Delegates to the existing ``agent_orchestrator`` service for workflow
    management and to ``job_system`` for job tracking.

    Requirements: 18, 18.7–18.9
    """

    def __init__(self, openrouter_client: OpenRouterClient) -> None:
        self.openrouter_client = openrouter_client
        self._agent_svc = None
        self._job_system = None

    # ------------------------------------------------------------------
    # Lazy service accessors
    # ------------------------------------------------------------------

    def _get_agent_service(self):
        if self._agent_svc is None:
            from backend.services.agent_orchestrator import AgentOrchestrator  # noqa: PLC0415
            self._agent_svc = AgentOrchestrator()
        return self._agent_svc

    def _get_job_system(self):
        if self._job_system is None:
            from backend.services.job_system import JobSystem  # noqa: PLC0415
            self._job_system = JobSystem()
        return self._job_system

    # ------------------------------------------------------------------
    # Agent job workflow
    # ------------------------------------------------------------------

    async def start_agent_job(
        self, project_id: str, task: str, user_id: str = "anonymous"
    ) -> Dict[str, Any]:
        """Start an AI agent job.

        Workflow:
        1. Validate inputs.
        2. Create a job record via ``job_system``.
        3. Kick off agent execution via ``agent_orchestrator``.
        4. Return job ID for later polling.

        Args:
            project_id: Target project identifier.
            task: Human-readable description of what the agent should do.
            user_id: Identifier of the requesting user.

        Returns:
            Dict with ``job_id`` and initial ``status``.

        Raises:
            ValidationError: When required parameters are missing.
            UpstreamError: When agent execution cannot be initialised.

        Requirements: 18.7
        """
        if not project_id:
            raise ValidationError("project_id is required")
        if not task:
            raise ValidationError("task is required")

        try:
            job_system = self._get_job_system()
            job_id = job_system.create_job(
                project_id=project_id,
                user_id=user_id,
                task=task,
                status="pending",
            )

            # Fire-and-forget — agent runs asynchronously
            agent_svc = self._get_agent_service()
            await agent_svc.start_job(job_id=job_id, project_id=project_id, task=task)

            return {"job_id": job_id, "status": "pending", "project_id": project_id}

        except (ValidationError, NotFoundError):
            raise
        except Exception as exc:
            logger.error("Failed to start agent job: %s", exc)
            raise UpstreamError(
                "Agent workflow service is temporarily unavailable.",
                service="AgentOrchestrator",
                upstream_status=503,
            ) from exc

    async def get_agent_job(self, job_id: str) -> Dict[str, Any]:
        """Retrieve the status of an agent job.

        Args:
            job_id: Job identifier returned by :meth:`start_agent_job`.

        Returns:
            Dict with job status and metadata.

        Raises:
            NotFoundError: When the job_id is unknown.

        Requirements: 18.8
        """
        if not job_id:
            raise ValidationError("job_id is required")
        try:
            job_system = self._get_job_system()
            job = job_system.get_job(job_id)
            if job is None:
                raise NotFoundError(f"Job {job_id} not found")
            return job
        except (NotFoundError, ValidationError):
            raise
        except Exception as exc:
            logger.error("Failed to retrieve agent job %s: %s", job_id, exc)
            raise UpstreamError(
                "Agent job retrieval failed.",
                service="JobSystem",
                upstream_status=503,
            ) from exc

    # ------------------------------------------------------------------
    # DevLab job workflow
    # ------------------------------------------------------------------

    async def create_devlab_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a DevLab job.

        Args:
            job_data: Job specification dict.

        Returns:
            Dict with ``job_id`` and ``status``.

        Requirements: 18.9
        """
        try:
            job_system = self._get_job_system()
            job_id = job_system.create_job(
                project_id=job_data.get("project_id", "devlab"),
                user_id=job_data.get("user_id", "anonymous"),
                task=job_data.get("task", "DevLab job"),
                status="pending",
                job_type="devlab",
            )
            return {"job_id": job_id, "status": "pending"}
        except Exception as exc:
            logger.error("Failed to create DevLab job: %s", exc)
            raise UpstreamError(
                "DevLab job service is temporarily unavailable.",
                service="JobSystem",
                upstream_status=503,
            ) from exc

    async def get_devlab_job(self, job_id: str) -> Dict[str, Any]:
        """Retrieve a DevLab job status.

        Args:
            job_id: Job identifier.

        Returns:
            Dict with job status and metadata.

        Requirements: 18.9
        """
        return await self.get_agent_job(job_id)
