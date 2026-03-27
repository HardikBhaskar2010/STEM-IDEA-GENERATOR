"""
Project generation router.

Thin HTTP handler that delegates all workflow logic to ProjectOrchestrator.
Handles request validation, response formatting, and exception-to-HTTP mapping.

Requirements: 6, 6.5, 6.6, 6.7, 6.8
"""

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.core.dependencies import (
    get_authenticated_user_id,
    get_project_orchestrator,
    get_supabase_service,
)
from backend.core.exceptions import AppError
from backend.orchestration.project_orchestrator import ProjectOrchestrator
from backend.services.supabase_service import SupabaseService

logger = logging.getLogger(__name__)

projects_router = APIRouter(prefix="/api", tags=["projects"])


# ---------------------------------------------------------------------------
# Pydantic request / response models (local until models/ is complete)
# ---------------------------------------------------------------------------

class ProjectParams(BaseModel):
    projectType: str
    skillLevel: str
    interests: Optional[str] = ""
    budget: Optional[str] = ""
    duration: Optional[str] = ""


class ProjectSyncRequest(BaseModel):
    project_id: Optional[str] = None
    id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None


# ---------------------------------------------------------------------------
# Endpoints — delegate ONLY to orchestrator, never to services directly
# ---------------------------------------------------------------------------

@projects_router.post("/generate-project")
async def generate_project(
    params: ProjectParams,
    orchestrator: ProjectOrchestrator = Depends(get_project_orchestrator),
    user_id: Optional[str] = Depends(get_authenticated_user_id),
    svc: SupabaseService = Depends(get_supabase_service),
) -> Dict[str, Any]:
    """Generate a STEM project based on parameters.

    If the caller sends a valid Supabase Bearer token the result is
    persisted to public.projects. Unauthenticated requests (guests) are
    handled identically but without any database writes.

    Requirements: 6, 38.11
    """
    try:
        result = await orchestrator.generate_project(params.model_dump())
        # Persist to Supabase when authenticated (no-op for guests)
        await svc.save_generated_idea(user_id, result, params.model_dump())
        return result
    except AppError as exc:
        raise HTTPException(status_code=exc.to_http_status(), detail=exc.to_response_dict())
    except Exception:
        logger.exception("Unexpected error in generate_project")
        raise HTTPException(
            status_code=500,
            detail={"error": "InternalServerError", "message": "An unexpected error occurred"},
        )


@projects_router.post("/generate-project-stream")
async def generate_project_stream(
    params: ProjectParams,
    orchestrator: ProjectOrchestrator = Depends(get_project_orchestrator),
) -> StreamingResponse:
    """Stream project generation token-by-token.

    Requirements: 6
    """
    try:
        async def event_stream():
            async for chunk in orchestrator.generate_project_stream(params.model_dump()):
                yield f"data: {chunk}\n\n"

        return StreamingResponse(event_stream(), media_type="text/event-stream")
    except AppError as exc:
        raise HTTPException(status_code=exc.to_http_status(), detail=exc.to_response_dict())
    except Exception:
        logger.exception("Unexpected error in generate_project_stream")
        raise HTTPException(status_code=500, detail={"error": "InternalServerError", "message": "Streaming failed"})


@projects_router.post("/projects/sync")
async def sync_project(
    project: ProjectSyncRequest,
    orchestrator: ProjectOrchestrator = Depends(get_project_orchestrator),
) -> Dict[str, Any]:
    """Sync/upsert a project record.

    Requirements: 6
    """
    try:
        return await orchestrator.sync_project(project.model_dump())
    except AppError as exc:
        raise HTTPException(status_code=exc.to_http_status(), detail=exc.to_response_dict())
    except Exception:
        logger.exception("Unexpected error in sync_project")
        raise HTTPException(status_code=500, detail={"error": "InternalServerError", "message": "Sync failed"})


@projects_router.get("/components/{component_id}/details")
async def get_component_details(
    component_id: str,
    orchestrator: ProjectOrchestrator = Depends(get_project_orchestrator),
) -> Dict[str, Any]:
    """Retrieve details for a project component.

    Requirements: 6
    """
    try:
        return await orchestrator.get_component_details(component_id)
    except AppError as exc:
        raise HTTPException(status_code=exc.to_http_status(), detail=exc.to_response_dict())
    except Exception:
        logger.exception("Unexpected error in get_component_details")
        raise HTTPException(status_code=500, detail={"error": "InternalServerError", "message": "Component lookup failed"})
