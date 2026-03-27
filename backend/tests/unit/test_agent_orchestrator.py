"""
Unit tests for AgentWorkflowOrchestrator.

Tests:
  - start_agent_job: success creates job + returns job_id
  - start_agent_job: validation errors for empty inputs
  - start_agent_job: UpstreamError when agent service fails
  - get_agent_job: returns job dict
  - get_agent_job: NotFoundError when job is missing
  - create_devlab_job: returns job_id and status
  - get_devlab_job: delegates to get_agent_job

Requirements: 18, 18.7, 18.8, 18.9, 40
"""

import pytest
from unittest.mock import AsyncMock, MagicMock

from backend.core.exceptions import NotFoundError, UpstreamError, ValidationError
from backend.orchestration.agent_orchestrator import AgentWorkflowOrchestrator


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_client():
    return MagicMock()


@pytest.fixture
def orchestrator(mock_client):
    return AgentWorkflowOrchestrator(openrouter_client=mock_client)


def _make_mock_services(orchestrator, *, job_id="job-abc", job_data=None):
    """Inject mocked job_system and agent_service into orchestrator."""
    mock_job = MagicMock()
    mock_job.create_job = MagicMock(return_value=job_id)
    mock_job.get_job = MagicMock(return_value=job_data or {"job_id": job_id, "status": "pending"})
    orchestrator._job_system = mock_job

    mock_agent = MagicMock()
    mock_agent.start_job = AsyncMock()
    orchestrator._agent_svc = mock_agent

    return mock_job, mock_agent


# ---------------------------------------------------------------------------
# start_agent_job
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_start_agent_job_success(orchestrator):
    """Valid inputs → creates job and returns job_id + status."""
    mock_job, mock_agent = _make_mock_services(orchestrator, job_id="job-001")

    result = await orchestrator.start_agent_job(
        project_id="proj-1",
        task="Generate an authentication module",
        user_id="user-42",
    )

    assert result["job_id"] == "job-001"
    assert result["status"] == "pending"
    assert result["project_id"] == "proj-1"
    mock_job.create_job.assert_called_once()
    mock_agent.start_job.assert_called_once()


@pytest.mark.asyncio
async def test_start_agent_job_empty_project_id(orchestrator):
    """Empty project_id → ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        await orchestrator.start_agent_job(project_id="", task="Do something")
    assert "project_id" in exc_info.value.message.lower()


@pytest.mark.asyncio
async def test_start_agent_job_empty_task(orchestrator):
    """Empty task → ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        await orchestrator.start_agent_job(project_id="proj-1", task="")
    assert "task" in exc_info.value.message.lower()


@pytest.mark.asyncio
async def test_start_agent_job_service_failure(orchestrator):
    """Job system failure → UpstreamError."""
    mock_job = MagicMock()
    mock_job.create_job = MagicMock(side_effect=Exception("DB unreachable"))
    orchestrator._job_system = mock_job

    with pytest.raises(UpstreamError) as exc_info:
        await orchestrator.start_agent_job(project_id="proj-1", task="Run tests")
    assert exc_info.value.upstream_status == 503


@pytest.mark.asyncio
async def test_start_agent_job_agent_failure_raises_upstream(orchestrator):
    """Agent start failure → UpstreamError."""
    mock_job = MagicMock()
    mock_job.create_job = MagicMock(return_value="job-x")
    orchestrator._job_system = mock_job

    mock_agent = MagicMock()
    mock_agent.start_job = AsyncMock(side_effect=Exception("Agent crashed"))
    orchestrator._agent_svc = mock_agent

    with pytest.raises(UpstreamError):
        await orchestrator.start_agent_job(project_id="proj-1", task="Build feature")


# ---------------------------------------------------------------------------
# get_agent_job
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_agent_job_success(orchestrator):
    """Valid job_id → returns job dict."""
    _make_mock_services(orchestrator, job_id="job-001", job_data={"job_id": "job-001", "status": "running"})

    result = await orchestrator.get_agent_job("job-001")
    assert result["job_id"] == "job-001"
    assert result["status"] == "running"


@pytest.mark.asyncio
async def test_get_agent_job_not_found(orchestrator):
    """Unknown job_id → NotFoundError."""
    mock_job = MagicMock()
    mock_job.get_job = MagicMock(return_value=None)
    orchestrator._job_system = mock_job

    with pytest.raises(NotFoundError) as exc_info:
        await orchestrator.get_agent_job("nonexistent-job")
    assert "not found" in exc_info.value.message.lower()


@pytest.mark.asyncio
async def test_get_agent_job_empty_id(orchestrator):
    """Empty job_id → ValidationError."""
    with pytest.raises(ValidationError):
        await orchestrator.get_agent_job("")


@pytest.mark.asyncio
async def test_get_agent_job_service_error(orchestrator):
    """Job system crashes → UpstreamError."""
    mock_job = MagicMock()
    mock_job.get_job = MagicMock(side_effect=Exception("DB down"))
    orchestrator._job_system = mock_job

    with pytest.raises(UpstreamError):
        await orchestrator.get_agent_job("job-001")


# ---------------------------------------------------------------------------
# create_devlab_job / get_devlab_job
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_devlab_job_success(orchestrator):
    """DevLab job creation returns job_id and status."""
    mock_job = MagicMock()
    mock_job.create_job = MagicMock(return_value="devlab-job-1")
    orchestrator._job_system = mock_job

    result = await orchestrator.create_devlab_job({
        "task": "Run build",
        "project_id": "devlab-proj",
        "user_id": "user-1",
    })

    assert result["job_id"] == "devlab-job-1"
    assert result["status"] == "pending"


@pytest.mark.asyncio
async def test_create_devlab_job_service_failure(orchestrator):
    """DevLab creation failure → UpstreamError."""
    mock_job = MagicMock()
    mock_job.create_job = MagicMock(side_effect=Exception("Failure"))
    orchestrator._job_system = mock_job

    with pytest.raises(UpstreamError):
        await orchestrator.create_devlab_job({"task": "build"})


@pytest.mark.asyncio
async def test_get_devlab_job_delegates_to_agent(orchestrator):
    """get_devlab_job delegates to get_agent_job."""
    _make_mock_services(orchestrator, job_id="dl-1", job_data={"job_id": "dl-1", "status": "done"})

    result = await orchestrator.get_devlab_job("dl-1")
    assert result["job_id"] == "dl-1"
