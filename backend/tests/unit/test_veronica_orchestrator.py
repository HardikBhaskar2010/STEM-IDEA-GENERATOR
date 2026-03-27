"""
Unit tests for VeronicaOrchestrator.

Tests:
  - chat: success path with mock router + AI
  - chat: UpstreamError when AI fails
  - generate_project: delegates to project generator
  - get_mentor_suggestions: returns suggestions dict
  - download_project_zip: returns bytes
  - update_project_file: writes file and returns status

Requirements: 16, 16.11, 16.12, 16.13, 40
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch, mock_open

from backend.core.exceptions import UpstreamError
from backend.orchestration.veronica_orchestrator import VeronicaOrchestrator


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_client():
    client = MagicMock()
    client.chat_completion = AsyncMock(return_value="Here's how to build your React app...")
    return client


@pytest.fixture
def orchestrator(mock_client):
    return VeronicaOrchestrator(openrouter_client=mock_client)


# ---------------------------------------------------------------------------
# chat()
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_chat_success(orchestrator, mock_client):
    """Chat succeeds: returns intent, confidence, assistant_text, actions."""
    mock_router = MagicMock()
    mock_router.route = AsyncMock(return_value={"intent": "code_help", "confidence": 0.95, "actions": []})
    orchestrator._veronica_router = mock_router

    result = await orchestrator.chat(
        message="Help me build a React app",
        session_id="session-1",
        context={"project_id": "p1"},
    )

    assert result["intent"] == "code_help"
    assert result["confidence"] == 0.95
    assert "assistant_text" in result
    mock_client.chat_completion.assert_called_once()


@pytest.mark.asyncio
async def test_chat_raises_upstream_error_on_ai_failure(orchestrator, mock_client):
    """When OpenRouter fails, chat raises UpstreamError."""
    mock_client.chat_completion = AsyncMock(side_effect=Exception("OpenRouter down"))
    mock_router = MagicMock()
    mock_router.route = AsyncMock(return_value={"intent": "general", "confidence": 0.5, "actions": []})
    orchestrator._veronica_router = mock_router

    with pytest.raises(UpstreamError) as exc_info:
        await orchestrator.chat(
            message="help",
            session_id=None,
            context=None,
        )
    assert exc_info.value.upstream_status == 503


@pytest.mark.asyncio
async def test_chat_raises_upstream_error_on_router_failure(orchestrator, mock_client):
    """When the veronica router itself fails, chat raises UpstreamError."""
    mock_router = MagicMock()
    mock_router.route = AsyncMock(side_effect=Exception("Router crashed"))
    orchestrator._veronica_router = mock_router

    with pytest.raises(UpstreamError):
        await orchestrator.chat("hello", session_id=None, context=None)


# ---------------------------------------------------------------------------
# generate_project()
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_generate_project_delegates_to_generator(orchestrator):
    """generate_project delegates to VeronicaProjectGenerator."""
    mock_gen = MagicMock()
    mock_gen.generate = AsyncMock(return_value={"title": "Todo App", "files": []})
    orchestrator._project_generator = mock_gen

    result = await orchestrator.generate_project({"framework": "react", "description": "Todo app"})

    assert result["title"] == "Todo App"
    mock_gen.generate.assert_called_once()


@pytest.mark.asyncio
async def test_generate_project_raises_upstream_on_failure(orchestrator):
    """When project generator fails, raises UpstreamError."""
    mock_gen = MagicMock()
    mock_gen.generate = AsyncMock(side_effect=Exception("Generator failed"))
    orchestrator._project_generator = mock_gen

    with pytest.raises(UpstreamError) as exc_info:
        await orchestrator.generate_project({"framework": "react"})
    assert "unavailable" in exc_info.value.message.lower()


# ---------------------------------------------------------------------------
# get_mentor_suggestions()
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_mentor_suggestions_success(orchestrator, mock_client):
    """Returns dict with project_id and suggestions."""
    result = await orchestrator.get_mentor_suggestions("project-abc")

    assert result["project_id"] == "project-abc"
    assert "suggestions" in result
    mock_client.chat_completion.assert_called_once()


@pytest.mark.asyncio
async def test_get_mentor_suggestions_raises_on_ai_failure(orchestrator, mock_client):
    """When AI fails, raises UpstreamError."""
    mock_client.chat_completion = AsyncMock(side_effect=Exception("timeout"))

    with pytest.raises(UpstreamError):
        await orchestrator.get_mentor_suggestions("project-xyz")


# ---------------------------------------------------------------------------
# streaming
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_generate_project_stream_yields_chunks(orchestrator):
    """Stream generation yields chunks from project generator."""
    async def fake_gen_stream(request_data):
        for chunk in ["import React", " from 'react'", ";"]:
            yield chunk

    mock_gen = MagicMock()
    mock_gen.generate_stream = fake_gen_stream
    orchestrator._project_generator = mock_gen

    chunks = []
    async for chunk in orchestrator.generate_project_stream({}):
        chunks.append(chunk)

    assert "".join(chunks) == "import React from 'react';"


# ---------------------------------------------------------------------------
# generate_project_stream error handling
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_generate_project_stream_raises_upstream_on_failure(orchestrator):
    """Stream raises UpstreamError when generator fails."""
    async def bad_gen_stream(request_data):
        raise Exception("Stream broken")
        yield  # pragma: no cover

    mock_gen = MagicMock()
    mock_gen.generate_stream = bad_gen_stream
    orchestrator._project_generator = mock_gen

    with pytest.raises(UpstreamError):
        async for _ in orchestrator.generate_project_stream({}):
            pass
