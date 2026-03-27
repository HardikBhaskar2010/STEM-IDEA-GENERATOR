"""
Sandbox execution router.

Thin HTTP handler for code execution endpoints. Delegates to SandboxService.
Applies rate limiting to execution endpoints.

Requirements: 8, 8.7, 8.8, 37.3, 37.4
"""

import logging
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Request, WebSocket
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

    Requirements: 8, 8.7
    """
    try:
        return await service.run_project(project_id)
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("Unexpected error in run_project")
        raise HTTPException(status_code=500, detail={"error": "InternalServerError", "message": "Execution failed"})


@sandbox_router.post(
    "/veronica-projects/{project_id}/stop",
    dependencies=[rate_limit("sandbox_execution")],
)
async def stop_project(
    project_id: str,
    request: Request,
    service: SandboxService = Depends(get_sandbox_service),
) -> Dict[str, Any]:
    """Stop a running sandbox.

    Requirements: 8
    """
    try:
        body = await request.json()
        run_id = body.get("run_id", "")
        return await service.stop_project(project_id, run_id)
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("Unexpected error in stop_project")
        raise HTTPException(status_code=500, detail={"error": "InternalServerError", "message": "Stop failed"})


@sandbox_router.get("/veronica-projects/{project_id}/runs/{run_id}/logs")
async def get_logs(
    project_id: str,
    run_id: str,
    service: SandboxService = Depends(get_sandbox_service),
) -> Dict[str, Any]:
    """Get logs for a sandbox run.

    Requirements: 8
    """
    try:
        return await service.get_logs(project_id, run_id)
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("Unexpected error in get_logs")
        raise HTTPException(status_code=500, detail={"error": "InternalServerError", "message": "Log retrieval failed"})


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
    """Attempt automatic error fix for a failed run.

    Requirements: 8
    """
    try:
        body = await request.json()
        error_log = body.get("error_log", "")
        return await service.self_fix(project_id, run_id, error_log)
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("Unexpected error in self_fix")
        raise HTTPException(status_code=500, detail={"error": "InternalServerError", "message": "Self-fix failed"})


@sandbox_router.get("/veronica-preview/{run_id}/{path:path}")
async def preview_proxy(
    run_id: str,
    path: str,
    request: Request,
    service: SandboxService = Depends(get_sandbox_service),
):
    """Proxy preview requests to the sandbox container.

    Requirements: 37.3
    """
    import httpx  # noqa: PLC0415

    try:
        from backend.services.sandbox_manager import get_sandbox_manager  # noqa: PLC0415
        manager = get_sandbox_manager()
        run = manager.get_run(run_id)
        if run.host_port is None:
            return {"error": "Preview not available"}
        target_url = f"http://localhost:{run.host_port}/{path}"
        async with httpx.AsyncClient() as client:
            resp = await client.get(target_url, params=dict(request.query_params))
        from fastapi.responses import Response  # noqa: PLC0415
        return Response(
            content=resp.content,
            status_code=resp.status_code,
            media_type=resp.headers.get("content-type", "text/html"),
        )
    except KeyError:
        raise HTTPException(status_code=404, detail="Run not found")
    except Exception:
        logger.exception("Preview proxy error")
        raise HTTPException(status_code=502, detail="Preview unavailable")


@sandbox_router.websocket("/veronica-preview-ws/{run_id}")
async def preview_websocket(run_id: str, websocket: WebSocket):
    """WebSocket proxy for sandbox HMR preview.

    Requirements: 37.4
    """
    import websockets as ws_lib  # noqa: PLC0415

    await websocket.accept()
    try:
        from backend.services.sandbox_manager import get_sandbox_manager  # noqa: PLC0415
        manager = get_sandbox_manager()
        run = manager.get_run(run_id)
        if run.host_port is None:
            await websocket.close(code=1003)
            return
        ws_url = f"ws://localhost:{run.host_port}"
        async with ws_lib.connect(ws_url) as upstream:
            import asyncio  # noqa: PLC0415

            async def forward_to_client():
                async for msg in upstream:
                    await websocket.send_text(msg if isinstance(msg, str) else msg.decode())

            async def forward_to_upstream():
                async for msg in websocket.iter_text():
                    await upstream.send(msg)

            await asyncio.gather(forward_to_client(), forward_to_upstream())
    except Exception:
        logger.exception("WebSocket proxy error")
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
