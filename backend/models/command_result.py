"""
Command execution result model for agentic builder.

This module defines the CommandResult model used to capture shell command
execution results in the E2B sandbox during project generation.
"""

from pydantic import BaseModel, Field


class CommandResult(BaseModel):
    """
    Result of a shell command execution in the E2B sandbox.
    
    Captures stdout, stderr, exit code, and execution duration for
    command operations during agentic project generation.
    
    Validates: Requirements 6.2, 10.1
    """
    
    command: str = Field(
        ...,
        description="The shell command that was executed"
    )
    stdout: str = Field(
        default="",
        description="Standard output from command execution"
    )
    stderr: str = Field(
        default="",
        description="Standard error output from command execution"
    )
    exit_code: int = Field(
        ...,
        description="Command exit code (0 indicates success)"
    )
    duration_ms: int = Field(
        ...,
        ge=0,
        description="Command execution duration in milliseconds"
    )
    
    @property
    def success(self) -> bool:
        """
        Check if command executed successfully.
        
        Returns:
            True if exit_code is 0, False otherwise
        """
        return self.exit_code == 0
    
    @property
    def has_errors(self) -> bool:
        """
        Check if stderr contains error indicators.
        
        Searches for common error keywords in stderr output to detect
        errors even when exit_code is 0 (some tools write errors to
        stderr but still exit successfully).
        
        Returns:
            True if error keywords found in stderr, False otherwise
        """
        error_keywords = ["error", "failed", "exception", "traceback"]
        return any(kw in self.stderr.lower() for kw in error_keywords)
