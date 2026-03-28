"""
Sandbox execution router.

Thin HTTP handler for code execution endpoints. Delegates to SandboxService.
Applies rate limiting to execution endpoints.

Requirements: 8, 8.7, 8.8, 37.3, 37.4
"""

import logging
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from backend.core.exceptions import AppError
from backend.core.rate_limit import rate_limit
from backend.services.sandbox_service import SandboxService

logger = logging.getLogger(__name__)

sandbox_router = APIRouter(prefix="/api", tags=["sandbox"])


def get_sandbox_service() -> SandboxService:
    """Dependency provider for SandboxService."""
    return SandboxService()


def _http_from_app_error(exc: AppError) -> HTTPException:
    return HTTPException(status_code=exc.to_http_status(), detail=exc.to_response_dict())


@sandbox_router.post(
    "/veronica-projects/{project_id}/run",
    dependencies=[rate_limit("sandbox_execution")],
)
async def run_project(
    project_id: str,
    service: SandboxService = Depends(get_sandbox_service),
) -> Dict[str, Any]:
    """Start a sandbox run for a Veronica project.

    Uploads all generated files to E2B, runs npm install + npm run dev,
    and returns a live public preview URL.

    Requirements: 8, 8.7
    """
    try:
        return await service.run_project(project_id)
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("Unexpected error in run_project")
        raise HTTPException(
            status_code=500,
            detail={"error": "InternalServerError", "message": "Execution failed"},
        )


@sandbox_router.post(
    "/veronica-projects/{project_id}/stop",
    dependencies=[rate_limit("sandbox_execution")],
)
async def stop_project(
    project_id: str,
    request: Request,
    service: SandboxService = Depends(get_sandbox_service),
) -> Dict[str, Any]:
    """Stop a running sandbox."""
    try:
        body = await request.json()
        run_id = body.get("run_id", "")
        return await service.stop_project(project_id, run_id)
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("Unexpected error in stop_project")
        raise HTTPException(
            status_code=500,
            detail={"error": "InternalServerError", "message": "Stop failed"},
        )


@sandbox_router.get("/veronica-projects/{project_id}/runs/{run_id}/logs")
async def get_logs(
    project_id: str,
    run_id: str,
    service: SandboxService = Depends(get_sandbox_service),
) -> Dict[str, Any]:
    """Get logs for a sandbox run."""
    try:
        return await service.get_logs(project_id, run_id)
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("Unexpected error in get_logs")
        raise HTTPException(
            status_code=500,
            detail={"error": "InternalServerError", "message": "Log retrieval failed"},
        )


@sandbox_router.get("/veronica-projects/{project_id}/runs/{run_id}/logs/stream")
async def stream_logs(
    project_id: str,
    run_id: str,
) -> StreamingResponse:
    """Stream live logs from a running E2B sandbox as Server-Sent Events.

    Each SSE event: data: <log line>\n\n

    Requirements: 8, 37.3
    """
    from backend.services.e2b_runner import get_e2b_runner  # noqa: PLC0415

    runner = get_e2b_runner()

    async def generate():
        yield f"data: Connecting to sandbox {run_id[:8]}...\n\n"
        try:
            async for chunk in runner.stream_logs(run_id):
                yield chunk
        except Exception as exc:
            yield f"data: Stream error: {exc}\n\n"
        finally:
            yield "data: [STREAM_END]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@sandbox_router.post(
    "/veronica-projects/{project_id}/runs/{run_id}/self-fix",
    dependencies=[rate_limit("sandbox_execution")],
)
async def self_fix(
    project_id: str,
    run_id: str,
    request: Request,
    service: SandboxService = Depends(get_sandbox_service),
) -> Dict[str, Any]:
    """Attempt automatic error fix for a failed run."""
    try:
        body = await request.json()
        error_log = body.get("error_log", "")
        return await service.self_fix(project_id, run_id, error_log)
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("Unexpected error in self_fix")
        raise HTTPException(
            status_code=500,
            detail={"error": "InternalServerError", "message": "Self-fix failed"},
        )
