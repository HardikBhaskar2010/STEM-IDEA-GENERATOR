"""
Bug Condition Exploration Test for Veronica Stream Generation Fix

**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

This test encodes the EXPECTED BEHAVIOR for streaming project generation.
It MUST FAIL on unfixed code to confirm the bug exists.

Property 1: Bug Condition - Streaming Generation Yields All Events

For any request to `/api/veronica-projects/generate/agent-stream` with a valid message,
the system SHALL yield all SSE events (plan, file_start, file_done, done) to the frontend,
save the project spec and files to disk, and ensure the "done" event with complete project
data is received before the stream closes.

CRITICAL: This test is EXPECTED TO FAIL on unfixed code.
When it fails, it proves the bug exists and surfaces counterexamples.
"""

import json
import os
import tempfile
from pathlib import Path
from typing import List, Dict, Any
from unittest.mock import AsyncMock, MagicMock

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from fastapi.testclient import TestClient
from fastapi import FastAPI

from backend.routers.veronica import veronica_router
from backend.core.dependencies import get_veronica_orchestrator
from backend.orchestration.veronica_orchestrator import VeronicaOrchestrator
from backend.integrations.openrouter.client import OpenRouterClient
from backend.core.config import OpenRouterConfig


# ---------------------------------------------------------------------------
# Test Helpers
# ---------------------------------------------------------------------------

def parse_sse_events(sse_text: str) -> List[Dict[str, Any]]:
    """Parse SSE text into a list of event objects."""
    events = []
    for line in sse_text.strip().split("\n"):
        if line.startswith("data: "):
            try:
                event_data = json.loads(line[6:])  # Remove "data: " prefix
                events.append(event_data)
            except json.JSONDecodeError:
                pass  # Skip malformed events
    return events


def verify_event_sequence(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Verify that events follow the expected sequence and structure.
    Returns a dict with verification results.
    """
    result = {
        "has_events": len(events) > 0,
        "has_plan": False,
        "has_file_events": False,
        "has_done": False,
        "done_event": None,
        "file_pairs": [],
        "event_types": [e.get("event") for e in events],
    }

    file_starts = []
    file_dones = []

    for event in events:
        event_type = event.get("event")
        
        if event_type == "plan":
            result["has_plan"] = True
        
        elif event_type == "file_start":
            file_starts.append(event.get("path"))
        
        elif event_type == "file_done":
            file_dones.append(event.get("path"))
        
        elif event_type == "done":
            result["has_done"] = True
            result["done_event"] = event

    # Check for file_start/file_done pairs
    if file_starts and file_dones:
        result["has_file_events"] = True
        result["file_pairs"] = list(zip(file_starts, file_dones))

    return result


# ---------------------------------------------------------------------------
# Property-Based Test: Bug Condition Exploration
# ---------------------------------------------------------------------------

@given(
    message=st.one_of(
        st.just("Build me a simple todo app"),
        st.just("Create a calculator app"),
        st.just("Make a weather dashboard"),
        st.just("Build a hello world project"),
        st.just("Create a simple web app"),
    )
)
@settings(
    max_examples=5,  # Limited examples for bug exploration
    deadline=60000,  # 60 second timeout per example
    suppress_health_check=[HealthCheck.function_scoped_fixture, HealthCheck.too_slow],
)
def test_streaming_generation_yields_all_events(message: str):
    """
    Property 1: Bug Condition - Streaming Generation Yields All Events
    
    **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
    
    CRITICAL: This test MUST FAIL on unfixed code.
    
    For any valid project generation request, the streaming endpoint SHALL:
    1. Yield SSE events (plan, file_start, file_done, done)
    2. Save project files to disk
    3. Include complete project data in the "done" event
    
    Expected counterexamples on unfixed code:
    - No events received (events.length == 0)
    - Stream closes prematurely (missing done event)
    - Files not saved to disk
    - Incomplete event sequence
    """
    # Create temporary directory for this test
    with tempfile.TemporaryDirectory() as tmpdir:
        # Set up environment
        os.environ["VERONICA_PROJECT_DIR"] = tmpdir
        
        # Create mocked OpenRouter client
        mock_openrouter = MagicMock(spec=OpenRouterClient)
        
        # Mock the chat_completion method to return a valid project spec
        async def mock_chat_completion(messages, **kwargs):
            # Extract project_id from the prompt if present
            prompt = messages[0]["content"] if messages else ""
            import re
            project_id_match = re.search(r'"project_id":\s*"([^"]+)"', prompt)
            project_id = project_id_match.group(1) if project_id_match else "test-project-id-12345"
            
            return json.dumps({
                "project_id": project_id,
                "title": "Test Project",
                "platform": "web",
                "difficulty": "beginner",
                "summary": "A test project generated from: " + message,
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
        
        # Create orchestrator
        orchestrator = VeronicaOrchestrator(openrouter_client=mock_openrouter)
        
        # Create FastAPI app with dependency override
        app = FastAPI()
        app.include_router(veronica_router)
        app.dependency_overrides[get_veronica_orchestrator] = lambda: orchestrator
        
        # Make streaming request
        with TestClient(app) as client:
            response = client.post(
                "/api/veronica-projects/generate/agent-stream",
                json={"message": message},
                timeout=30.0,
            )
            
            # Collect SSE events
            sse_text = response.text
            events = parse_sse_events(sse_text)
            
            # Verify event sequence
            verification = verify_event_sequence(events)
            
            # ASSERTIONS - These encode the expected behavior
            # On unfixed code, these will FAIL and surface counterexamples
            
            # Assert 1: Events are received
            assert verification["has_events"], (
                f"COUNTEREXAMPLE: No events received for message: {message!r}\n"
                f"Response status: {response.status_code}\n"
                f"Response text: {sse_text[:500]}"
            )
            
            # Assert 2: Plan events are present
            assert verification["has_plan"], (
                f"COUNTEREXAMPLE: No 'plan' events received\n"
                f"Events received: {verification['event_types']}\n"
                f"Message: {message!r}"
            )
            
            # Assert 3: File events are present
            assert verification["has_file_events"], (
                f"COUNTEREXAMPLE: No file_start/file_done events received\n"
                f"Events received: {verification['event_types']}\n"
                f"Message: {message!r}"
            )
            
            # Assert 4: Done event is received
            assert verification["has_done"], (
                f"COUNTEREXAMPLE: No 'done' event received (stream closed prematurely)\n"
                f"Events received: {verification['event_types']}\n"
                f"Message: {message!r}"
            )
            
            # Assert 5: Done event contains project data
            done_event = verification["done_event"]
            assert done_event is not None, "Done event is None"
            assert "result" in done_event, (
                f"COUNTEREXAMPLE: 'done' event missing 'result' field\n"
                f"Done event: {done_event}\n"
                f"Message: {message!r}"
            )
            
            result = done_event["result"]
            assert "project" in result, (
                f"COUNTEREXAMPLE: 'done' event result missing 'project' field\n"
                f"Result: {result}\n"
                f"Message: {message!r}"
            )
            
            project = result["project"]
            project_id = project.get("project_id")
            assert project_id, (
                f"COUNTEREXAMPLE: Project missing 'project_id'\n"
                f"Project: {project}\n"
                f"Message: {message!r}"
            )
            
            # Assert 6: Project files exist on disk
            project_dir = Path(tmpdir) / "projects" / project_id / "files"
            assert project_dir.exists(), (
                f"COUNTEREXAMPLE: Project directory not created on disk\n"
                f"Expected path: {project_dir}\n"
                f"Project ID: {project_id}\n"
                f"Message: {message!r}"
            )
            
            # Assert 7: spec.json exists
            spec_path = Path(tmpdir) / "projects" / project_id / "spec.json"
            assert spec_path.exists(), (
                f"COUNTEREXAMPLE: spec.json not saved to disk\n"
                f"Expected path: {spec_path}\n"
                f"Project ID: {project_id}\n"
                f"Message: {message!r}"
            )
            
            # Assert 8: Generated files exist on disk
            files_on_disk = list(project_dir.glob("**/*"))
            files_on_disk = [f for f in files_on_disk if f.is_file()]
            assert len(files_on_disk) > 0, (
                f"COUNTEREXAMPLE: No files materialized on disk\n"
                f"Project directory: {project_dir}\n"
                f"Project ID: {project_id}\n"
                f"Message: {message!r}"
            )


# ---------------------------------------------------------------------------
# Simple Unit Test: Concrete Bug Condition Case
# ---------------------------------------------------------------------------

def test_simple_streaming_generation_bug_condition():
    """
    Concrete test case for bug condition exploration.
    
    **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
    
    This is a simpler, non-property-based version of the bug condition test
    for easier debugging and faster execution.
    
    CRITICAL: This test MUST FAIL on unfixed code.
    """
    message = "Build me a simple todo app"
    
    with tempfile.TemporaryDirectory() as tmpdir:
        os.environ["VERONICA_PROJECT_DIR"] = tmpdir
        
        # Create mocked OpenRouter client
        mock_openrouter = MagicMock(spec=OpenRouterClient)
        
        async def mock_chat_completion(messages, **kwargs):
            # Extract project_id from the prompt if present
            prompt = messages[0]["content"] if messages else ""
            import re
            project_id_match = re.search(r'"project_id":\s*"([^"]+)"', prompt)
            project_id = project_id_match.group(1) if project_id_match else "test-project-id-12345"
            
            return json.dumps({
                "project_id": project_id,
                "title": "Todo App",
                "platform": "web",
                "difficulty": "beginner",
                "summary": "A simple todo application",
                "learning_goals": ["Learn React", "Learn state management"],
                "steps": ["Create components", "Add state", "Style the app"],
                "materials": [],
                "wiring": {"overview": "", "connections": [], "notes": []},
                "files": [
                    {
                        "path": "App.js",
                        "content": "import React from 'react';\n\nfunction App() {\n  return <div>Todo App</div>;\n}\n\nexport default App;",
                        "is_main": True
                    },
                    {
                        "path": "index.html",
                        "content": "<!DOCTYPE html><html><body><div id='root'></div></body></html>",
                        "is_main": False
                    }
                ],
                "readme": "# Todo App\n\nA simple todo application.",
                "meta": {}
            })
        
        mock_openrouter.chat_completion = AsyncMock(side_effect=mock_chat_completion)
        orchestrator = VeronicaOrchestrator(openrouter_client=mock_openrouter)
        
        app = FastAPI()
        app.include_router(veronica_router)
        app.dependency_overrides[get_veronica_orchestrator] = lambda: orchestrator
        
        with TestClient(app) as client:
            response = client.post(
                "/api/veronica-projects/generate/agent-stream",
                json={"message": message},
                timeout=30.0,
            )
            
            sse_text = response.text
            events = parse_sse_events(sse_text)
            verification = verify_event_sequence(events)
            
            # Core assertions
            assert len(events) > 0, f"No events received. Response: {sse_text[:500]}"
            assert verification["has_plan"], f"No plan events. Events: {verification['event_types']}"
            assert verification["has_file_events"], f"No file events. Events: {verification['event_types']}"
            assert verification["has_done"], f"No done event. Events: {verification['event_types']}"
            
            # Verify project data
            done_event = verification["done_event"]
            assert "result" in done_event, f"Done event missing result: {done_event}"
            assert "project" in done_event["result"], f"Result missing project: {done_event['result']}"
            
            project = done_event["result"]["project"]
            project_id = project["project_id"]
            
            # Verify files on disk
            spec_path = Path(tmpdir) / "projects" / project_id / "spec.json"
            assert spec_path.exists(), f"spec.json not found at {spec_path}"
            
            files_dir = Path(tmpdir) / "projects" / project_id / "files"
            assert files_dir.exists(), f"Files directory not found at {files_dir}"
            
            files_on_disk = list(files_dir.glob("**/*"))
            files_on_disk = [f for f in files_on_disk if f.is_file()]
            assert len(files_on_disk) >= 2, f"Expected at least 2 files, found {len(files_on_disk)}"
