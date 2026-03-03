# Test for AI Guidance Chat Endpoint
# Task: 4.1 Implement chat endpoint (POST /api/projects/{projectId}/guidance/chat)

import pytest
import asyncio
import uuid
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock

# Import the FastAPI app
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server import app
from models.ai_guidance import ChatRequest, ChatResponse, ProjectContext, GuidanceResponse
from services.ai_guidance_service import AIGuidanceService


class TestChatEndpoint:
    """Test cases for the AI guidance chat endpoint"""
    
    def setup_method(self):
        """Set up test client and mock data"""
        self.client = TestClient(app)
        self.test_project_id = str(uuid.uuid4())
        self.test_session_id = str(uuid.uuid4())
        
        # Mock project context
        self.mock_project_context = ProjectContext(
            project_id=self.test_project_id,
            title="Test IoT Project",
            description="A test project for IoT development",
            goals=["Learn IoT basics", "Build a sensor network"],
            current_phase="Development",
            tasks=[],
            milestones=[],
            progress=45.0,
            deadlines=[]
        )
        
        # Mock chat response
        self.mock_chat_response = ChatResponse(
            response="I can help you with your IoT project. What specific aspect would you like guidance on?",
            session_id=self.test_session_id,
            suggestions=[
                "Review your sensor configuration",
                "Check your network connectivity",
                "Test individual components"
            ],
            next_steps=[
                "Verify sensor readings",
                "Implement data logging",
                "Set up remote monitoring"
            ]
        )
    
    @patch('backend.services.ai_guidance_service.AIGuidanceService.process_chat_request')
    def test_chat_endpoint_success(self, mock_process_chat):
        """Test successful chat request processing"""
        # Setup mock
        mock_process_chat.return_value = self.mock_chat_response
        
        # Prepare request
        chat_request = {
            "message": "I need help with my IoT sensors",
            "session_id": self.test_session_id
        }
        
        # Make request
        response = self.client.post(
            f"/api/projects/{self.test_project_id}/guidance/chat",
            json=chat_request
        )
        
        # Verify response
        assert response.status_code == 200
        
        response_data = response.json()
        assert response_data["response"] == self.mock_chat_response.response
        assert response_data["session_id"] == self.test_session_id
        assert len(response_data["suggestions"]) == 3
        assert len(response_data["next_steps"]) == 3
        
        # Verify service was called correctly
        mock_process_chat.assert_called_once()
        call_args = mock_process_chat.call_args
        assert call_args[1]["project_id"] == self.test_project_id
        assert call_args[1]["user_id"] == "default-user-id"
        assert call_args[1]["request"].message == "I need help with my IoT sensors"
    
    def test_chat_endpoint_invalid_project_id(self):
        """Test chat endpoint with invalid project ID"""
        chat_request = {
            "message": "I need help with my project"
        }
        
        # Make request with invalid project ID
        response = self.client.post(
            "/api/projects/invalid-uuid/guidance/chat",
            json=chat_request
        )
        
        # Verify error response
        assert response.status_code == 400
        
        response_data = response.json()
        assert response_data["detail"]["code"] == "invalid_project_id"
        assert "UUID" in response_data["detail"]["message"]
    
    def test_chat_endpoint_empty_message(self):
        """Test chat endpoint with empty message"""
        chat_request = {
            "message": ""
        }
        
        # Make request
        response = self.client.post(
            f"/api/projects/{self.test_project_id}/guidance/chat",
            json=chat_request
        )
        
        # Verify validation error
        assert response.status_code == 422  # Pydantic validation error
    
    def test_chat_endpoint_missing_message(self):
        """Test chat endpoint with missing message field"""
        chat_request = {}
        
        # Make request
        response = self.client.post(
            f"/api/projects/{self.test_project_id}/guidance/chat",
            json=chat_request
        )
        
        # Verify validation error
        assert response.status_code == 422  # Pydantic validation error
    
    @patch('backend.services.ai_guidance_service.AIGuidanceService.process_chat_request')
    def test_chat_endpoint_service_error(self, mock_process_chat):
        """Test chat endpoint when service raises an exception"""
        # Setup mock to raise exception
        mock_process_chat.side_effect = Exception("Service unavailable")
        
        # Prepare request
        chat_request = {
            "message": "I need help with my project"
        }
        
        # Make request
        response = self.client.post(
            f"/api/projects/{self.test_project_id}/guidance/chat",
            json=chat_request
        )
        
        # Verify error response
        assert response.status_code == 500
        
        response_data = response.json()
        assert response_data["detail"]["code"] == "internal_error"
        assert "error occurred" in response_data["detail"]["message"]
    
    @patch('backend.services.ai_guidance_service.AIGuidanceService.process_chat_request')
    def test_chat_endpoint_validation_error(self, mock_process_chat):
        """Test chat endpoint when service raises validation error"""
        # Setup mock to raise ValueError
        mock_process_chat.side_effect = ValueError("Invalid session ID")
        
        # Prepare request
        chat_request = {
            "message": "I need help with my project"
        }
        
        # Make request
        response = self.client.post(
            f"/api/projects/{self.test_project_id}/guidance/chat",
            json=chat_request
        )
        
        # Verify error response
        assert response.status_code == 400
        
        response_data = response.json()
        assert response_data["detail"]["code"] == "validation_error"
        assert "Invalid session ID" in response_data["detail"]["message"]
    
    def test_chat_endpoint_new_session(self):
        """Test chat endpoint without session_id (new session)"""
        with patch('backend.services.ai_guidance_service.AIGuidanceService.process_chat_request') as mock_process_chat:
            # Setup mock
            mock_process_chat.return_value = self.mock_chat_response
            
            # Prepare request without session_id
            chat_request = {
                "message": "I'm starting a new conversation about my project"
            }
            
            # Make request
            response = self.client.post(
                f"/api/projects/{self.test_project_id}/guidance/chat",
                json=chat_request
            )
            
            # Verify response
            assert response.status_code == 200
            
            response_data = response.json()
            assert response_data["session_id"] == self.test_session_id
            
            # Verify service was called with None session_id
            mock_process_chat.assert_called_once()
            call_args = mock_process_chat.call_args
            assert call_args[1]["request"].session_id is None
    
    def test_chat_endpoint_long_message(self):
        """Test chat endpoint with very long message"""
        with patch('backend.services.ai_guidance_service.AIGuidanceService.process_chat_request') as mock_process_chat:
            # Setup mock
            mock_process_chat.return_value = self.mock_chat_response
            
            # Prepare request with long message (but within limit)
            long_message = "I need help with my project. " * 100  # Should be under 10000 chars
            chat_request = {
                "message": long_message
            }
            
            # Make request
            response = self.client.post(
                f"/api/projects/{self.test_project_id}/guidance/chat",
                json=chat_request
            )
            
            # Verify response
            assert response.status_code == 200
    
    def test_chat_endpoint_message_too_long(self):
        """Test chat endpoint with message exceeding length limit"""
        # Prepare request with message exceeding 10000 characters
        very_long_message = "x" * 10001
        chat_request = {
            "message": very_long_message
        }
        
        # Make request
        response = self.client.post(
            f"/api/projects/{self.test_project_id}/guidance/chat",
            json=chat_request
        )
        
        # Verify validation error
        assert response.status_code == 422  # Pydantic validation error


class TestContextEndpoint:
    """Test cases for the project context endpoint"""
    
    def setup_method(self):
        """Set up test client and mock data"""
        self.client = TestClient(app)
        self.test_project_id = str(uuid.uuid4())
        
        # Mock project context
        self.mock_project_context = ProjectContext(
            project_id=self.test_project_id,
            title="Test Robotics Project",
            description="A test project for robotics development",
            goals=["Learn robotics basics", "Build an autonomous robot"],
            current_phase="Planning",
            tasks=[],
            milestones=[],
            progress=15.0,
            deadlines=[]
        )
    
    @patch('backend.services.ai_guidance_service.AIGuidanceService.analyzeProjectContext')
    def test_context_endpoint_success(self, mock_analyze_context):
        """Test successful project context retrieval"""
        # Setup mock
        mock_analyze_context.return_value = self.mock_project_context
        
        # Make request
        response = self.client.get(f"/api/projects/{self.test_project_id}/guidance/context")
        
        # Verify response
        assert response.status_code == 200
        
        response_data = response.json()
        assert response_data["project"]["title"] == "Test Robotics Project"
        assert response_data["project"]["progress"] == 15.0
        assert len(response_data["recommendations"]) > 0
        
        # Verify service was called correctly
        mock_analyze_context.assert_called_once_with(self.test_project_id)
    
    @patch('backend.services.ai_guidance_service.AIGuidanceService.analyzeProjectContext')
    def test_context_endpoint_project_not_found(self, mock_analyze_context):
        """Test context endpoint when project is not found"""
        # Setup mock to return None
        mock_analyze_context.return_value = None
        
        # Make request
        response = self.client.get(f"/api/projects/{self.test_project_id}/guidance/context")
        
        # Verify error response
        assert response.status_code == 404
        
        response_data = response.json()
        assert response_data["detail"]["code"] == "project_not_found"
    
    def test_context_endpoint_invalid_project_id(self):
        """Test context endpoint with invalid project ID"""
        # Make request with invalid project ID
        response = self.client.get("/api/projects/invalid-uuid/guidance/context")
        
        # Verify error response
        assert response.status_code == 400
        
        response_data = response.json()
        assert response_data["detail"]["code"] == "invalid_project_id"


class TestHistoryEndpoint:
    """Test cases for the chat history endpoint"""
    
    def setup_method(self):
        """Set up test client and mock data"""
        self.client = TestClient(app)
        self.test_project_id = str(uuid.uuid4())
        self.test_session_id = str(uuid.uuid4())
    
    @patch('backend.services.ai_guidance_service.AIGuidanceService.get_chat_history')
    def test_history_endpoint_success(self, mock_get_history):
        """Test successful chat history retrieval"""
        # Setup mock
        mock_messages = []  # Empty for simplicity
        mock_get_history.return_value = mock_messages
        
        # Make request
        response = self.client.get(
            f"/api/projects/{self.test_project_id}/guidance/history",
            params={"session_id": self.test_session_id}
        )
        
        # Verify response
        assert response.status_code == 200
        
        response_data = response.json()
        assert response_data["session_id"] == self.test_session_id
        assert isinstance(response_data["messages"], list)
    
    def test_history_endpoint_invalid_project_id(self):
        """Test history endpoint with invalid project ID"""
        # Make request with invalid project ID
        response = self.client.get("/api/projects/invalid-uuid/guidance/history")
        
        # Verify error response
        assert response.status_code == 400
        
        response_data = response.json()
        assert response_data["detail"]["code"] == "invalid_project_id"
    
    def test_history_endpoint_invalid_session_id(self):
        """Test history endpoint with invalid session ID"""
        # Make request with invalid session ID
        response = self.client.get(
            f"/api/projects/{self.test_project_id}/guidance/history",
            params={"session_id": "invalid-uuid"}
        )
        
        # Verify error response
        assert response.status_code == 400
        
        response_data = response.json()
        assert response_data["detail"]["code"] == "invalid_session_id"
    
    def test_history_endpoint_invalid_limit(self):
        """Test history endpoint with invalid limit parameter"""
        # Make request with invalid limit
        response = self.client.get(
            f"/api/projects/{self.test_project_id}/guidance/history",
            params={"limit": 0}
        )
        
        # Verify error response
        assert response.status_code == 400
        
        response_data = response.json()
        assert response_data["detail"]["code"] == "invalid_limit"
    
    def test_history_endpoint_limit_too_high(self):
        """Test history endpoint with limit exceeding maximum"""
        # Make request with limit too high
        response = self.client.get(
            f"/api/projects/{self.test_project_id}/guidance/history",
            params={"limit": 1001}
        )
        
        # Verify error response
        assert response.status_code == 400
        
        response_data = response.json()
        assert response_data["detail"]["code"] == "invalid_limit"


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])