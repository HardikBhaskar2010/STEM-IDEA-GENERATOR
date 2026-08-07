import logging
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from backend.core.log_stream import global_log_streamer
from backend.core.dependencies import require_admin

logger = logging.getLogger(__name__)

# Base route that maps securely to the config inside auth_middleware 
# (ROLE_PROTECTED_PATHS forces /api/admin to require 'admin' role)
system_router = APIRouter(
    prefix="/api/admin/system", 
    tags=["system_admin"],
    dependencies=[Depends(require_admin)]
)


@system_router.get("/logs/stream")
async def stream_backend_logs():
    """
    Server-Sent Events endpoint that broadcasts raw python and uvicorn logs in real-time.
    Access restricted to Admin tokens by the global AuthMiddleware.
    """
    return StreamingResponse(
        global_log_streamer.stream_logs(),
        media_type="text/event-stream"
    )
