"""
Real API Integration Test for Veronica Stream Generation

This test uses the REAL OpenRouter API to test streaming project generation
under actual production conditions. This helps identify bugs that may only
manifest with real network calls, API delays, or race conditions.

**IMPORTANT**: This test requires a valid OPENROUTER_API_KEY environment variable.
It will be skipped if the API key is not available.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4**
"""

import json
import os
import tempfile
from pathlib import Path
from typing import List, Dict, Any

import pytest
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
# Real API Integration Test
# ---------------------------------------------------------------------------

@pytest.mark.skipif(
    not os.getenv("OPENROUTER_API_KEY"),
    reason="OPENROUTER_API_KEY not set - skipping real API test"
)
def test_streaming_generation_with_real_api():
    """
    Test streaming project generation with REAL OpenRouter API.
    
    **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
    
    This test uses the actual OpenRouter API to generate a project and verify
    that all SSE events are received and files are saved to disk.
    
    CRITICAL: If this test FAILS, it confirms the bug exists under real conditions.
    If it PASSES, the streaming implementation is working correctly.
    """
    message = "Build me a very simple hello world web app"
    
    with tempfile.TemporaryDirectory() as tmpdir:
        os.environ["VERONICA_PROJECT_DIR"] = tmpdir
        
        # Create REAL OpenRouter client
        config = OpenRouterConfig()
        openrouter_client = OpenRouterClient(config=config)
        
        # Create orchestrator with real client
        orchestrator = VeronicaOrchestrator(openrouter_client=openrouter_client)
        
        # Create FastAPI app
        app = FastAPI()
        app.include_router(veronica_router)
        app.dependency_overrides[get_veronica_orchestrator] = lambda: orchestrator
        
        try:
            with TestClient(app) as client:
                print(f"\n🔄 Making real API request: {message}")
                response = client.post(
                    "/api/veronica-projects/generate/agent-stream",
                    json={"message": message},
                    timeout=120.0,  # Longer timeout for real API
                )
                
                print(f"📡 Response status: {response.status_code}")
                
                # Collect SSE events
                sse_text = response.text
                print(f"📝 Response length: {len(sse_text)} chars")
                
                events = parse_sse_events(sse_text)
                print(f"📊 Events received: {len(events)}")
                
                verification = verify_event_sequence(events)
                print(f"🔍 Event types: {verification['event_types']}")
                
                # Core assertions - these will FAIL if the bug exists
                assert response.status_code == 200, f"Expected 200, got {response.status_code}"
                
                assert len(events) > 0, (
                    f"❌ COUNTEREXAMPLE: No events received from real API\n"
                    f"Response text: {sse_text[:500]}"
                )
                print("✅ Events received")
                
                assert verification["has_plan"], (
                    f"❌ COUNTEREXAMPLE: No 'plan' events received from real API\n"
                    f"Events: {verification['event_types']}"
                )
                print("✅ Plan events present")
                
                assert verification["has_file_events"], (
                    f"❌ COUNTEREXAMPLE: No file_start/file_done events received from real API\n"
                    f"Events: {verification['event_types']}"
                )
                print("✅ File events present")
                
                assert verification["has_done"], (
                    f"❌ COUNTEREXAMPLE: No 'done' event received (stream closed prematurely)\n"
                    f"Events: {verification['event_types']}"
                )
                print("✅ Done event received")
                
                # Verify project data
                done_event = verification["done_event"]
                assert "result" in done_event, f"Done event missing result: {done_event}"
                assert "project" in done_event["result"], f"Result missing project: {done_event['result']}"
                
                project = done_event["result"]["project"]
                project_id = project["project_id"]
                print(f"📦 Project ID: {project_id}")
                
                # Verify files on disk
                spec_path = Path(tmpdir) / "projects" / project_id / "spec.json"
                assert spec_path.exists(), (
                    f"❌ COUNTEREXAMPLE: spec.json not saved to disk\n"
                    f"Expected path: {spec_path}"
                )
                print(f"✅ spec.json exists at {spec_path}")
                
                files_dir = Path(tmpdir) / "projects" / project_id / "files"
                assert files_dir.exists(), (
                    f"❌ COUNTEREXAMPLE: Files directory not created\n"
                    f"Expected path: {files_dir}"
                )
                
                files_on_disk = list(files_dir.glob("**/*"))
                files_on_disk = [f for f in files_on_disk if f.is_file()]
                print(f"📁 Files on disk: {len(files_on_disk)}")
                for f in files_on_disk:
                    print(f"  - {f.relative_to(files_dir)}")
                
                assert len(files_on_disk) > 0, (
                    f"❌ COUNTEREXAMPLE: No files materialized on disk\n"
                    f"Project directory: {files_dir}"
                )
                print("✅ Files materialized on disk")
                
                print("\n✅ ALL ASSERTIONS PASSED - Streaming generation works correctly with real API")
                
        finally:
            # Clean up - skip if event loop is already closed
            try:
                import asyncio
                loop = asyncio.get_event_loop()
                if not loop.is_closed():
                    asyncio.run(openrouter_client.close())
            except RuntimeError:
                pass  # Event loop already closed


# ---------------------------------------------------------------------------
# Minimal Real API Test (Faster)
# ---------------------------------------------------------------------------

@pytest.mark.skipif(
    not os.getenv("OPENROUTER_API_KEY"),
    reason="OPENROUTER_API_KEY not set - skipping real API test"
)
def test_streaming_generation_minimal_real_api():
    """
    Minimal test with real API - just checks if events are received.
    
    This is a faster version that only verifies the core bug condition:
    whether SSE events are yielded at all.
    """
    message = "Build a hello world app"
    
    with tempfile.TemporaryDirectory() as tmpdir:
        os.environ["VERONICA_PROJECT_DIR"] = tmpdir
        
        config = OpenRouterConfig()
        openrouter_client = OpenRouterClient(config=config)
        orchestrator = VeronicaOrchestrator(openrouter_client=openrouter_client)
        
        app = FastAPI()
        app.include_router(veronica_router)
        app.dependency_overrides[get_veronica_orchestrator] = lambda: orchestrator
        
        try:
            with TestClient(app) as client:
                response = client.post(
                    "/api/veronica-projects/generate/agent-stream",
                    json={"message": message},
                    timeout=120.0,
                )
                
                events = parse_sse_events(response.text)
                
                # Minimal assertion - just check if ANY events were received
                assert len(events) > 0, (
                    f"❌ BUG CONFIRMED: No events received from streaming endpoint\n"
                    f"Response status: {response.status_code}\n"
                    f"Response text: {response.text[:500]}"
                )
                
                print(f"✅ Received {len(events)} events from real API")
                
        finally:
            # Clean up - skip if event loop is already closed
            try:
                import asyncio
                loop = asyncio.get_event_loop()
                if not loop.is_closed():
                    asyncio.run(openrouter_client.close())
            except RuntimeError:
                pass  # Event loop already closed
