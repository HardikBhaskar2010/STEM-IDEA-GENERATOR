"""
Unit tests for GenerationState data model.

Tests GenerationState model including validation, save(), and load() methods.

Requirements: 12.2, 12.3
"""

from datetime import datetime, timezone
from unittest.mock import Mock

import pytest
from pydantic import ValidationError

from backend.models.generation_state import GenerationState


class TestGenerationStateBasic:
    """Test GenerationState model basic functionality."""

    def test_generation_state_basic_creation(self):
        """Test creating a GenerationState with required fields."""
        state = GenerationState(
            sandbox_id="sandbox-123",
            project_id="project-456",
            phase="planning",
        )
        assert state.sandbox_id == "sandbox-123"
        assert state.project_id == "project-456"
        assert state.phase == "planning"
        assert state.plan is None
        assert state.files_created == []
        assert state.commands_executed == []
        assert state.debug_iterations == 0
        assert state.max_debug_iterations == 5
        assert state.last_error is None

    def test_generation_state_with_all_fields(self):
        """Test creating a GenerationState with all fields populated."""
        plan_data = {
            "project_title": "Todo App",
            "project_description": "A simple todo app",
            "platform": "web",
            "tech_stack": ["React", "TypeScript"],
            "estimated_file_count": 15,
        }
        
        state = GenerationState(
            sandbox_id="sandbox-123",
            project_id="project-456",
            phase="files",
            plan=plan_data,
            files_created=["src/App.tsx", "src/index.tsx"],
            commands_executed=["npm install", "npm run build"],
            debug_iterations=2,
            max_debug_iterations=5,
            last_error="Type error in App.tsx",
        )
        
        assert state.phase == "files"
        assert state.plan == plan_data
        assert len(state.files_created) == 2
        assert "src/App.tsx" in state.files_created
        assert len(state.commands_executed) == 2
        assert "npm install" in state.commands_executed
        assert state.debug_iterations == 2
        assert state.last_error == "Type error in App.tsx"

    def test_generation_state_requires_sandbox_id(self):
        """Test that sandbox_id is required."""
        with pytest.raises(ValidationError):
            GenerationState(
                project_id="project-456",
                phase="planning",
            )

    def test_generation_state_requires_project_id(self):
        """Test that project_id is required."""
        with pytest.raises(ValidationError):
            GenerationState(
                sandbox_id="sandbox-123",
                phase="planning",
            )

    def test_generation_state_requires_phase(self):
        """Test that phase is required."""
        with pytest.raises(ValidationError):
            GenerationState(
                sandbox_id="sandbox-123",
                project_id="project-456",
            )

    def test_generation_state_default_values(self):
        """Test that default values are set correctly."""
        state = GenerationState(
            sandbox_id="sandbox-123",
            project_id="project-456",
            phase="sandbox",
        )
        
        assert state.files_created == []
        assert state.commands_executed == []
        assert state.debug_iterations == 0
        assert state.max_debug_iterations == 5
        assert state.plan is None
        assert state.last_error is None


class TestGenerationStateTimestamps:
    """Test GenerationState timestamp handling."""

    def test_generation_state_auto_creates_timestamps(self):
        """Test that created_at and updated_at are automatically set."""
        state = GenerationState(
            sandbox_id="sandbox-123",
            project_id="project-456",
            phase="planning",
        )
        
        assert state.created_at is not None
        assert state.updated_at is not None
        
        # Verify timestamps are valid ISO 8601 format
        datetime.fromisoformat(state.created_at.replace("Z", "+00:00"))
        datetime.fromisoformat(state.updated_at.replace("Z", "+00:00"))

    def test_generation_state_timestamps_are_iso8601(self):
        """Test that timestamps follow ISO 8601 format."""
        state = GenerationState(
            sandbox_id="sandbox-123",
            project_id="project-456",
            phase="planning",
        )
        
        # Should be parseable as ISO 8601
        created = datetime.fromisoformat(state.created_at.replace("Z", "+00:00"))
        updated = datetime.fromisoformat(state.updated_at.replace("Z", "+00:00"))
        
        assert isinstance(created, datetime)
        assert isinstance(updated, datetime)

    def test_generation_state_can_set_custom_timestamps(self):
        """Test that custom timestamps can be provided."""
        custom_time = "2024-01-15T10:30:00+00:00"
        
        state = GenerationState(
            sandbox_id="sandbox-123",
            project_id="project-456",
            phase="planning",
            created_at=custom_time,
            updated_at=custom_time,
        )
        
        assert state.created_at == custom_time
        assert state.updated_at == custom_time


class TestGenerationStatePhases:
    """Test GenerationState phase tracking (Requirement 12.2)."""

    def test_generation_state_sandbox_phase(self):
        """Test state in sandbox phase."""
        state = GenerationState(
            sandbox_id="sandbox-123",
            project_id="project-456",
            phase="sandbox",
        )
        assert state.phase == "sandbox"

    def test_generation_state_planning_phase(self):
        """Test state in planning phase."""
        state = GenerationState(
            sandbox_id="sandbox-123",
            project_id="project-456",
            phase="planning",
        )
        assert state.phase == "planning"

    def test_generation_state_scaffolding_phase(self):
        """Test state in scaffolding phase."""
        state = GenerationState(
            sandbox_id="sandbox-123",
            project_id="project-456",
            phase="scaffolding",
            commands_executed=["npm create vite@latest"],
        )
        assert state.phase == "scaffolding"
        assert len(state.commands_executed) == 1

    def test_generation_state_files_phase(self):
        """Test state in files phase."""
        state = GenerationState(
            sandbox_id="sandbox-123",
            project_id="project-456",
            phase="files",
            files_created=["src/App.tsx", "src/index.tsx", "package.json"],
        )
        assert state.phase == "files"
        assert len(state.files_created) == 3

    def test_generation_state_debugging_phase(self):
        """Test state in debugging phase."""
        state = GenerationState(
            sandbox_id="sandbox-123",
            project_id="project-456",
            phase="debugging",
            debug_iterations=2,
            last_error="Build failed: missing dependency",
        )
        assert state.phase == "debugging"
        assert state.debug_iterations == 2
        assert state.last_error is not None


class TestGenerationStateProgressTracking:
    """Test GenerationState progress tracking (Requirement 12.3)."""

    def test_generation_state_tracks_files_created(self):
        """Test that files_created list tracks file creation progress."""
        state = GenerationState(
            sandbox_id="sandbox-123",
            project_id="project-456",
            phase="files",
            files_created=[
                "package.json",
                "tsconfig.json",
                "src/App.tsx",
                "src/index.tsx",
                "src/components/Button.tsx",
            ],
        )
        
        assert len(state.files_created) == 5
        assert "package.json" in state.files_created
        assert "src/App.tsx" in state.files_created

    def test_generation_state_tracks_commands_executed(self):
        """Test that commands_executed list tracks command execution progress."""
        state = GenerationState(
            sandbox_id="sandbox-123",
            project_id="project-456",
            phase="scaffolding",
            commands_executed=[
                "npm create vite@latest my-app -- --template react-ts",
                "cd my-app",
                "npm install",
            ],
        )
        
        assert len(state.commands_executed) == 3
        assert "npm install" in state.commands_executed

    def test_generation_state_tracks_debug_iterations(self):
        """Test that debug_iterations tracks debugging progress."""
        state = GenerationState(
            sandbox_id="sandbox-123",
            project_id="project-456",
            phase="debugging",
            debug_iterations=3,
            max_debug_iterations=5,
        )
        
        assert state.debug_iterations == 3
        assert state.max_debug_iterations == 5
        # Still has 2 iterations remaining
        assert state.debug_iterations < state.max_debug_iterations

    def test_generation_state_tracks_last_error(self):
        """Test that last_error captures error information."""
        error_msg = "TypeError: Cannot read property 'map' of undefined at App.tsx:42"
        
        state = GenerationState(
            sandbox_id="sandbox-123",
            project_id="project-456",
            phase="debugging",
            last_error=error_msg,
        )
        
        assert state.last_error == error_msg


class TestGenerationStateSaveMethod:
    """Test GenerationState.save() method (Requirement 12.3)."""

    def test_save_calls_store_with_correct_parameters(self):
        """Test that save() calls store.save_generation_state with correct args."""
        mock_store = Mock()
        
        state = GenerationState(
            sandbox_id="sandbox-123",
            project_id="project-456",
            phase="planning",
        )
        
        state.save(mock_store)
        
        mock_store.save_generation_state.assert_called_once_with(
            "project-456", state
        )

    def test_save_updates_timestamp(self):
        """Test that save() updates the updated_at timestamp."""
        mock_store = Mock()
        
        state = GenerationState(
            sandbox_id="sandbox-123",
            project_id="project-456",
            phase="planning",
            updated_at="2024-01-01T00:00:00+00:00",
        )
        
        old_timestamp = state.updated_at
        state.save(mock_store)
        
        # updated_at should be different after save
        assert state.updated_at != old_timestamp

    def test_save_preserves_state_data(self):
        """Test that save() preserves all state data."""
        mock_store = Mock()
        
        state = GenerationState(
            sandbox_id="sandbox-123",
            project_id="project-456",
            phase="files",
            files_created=["src/App.tsx", "src/index.tsx"],
            commands_executed=["npm install"],
            debug_iterations=1,
        )
        
        state.save(mock_store)
        
        # Verify state data is unchanged (except updated_at)
        assert state.sandbox_id == "sandbox-123"
        assert state.project_id == "project-456"
        assert state.phase == "files"
        assert len(state.files_created) == 2
        assert len(state.commands_executed) == 1
        assert state.debug_iterations == 1


class TestGenerationStateLoadMethod:
    """Test GenerationState.load() classmethod (Requirement 12.3)."""

    def test_load_calls_store_with_project_id(self):
        """Test that load() calls store.load_generation_state with project_id."""
        mock_store = Mock()
        mock_store.load_generation_state.return_value = None
        
        GenerationState.load("project-456", mock_store)
        
        mock_store.load_generation_state.assert_called_once_with("project-456")

    def test_load_returns_state_when_found(self):
        """Test that load() returns GenerationState when found in store."""
        mock_store = Mock()
        
        expected_state = GenerationState(
            sandbox_id="sandbox-123",
            project_id="project-456",
            phase="files",
            files_created=["src/App.tsx"],
        )
        
        mock_store.load_generation_state.return_value = expected_state
        
        result = GenerationState.load("project-456", mock_store)
        
        assert result is not None
        assert result.sandbox_id == "sandbox-123"
        assert result.project_id == "project-456"
        assert result.phase == "files"
        assert len(result.files_created) == 1

    def test_load_returns_none_when_not_found(self):
        """Test that load() returns None when state not found in store."""
        mock_store = Mock()
        mock_store.load_generation_state.return_value = None
        
        result = GenerationState.load("nonexistent-project", mock_store)
        
        assert result is None

    def test_load_preserves_all_state_fields(self):
        """Test that load() preserves all state fields."""
        mock_store = Mock()
        
        original_state = GenerationState(
            sandbox_id="sandbox-789",
            project_id="project-999",
            phase="debugging",
            plan={"project_title": "Test App"},
            files_created=["file1.ts", "file2.ts", "file3.ts"],
            commands_executed=["npm install", "npm run build"],
            debug_iterations=3,
            max_debug_iterations=5,
            last_error="Build error",
            created_at="2024-01-01T10:00:00+00:00",
            updated_at="2024-01-01T11:00:00+00:00",
        )
        
        mock_store.load_generation_state.return_value = original_state
        
        loaded_state = GenerationState.load("project-999", mock_store)
        
        assert loaded_state.sandbox_id == "sandbox-789"
        assert loaded_state.project_id == "project-999"
        assert loaded_state.phase == "debugging"
        assert loaded_state.plan == {"project_title": "Test App"}
        assert len(loaded_state.files_created) == 3
        assert len(loaded_state.commands_executed) == 2
        assert loaded_state.debug_iterations == 3
        assert loaded_state.max_debug_iterations == 5
        assert loaded_state.last_error == "Build error"
        assert loaded_state.created_at == "2024-01-01T10:00:00+00:00"
        assert loaded_state.updated_at == "2024-01-01T11:00:00+00:00"


class TestGenerationStateResumability:
    """Test GenerationState resumability scenarios (Requirement 12.2, 12.3)."""

    def test_state_can_resume_from_planning_phase(self):
        """Test that state can be saved and loaded during planning phase."""
        mock_store = Mock()
        
        # Save state during planning
        state = GenerationState(
            sandbox_id="sandbox-123",
            project_id="project-456",
            phase="planning",
            plan={"project_title": "Todo App"},
        )
        state.save(mock_store)
        
        # Simulate loading state to resume
        mock_store.load_generation_state.return_value = state
        loaded_state = GenerationState.load("project-456", mock_store)
        
        assert loaded_state.phase == "planning"
        assert loaded_state.plan is not None

    def test_state_can_resume_from_files_phase(self):
        """Test that state can be saved and loaded during files phase."""
        mock_store = Mock()
        
        # Save state during file creation
        state = GenerationState(
            sandbox_id="sandbox-123",
            project_id="project-456",
            phase="files",
            files_created=["package.json", "src/App.tsx", "src/index.tsx"],
        )
        state.save(mock_store)
        
        # Simulate loading state to resume
        mock_store.load_generation_state.return_value = state
        loaded_state = GenerationState.load("project-456", mock_store)
        
        assert loaded_state.phase == "files"
        assert len(loaded_state.files_created) == 3
        # Can determine which files still need to be created

    def test_state_can_resume_from_debugging_phase(self):
        """Test that state can be saved and loaded during debugging phase."""
        mock_store = Mock()
        
        # Save state during debugging
        state = GenerationState(
            sandbox_id="sandbox-123",
            project_id="project-456",
            phase="debugging",
            debug_iterations=2,
            last_error="Type error in App.tsx",
        )
        state.save(mock_store)
        
        # Simulate loading state to resume
        mock_store.load_generation_state.return_value = state
        loaded_state = GenerationState.load("project-456", mock_store)
        
        assert loaded_state.phase == "debugging"
        assert loaded_state.debug_iterations == 2
        assert loaded_state.last_error is not None
        # Can continue debugging from iteration 3
