"""
Universal chat router.

Handles chat endpoints that don't belong to Veronica specifically.
Delegates to UniversalChatService.

Requirements: 12, 12.5, 12.6, 12.7, 12.8
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.core.exceptions import AppError
from backend.core.rate_limit import rate_limit

logger = logging.getLogger(__name__)

chat_router = APIRouter(prefix="/api", tags=["chat"])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    session_id: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 2048
    stream: Optional[bool] = False


def get_chat_service():
    from backend.services.universal_chat_service import UniversalChatService  # noqa: PLC0415
    return UniversalChatService()


def _http_from_app_error(exc: AppError) -> HTTPException:
    return HTTPException(status_code=exc.to_http_status(), detail=exc.to_response_dict())


@chat_router.post(
    "/chat",
    dependencies=[rate_limit("veronica_ai")],
)
async def chat(
    body: ChatRequest,
    service=Depends(get_chat_service),
) -> Dict[str, Any]:
    """Universal chat endpoint.

    Requirements: 12, 12.5
    """
    try:
        msgs = [m.model_dump() for m in body.messages]
        if body.stream:
            async def gen():
                async for chunk in service.chat_stream(
                    messages=msgs,
                    session_id=body.session_id,
                    model=body.model,
                    temperature=body.temperature,
                    max_tokens=body.max_tokens,
                ):
                    yield f"data: {chunk}\n\n"
            return StreamingResponse(gen(), media_type="text/event-stream")

        return await service.chat(
            messages=msgs,
            session_id=body.session_id,
            model=body.model,
            temperature=body.temperature,
            max_tokens=body.max_tokens,
        )
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("Chat failed")
        raise HTTPException(status_code=500, detail={"error": "InternalServerError", "message": "Chat service unavailable"})


@chat_router.get("/chat/{session_id}/history")
async def get_chat_history(
    session_id: str,
    service=Depends(get_chat_service),
) -> Dict[str, Any]:
    """Get chat session message history.

    Requirements: 12, 12.6
    """
    try:
        return await service.get_history(session_id)
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("History retrieval failed")
        raise HTTPException(status_code=500, detail={"error": "InternalServerError", "message": "History unavailable"})


@chat_router.delete("/chat/{session_id}")
async def clear_chat_session(
    session_id: str,
    service=Depends(get_chat_service),
) -> Dict[str, Any]:
    """Clear a chat session.

    Requirements: 12, 12.7
    """
    try:
        await service.clear_session(session_id)
        return {"status": "cleared", "session_id": session_id}
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("Session clear failed")
        raise HTTPException(status_code=500, detail={"error": "InternalServerError", "message": "Session clear failed"})
