"""
Unit tests for SandboxService.create_sandbox() method.

Tests the create_sandbox() method that creates an E2B sandbox
and returns sandbox_id + viewer_url.

Requirements: 1.1, 1.2, 16.1, 16.2
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from backend.core.exceptions import UpstreamError
from backend.services.sandbox_service import SandboxService


@pytest.fixture
def sandbox_service():
    """Create a SandboxService instance for testing."""
    return SandboxService()


@pytest.fixture
def mock_sandbox():
    """Create a mock E2B sandbox object."""
    sandbox = MagicMock()
    sandbox.id = "test-sandbox-123"
    return sandbox


@pytest.mark.asyncio
async def test_create_sandbox_success(sandbox_service, mock_sandbox):
    """Test successful sandbox creation returns sandbox_id and viewer_url."""
    # Mock the E2B runner
    mock_runner = MagicMock()
    mock_runner.create_empty_sandbox = AsyncMock(return_value=mock_sandbox)
    
    with patch.object(sandbox_service, '_get_runner', return_value=mock_runner):
        result = await sandbox_service.create_sandbox()
    
    # Verify result structure
    assert "sandbox_id" in result
    assert "viewer_url" in result
    assert "status" in result
    
    # Verify values
    assert result["sandbox_id"] == "test-sandbox-123"
    assert result["viewer_url"] == "https://e2b.dev/sandbox/test-sandbox-123/files"
    assert result["status"] == "ready"
    
    # Verify runner was called
    mock_runner.create_empty_sandbox.assert_called_once()


@pytest.mark.asyncio
async def test_create_sandbox_e2b_failure(sandbox_service):
    """Test that E2B failures are converted to UpstreamError."""
    # Mock the E2B runner to raise an exception
    mock_runner = MagicMock()
    mock_runner.create_empty_sandbox = AsyncMock(
        side_effect=Exception("E2B API unavailable")
    )
    
    with patch.object(sandbox_service, '_get_runner', return_value=mock_runner):
        with pytest.raises(UpstreamError) as exc_info:
            await sandbox_service.create_sandbox()
    
    # Verify error details
    assert exc_info.value.service == "E2B"
    assert exc_info.value.upstream_status == 503
    assert "Failed to create sandbox" in exc_info.value.message


@pytest.mark.asyncio
async def test_create_sandbox_viewer_url_format(sandbox_service, mock_sandbox):
    """Test that viewer URL follows the correct format."""
    mock_runner = MagicMock()
    mock_runner.create_empty_sandbox = AsyncMock(return_value=mock_sandbox)
    
    with patch.object(sandbox_service, '_get_runner', return_value=mock_runner):
        result = await sandbox_service.create_sandbox()
    
    # Verify URL format
    viewer_url = result["viewer_url"]
    assert viewer_url.startswith("https://e2b.dev/sandbox/")
    assert viewer_url.endswith("/files")
    assert mock_sandbox.id in viewer_url


def test_generate_viewer_url(sandbox_service):
    """Test the _generate_viewer_url helper method."""
    sandbox_id = "abc-123-xyz"
    viewer_url = sandbox_service._generate_viewer_url(sandbox_id)
    
    assert viewer_url == "https://e2b.dev/sandbox/abc-123-xyz/files"
    assert viewer_url.startswith("https://e2b.dev/sandbox/")
    assert viewer_url.endswith("/files")
