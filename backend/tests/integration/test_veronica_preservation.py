"""
Preservation Property Tests for Veronica Stream Generation Fix

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

This test suite verifies that non-streaming endpoints continue to work correctly
on the UNFIXED code. These tests should PASS on unfixed code to establish the
baseline behavior that must be preserved.

Property 2: Preservation - Non-Streaming Endpoints Unchanged

For any request that does NOT use the streaming endpoint, the system SHALL
produce exactly the same behavior as before, preserving all existing functionality.
"""

import json
import os
import tempfile
from pathlib import Path
from typing import Dict, Any
from unittest.mock import AsyncMock, MagicMock

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from fastapi.testclient import TestClient
from fastapi import FastAPI

from backend.routers.veronica import veronica_router
from backend.core.dependencies import get_veronica_orchestrator
from backend.orchestration.veronica_orchestrator import VeronicaOrchestrator
from backend.integrations.openrouter.client import OpenRouterClient


# ---------------------------------------------------------------------------
# Test Helpers
# ---------------------------------------------------------------------------

def create_mock_openrouter() -> MagicMock:
    """Create a mocked OpenRouter client with realistic responses."""
    mock_openrouter = MagicMock(spec=OpenRouterClient)
    
    async def mock_chat_completion(messages, **kwargs):
        # Extract project_id from the prompt if present
        prompt = messages[0]["content"] if messages else ""
        import re
        project_id_match = re.search(r'"project_id":\s*"([^"]+)"', prompt)
        project_id = project_id_match.group(1) if project_id_match else "test-project-id-12345"
        
        # Extract message content to generate appropriate response
        message_content = ""
        for msg in messages:
            if msg.get("role") == "user":
                message_content = msg.get("content", "")
                break
        
        return json.dumps({
            "project_id": project_id,
            "title": "Test Project",
            "platform": "web",
            "difficulty": "beginner",
            "summary": "A test project",
            "learning_goals": ["Learn testing"],
            "steps": ["Step 1: Write code"],
            "materials": [],
            "wiring": {"overview": "", "connections": [], "notes": []},
            "files": [
                {
                    "path": "index.html",
                    "content": "<html><body>Hello World</body></html>",
                    "is_main": True
                },
                {
                    "path": "style.css",
                    "content": "body { margin: 0; }",
                    "is_main": False
                }
            ],
            "readme": "# Test Project\n\nGenerated for testing.",
            "meta": {}
        })
    
    mock_openrouter.chat_completion = AsyncMock(side_effect=mock_chat_completion)
    return mock_openrouter


def create_test_app(orchestrator: VeronicaOrchestrator) -> FastAPI:
    """Create a FastAPI app with the veronica router and dependency override."""
    from backend.core.rate_limit import get_rate_limiter, RateLimitConfig
    
    app = FastAPI()
    app.include_router(veronica_router)
    app.dependency_overrides[get_veronica_orchestrator] = lambda: orchestrator
    
    # Disable rate limiting for tests
    mock_limiter = MagicMock(spec=RateLimitConfig)
    mock_limiter.check_rate_limit = AsyncMock(return_value=None)
    app.dependency_overrides[get_rate_limiter] = lambda: mock_limiter
    
    return app


# ---------------------------------------------------------------------------
# Property 1: Synchronous Project Generation Preservation
# ---------------------------------------------------------------------------

@given(
    message=st.one_of(
        st.just("Build me a todo app"),
        st.just("Create a calculator"),
        st.just("Make a weather app"),
        st.just("Build a simple game"),
        st.just("Create a portfolio site"),
    )
)
@settings(
    max_examples=5,
    deadline=60000,
    suppress_health_check=[HealthCheck.function_scoped_fixture, HealthCheck.too_slow],
)
def test_synchronous_generation_preserves_behavior(message: str):
    """
    Property 2.1: Synchronous Generation Preservation
    
    **Validates: Requirement 3.1, 3.2**
    
    For any synchronous project generation request via `/api/veronica-projects/generate`,
    the system SHALL:
    1. Generate and save projects correctly to disk
    2. Return complete project data in the response
    3. Create spec.json and all project files
    
    This test should PASS on unfixed code to establish baseline behavior.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        os.environ["VERONICA_PROJECT_DIR"] = tmpdir
        
        mock_openrouter = create_mock_openrouter()
        orchestrator = VeronicaOrchestrator(openrouter_client=mock_openrouter)
        app = create_test_app(orchestrator)
        
        with TestClient(app) as client:
            response = client.post(
                "/api/veronica-projects/generate",
                json={"message": message},
                timeout=30.0,
            )
            
            # Assert: Synchronous generation returns 200 OK
            assert response.status_code == 200, (
                f"Synchronous generation failed with status {response.status_code}\n"
                f"Message: {message!r}\n"
                f"Response: {response.text[:500]}"
            )
            
            data = response.json()
            
            # Assert: Response contains expected fields
            assert "intent" in data, f"Response missing 'intent' field: {data}"
            assert "project" in data, f"Response missing 'project' field: {data}"
            assert data["project"] is not None, f"Project is None for message: {message!r}"
            
            project = data["project"]
            project_id = project.get("project_id")
            assert project_id, f"Project missing 'project_id': {project}"
            
            # Assert: Project files are saved to disk
            spec_path = Path(tmpdir) / "projects" / project_id / "spec.json"
            assert spec_path.exists(), (
                f"spec.json not saved to disk at {spec_path}\n"
                f"Message: {message!r}\n"
                f"Project ID: {project_id}"
            )
            
            # Assert: Project files directory exists
            files_dir = Path(tmpdir) / "projects" / project_id / "files"
            assert files_dir.exists(), (
                f"Files directory not created at {files_dir}\n"
                f"Message: {message!r}\n"
                f"Project ID: {project_id}"
            )
            
            # Assert: Files are materialized on disk
            files_on_disk = list(files_dir.glob("**/*"))
            files_on_disk = [f for f in files_on_disk if f.is_file()]
            assert len(files_on_disk) > 0, (
                f"No files materialized on disk\n"
                f"Files directory: {files_dir}\n"
                f"Message: {message!r}"
            )
            
            # Assert: Response includes actions
            assert "actions" in data, f"Response missing 'actions' field: {data}"
            assert len(data["actions"]) > 0, f"No actions in response: {data}"


# ---------------------------------------------------------------------------
# Property 2: Chat-Only Interactions Preservation
# ---------------------------------------------------------------------------

@given(
    message=st.one_of(
        st.just(""),  # Empty message
        st.just("   "),  # Whitespace only
    )
)
@settings(
    max_examples=2,
    deadline=30000,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def test_chat_only_no_project_generation(message: str):
    """
    Property 2.2: Chat-Only Interactions Preservation
    
    **Validates: Requirement 3.2**
    
    For chat-only requests (empty or whitespace-only messages), the system SHALL:
    1. Return IDEA_ONLY intent
    2. NOT trigger project generation
    3. NOT create any project files on disk
    
    This test should PASS on unfixed code to establish baseline behavior.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        os.environ["VERONICA_PROJECT_DIR"] = tmpdir
        
        mock_openrouter = create_mock_openrouter()
        orchestrator = VeronicaOrchestrator(openrouter_client=mock_openrouter)
        app = create_test_app(orchestrator)
        
        with TestClient(app) as client:
            response = client.post(
                "/api/veronica-projects/generate",
                json={"message": message},
                timeout=30.0,
            )
            
            # Assert: Request succeeds
            assert response.status_code == 200, (
                f"Chat-only request failed with status {response.status_code}\n"
                f"Message: {message!r}"
            )
            
            data = response.json()
            
            # Assert: Intent is IDEA_ONLY (no project generation)
            assert data.get("intent") == "IDEA_ONLY", (
                f"Expected IDEA_ONLY intent for empty message, got {data.get('intent')}\n"
                f"Message: {message!r}\n"
                f"Response: {data}"
            )
            
            # Assert: No project is generated
            assert data.get("project") is None, (
                f"Project should be None for empty message\n"
                f"Message: {message!r}\n"
                f"Response: {data}"
            )
            
            # Assert: No project files created on disk
            projects_dir = Path(tmpdir) / "projects"
            if projects_dir.exists():
                project_dirs = list(projects_dir.iterdir())
                assert len(project_dirs) == 0, (
                    f"No project directories should be created for empty message\n"
                    f"Found: {project_dirs}\n"
                    f"Message: {message!r}"
                )


# ---------------------------------------------------------------------------
# Property 3: File Operations Preservation
# ---------------------------------------------------------------------------

def test_file_update_preserves_behavior():
    """
    Property 2.3: File Operations Preservation
    
    **Validates: Requirement 3.3**
    
    For file update operations, the system SHALL:
    1. Accept file update requests
    2. Return success response
    3. Maintain existing file update behavior
    
    This test should PASS on unfixed code to establish baseline behavior.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        os.environ["VERONICA_PROJECT_DIR"] = tmpdir
        
        # First, create a project
        mock_openrouter = create_mock_openrouter()
        orchestrator = VeronicaOrchestrator(openrouter_client=mock_openrouter)
        app = create_test_app(orchestrator)
        
        with TestClient(app) as client:
            # Generate a project first
            gen_response = client.post(
                "/api/veronica-projects/generate",
                json={"message": "Build a test app"},
                timeout=30.0,
            )
            assert gen_response.status_code == 200
            project_data = gen_response.json()
            project_id = project_data["project"]["project_id"]
            
            # Now test file update
            update_response = client.put(
                f"/api/veronica-projects/{project_id}/files",
                json={
                    "path": "index.html",
                    "content": "<html><body>Updated content</body></html>"
                },
                timeout=30.0,
            )
            
            # Assert: File update succeeds
            assert update_response.status_code == 200, (
                f"File update failed with status {update_response.status_code}\n"
                f"Project ID: {project_id}\n"
                f"Response: {update_response.text[:500]}"
            )
            
            update_data = update_response.json()
            
            # Assert: Response indicates success
            assert "status" in update_data or "success" in update_data or "path" in update_data, (
                f"File update response missing expected fields: {update_data}"
            )


def test_project_download_preserves_behavior():
    """
    Property 2.4: Project Download Preservation
    
    **Validates: Requirement 3.3**
    
    For project download operations, the system SHALL:
    1. Generate ZIP archives correctly
    2. Return ZIP file with correct content-type
    3. Maintain existing download behavior
    
    This test should PASS on unfixed code to establish baseline behavior.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        os.environ["VERONICA_PROJECT_DIR"] = tmpdir
        
        mock_openrouter = create_mock_openrouter()
        orchestrator = VeronicaOrchestrator(openrouter_client=mock_openrouter)
        app = create_test_app(orchestrator)
        
        with TestClient(app) as client:
            # Generate a project first
            gen_response = client.post(
                "/api/veronica-projects/generate",
                json={"message": "Build a test app"},
                timeout=30.0,
            )
            assert gen_response.status_code == 200
            project_data = gen_response.json()
            project_id = project_data["project"]["project_id"]
            
            # Now test download
            download_response = client.get(
                f"/api/veronica-projects/{project_id}/download/zip",
                timeout=30.0,
            )
            
            # Assert: Download succeeds
            assert download_response.status_code == 200, (
                f"Project download failed with status {download_response.status_code}\n"
                f"Project ID: {project_id}"
            )
            
            # Assert: Response is a ZIP file
            assert download_response.headers.get("content-type") == "application/zip", (
                f"Expected application/zip content-type, got {download_response.headers.get('content-type')}"
            )
            
            # Assert: ZIP file has content
            assert len(download_response.content) > 0, (
                f"ZIP file is empty for project {project_id}"
            )


# ---------------------------------------------------------------------------
# Property 4: Memory and Mentor Operations Preservation
# ---------------------------------------------------------------------------

def test_mentor_suggestions_preserves_behavior():
    """
    Property 2.5: Mentor Operations Preservation
    
    **Validates: Requirement 3.5**
    
    For mentor suggestion operations, the system SHALL:
    1. Accept mentor requests
    2. Return suggestions
    3. Maintain existing mentor behavior
    
    This test should PASS on unfixed code to establish baseline behavior.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        os.environ["VERONICA_PROJECT_DIR"] = tmpdir
        
        mock_openrouter = create_mock_openrouter()
        orchestrator = VeronicaOrchestrator(openrouter_client=mock_openrouter)
        app = create_test_app(orchestrator)
        
        with TestClient(app) as client:
            # Generate a project first
            gen_response = client.post(
                "/api/veronica-projects/generate",
                json={"message": "Build a test app"},
                timeout=30.0,
            )
            assert gen_response.status_code == 200
            project_data = gen_response.json()
            project_id = project_data["project"]["project_id"]
            
            # Now test mentor suggestions
            mentor_response = client.get(
                f"/api/veronica-projects/{project_id}/mentor",
                timeout=30.0,
            )
            
            # Assert: Mentor request succeeds
            assert mentor_response.status_code == 200, (
                f"Mentor request failed with status {mentor_response.status_code}\n"
                f"Project ID: {project_id}"
            )
            
            mentor_data = mentor_response.json()
            
            # Assert: Response contains expected fields
            assert "project_id" in mentor_data or "suggestions" in mentor_data, (
                f"Mentor response missing expected fields: {mentor_data}"
            )


# ---------------------------------------------------------------------------
# Simple Unit Tests: Concrete Preservation Cases
# ---------------------------------------------------------------------------

def test_simple_synchronous_generation():
    """
    Concrete test for synchronous generation preservation.
    
    **Validates: Requirements 3.1, 3.2**
    
    This is a simpler, non-property-based version for easier debugging.
    Should PASS on unfixed code.
    """
    message = "Build me a todo app"
    
    with tempfile.TemporaryDirectory() as tmpdir:
        os.environ["VERONICA_PROJECT_DIR"] = tmpdir
        
        mock_openrouter = create_mock_openrouter()
        orchestrator = VeronicaOrchestrator(openrouter_client=mock_openrouter)
        app = create_test_app(orchestrator)
        
        with TestClient(app) as client:
            response = client.post(
                "/api/veronica-projects/generate",
                json={"message": message},
                timeout=30.0,
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "project" in data
            assert data["project"] is not None
            
            project_id = data["project"]["project_id"]
            spec_path = Path(tmpdir) / "projects" / project_id / "spec.json"
            assert spec_path.exists(), f"spec.json not found at {spec_path}"
            
            files_dir = Path(tmpdir) / "projects" / project_id / "files"
            assert files_dir.exists(), f"Files directory not found at {files_dir}"


def test_simple_chat_only():
    """
    Concrete test for chat-only preservation.
    
    **Validates: Requirement 3.2**
    
    Should PASS on unfixed code.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        os.environ["VERONICA_PROJECT_DIR"] = tmpdir
        
        mock_openrouter = create_mock_openrouter()
        orchestrator = VeronicaOrchestrator(openrouter_client=mock_openrouter)
        app = create_test_app(orchestrator)
        
        with TestClient(app) as client:
            response = client.post(
                "/api/veronica-projects/generate",
                json={"message": ""},
                timeout=30.0,
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data.get("intent") == "IDEA_ONLY"
            assert data.get("project") is None
