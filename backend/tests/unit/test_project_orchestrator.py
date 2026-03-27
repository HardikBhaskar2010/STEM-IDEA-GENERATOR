"""
Unit tests for ProjectOrchestrator.

Tests:
  - generate_project: success path with valid AI response
  - generate_project: fallback to local generator on AI failure
  - generate_project: validation errors for missing required fields
  - generate_project_stream: yields chunks from AI
  - sync_project: returns correct status dict
  - get_component_details: success and validation error

Requirements: 15, 15.8, 15.9, 15.11, 27
"""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from backend.core.exceptions import ValidationError
from backend.orchestration.project_orchestrator import ProjectOrchestrator


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_client():
    client = MagicMock()
    client.chat_completion = AsyncMock(return_value=json.dumps({
        "title": "Line-Following Robot",
        "description": "Build a robot using Arduino IR sensors.",
        "difficulty": "Intermediate",
        "estimatedTime": "4-6 hours",
        "estimatedCost": "$20 - $40",
        "components": ["Arduino", "IR sensors", "Motors"],
        "skills": ["Electronics", "Programming"],
        "steps": ["Step 1: Assemble", "Step 2: Wire", "Step 3: Code"],
    }))

    async def streaming(*args, **kwargs):
        for chunk in ["Line-", "Following ", "Robot"]:
            yield chunk

    client.chat_completion_stream = streaming
    return client


@pytest.fixture
def orchestrator(mock_client):
    return ProjectOrchestrator(openrouter_client=mock_client)


# ---------------------------------------------------------------------------
# generate_project
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_generate_project_success(orchestrator, mock_client):
    """Valid params → returns project dict with expected keys."""
    params = {"projectType": "robotics", "skillLevel": "intermediate"}
    result = await orchestrator.generate_project(params)

    assert result["title"] == "Line-Following Robot"
    assert "components" in result
    assert "steps" in result
    mock_client.chat_completion.assert_called_once()


@pytest.mark.asyncio
async def test_generate_project_falls_back_on_ai_error(orchestrator, mock_client):
    """When AI throws, falls back to local generator without raising."""
    mock_client.chat_completion = AsyncMock(side_effect=Exception("Network unreachable"))

    params = {"projectType": "robotics", "skillLevel": "beginner"}
    result = await orchestrator.generate_project(params)

    # Fallback always returns a dict with these keys
    assert "title" in result
    assert "steps" in result
    assert result.get("fallback") is True


@pytest.mark.asyncio
async def test_generate_project_falls_back_on_invalid_json(orchestrator, mock_client):
    """When AI returns non-JSON, falls back to local generator."""
    mock_client.chat_completion = AsyncMock(return_value="I cannot help with that.")

    params = {"projectType": "electronics", "skillLevel": "advanced"}
    result = await orchestrator.generate_project(params)

    assert "title" in result
    assert result.get("fallback") is True


@pytest.mark.asyncio
async def test_generate_project_missing_project_type(orchestrator):
    """Missing projectType → ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        await orchestrator.generate_project({"skillLevel": "beginner"})
    assert "projectType" in exc_info.value.message.lower() or "projectType" in str(exc_info.value.details)


@pytest.mark.asyncio
async def test_generate_project_missing_skill_level(orchestrator):
    """Missing skillLevel → ValidationError."""
    with pytest.raises(ValidationError):
        await orchestrator.generate_project({"projectType": "robotics"})


@pytest.mark.asyncio
async def test_generate_project_empty_strings(orchestrator):
    """Empty string for projectType → ValidationError."""
    with pytest.raises(ValidationError):
        await orchestrator.generate_project({"projectType": "", "skillLevel": "beginner"})


# ---------------------------------------------------------------------------
# generate_project_stream
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_generate_project_stream_yields_chunks(orchestrator):
    """Valid params → yields text chunks from AI."""
    params = {"projectType": "robotics", "skillLevel": "intermediate"}
    chunks = []
    async for chunk in orchestrator.generate_project_stream(params):
        chunks.append(chunk)

    assert len(chunks) == 3
    assert "".join(chunks) == "Line-Following Robot"


@pytest.mark.asyncio
async def test_generate_project_stream_fallback_on_error(mock_client):
    """AI stream failure → yields JSON of fallback project."""
    async def failing_stream(*args, **kwargs):
        raise Exception("Stream broken")
        yield  # Make generator

    mock_client.chat_completion_stream = failing_stream
    orch = ProjectOrchestrator(openrouter_client=mock_client)

    params = {"projectType": "robotics", "skillLevel": "beginner"}
    chunks = []
    async for chunk in orch.generate_project_stream(params):
        chunks.append(chunk)

    full = "".join(chunks)
    assert len(full) > 0  # At least the fallback JSON was yielded


# ---------------------------------------------------------------------------
# sync_project
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_sync_project_returns_status(orchestrator):
    """Sync returns dict with status: synced."""
    result = await orchestrator.sync_project({"id": "proj-123", "title": "My Project"})
    assert result["status"] == "synced"
    assert result["project_id"] == "proj-123"


@pytest.mark.asyncio
async def test_sync_project_alternate_id_key(orchestrator):
    """Sync handles project_id key as well as id."""
    result = await orchestrator.sync_project({"project_id": "abc", "title": "X"})
    assert result["project_id"] == "abc"


# ---------------------------------------------------------------------------
# get_component_details
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_component_details_success(orchestrator):
    """Valid component_id → returns details dict."""
    result = await orchestrator.get_component_details("arduino-uno")
    assert result["component_id"] == "arduino-uno"
    assert "details" in result


@pytest.mark.asyncio
async def test_get_component_details_empty_id(orchestrator):
    """Empty component_id → ValidationError."""
    with pytest.raises(ValidationError):
        await orchestrator.get_component_details("")


@pytest.mark.asyncio
async def test_get_component_details_whitespace_id(orchestrator):
    """Whitespace component_id → ValidationError."""
    with pytest.raises(ValidationError):
        await orchestrator.get_component_details("   ")


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def test_build_prompt_includes_all_params(orchestrator):
    """Prompt string contains projectType and skillLevel."""
    params = {
        "projectType": "robotics",
        "skillLevel": "advanced",
        "interests": "AI",
        "budget": "$100",
        "duration": "2 weeks",
    }
    prompt = orchestrator._build_prompt(params)
    assert "robotics" in prompt
    assert "advanced" in prompt
    assert "AI" in prompt


def test_normalise_project_fills_missing_keys():
    """_normalise_project adds defaults for missing keys."""
    orch = ProjectOrchestrator(openrouter_client=MagicMock())
    result = orch._normalise_project({}, {"projectType": "science", "skillLevel": "beginner"})
    assert result["title"]
    assert isinstance(result["components"], list)
    assert isinstance(result["steps"], list)
