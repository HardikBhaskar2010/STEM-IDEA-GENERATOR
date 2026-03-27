"""
Shared pytest fixtures and conftest for the STEM backend test suite.

Provides:
  - mock_openrouter_client: A fully-mocked OpenRouterClient
  - mock_app / async_client: ASGI test client for integration tests
"""

import sys
import os
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch

# Ensure project root is on path
_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _root not in sys.path:
    sys.path.insert(0, _root)


# ---------------------------------------------------------------------------
# Core fixtures shared across unit and integration tests
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_openrouter_client():
    """Return a mocked OpenRouterClient with async methods."""
    client = MagicMock()
    client.chat_completion = AsyncMock(return_value="AI generated response text")

    async def mock_stream(*args, **kwargs):
        for chunk in ["Hello ", "world ", "from AI."]:
            yield chunk

    client.chat_completion_stream = mock_stream
    client.close = AsyncMock()
    return client


@pytest.fixture
def sample_project_params():
    """Standard project generation parameters."""
    return {
        "projectType": "robotics",
        "skillLevel": "intermediate",
        "interests": "automation",
        "budget": "$50",
        "duration": "1 week",
    }


@pytest.fixture
def sample_veronica_request():
    """Standard Veronica chat request payload."""
    return {
        "message": "Help me build a React app",
        "session_id": "test-session-123",
        "context": {"project_id": "proj-456"},
    }
