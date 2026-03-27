"""
Integration tests for the projects router.

Tests:
  - POST /api/generate-project → 200 with project dict
  - POST /api/generate-project → 422 (validation error from FastAPI when body is wrong type)
  - POST /api/generate-project → 400 when orchestrator raises ValidationError
  - POST /api/projects/sync → 200 with synced status
  - GET /api/components/{id}/details → 200 with component_id

Uses FastAPI TestClient with mocked ProjectOrchestrator.

Requirements: 6, 6.5, 6.6, 6.7, 6.8
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient
from fastapi import FastAPI

from backend.routers.projects import projects_router
from backend.orchestration.project_orchestrator import ProjectOrchestrator
from backend.core.exceptions import ValidationError
from backend.core.dependencies import get_project_orchestrator


def _make_orchestrator(
    *,
    generate_return=None,
    generate_side_effect=None,
    sync_return=None,
    component_return=None,
):
    orch = MagicMock(spec=ProjectOrchestrator)
    orch.generate_project = AsyncMock(
        return_value=generate_return or {
            "title": "Line-Following Robot",
            "description": "Build it",
            "difficulty": "Intermediate",
            "estimatedTime": "4h",
            "estimatedCost": "$30",
            "components": ["Arduino"],
            "skills": ["Electronics"],
            "steps": ["Step 1"],
        },
        side_effect=generate_side_effect,
    )
    orch.sync_project = AsyncMock(
        return_value=sync_return or {"status": "synced", "project_id": "proj-1"}
    )
    orch.get_component_details = AsyncMock(
        return_value=component_return or {
            "component_id": "arduino-uno",
            "details": "Description of arduino-uno",
        }
    )
    return orch


def _make_app(orchestrator):
    app = FastAPI()
    app.include_router(projects_router)
    app.dependency_overrides[get_project_orchestrator] = lambda: orchestrator
    return app


# ---------------------------------------------------------------------------
# generate-project
# ---------------------------------------------------------------------------

def test_generate_project_success():
    orch = _make_orchestrator()
    with TestClient(_make_app(orch)) as client:
        response = client.post("/api/generate-project", json={
            "projectType": "robotics",
            "skillLevel": "intermediate",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Line-Following Robot"
        assert "steps" in data


def test_generate_project_missing_required_field():
    """Missing projectType in body → 422 from FastAPI Pydantic validation."""
    orch = _make_orchestrator()
    with TestClient(_make_app(orch)) as client:
        response = client.post("/api/generate-project", json={
            "skillLevel": "beginner",
        })
        assert response.status_code == 422


def test_generate_project_validation_error_from_orchestrator():
    """Orchestrator raises ValidationError → 400."""
    orch = _make_orchestrator(
        generate_side_effect=ValidationError("projectType is required",
                                             details={"field": "projectType"})
    )
    with TestClient(_make_app(orch)) as client:
        response = client.post("/api/generate-project", json={
            "projectType": "",
            "skillLevel": "beginner",
        })
        assert response.status_code == 400
        assert response.json()["detail"]["error"] == "ValidationError"


def test_generate_project_internal_error():
    """Unhandled exception → 500."""
    orch = _make_orchestrator(generate_side_effect=Exception("Unexpected crash"))
    with TestClient(_make_app(orch)) as client:
        response = client.post("/api/generate-project", json={
            "projectType": "robotics",
            "skillLevel": "beginner",
        })
        assert response.status_code == 500


# ---------------------------------------------------------------------------
# projects/sync
# ---------------------------------------------------------------------------

def test_sync_project_success():
    orch = _make_orchestrator()
    with TestClient(_make_app(orch)) as client:
        response = client.post("/api/projects/sync", json={
            "id": "proj-1",
            "title": "My Project",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "synced"


# ---------------------------------------------------------------------------
# components details
# ---------------------------------------------------------------------------

def test_get_component_details_success():
    orch = _make_orchestrator()
    with TestClient(_make_app(orch)) as client:
        response = client.get("/api/components/arduino-uno/details")
        assert response.status_code == 200
        data = response.json()
        assert data["component_id"] == "arduino-uno"
