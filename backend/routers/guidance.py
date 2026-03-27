"""
AI guidance router.

Thin HTTP handler for AI guidance endpoints. Delegates to the existing
ai_guidance_service module without re-implementing its logic.

Requirements: 11, 11.5, 11.6, 11.7, 11.8
"""

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.core.exceptions import AppError
from backend.core.rate_limit import rate_limit

logger = logging.getLogger(__name__)

guidance_router = APIRouter(prefix="/api", tags=["guidance"])


class GuidanceQuestionRequest(BaseModel):
    project_id: str
    question: str
    context: Optional[Dict[str, Any]] = None


class GuidanceHintRequest(BaseModel):
    project_id: str
    step: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


def get_guidance_service():
    """Dependency: existing ai_guidance_service singleton."""
    from backend.services.ai_guidance_service import AIGuidanceService  # noqa: PLC0415
    return AIGuidanceService()


def _http_from_app_error(exc: AppError) -> HTTPException:
    return HTTPException(status_code=exc.to_http_status(), detail=exc.to_response_dict())


@guidance_router.post(
    "/guidance/question",
    dependencies=[rate_limit("veronica_ai")],
)
async def ask_guidance_question(
    body: GuidanceQuestionRequest,
    service=Depends(get_guidance_service),
) -> Dict[str, Any]:
    """Ask an AI guidance question about a project.

    Requirements: 11, 11.5
    """
    try:
        result = await service.answer_question(
            project_id=body.project_id,
            question=body.question,
            context=body.context or {},
        )
        return result
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("Guidance question failed")
        raise HTTPException(status_code=500, detail={"error": "InternalServerError", "message": "Guidance service unavailable"})


@guidance_router.post(
    "/guidance/question/stream",
    dependencies=[rate_limit("veronica_ai")],
)
async def ask_guidance_question_stream(
    body: GuidanceQuestionRequest,
    service=Depends(get_guidance_service),
) -> StreamingResponse:
    """Stream an AI guidance answer.

    Requirements: 11, 11.6
    """
    try:
        async def gen():
            async for chunk in service.answer_question_stream(
                project_id=body.project_id,
                question=body.question,
                context=body.context or {},
            ):
                yield f"data: {chunk}\n\n"

        return StreamingResponse(gen(), media_type="text/event-stream")
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("Guidance stream failed")
        raise HTTPException(status_code=500, detail={"error": "InternalServerError", "message": "Guidance streaming unavailable"})


@guidance_router.post(
    "/guidance/hint",
    dependencies=[rate_limit("veronica_ai")],
)
async def get_hint(
    body: GuidanceHintRequest,
    service=Depends(get_guidance_service),
) -> Dict[str, Any]:
    """Get a hint for the current project step.

    Requirements: 11, 11.7
    """
    try:
        return await service.get_hint(project_id=body.project_id, step=body.step, context=body.context or {})
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("Hint generation failed")
        raise HTTPException(status_code=500, detail={"error": "InternalServerError", "message": "Hint service unavailable"})


@guidance_router.get("/guidance/{project_id}/session")
async def get_guidance_session(
    project_id: str,
    service=Depends(get_guidance_service),
) -> Dict[str, Any]:
    """Get the guidance session context for a project.

    Requirements: 11, 11.8
    """
    try:
        return await service.get_session(project_id=project_id)
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("Session retrieval failed")
        raise HTTPException(status_code=500, detail={"error": "InternalServerError", "message": "Session unavailable"})
