"""
Unit tests for SandboxService directory and command execution operations.

Tests:
  - list_directory: success returns list of files
  - list_directory: ValidationError for empty sandbox_id
  - list_directory: NotFoundError when sandbox doesn't exist
  - list_directory: NotFoundError when directory doesn't exist
  - list_directory: UpstreamError when listing fails
  - run_command: success returns CommandResult with stdout, stderr, exit_code
  - run_command: ValidationError for empty sandbox_id or command
  - run_command: ValidationError for dangerous commands
  - run_command: NotFoundError when sandbox doesn't exist
  - run_command: UpstreamError on timeout
  - run_command: UpstreamError when execution fails

Requirements: 5.4, 6.1, 6.2, 6.3, 6.6
"""

import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock

from backend.core.exceptions import NotFoundError, UpstreamError, ValidationError
from backend.models.command_result import CommandResult
from backend.services.sandbox_service import SandboxService


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def sandbox_service():
    svc = SandboxService()
    return svc


@pytest.fixture
def mock_command_result():
    """Mock E2B command result."""
    result = MagicMock()
    result.stdout = "file1.txt\nfile2.txt\ndir1\n"
    result.stderr = ""
    result.exit_code = 0
    return result


@pytest.fixture
def mock_sandbox(mock_command_result):
    """Mock E2B sandbox object with commands API."""
    sandbox = MagicMock()
    sandbox.commands = MagicMock()
    sandbox.commands.run = AsyncMock(return_value=mock_command_result)
    return sandbox


@pytest.fixture
def mock_runner(mock_sandbox):
    """Mock E2BRunner with sandbox."""
    runner = MagicMock()
    runner.get_sandbox = MagicMock(return_value=mock_sandbox)
    return runner


# ---------------------------------------------------------------------------
# list_directory
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_directory_success(sandbox_service, mock_runner, mock_command_result):
    """Test successful directory listing from sandbox."""
    sandbox_service._runner = mock_runner
    
    files = await sandbox_service.list_directory("sandbox-123", "/home/user")
    
    assert files == ["file1.txt", "file2.txt", "dir1"]
    mock_runner.get_sandbox.assert_called_once_with("sandbox-123")


@pytest.mark.asyncio
async def test_list_directory_default_path(sandbox_service, mock_runner):
    """Test list_directory uses current directory by default."""
    sandbox_service._runner = mock_runner
    
    await sandbox_service.list_directory("sandbox-123")
    
    # Should use default path "."
    mock_runner.get_sandbox.assert_called_once_with("sandbox-123")


@pytest.mark.asyncio
async def test_list_directory_empty_result(sandbox_service, mock_runner, mock_sandbox):
    """Test list_directory returns empty list for empty directory."""
    mock_result = MagicMock()
    mock_result.stdout = ""
    mock_result.exit_code = 0
    mock_sandbox.commands.run = AsyncMock(return_value=mock_result)
    sandbox_service._runner = mock_runner
    
    files = await sandbox_service.list_directory("sandbox-123", "/empty")
    
    assert files == []


@pytest.mark.asyncio
async def test_list_directory_empty_sandbox_id(sandbox_service):
    """Test list_directory raises ValidationError for empty sandbox_id."""
    with pytest.raises(ValidationError) as exc_info:
        await sandbox_service.list_directory("", "/home")
    assert "sandbox_id" in exc_info.value.message.lower()


@pytest.mark.asyncio
async def test_list_directory_sandbox_not_found(sandbox_service):
    """Test list_directory raises NotFoundError when sandbox doesn't exist."""
    mock_runner = MagicMock()
    mock_runner.get_sandbox = MagicMock(return_value=None)
    sandbox_service._runner = mock_runner
    
    with pytest.raises(NotFoundError) as exc_info:
        await sandbox_service.list_directory("sandbox-123", "/home")
    assert "sandbox-123" in exc_info.value.message


@pytest.mark.asyncio
async def test_list_directory_not_found(sandbox_service, mock_runner, mock_sandbox):
    """Test list_directory raises NotFoundError when directory doesn't exist."""
    mock_result = MagicMock()
    mock_result.exit_code = 1
    mock_result.stderr = "ls: cannot access '/nonexistent': No such file or directory"
    mock_sandbox.commands.run = AsyncMock(return_value=mock_result)
    sandbox_service._runner = mock_runner
    
    with pytest.raises(NotFoundError) as exc_info:
        await sandbox_service.list_directory("sandbox-123", "/nonexistent")
    assert "/nonexistent" in exc_info.value.message


@pytest.mark.asyncio
async def test_list_directory_upstream_error(sandbox_service, mock_runner, mock_sandbox):
    """Test list_directory raises UpstreamError when listing fails."""
    mock_sandbox.commands.run = AsyncMock(side_effect=Exception("Connection lost"))
    sandbox_service._runner = mock_runner
    
    with pytest.raises(UpstreamError) as exc_info:
        await sandbox_service.list_directory("sandbox-123", "/home")
    assert exc_info.value.upstream_status == 503


# ---------------------------------------------------------------------------
# run_command
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_run_command_success(sandbox_service, mock_runner, mock_sandbox):
    """Test successful command execution in sandbox."""
    mock_result = MagicMock()
    mock_result.stdout = "Hello World"
    mock_result.stderr = ""
    mock_result.exit_code = 0
    mock_sandbox.commands.run = AsyncMock(return_value=mock_result)
    sandbox_service._runner = mock_runner
    
    result = await sandbox_service.run_command("sandbox-123", "echo 'Hello World'")
    
    assert isinstance(result, CommandResult)
    assert result.command == "echo 'Hello World'"
    assert result.stdout == "Hello World"
    assert result.stderr == ""
    assert result.exit_code == 0
    assert result.duration_ms >= 0
    assert result.success is True


@pytest.mark.asyncio
async def test_run_command_with_stderr(sandbox_service, mock_runner, mock_sandbox):
    """Test command execution captures stderr."""
    mock_result = MagicMock()
    mock_result.stdout = ""
    mock_result.stderr = "Error: file not found"
    mock_result.exit_code = 1
    mock_sandbox.commands.run = AsyncMock(return_value=mock_result)
    sandbox_service._runner = mock_runner
    
    result = await sandbox_service.run_command("sandbox-123", "cat nonexistent.txt")
    
    assert result.stderr == "Error: file not found"
    assert result.exit_code == 1
    assert result.success is False


@pytest.mark.asyncio
async def test_run_command_custom_timeout(sandbox_service, mock_runner, mock_sandbox):
    """Test run_command respects custom timeout."""
    mock_result = MagicMock()
    mock_result.stdout = "Done"
    mock_result.stderr = ""
    mock_result.exit_code = 0
    mock_sandbox.commands.run = AsyncMock(return_value=mock_result)
    sandbox_service._runner = mock_runner
    
    await sandbox_service.run_command("sandbox-123", "npm install", timeout=120)
    
    # Verify timeout was passed to sandbox.commands.run
    mock_sandbox.commands.run.assert_called_once()
    call_kwargs = mock_sandbox.commands.run.call_args[1]
    assert call_kwargs["timeout"] == 120


@pytest.mark.asyncio
async def test_run_command_empty_sandbox_id(sandbox_service):
    """Test run_command raises ValidationError for empty sandbox_id."""
    with pytest.raises(ValidationError) as exc_info:
        await sandbox_service.run_command("", "echo test")
    assert "sandbox_id" in exc_info.value.message.lower()


@pytest.mark.asyncio
async def test_run_command_empty_command(sandbox_service):
    """Test run_command raises ValidationError for empty command."""
    with pytest.raises(ValidationError) as exc_info:
        await sandbox_service.run_command("sandbox-123", "")
    assert "command" in exc_info.value.message.lower()


@pytest.mark.asyncio
async def test_run_command_dangerous_rm_rf(sandbox_service):
    """Test run_command blocks dangerous rm -rf / command."""
    with pytest.raises(ValidationError) as exc_info:
        await sandbox_service.run_command("sandbox-123", "rm -rf /")
    assert "dangerous" in exc_info.value.message.lower()


@pytest.mark.asyncio
async def test_run_command_dangerous_fork_bomb(sandbox_service):
    """Test run_command blocks fork bomb."""
    with pytest.raises(ValidationError) as exc_info:
        await sandbox_service.run_command("sandbox-123", ":(){ :|:& };:")
    assert "dangerous" in exc_info.value.message.lower()


@pytest.mark.asyncio
async def test_run_command_dangerous_mkfs(sandbox_service):
    """Test run_command blocks mkfs command."""
    with pytest.raises(ValidationError) as exc_info:
        await sandbox_service.run_command("sandbox-123", "mkfs.ext4 /dev/sda1")
    assert "dangerous" in exc_info.value.message.lower()


@pytest.mark.asyncio
async def test_run_command_dangerous_dd(sandbox_service):
    """Test run_command blocks dd if=/dev/zero command."""
    with pytest.raises(ValidationError) as exc_info:
        await sandbox_service.run_command("sandbox-123", "dd if=/dev/zero of=/dev/sda")
    assert "dangerous" in exc_info.value.message.lower()


@pytest.mark.asyncio
async def test_run_command_sandbox_not_found(sandbox_service):
    """Test run_command raises NotFoundError when sandbox doesn't exist."""
    mock_runner = MagicMock()
    mock_runner.get_sandbox = MagicMock(return_value=None)
    sandbox_service._runner = mock_runner
    
    with pytest.raises(NotFoundError) as exc_info:
        await sandbox_service.run_command("sandbox-123", "echo test")
    assert "sandbox-123" in exc_info.value.message


@pytest.mark.asyncio
async def test_run_command_timeout_error(sandbox_service, mock_runner, mock_sandbox):
    """Test run_command raises UpstreamError on timeout."""
    mock_sandbox.commands.run = AsyncMock(side_effect=asyncio.TimeoutError())
    sandbox_service._runner = mock_runner
    
    with pytest.raises(UpstreamError) as exc_info:
        await sandbox_service.run_command("sandbox-123", "sleep 100", timeout=5)
    assert exc_info.value.upstream_status == 504
    assert "timeout" in exc_info.value.message.lower()


@pytest.mark.asyncio
async def test_run_command_upstream_error(sandbox_service, mock_runner, mock_sandbox):
    """Test run_command raises UpstreamError when execution fails."""
    mock_sandbox.commands.run = AsyncMock(side_effect=Exception("Network error"))
    sandbox_service._runner = mock_runner
    
    with pytest.raises(UpstreamError) as exc_info:
        await sandbox_service.run_command("sandbox-123", "echo test")
    assert exc_info.value.upstream_status == 503


@pytest.mark.asyncio
async def test_run_command_duration_tracking(sandbox_service, mock_runner, mock_sandbox):
    """Test run_command tracks execution duration."""
    mock_result = MagicMock()
    mock_result.stdout = "Done"
    mock_result.stderr = ""
    mock_result.exit_code = 0
    
    # Simulate a command that takes some time
    async def slow_run(*args, **kwargs):
        await asyncio.sleep(0.1)  # 100ms
        return mock_result
    
    mock_sandbox.commands.run = slow_run
    sandbox_service._runner = mock_runner
    
    result = await sandbox_service.run_command("sandbox-123", "echo test")
    
    # Duration should be at least 100ms
    assert result.duration_ms >= 100
