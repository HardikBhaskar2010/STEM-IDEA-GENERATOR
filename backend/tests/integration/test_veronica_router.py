"""
Integration tests for the Veronica AI router.

Tests:
  - POST /api/veronica-ai/chat → 200 with intent + assistant_text
  - POST /api/veronica-ai/chat → 503 when orchestrator raises UpstreamError
  - POST /api/veronica-projects/generate → 200
  - GET /api/veronica-projects/{id}/mentor → 200

Requirements: 7, 7.9, 7.10, 7.11
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient
from fastapi import FastAPI

from backend.routers.veronica import veronica_router
from backend.orchestration.veronica_orchestrator import VeronicaOrchestrator
from backend.core.dependencies import get_veronica_orchestrator
from backend.core.exceptions import UpstreamError


def _make_orchestrator(**overrides):
    orch = MagicMock(spec=VeronicaOrchestrator)
    orch.chat = AsyncMock(return_value={
        "intent": "code_help",
        "confidence": 0.9,
        "assistant_text": "Here's how to do that...",
        "actions": [],
    })
    orch.generate_project = AsyncMock(return_value={
        "title": "Todo App",
        "files": [],
    })
    orch.get_mentor_suggestions = AsyncMock(return_value={
        "project_id": "proj-1",
        "suggestions": "1. Add tests\n2. Add docs",
    })
    orch.update_user_memory = AsyncMock(return_value={"status": "updated", "user_id": "user-1"})
    orch.get_user_memory = AsyncMock(return_value={"user_id": "user-1", "prefs": {}})

    for k, v in overrides.items():
        setattr(orch, k, v)
    return orch


def _make_app(orchestrator):
    app = FastAPI()
    app.include_router(veronica_router)
    app.dependency_overrides[get_veronica_orchestrator] = lambda: orchestrator
    return app


# ---------------------------------------------------------------------------
# chat
# ---------------------------------------------------------------------------

def test_veronica_chat_success():
    orch = _make_orchestrator()
    with TestClient(_make_app(orch)) as client:
        response = client.post("/api/veronica-ai/chat", json={
            "message": "Help me build a login page",
            "session_id": "sess-123",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["intent"] == "code_help"
        assert "assistant_text" in data


def test_veronica_chat_upstream_error():
    """503 from orchestrator maps to HTTP 503."""
    orch = _make_orchestrator(
        chat=AsyncMock(side_effect=UpstreamError(
            "Veronica AI unavailable",
            service="OpenRouter",
            upstream_status=503,
        ))
    )
    with TestClient(_make_app(orch)) as client:
        response = client.post("/api/veronica-ai/chat", json={"message": "hi"})
        assert response.status_code == 503


def test_veronica_chat_missing_message():
    """Missing message field → 422."""
    orch = _make_orchestrator()
    with TestClient(_make_app(orch)) as client:
        response = client.post("/api/veronica-ai/chat", json={"session_id": "s"})
        assert response.status_code == 422


# ---------------------------------------------------------------------------
# generate project
# ---------------------------------------------------------------------------

def test_veronica_generate_project_success():
    orch = _make_orchestrator()
    with TestClient(_make_app(orch)) as client:
        response = client.post("/api/veronica-projects/generate", json={
            "framework": "react",
            "description": "Build a todo app",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Todo App"


# ---------------------------------------------------------------------------
# mentor suggestions
# ---------------------------------------------------------------------------

def test_get_mentor_suggestions_success():
    orch = _make_orchestrator()
    with TestClient(_make_app(orch)) as client:
        response = client.get("/api/veronica-projects/proj-1/mentor")
        assert response.status_code == 200
        data = response.json()
        assert data["project_id"] == "proj-1"
        assert "suggestions" in data
