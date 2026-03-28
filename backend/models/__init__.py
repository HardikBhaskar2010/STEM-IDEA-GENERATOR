"""
Data models for the Veronica AI project generation system.

This package contains Pydantic models for project specifications,
generation state, implementation plans, and progress tracking.
"""

from backend.models.command_result import CommandResult
from backend.models.progress_event import EventType, ProgressEvent

__all__ = [
    "CommandResult",
    "EventType",
    "ProgressEvent",
]
