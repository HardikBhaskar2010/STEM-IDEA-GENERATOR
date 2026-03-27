"""
Unit tests for SnapshotService.

Tests:
  - create_snapshot: success returns snapshot dict
  - create_snapshot: ValidationError for empty project_id
  - create_snapshot: UpstreamError on versioning failure
  - list_snapshots: success returns list
  - list_snapshots: ValidationError for empty project_id
  - restore_snapshot: success returns restore result
  - restore_snapshot: ValidationError for empty args
  - restore_snapshot: NotFoundError when snapshot missing

Requirements: 19, 19.5, 19.6, 19.7
"""

import pytest
from unittest.mock import MagicMock

from backend.core.exceptions import NotFoundError, UpstreamError, ValidationError
from backend.services.snapshot_service import SnapshotService


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def snapshot_service():
    return SnapshotService()


@pytest.fixture
def mock_versioning():
    v = MagicMock()
    v.create_snapshot = MagicMock(return_value={
        "snapshot_id": "snap-001",
        "project_id": "proj-1",
        "label": "Before refactor",
        "created_at": "2026-03-28T00:00:00Z",
    })
    v.list_snapshots = MagicMock(return_value=[
        {"snapshot_id": "snap-001", "label": "Before refactor"},
        {"snapshot_id": "snap-002", "label": "After refactor"},
    ])
    v.restore_snapshot = MagicMock(return_value={
        "status": "restored",
        "snapshot_id": "snap-001",
        "project_id": "proj-1",
    })
    return v


# ---------------------------------------------------------------------------
# create_snapshot
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_snapshot_success(snapshot_service, mock_versioning):
    snapshot_service._versioning = mock_versioning
    result = await snapshot_service.create_snapshot("proj-1", label="Before refactor")
    assert result["snapshot_id"] == "snap-001"
    assert result["project_id"] == "proj-1"


@pytest.mark.asyncio
async def test_create_snapshot_empty_project_id(snapshot_service):
    with pytest.raises(ValidationError) as exc_info:
        await snapshot_service.create_snapshot("")
    assert "project_id" in exc_info.value.message.lower()


@pytest.mark.asyncio
async def test_create_snapshot_versioning_failure(snapshot_service):
    v = MagicMock()
    v.create_snapshot = MagicMock(side_effect=OSError("Disk full"))
    snapshot_service._versioning = v

    with pytest.raises(UpstreamError) as exc_info:
        await snapshot_service.create_snapshot("proj-1")
    assert exc_info.value.upstream_status == 500


# ---------------------------------------------------------------------------
# list_snapshots
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_snapshots_success(snapshot_service, mock_versioning):
    snapshot_service._versioning = mock_versioning
    result = await snapshot_service.list_snapshots("proj-1")
    assert len(result) == 2
    assert result[0]["snapshot_id"] == "snap-001"


@pytest.mark.asyncio
async def test_list_snapshots_empty_project_id(snapshot_service):
    with pytest.raises(ValidationError):
        await snapshot_service.list_snapshots("")


@pytest.mark.asyncio
async def test_list_snapshots_versioning_failure(snapshot_service):
    v = MagicMock()
    v.list_snapshots = MagicMock(side_effect=Exception("DB error"))
    snapshot_service._versioning = v

    with pytest.raises(UpstreamError):
        await snapshot_service.list_snapshots("proj-1")


# ---------------------------------------------------------------------------
# restore_snapshot
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_restore_snapshot_success(snapshot_service, mock_versioning):
    snapshot_service._versioning = mock_versioning
    result = await snapshot_service.restore_snapshot("proj-1", "snap-001")
    assert result["status"] == "restored"
    assert result["snapshot_id"] == "snap-001"


@pytest.mark.asyncio
async def test_restore_snapshot_empty_project_id(snapshot_service):
    with pytest.raises(ValidationError) as exc_info:
        await snapshot_service.restore_snapshot("", "snap-001")
    assert "project_id" in exc_info.value.message.lower()


@pytest.mark.asyncio
async def test_restore_snapshot_empty_snapshot_id(snapshot_service):
    with pytest.raises(ValidationError) as exc_info:
        await snapshot_service.restore_snapshot("proj-1", "")
    assert "snapshot_id" in exc_info.value.message.lower()


@pytest.mark.asyncio
async def test_restore_snapshot_not_found(snapshot_service):
    v = MagicMock()
    v.restore_snapshot = MagicMock(return_value=None)
    snapshot_service._versioning = v

    with pytest.raises(NotFoundError) as exc_info:
        await snapshot_service.restore_snapshot("proj-1", "ghost-snap")
    assert "not found" in exc_info.value.message.lower()


@pytest.mark.asyncio
async def test_restore_snapshot_versioning_failure(snapshot_service):
    v = MagicMock()
    v.restore_snapshot = MagicMock(side_effect=Exception("Restore failed"))
    snapshot_service._versioning = v

    with pytest.raises(UpstreamError):
        await snapshot_service.restore_snapshot("proj-1", "snap-001")
