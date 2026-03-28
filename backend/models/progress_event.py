"""
Progress event model for agentic builder streaming.

This module defines the ProgressEvent model and EventType enum used for
real-time progress tracking during project generation.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class EventType(str, Enum):
    """
    Event types for agentic project generation phases.
    
    These events are emitted during the generation workflow to provide
    real-time progress updates to the frontend.
    """
    
    SANDBOX_READY = "sandbox_ready"
    PLAN_READY = "plan_ready"
    SCAFFOLD_START = "scaffold_start"
    SCAFFOLD_DONE = "scaffold_done"
    FILE_START = "file_start"
    FILE_DONE = "file_done"
    DEBUG_START = "debug_start"
    DEBUG_ITERATION = "debug_iteration"
    DEBUG_DONE = "debug_done"
    ERROR = "error"
    DONE = "done"
    DONE_FAILED = "done_failed"


class ProgressEvent(BaseModel):
    """
    Progress event for streaming generation updates.
    
    Emitted during agentic project generation to provide real-time
    progress tracking, phase transitions, and error reporting.
    
    Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.7
    """
    
    event: EventType = Field(
        ...,
        description="Type of event being emitted"
    )
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO 8601 timestamp of event occurrence"
    )
    data: Optional[str] = Field(
        default=None,
        description="Event-specific data or message"
    )
    path: Optional[str] = Field(
        default=None,
        description="File path for file-related events"
    )
    lines: Optional[int] = Field(
        default=None,
        ge=0,
        description="Number of lines in file (for file_done events)"
    )
    progress: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Progress percentage (0.0 to 1.0)"
    )
    sandbox_id: Optional[str] = Field(
        default=None,
        description="E2B sandbox identifier"
    )
    viewer_url: Optional[str] = Field(
        default=None,
        description="E2B file viewer URL for sandbox access"
    )
    
    def to_json(self) -> str:
        """
        Convert event to JSON string for SSE streaming.
        
        Excludes None values to minimize payload size.
        
        Returns:
            JSON string representation of the event
        """
        return self.model_dump_json(exclude_none=True)
