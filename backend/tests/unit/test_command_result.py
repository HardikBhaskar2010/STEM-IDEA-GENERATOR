"""
Unit tests for CommandResult model.

Tests the CommandResult data model including helper properties
for success and error detection.
"""

import pytest
from pydantic import ValidationError

from backend.models.command_result import CommandResult


class TestCommandResult:
    """Test suite for CommandResult model."""
    
    def test_create_successful_command_result(self):
        """Test creating a successful command result."""
        result = CommandResult(
            command="npm install",
            stdout="added 42 packages",
            stderr="",
            exit_code=0,
            duration_ms=1500
        )
        
        assert result.command == "npm install"
        assert result.stdout == "added 42 packages"
        assert result.stderr == ""
        assert result.exit_code == 0
        assert result.duration_ms == 1500
    
    def test_create_failed_command_result(self):
        """Test creating a failed command result."""
        result = CommandResult(
            command="npm run build",
            stdout="",
            stderr="Error: Module not found",
            exit_code=1,
            duration_ms=500
        )
        
        assert result.command == "npm run build"
        assert result.exit_code == 1
        assert result.stderr == "Error: Module not found"
    
    def test_success_property_returns_true_for_zero_exit_code(self):
        """Test that success property returns True when exit_code is 0."""
        result = CommandResult(
            command="echo hello",
            stdout="hello",
            stderr="",
            exit_code=0,
            duration_ms=100
        )
        
        assert result.success is True
    
    def test_success_property_returns_false_for_nonzero_exit_code(self):
        """Test that success property returns False when exit_code is not 0."""
        result = CommandResult(
            command="false",
            stdout="",
            stderr="",
            exit_code=1,
            duration_ms=50
        )
        
        assert result.success is False
    
    def test_has_errors_detects_error_keyword(self):
        """Test that has_errors detects 'error' keyword in stderr."""
        result = CommandResult(
            command="npm test",
            stdout="",
            stderr="Error: Test failed",
            exit_code=0,
            duration_ms=200
        )
        
        assert result.has_errors is True
    
    def test_has_errors_detects_failed_keyword(self):
        """Test that has_errors detects 'failed' keyword in stderr."""
        result = CommandResult(
            command="npm test",
            stdout="",
            stderr="Build failed with 3 errors",
            exit_code=0,
            duration_ms=200
        )
        
        assert result.has_errors is True
    
    def test_has_errors_detects_exception_keyword(self):
        """Test that has_errors detects 'exception' keyword in stderr."""
        result = CommandResult(
            command="python script.py",
            stdout="",
            stderr="Exception: ValueError occurred",
            exit_code=0,
            duration_ms=300
        )
        
        assert result.has_errors is True
    
    def test_has_errors_detects_traceback_keyword(self):
        """Test that has_errors detects 'traceback' keyword in stderr."""
        result = CommandResult(
            command="python script.py",
            stdout="",
            stderr="Traceback (most recent call last):",
            exit_code=0,
            duration_ms=300
        )
        
        assert result.has_errors is True
    
    def test_has_errors_is_case_insensitive(self):
        """Test that has_errors detection is case-insensitive."""
        result = CommandResult(
            command="npm test",
            stdout="",
            stderr="ERROR: Something went wrong",
            exit_code=0,
            duration_ms=200
        )
        
        assert result.has_errors is True
    
    def test_has_errors_returns_false_for_clean_stderr(self):
        """Test that has_errors returns False when stderr has no error keywords."""
        result = CommandResult(
            command="npm install",
            stdout="added 42 packages",
            stderr="npm WARN deprecated package@1.0.0",
            exit_code=0,
            duration_ms=1500
        )
        
        assert result.has_errors is False
    
    def test_has_errors_returns_false_for_empty_stderr(self):
        """Test that has_errors returns False when stderr is empty."""
        result = CommandResult(
            command="echo hello",
            stdout="hello",
            stderr="",
            exit_code=0,
            duration_ms=100
        )
        
        assert result.has_errors is False
    
    def test_default_stdout_is_empty_string(self):
        """Test that stdout defaults to empty string."""
        result = CommandResult(
            command="test",
            exit_code=0,
            duration_ms=100
        )
        
        assert result.stdout == ""
    
    def test_default_stderr_is_empty_string(self):
        """Test that stderr defaults to empty string."""
        result = CommandResult(
            command="test",
            exit_code=0,
            duration_ms=100
        )
        
        assert result.stderr == ""
    
    def test_negative_duration_raises_validation_error(self):
        """Test that negative duration_ms raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            CommandResult(
                command="test",
                exit_code=0,
                duration_ms=-100
            )
        
        assert "duration_ms" in str(exc_info.value)
    
    def test_missing_required_fields_raises_validation_error(self):
        """Test that missing required fields raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            CommandResult()
        
        error_str = str(exc_info.value)
        assert "command" in error_str
        assert "exit_code" in error_str
        assert "duration_ms" in error_str
    
    def test_model_serialization(self):
        """Test that model can be serialized to dict."""
        result = CommandResult(
            command="npm test",
            stdout="All tests passed",
            stderr="",
            exit_code=0,
            duration_ms=2000
        )
        
        data = result.model_dump()
        
        assert data["command"] == "npm test"
        assert data["stdout"] == "All tests passed"
        assert data["stderr"] == ""
        assert data["exit_code"] == 0
        assert data["duration_ms"] == 2000
    
    def test_model_json_serialization(self):
        """Test that model can be serialized to JSON."""
        result = CommandResult(
            command="npm test",
            stdout="All tests passed",
            stderr="",
            exit_code=0,
            duration_ms=2000
        )
        
        json_str = result.model_dump_json()
        
        assert '"command":"npm test"' in json_str or '"command": "npm test"' in json_str
        assert '"exit_code":0' in json_str or '"exit_code": 0' in json_str
