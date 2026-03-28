"""
Unit tests for ProgressEvent model and EventType enum.

Tests the ProgressEvent data model including event types,
timestamp generation, and JSON serialization.
"""

import json
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from backend.models.progress_event import EventType, ProgressEvent


class TestEventType:
    """Test suite for EventType enum."""
    
    def test_all_event_types_exist(self):
        """Test that all required event types are defined."""
        assert EventType.SANDBOX_READY == "sandbox_ready"
        assert EventType.PLAN_READY == "plan_ready"
        assert EventType.SCAFFOLD_START == "scaffold_start"
        assert EventType.SCAFFOLD_DONE == "scaffold_done"
        assert EventType.FILE_START == "file_start"
        assert EventType.FILE_DONE == "file_done"
        assert EventType.DEBUG_START == "debug_start"
        assert EventType.DEBUG_ITERATION == "debug_iteration"
        assert EventType.DEBUG_DONE == "debug_done"
        assert EventType.ERROR == "error"
        assert EventType.DONE == "done"
        assert EventType.DONE_FAILED == "done_failed"
    
    def test_event_type_is_string_enum(self):
        """Test that EventType values are strings."""
        assert isinstance(EventType.SANDBOX_READY.value, str)
        assert isinstance(EventType.FILE_DONE.value, str)


class TestProgressEvent:
    """Test suite for ProgressEvent model."""
    
    def test_create_minimal_progress_event(self):
        """Test creating a progress event with only required fields."""
        event = ProgressEvent(event=EventType.SANDBOX_READY)
        
        assert event.event == EventType.SANDBOX_READY
        assert event.timestamp is not None
        assert event.data is None
        assert event.path is None
        assert event.lines is None
        assert event.progress is None
        assert event.sandbox_id is None
        assert event.viewer_url is None
    
    def test_create_sandbox_ready_event(self):
        """Test creating a sandbox_ready event with all relevant fields."""
        event = ProgressEvent(
            event=EventType.SANDBOX_READY,
            sandbox_id="sandbox-123",
            viewer_url="https://e2b.dev/sandbox/sandbox-123/files"
        )
        
        assert event.event == EventType.SANDBOX_READY
        assert event.sandbox_id == "sandbox-123"
        assert event.viewer_url == "https://e2b.dev/sandbox/sandbox-123/files"
    
    def test_create_file_done_event(self):
        """Test creating a file_done event with path and lines."""
        event = ProgressEvent(
            event=EventType.FILE_DONE,
            path="src/App.tsx",
            lines=42,
            progress=0.5
        )
        
        assert event.event == EventType.FILE_DONE
        assert event.path == "src/App.tsx"
        assert event.lines == 42
        assert event.progress == 0.5
    
    def test_create_error_event(self):
        """Test creating an error event with data message."""
        event = ProgressEvent(
            event=EventType.ERROR,
            data="Rate limit exceeded, waiting 2s..."
        )
        
        assert event.event == EventType.ERROR
        assert event.data == "Rate limit exceeded, waiting 2s..."
    
    def test_timestamp_is_iso_8601_format(self):
        """Test that timestamp is in ISO 8601 format."""
        event = ProgressEvent(event=EventType.PLAN_READY)
        
        # Should be parseable as ISO 8601
        parsed = datetime.fromisoformat(event.timestamp.replace('Z', '+00:00'))
        assert isinstance(parsed, datetime)
    
    def test_timestamp_is_utc(self):
        """Test that timestamp is in UTC timezone."""
        event = ProgressEvent(event=EventType.PLAN_READY)
        
        # ISO 8601 UTC timestamps end with 'Z' or '+00:00'
        assert event.timestamp.endswith('+00:00') or event.timestamp.endswith('Z')
    
    def test_custom_timestamp(self):
        """Test creating event with custom timestamp."""
        custom_time = "2024-01-15T10:30:00+00:00"
        event = ProgressEvent(
            event=EventType.FILE_START,
            timestamp=custom_time
        )
        
        assert event.timestamp == custom_time
    
    def test_progress_must_be_between_0_and_1(self):
        """Test that progress must be in range [0.0, 1.0]."""
        # Valid progress values
        event1 = ProgressEvent(event=EventType.FILE_DONE, progress=0.0)
        assert event1.progress == 0.0
        
        event2 = ProgressEvent(event=EventType.FILE_DONE, progress=0.5)
        assert event2.progress == 0.5
        
        event3 = ProgressEvent(event=EventType.FILE_DONE, progress=1.0)
        assert event3.progress == 1.0
    
    def test_progress_greater_than_1_raises_validation_error(self):
        """Test that progress > 1.0 raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            ProgressEvent(event=EventType.FILE_DONE, progress=1.5)
        
        assert "progress" in str(exc_info.value)
    
    def test_progress_less_than_0_raises_validation_error(self):
        """Test that progress < 0.0 raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            ProgressEvent(event=EventType.FILE_DONE, progress=-0.1)
        
        assert "progress" in str(exc_info.value)
    
    def test_lines_must_be_non_negative(self):
        """Test that lines must be >= 0."""
        # Valid lines values
        event1 = ProgressEvent(event=EventType.FILE_DONE, lines=0)
        assert event1.lines == 0
        
        event2 = ProgressEvent(event=EventType.FILE_DONE, lines=100)
        assert event2.lines == 100
    
    def test_negative_lines_raises_validation_error(self):
        """Test that negative lines raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            ProgressEvent(event=EventType.FILE_DONE, lines=-5)
        
        assert "lines" in str(exc_info.value)
    
    def test_to_json_returns_valid_json_string(self):
        """Test that to_json() returns valid JSON string."""
        event = ProgressEvent(
            event=EventType.FILE_DONE,
            path="src/App.tsx",
            lines=42,
            progress=0.5
        )
        
        json_str = event.to_json()
        
        # Should be valid JSON
        parsed = json.loads(json_str)
        assert parsed["event"] == "file_done"
        assert parsed["path"] == "src/App.tsx"
        assert parsed["lines"] == 42
        assert parsed["progress"] == 0.5
    
    def test_to_json_excludes_none_values(self):
        """Test that to_json() excludes None values."""
        event = ProgressEvent(
            event=EventType.SANDBOX_READY,
            sandbox_id="sandbox-123"
        )
        
        json_str = event.to_json()
        parsed = json.loads(json_str)
        
        # Should include non-None fields
        assert "event" in parsed
        assert "timestamp" in parsed
        assert "sandbox_id" in parsed
        
        # Should exclude None fields
        assert "data" not in parsed
        assert "path" not in parsed
        assert "lines" not in parsed
        assert "progress" not in parsed
        assert "viewer_url" not in parsed
    
    def test_model_serialization(self):
        """Test that model can be serialized to dict."""
        event = ProgressEvent(
            event=EventType.DEBUG_ITERATION,
            data="Running project (attempt 2/5)...",
            progress=0.85
        )
        
        data = event.model_dump()
        
        assert data["event"] == EventType.DEBUG_ITERATION
        assert data["data"] == "Running project (attempt 2/5)..."
        assert data["progress"] == 0.85
    
    def test_model_deserialization(self):
        """Test that model can be deserialized from dict."""
        data = {
            "event": "file_done",
            "timestamp": "2024-01-15T10:30:00+00:00",
            "path": "src/App.tsx",
            "lines": 42,
            "progress": 0.5
        }
        
        event = ProgressEvent(**data)
        
        assert event.event == EventType.FILE_DONE
        assert event.timestamp == "2024-01-15T10:30:00+00:00"
        assert event.path == "src/App.tsx"
        assert event.lines == 42
        assert event.progress == 0.5
    
    def test_all_event_types_can_be_created(self):
        """Test that events can be created for all EventType values."""
        for event_type in EventType:
            event = ProgressEvent(event=event_type)
            assert event.event == event_type
    
    def test_missing_required_event_field_raises_validation_error(self):
        """Test that missing event field raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            ProgressEvent()
        
        assert "event" in str(exc_info.value)
