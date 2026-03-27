"""
Integration tests for the health router.

Tests:
  - GET /api/health → 200 {"status": "ok"}
  - GET /api/health/detailed → 200 with services key
  - GET /api/test-status → 200 {"status": "running"}

Uses FastAPI TestClient (synchronous ASGI transport) so no running server needed.

Requirements: 5, 5.4, 5.5, 5.6
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient
from fastapi import FastAPI

from backend.routers.health import health_router
from backend.integrations.openrouter.health import OpenRouterHealthCheck


def _make_app():
    """Create a minimal test FastAPI app with only the health router."""
    app = FastAPI()
    app.include_router(health_router)

    # Override the health-check dependency
    mock_health = MagicMock(spec=OpenRouterHealthCheck)
    mock_health.check_health = AsyncMock(return_value={"status": "healthy", "last_checked": "2026-03-28"})
    mock_health.get_health_status = MagicMock(return_value={"status": "healthy"})

    from backend.core.dependencies import get_openrouter_health  # noqa: PLC0415
    app.dependency_overrides[get_openrouter_health] = lambda: mock_health
    return app


@pytest.fixture
def client():
    app = _make_app()
    with TestClient(app) as c:
        yield c


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_health_liveness(client):
    """GET /api/health → 200 with status: ok."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_health_detailed(client):
    """GET /api/health/detailed → 200 with services.openrouter."""
    response = client.get("/api/health/detailed")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] in ("healthy", "degraded")
    assert "services" in data
    assert "openrouter" in data["services"]


def test_test_status(client):
    """GET /api/test-status → 200 with status: running."""
    response = client.get("/api/test-status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "running"
    assert "message" in data
