"""
Agents router.

Thin HTTP handler for agent orchestration and DevLab job endpoints.
Delegates entirely to AgentWorkflowOrchestrator.

Requirements: 9, 9.7, 9.8, 9.9, 9.10, 9.11
"""

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.core.dependencies import get_agent_orchestrator
from backend.core.exceptions import AppError
from backend.core.rate_limit import rate_limit
from backend.services.agent_orchestrator import AgentWorkflowOrchestrator

logger = logging.getLogger(__name__)

agents_router = APIRouter(prefix="/api", tags=["agents"])


class AgentJobRequest(BaseModel):
    project_id: str
    task: str
    user_id: Optional[str] = "anonymous"


class DevLabJobRequest(BaseModel):
    project_id: Optional[str] = "devlab"
    task: Optional[str] = "DevLab job"
    user_id: Optional[str] = "anonymous"


def _http_from_app_error(exc: AppError) -> HTTPException:
    return HTTPException(status_code=exc.to_http_status(), detail=exc.to_response_dict())


@agents_router.post(
    "/agents/start",
    dependencies=[rate_limit("agent_jobs")],
)
async def start_agent_job(
    body: AgentJobRequest,
    orchestrator: AgentWorkflowOrchestrator = Depends(get_agent_orchestrator),
) -> Dict[str, Any]:
    """Start an AI agent job.

    Requirements: 9, 9.7
    """
    try:
        return await orchestrator.start_agent_job(
            project_id=body.project_id,
            task=body.task,
            user_id=body.user_id,
        )
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("Unexpected error starting agent job")
        raise HTTPException(status_code=500, detail={"error": "InternalServerError", "message": "Agent start failed"})


@agents_router.get("/agents/{job_id}")
async def get_agent_job(
    job_id: str,
    orchestrator: AgentWorkflowOrchestrator = Depends(get_agent_orchestrator),
) -> Dict[str, Any]:
    """Get agent job status.

    Requirements: 9, 9.8
    """
    try:
        return await orchestrator.get_agent_job(job_id)
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("Unexpected error getting agent job")
        raise HTTPException(status_code=500, detail={"error": "InternalServerError", "message": "Job lookup failed"})


@agents_router.post(
    "/devlab/jobs",
    dependencies=[rate_limit("agent_jobs")],
)
async def create_devlab_job(
    body: DevLabJobRequest,
    orchestrator: AgentWorkflowOrchestrator = Depends(get_agent_orchestrator),
) -> Dict[str, Any]:
    """Create a DevLab job.

    Requirements: 9, 9.10
    """
    try:
        return await orchestrator.create_devlab_job(body.model_dump())
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("Unexpected error creating DevLab job")
        raise HTTPException(status_code=500, detail={"error": "InternalServerError", "message": "DevLab job creation failed"})


@agents_router.get("/devlab/jobs/{job_id}")
async def get_devlab_job(
    job_id: str,
    orchestrator: AgentWorkflowOrchestrator = Depends(get_agent_orchestrator),
) -> Dict[str, Any]:
    """Get DevLab job status.

    Requirements: 9, 9.11
    """
    try:
        return await orchestrator.get_devlab_job(job_id)
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("Unexpected error getting DevLab job")
        raise HTTPException(status_code=500, detail={"error": "InternalServerError", "message": "Job lookup failed"})
