"""
Unit tests for SandboxService.

Tests:
  - run_project: success returns run dict
  - run_project: ValidationError for empty project_id
  - run_project: UpstreamError when manager fails
  - stop_project: success returns updated status
  - stop_project: NotFoundError for unknown run_id
  - stop_project: ValidationError for empty run_id
  - get_logs: success returns log dict
  - get_logs: NotFoundError for unknown run_id
  - get_logs: ValidationError for empty args

Requirements: 17, 17.8, 17.9, 17.10
"""

import pytest
from unittest.mock import MagicMock, patch

from backend.core.exceptions import NotFoundError, UpstreamError, ValidationError
from backend.services.sandbox_service import SandboxService


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _make_run(run_id="run-1", status="running", preview_url="http://preview/run-1", project_id="proj-1"):
    run = MagicMock()
    run.run_id = run_id
    run.status = status
    run.preview_url = preview_url
    run.project_id = project_id
    return run


@pytest.fixture
def sandbox_service():
    svc = SandboxService()
    return svc


@pytest.fixture
def mock_manager():
    mgr = MagicMock()
    mgr.create_run = MagicMock(return_value=_make_run())
    mgr.get_run = MagicMock(return_value=_make_run())
    mgr.stop_run = MagicMock(return_value=_make_run(status="stopped"))
    mgr.get_logs = MagicMock(return_value="log line 1\nlog line 2")
    return mgr


# ---------------------------------------------------------------------------
# run_project
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_run_project_success(sandbox_service, mock_manager):
    sandbox_service._manager = mock_manager
    result = await sandbox_service.run_project("proj-1")
    assert result["run_id"] == "run-1"
    assert result["status"] == "running"
    assert "preview_url" in result


@pytest.mark.asyncio
async def test_run_project_empty_project_id(sandbox_service):
    with pytest.raises(ValidationError) as exc_info:
        await sandbox_service.run_project("")
    assert "project_id" in exc_info.value.message.lower()


@pytest.mark.asyncio
async def test_run_project_manager_failure(sandbox_service):
    mock_manager = MagicMock()
    mock_manager.create_run = MagicMock(side_effect=Exception("Docker not available"))
    sandbox_service._manager = mock_manager

    with pytest.raises(UpstreamError) as exc_info:
        await sandbox_service.run_project("proj-1")
    assert exc_info.value.upstream_status == 503


# ---------------------------------------------------------------------------
# stop_project
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_stop_project_success(sandbox_service, mock_manager):
    sandbox_service._manager = mock_manager
    result = await sandbox_service.stop_project("proj-1", "run-1")
    assert result["status"] == "stopped"


@pytest.mark.asyncio
async def test_stop_project_empty_run_id(sandbox_service):
    with pytest.raises(ValidationError) as exc_info:
        await sandbox_service.stop_project("proj-1", "")
    assert "run_id" in exc_info.value.message.lower()


@pytest.mark.asyncio
async def test_stop_project_not_found(sandbox_service):
    mock_mgr = MagicMock()
    mock_mgr.stop_run = MagicMock(side_effect=KeyError("not found"))
    sandbox_service._manager = mock_mgr

    with pytest.raises(NotFoundError) as exc_info:
        await sandbox_service.stop_project("proj-1", "unknown-run")
    assert "not found" in exc_info.value.message.lower()


@pytest.mark.asyncio
async def test_stop_project_unexpected_error(sandbox_service):
    mock_mgr = MagicMock()
    mock_mgr.stop_run = MagicMock(side_effect=Exception("Timeout"))
    sandbox_service._manager = mock_mgr

    with pytest.raises(UpstreamError):
        await sandbox_service.stop_project("proj-1", "run-1")


# ---------------------------------------------------------------------------
# get_logs
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_logs_success(sandbox_service, mock_manager):
    sandbox_service._manager = mock_manager
    result = await sandbox_service.get_logs("proj-1", "run-1")
    assert result["run_id"] == "run-1"
    assert "log line 1" in result["logs"]


@pytest.mark.asyncio
async def test_get_logs_empty_project_id(sandbox_service):
    with pytest.raises(ValidationError):
        await sandbox_service.get_logs("", "run-1")


@pytest.mark.asyncio
async def test_get_logs_empty_run_id(sandbox_service):
    with pytest.raises(ValidationError):
        await sandbox_service.get_logs("proj-1", "")


@pytest.mark.asyncio
async def test_get_logs_not_found(sandbox_service):
    mock_mgr = MagicMock()
    mock_mgr.get_logs = MagicMock(side_effect=KeyError("run not found"))
    sandbox_service._manager = mock_mgr

    with pytest.raises(NotFoundError):
        await sandbox_service.get_logs("proj-1", "ghost-run")


@pytest.mark.asyncio
async def test_get_logs_upstream_error(sandbox_service):
    mock_mgr = MagicMock()
    mock_mgr.get_logs = MagicMock(side_effect=ConnectionError("Container unreachable"))
    sandbox_service._manager = mock_mgr

    with pytest.raises(UpstreamError):
        await sandbox_service.get_logs("proj-1", "run-1")
