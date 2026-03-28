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

# Universal Chat History Management Models
class UniversalChatMessage(BaseModel):
    user_id: str
    session_id: str
    role: str
    content: str
    message_type: str = "text"
    voice_transcript: Optional[str] = None
    voice_duration: Optional[float] = None
    voice_confidence: Optional[float] = None
    action_type: Optional[str] = None
    action_parameters: Optional[Dict[str, Any]] = None
    response_metadata: Optional[Dict[str, Any]] = None
    conversation_context: Optional[Dict[str, Any]] = None

class UniversalChatResponse(BaseModel):
    id: str
    user_id: str
    session_id: str
    role: str
    content: str
    message_type: str = "text"
    created_at: str
    action_type: Optional[str] = None
    action_parameters: Optional[Dict[str, Any]] = None

@chat_router.post("/universal-chat/save-message", response_model=UniversalChatResponse)
async def save_universal_chat_message(
    message: UniversalChatMessage,
    service=Depends(get_chat_service),
):
    try:
        result = await service.save_message(
            user_id=message.user_id,
            session_id=message.session_id,
            role=message.role,
            content=message.content,
            message_type=message.message_type,
            voice_transcript=message.voice_transcript,
            voice_duration=message.voice_duration,
            voice_confidence=message.voice_confidence,
            action_type=message.action_type,
            action_parameters=message.action_parameters,
            response_metadata=message.response_metadata,
            conversation_context=message.conversation_context
        )
        return UniversalChatResponse(**result)
    except Exception as e:
        logger.error(f"Error saving universal chat message: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@chat_router.get("/universal-chat/sessions/{user_id}")
async def get_user_chat_sessions(
    user_id: str, 
    limit: int = 20, 
    offset: int = 0,
    service=Depends(get_chat_service),
):
    try:
        sessions = await service.get_user_sessions(user_id=user_id, limit=limit, offset=offset)
        return {"sessions": sessions, "total": len(sessions)}
    except Exception as e:
        logger.error(f"Error getting user chat sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@chat_router.get("/universal-chat/messages/{user_id}/{session_id}")
async def get_session_messages(
    user_id: str, 
    session_id: str, 
    limit: int = 50, 
    offset: int = 0,
    service=Depends(get_chat_service),
):
    try:
        messages = await service.get_session_messages(user_id=user_id, session_id=session_id, limit=limit, offset=offset)
        return {"messages": messages, "total": len(messages)}
    except Exception as e:
        logger.error(f"Error getting session messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))
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
