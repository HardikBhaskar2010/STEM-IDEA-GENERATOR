"""
Veronica AI router.

Thin HTTP handler for all Veronica AI endpoints. Delegates entirely to
VeronicaOrchestrator. Applies rate limiting to chat and generation endpoints.

Requirements: 7, 7.9–7.12, 38.11
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.core.dependencies import get_veronica_orchestrator
from backend.core.exceptions import AppError
from backend.core.rate_limit import rate_limit
from backend.orchestration.veronica_orchestrator import VeronicaOrchestrator

logger = logging.getLogger(__name__)

veronica_router = APIRouter(prefix="/api", tags=["veronica"])


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class VeronicaAIChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class VeronicaProjectFileUpdateRequest(BaseModel):
    path: str
    content: str


class VeronicaMemoryUpdateRequest(BaseModel):
    memory: Dict[str, Any]


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _http_from_app_error(exc: AppError) -> HTTPException:
    return HTTPException(status_code=exc.to_http_status(), detail=exc.to_response_dict())


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@veronica_router.post(
    "/veronica-ai/chat",
    dependencies=[rate_limit("veronica_ai")],
)
async def veronica_chat(
    body: VeronicaAIChatRequest,
    orchestrator: VeronicaOrchestrator = Depends(get_veronica_orchestrator),
) -> Dict[str, Any]:
    """Veronica AI chat endpoint.

    Requirements: 7, 7.9
    """
    try:
        return await orchestrator.chat(
            message=body.message,
            session_id=body.session_id,
            context=body.context,
        )
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("Unexpected error in veronica_chat")
        raise HTTPException(status_code=500, detail={"error": "InternalServerError", "message": "Chat failed"})


@veronica_router.post(
    "/veronica-projects/generate",
    dependencies=[rate_limit("veronica_ai")],
)
async def veronica_generate_project(
    request: Request,
    orchestrator: VeronicaOrchestrator = Depends(get_veronica_orchestrator),
) -> Dict[str, Any]:
    """Generate a Veronica project.

    Requirements: 7, 7.10
    """
    try:
        body = await request.json()
        return await orchestrator.generate_project(body)
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("Unexpected error in veronica_generate_project")
        raise HTTPException(status_code=500, detail={"error": "InternalServerError", "message": "Generation failed"})


@veronica_router.post(
    "/veronica-projects/generate/agent-stream",
    dependencies=[rate_limit("veronica_ai")],
)
async def veronica_generate_project_stream(
    request: Request,
    orchestrator: VeronicaOrchestrator = Depends(get_veronica_orchestrator),
) -> StreamingResponse:
    """Stream Veronica project generation.

    Requirements: 7, 7.11
    """
    try:
        body = await request.json()

        async def stream_gen():
            async for chunk in orchestrator.generate_project_stream(body):
                yield f"data: {chunk}\n\n"

        return StreamingResponse(stream_gen(), media_type="text/event-stream")
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("Unexpected error in veronica_generate_project_stream")
        raise HTTPException(status_code=500, detail={"error": "InternalServerError", "message": "Streaming failed"})


@veronica_router.get("/veronica-projects/{project_id}/download/zip")
async def download_project_zip(
    project_id: str,
    orchestrator: VeronicaOrchestrator = Depends(get_veronica_orchestrator),
):
    """Download Veronica project as ZIP archive.

    Requirements: 7, 7.12
    """
    from fastapi.responses import Response  # noqa: PLC0415

    try:
        zip_bytes = await orchestrator.download_project_zip(project_id)
        return Response(
            content=zip_bytes,
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{project_id}.zip"'},
        )
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("Unexpected error in download_project_zip")
        raise HTTPException(status_code=500, detail={"error": "InternalServerError", "message": "Download failed"})


@veronica_router.put("/veronica-projects/{project_id}/files")
async def update_project_file(
    project_id: str,
    body: VeronicaProjectFileUpdateRequest,
    orchestrator: VeronicaOrchestrator = Depends(get_veronica_orchestrator),
) -> Dict[str, Any]:
    """Update a file in a Veronica project.

    Requirements: 7
    """
    try:
        return await orchestrator.update_project_file(project_id, body.path, body.content)
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("Unexpected error in update_project_file")
        raise HTTPException(status_code=500, detail={"error": "InternalServerError", "message": "File update failed"})


@veronica_router.get("/veronica-projects/{project_id}/mentor")
async def get_mentor_suggestions(
    project_id: str,
    orchestrator: VeronicaOrchestrator = Depends(get_veronica_orchestrator),
) -> Dict[str, Any]:
    """Get AI mentor suggestions for a project.

    Requirements: 7
    """
    try:
        return await orchestrator.get_mentor_suggestions(project_id)
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("Unexpected error in get_mentor_suggestions")
        raise HTTPException(status_code=500, detail={"error": "InternalServerError", "message": "Mentor unavailable"})


@veronica_router.get("/veronica/memory/{user_id}")
async def get_user_memory(
    user_id: str,
    orchestrator: VeronicaOrchestrator = Depends(get_veronica_orchestrator),
) -> Dict[str, Any]:
    """Get Veronica's memory for a user.

    Requirements: 7
    """
    try:
        return await orchestrator.get_user_memory(user_id)
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("Unexpected error in get_user_memory")
        raise HTTPException(status_code=500, detail={"error": "InternalServerError", "message": "Memory retrieval failed"})


@veronica_router.post("/veronica/memory/{user_id}")
async def update_user_memory(
    user_id: str,
    body: VeronicaMemoryUpdateRequest,
    orchestrator: VeronicaOrchestrator = Depends(get_veronica_orchestrator),
) -> Dict[str, Any]:
    """Update Veronica's memory for a user.

    Requirements: 7
    """
    try:
        return await orchestrator.update_user_memory(user_id, body.memory)
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("Unexpected error in update_user_memory")
        raise HTTPException(status_code=500, detail={"error": "InternalServerError", "message": "Memory update failed"})
