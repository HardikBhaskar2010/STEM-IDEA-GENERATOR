"""
Test suite for the Veronica Agentic Project Builder.

Covers unit tests for orchestrator logic, error handling, rate limits, token
budgets, and agent tools, plus hypothesis property tests for invariants.

Requirements: 14.1–14.7, 15.1, 15.2, 16.1–16.3
"""

import json
import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from hypothesis import given, settings, strategies as st

from backend.core.exceptions import UpstreamError
from backend.models.generation_state import GenerationState
from backend.models.implementation_plan import FileSpec, ImplementationPlan
from backend.orchestration.veronica_orchestrator import VeronicaOrchestrator
from backend.services.agent_tools import (
    ALL_TOOLS,
    CreateFileTool,
    EditFileTool,
    FetchFileTool,
    ListFilesTool,
    ReadConsoleTool,
    ReadLogsTool,
    RunCommandTool,
)
from backend.utils.token_budget import TokenBudget

# ---------------------------------------------------------------------------
# Unit tests: Token Budget
# ---------------------------------------------------------------------------

def test_token_budget_estimation():
    budget = TokenBudget()
    text = "abcd" * 100  # 400 chars
    assert budget.estimate_tokens(text) == 100

def test_token_budget_truncation():
    budget = TokenBudget()
    text = "x" * 1000  # 1000 chars
    # Max tokens = 100 -> max chars = 400
    truncated = budget.truncate_context(text, max_tokens=100)
    assert len(truncated) <= 400 + len("\n... (truncated)")
    assert truncated.endswith("\n... (truncated)")
    assert truncated.startswith("x" * 400)

# ---------------------------------------------------------------------------
# Unit tests: Agent Tools Configuration
# ---------------------------------------------------------------------------

def test_agent_tools_registered():
    assert "fetch_file" in ALL_TOOLS
    assert "edit_file" in ALL_TOOLS
    assert "create_file" in ALL_TOOLS
    assert "list_files" in ALL_TOOLS
    assert "run_command" in ALL_TOOLS
    assert "read_logs" in ALL_TOOLS
    assert "read_console" in ALL_TOOLS

def test_agent_tools_schemas():
    for name, tool in ALL_TOOLS.items():
        assert hasattr(tool, "name")
        assert tool.name == name
        assert hasattr(tool, "description")
        assert "properties" in tool.parameters

# ---------------------------------------------------------------------------
# Unit tests: Agent Tools Execution
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_fetch_file_tool_missing_args():
    tool = FetchFileTool()
    res = await tool.execute(path="src/App.tsx")
    assert "error" in res
    assert "sandbox_id" in res["error"]

@pytest.mark.asyncio
@patch("backend.services.agent_tools._get_sandbox_service")
async def test_fetch_file_tool_success(mock_get_svc):
    mock_svc = MagicMock()
    mock_svc.read_file = AsyncMock(return_value="import React from 'react';\n")
    mock_get_svc.return_value = mock_svc

    tool = FetchFileTool()
    res = await tool.execute(path="src/App.tsx", sandbox_id="sbx-123")
    assert res["path"] == "src/App.tsx"
    assert "import React" in res["content"]
    assert res["line_count"] == 1

@pytest.mark.asyncio
@patch("backend.services.agent_tools._get_sandbox_service")
async def test_run_command_tool(mock_get_svc):
    mock_svc = MagicMock()
    mock_result = MagicMock()
    mock_result.stdout = "hello"
    mock_result.stderr = ""
    mock_result.exit_code = 0
    mock_result.duration_ms = 100
    mock_result.success = True
    mock_svc.run_command = AsyncMock(return_value=mock_result)
    mock_get_svc.return_value = mock_svc

    tool = RunCommandTool()
    res = await tool.execute(command="echo hello", sandbox_id="sbx-1")
    assert res["stdout"] == "hello"
    assert res["exit_code"] == 0
    assert res["success"] is True

# ---------------------------------------------------------------------------
# Unit tests: Orchestrator Workflows
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_openrouter():
    client = MagicMock()
    client.chat_completion = AsyncMock()
    return client

@pytest.fixture
def mock_sandbox_svc():
    svc = MagicMock()
    svc.create_sandbox = AsyncMock(return_value={"sandbox_id": "sbx-test", "viewer_url": "http://e2b.dev/sbx-test"})
    svc.write_file = AsyncMock()
    svc.create_file = AsyncMock()
    svc.cleanup_sandbox = AsyncMock()
    
    mock_cmd_result = MagicMock()
    mock_cmd_result.success = True
    mock_cmd_result.stdout = "OK"
    mock_cmd_result.stderr = ""
    mock_cmd_result.exit_code = 0
    svc.run_command = AsyncMock(return_value=mock_cmd_result)
    return svc

@pytest.mark.asyncio
@patch("backend.orchestration.veronica_orchestrator.VeronicaOrchestrator._get_sandbox_service")
async def test_orchestrator_sandbox_init(mock_get_svc, mock_openrouter, mock_sandbox_svc):
    mock_get_svc.return_value = mock_sandbox_svc
    
    plan_json = json.dumps({
        "project_title": "Test",
        "project_description": "Test doc",
        "platform": "web",
        "tech_stack": ["react"],
        "files": [{"path": f"f{i}.ts", "purpose": "x", "dependencies": []} for i in range(15)],
        "scaffold_commands": [],
        "additional_features": ["f1", "f2", "f3"],
        "estimated_file_count": 15
    })
    mock_openrouter.chat_completion.return_value = plan_json
    
    orchestrator = VeronicaOrchestrator(mock_openrouter)
    
    events = []
    async for event_json in orchestrator.generate_project_stream({"message": "test"}):
        events.append(json.loads(event_json))
        
    event_types = [e["event"] for e in events]
    assert "sandbox_ready" in event_types
    
    sbx_event = next(e for e in events if e["event"] == "sandbox_ready")
    assert sbx_event["sandbox_id"] == "sbx-test"
    assert sbx_event["viewer_url"] == "http://e2b.dev/sbx-test"
    assert sbx_event["progress"] > 0

@pytest.mark.asyncio
@patch("backend.orchestration.veronica_orchestrator.VeronicaOrchestrator._get_sandbox_service")
async def test_orchestrator_rate_limit_backoff(mock_get_svc, mock_openrouter, mock_sandbox_svc):
    mock_get_svc.return_value = mock_sandbox_svc
    
    # Needs a 15-file plan to pass planning phase
    plan_data = {
        "project_title": "Test", "project_description": "Test doc", "platform": "web",
        "tech_stack": ["react"], "scaffold_commands": [],
        "additional_features": ["f1", "f2", "f3"], "estimated_file_count": 15,
        "files": [{"path": f"f{i}.ts", "purpose": "x", "dependencies": []} for i in range(15)]
    }
    
    orchestrator = VeronicaOrchestrator(mock_openrouter)
    
    # Let planning pass, then simulate rate limits on file creation
    mock_openrouter.chat_completion.side_effect = [
        json.dumps(plan_data),  # Planning phase
    ] + [
        UpstreamError("429 Too Many Requests", service="OpenRouter", upstream_status=429),  # File 1 attempt 1
        "File 1 content",                                             # File 1 attempt 2
    ] + [f"File {i} OK" for i in range(2, 16)]                        # Rest of files
    
    events = []
    async for event_json in orchestrator.generate_project_stream({"message": "test"}):
        event = json.loads(event_json)
        events.append(event)
        
    error_events = [e for e in events if e["event"] == "error"]
    # We should see an error event containing "Rate limit hit" 
    assert any("Rate limit hit" in e.get("data", "") for e in error_events)
    
    file_done_events = [e for e in events if e["event"] == "file_done"]
    assert len(file_done_events) == 15

# ---------------------------------------------------------------------------
# Property-based tests (Hypothesis)
# ---------------------------------------------------------------------------

@settings(max_examples=20)
@given(
    files=st.lists(
        st.builds(
            FileSpec,
            path=st.text(alphabet="abcdefghijklmnopqrstuvwxyz/", min_size=5, max_size=20),
            purpose=st.text(min_size=1, max_size=50),
            dependencies=st.lists(st.text(), max_size=2)
        ),
        min_size=15,  # Needs 15+ to skip expansion phase
        max_size=25,
        unique_by=lambda f: f.path
    )
)
@pytest.mark.asyncio
async def test_property_file_order_correctness(files):
    """
    Property Test: Ensure incremental file creation handles files appropriately
    and records them in the GenerationState correctly.
    """
    state = GenerationState(sandbox_id="test", project_id="p1", phase="files")
    plan = ImplementationPlan(
        project_title="PropTest", project_description="Test", platform="web",
        tech_stack=["react"], scaffold_commands=[], files=files,
        additional_features=[], estimated_file_count=len(files)
    )
    
    mock_router = MagicMock()
    mock_router.chat_completion = AsyncMock(return_value="dummy code")
    
    orchestrator = VeronicaOrchestrator(mock_router)
    
    # Mock out sandbox writes
    mock_svc = MagicMock()
    mock_svc.create_file = AsyncMock()
    with patch.object(orchestrator, "_get_sandbox_service", return_value=mock_svc):
        with patch.object(orchestrator, "_get_store"):
            # Run the file creation generator
            events = []
            async for ev_str in orchestrator._create_files_incrementally(plan, "test", state):
                events.append(json.loads(ev_str))
                
            file_events = [e for e in events if e["event"] == "file_done"]
            assert len(file_events) == len(files)
            
            # State should track all files
            assert len(state.files_created) == len(files)
            for f in files:
                assert f.path in state.files_created
