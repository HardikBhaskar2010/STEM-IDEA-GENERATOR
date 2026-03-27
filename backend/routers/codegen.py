"""
Code generation router.

Handles code generation endpoints. Delegates to UniversalChatService
for AI-powered code synthesis.

Requirements: 13, 13.5, 13.6, 13.7
"""

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.core.exceptions import AppError
from backend.core.rate_limit import rate_limit

logger = logging.getLogger(__name__)

codegen_router = APIRouter(prefix="/api", tags=["codegen"])


class CodeGenRequest(BaseModel):
    prompt: str
    language: Optional[str] = "python"
    context: Optional[str] = None
    model: Optional[str] = None


class CodeExplainRequest(BaseModel):
    code: str
    language: Optional[str] = "python"


def get_chat_service():
    from backend.services.universal_chat_service import UniversalChatService  # noqa: PLC0415
    return UniversalChatService()


def _http_from_app_error(exc: AppError) -> HTTPException:
    return HTTPException(status_code=exc.to_http_status(), detail=exc.to_response_dict())


def _build_codegen_messages(req: CodeGenRequest):
    system_content = (
        f"You are an expert {req.language} programmer. "
        "Generate clean, well-commented code based on the user's request. "
        "Return ONLY the code block, no extra explanation."
    )
    user_content = req.prompt
    if req.context:
        user_content = f"Context:\n{req.context}\n\nRequest:\n{req.prompt}"
    return [
        {"role": "system", "content": system_content},
        {"role": "user", "content": user_content},
    ]


@codegen_router.post(
    "/generate_code",
    dependencies=[rate_limit("veronica_ai")],
)
async def generate_code(
    body: CodeGenRequest,
    service=Depends(get_chat_service),
) -> Dict[str, Any]:
    """Generate code from a natural-language prompt.

    Requirements: 13, 13.5
    """
    try:
        messages = _build_codegen_messages(body)
        result = await service.chat(messages=messages, model=body.model)
        return {"code": result.get("text", result) if isinstance(result, dict) else result, "language": body.language}
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("Code generation failed")
        raise HTTPException(status_code=500, detail={"error": "InternalServerError", "message": "Code generation unavailable"})


@codegen_router.post(
    "/generate_code/stream",
    dependencies=[rate_limit("veronica_ai")],
)
async def generate_code_stream(
    body: CodeGenRequest,
    service=Depends(get_chat_service),
) -> StreamingResponse:
    """Stream code generation token-by-token.

    Requirements: 13, 13.6
    """
    try:
        messages = _build_codegen_messages(body)

        async def gen():
            async for chunk in service.chat_stream(messages=messages, model=body.model):
                yield f"data: {chunk}\n\n"

        return StreamingResponse(gen(), media_type="text/event-stream")
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("Code generation stream failed")
        raise HTTPException(status_code=500, detail={"error": "InternalServerError", "message": "Streaming unavailable"})


@codegen_router.post(
    "/explain_code",
    dependencies=[rate_limit("veronica_ai")],
)
async def explain_code(
    body: CodeExplainRequest,
    service=Depends(get_chat_service),
) -> Dict[str, Any]:
    """Explain existing code in plain language.

    Requirements: 13, 13.7
    """
    try:
        messages = [
            {
                "role": "system",
                "content": (
                    f"You are an expert {body.language} programmer and educator. "
                    "Explain the provided code clearly and concisely."
                ),
            },
            {"role": "user", "content": f"Explain this code:\n\n```{body.language}\n{body.code}\n```"},
        ]
        result = await service.chat(messages=messages)
        return {"explanation": result.get("text", result) if isinstance(result, dict) else result}
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("Code explanation failed")
        raise HTTPException(status_code=500, detail={"error": "InternalServerError", "message": "Explanation unavailable"})
