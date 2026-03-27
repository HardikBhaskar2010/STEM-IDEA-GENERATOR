"""
Snapshots router.

Thin HTTP handler for project snapshot endpoints. Delegates to SnapshotService.

Requirements: 10, 10.4, 10.5, 10.6, 10.7
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.core.exceptions import AppError
from backend.services.snapshot_service import SnapshotService

logger = logging.getLogger(__name__)

snapshots_router = APIRouter(prefix="/api", tags=["snapshots"])


class SnapshotCreateRequest(BaseModel):
    label: Optional[str] = ""


def get_snapshot_service() -> SnapshotService:
    """Dependency provider for SnapshotService."""
    return SnapshotService()


def _http_from_app_error(exc: AppError) -> HTTPException:
    return HTTPException(status_code=exc.to_http_status(), detail=exc.to_response_dict())


@snapshots_router.post("/veronica-projects/{project_id}/snapshots")
async def create_snapshot(
    project_id: str,
    body: SnapshotCreateRequest,
    service: SnapshotService = Depends(get_snapshot_service),
) -> Dict[str, Any]:
    """Create a project snapshot.

    Requirements: 10, 10.4
    """
    try:
        return await service.create_snapshot(project_id, label=body.label or "")
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("Unexpected error creating snapshot")
        raise HTTPException(status_code=500, detail={"error": "InternalServerError", "message": "Snapshot creation failed"})


@snapshots_router.get("/veronica-projects/{project_id}/snapshots")
async def list_snapshots(
    project_id: str,
    service: SnapshotService = Depends(get_snapshot_service),
) -> List[Dict[str, Any]]:
    """List all snapshots for a project.

    Requirements: 10, 10.5
    """
    try:
        return await service.list_snapshots(project_id)
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("Unexpected error listing snapshots")
        raise HTTPException(status_code=500, detail={"error": "InternalServerError", "message": "Snapshot listing failed"})


@snapshots_router.post("/veronica-projects/{project_id}/snapshots/{snapshot_id}/restore")
async def restore_snapshot(
    project_id: str,
    snapshot_id: str,
    service: SnapshotService = Depends(get_snapshot_service),
) -> Dict[str, Any]:
    """Restore a project to a snapshot.

    Requirements: 10, 10.6
    """
    try:
        return await service.restore_snapshot(project_id, snapshot_id)
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("Unexpected error restoring snapshot")
        raise HTTPException(status_code=500, detail={"error": "InternalServerError", "message": "Snapshot restoration failed"})
