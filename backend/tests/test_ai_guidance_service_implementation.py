# Test for AIGuidanceService implementation
# Task: 3.1 Create AIGuidanceService class with basic structure

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime, timezone

from services.ai_guidance_service import AIGuidanceService
from models.ai_guidance import (
    GuidanceRequest, GuidanceResponse, ProjectContext, ChatMessage, MessageSender,
    Task, Milestone, TaskStatus, TaskPriority
)


class TestAIGuidanceServiceImplementation:
    """Test the core AIGuidanceService implementation"""
    
    @pytest.fixture
    def service(self):
        """Create AIGuidanceService instance with mocked dependencies"""
        with patch('services.ai_guidance_service.ChatSessionCRUD'), \
             patch('services.ai_guidance_service.ChatMessageCRUD'), \
             patch('services.ai_guidance_service.AIContextCacheCRUD'), \
             patch('services.ai_guidance_service.ProjectContextService'):
            
            service = AIGuidanceService()
            # Mock the OpenRouter client to None for testing fallback
            service.openrouter_client = None
            service.openrouter_config = None
            return service
    
    @pytest.fixture
    def sample_project_context(self):
        """Create sample project context for testing"""
        return ProjectContext(
            project_id="test-project-123",
            title="Test IoT Project",
            description="A test project for IoT development",
            goals=["Learn IoT basics", "Build a sensor network", "Create a dashboard"],
            current_phase="Development",
            tasks=[
                Task(
                    title="Setup hardware",
                    description="Connect sensors and microcontroller",
                    status=TaskStatus.IN_PROGRESS,
                    priority=TaskPriority.HIGH
                ),
                Task(
                    title="Write firmware",
                    description="Program the microcontroller",
                    status=TaskStatus.PENDING,
                    priority=TaskPriority.MEDIUM
                )
            ],
            milestones=[
                Milestone(
                    title="Hardware Setup Complete",
                    description="All hardware components connected",
                    target_date=datetime.now(timezone.utc),
                    completed=False
                )
            ],
            progress=35.0,
            deadlines=[datetime.now(timezone.utc)]
        )
    
    @pytest.fixture
    def sample_conversation_history(self):
        """Create sample conversation history"""
        return [
            ChatMessage(
                session_id="test-session",
                content="I need help with my IoT project",
                sender=MessageSender.USER
            ),
            ChatMessage(
                session_id="test-session",
                content="I'd be happy to help with your IoT project. What specific area do you need assistance with?",
                sender=MessageSender.AI
            )
        ]
    
    def test_service_initialization(self, service):
        """Test that AIGuidanceService initializes correctly"""
        assert service is not None
        assert hasattr(service, 'session_crud')
        assert hasattr(service, 'message_crud')
        assert hasattr(service, 'context_crud')
        assert hasattr(service, 'project_context_service')
        assert hasattr(service, 'openrouter_client')
        assert hasattr(service, 'openrouter_config')
    
    def test_formatContextForAI_with_project_context(self, service, sample_project_context, sample_conversation_history):
        """Test formatContextForAI method with project context"""
        formatted_context = service.formatContextForAI(sample_project_context, sample_conversation_history)
        
        assert isinstance(formatted_context, str)
        assert len(formatted_context) > 0
        assert "Test IoT Project" in formatted_context
        assert "Development" in formatted_context
        assert "35.0%" in formatted_context
        assert "Setup hardware" in formatted_context
        assert "Hardware Setup Complete" in formatted_context
        assert "User: I need help with my IoT project" in formatted_context
    
    def test_formatContextForAI_without_context(self, service):
        """Test formatContextForAI method without project context"""
        formatted_context = service.formatContextForAI(None, [])
        
        assert isinstance(formatted_context, str)
        assert len(formatted_context) > 0
        assert "AI project guidance assistant" in formatted_context
    
    def test_formatContextForAI_error_handling(self, service):
        """Test formatContextForAI error handling"""
        # Test with invalid input that might cause errors
        formatted_context = service.formatContextForAI(None, None)
        
        # Should return minimal context on error
        assert isinstance(formatted_context, str)
        assert "AI project guidance assistant" in formatted_context
    
    @pytest.mark.asyncio
    async def test_analyzeProjectContext_success(self, service, sample_project_context):
        """Test analyzeProjectContext method success case"""
        # Mock the project context service
        service.project_context_service.getProjectContext = AsyncMock(return_value=sample_project_context)
        
        result = await service.analyzeProjectContext("test-project-123")
        
        assert result is not None
        assert result.project_id == "test-project-123"
        assert result.title == "Test IoT Project"
        service.project_context_service.getProjectContext.assert_called_once_with("test-project-123")
    
    @pytest.mark.asyncio
    async def test_analyzeProjectContext_not_found(self, service):
        """Test analyzeProjectContext when project not found"""
        # Mock the project context service to return None
        service.project_context_service.getProjectContext = AsyncMock(return_value=None)
        
        result = await service.analyzeProjectContext("nonexistent-project")
        
        assert result is None
        service.project_context_service.getProjectContext.assert_called_once_with("nonexistent-project")
    
    @pytest.mark.asyncio
    async def test_analyzeProjectContext_validation_error(self, service):
        """Test analyzeProjectContext with invalid input"""
        with pytest.raises(ValueError, match="project_id cannot be empty"):
            await service.analyzeProjectContext("")
        
        with pytest.raises(ValueError, match="project_id cannot be empty"):
            await service.analyzeProjectContext("   ")
    
    def test_generate_context_based_suggestions(self, service, sample_project_context):
        """Test _generate_context_based_suggestions method"""
        suggestions = service._generate_context_based_suggestions(sample_project_context)
        
        assert isinstance(suggestions, list)
        assert len(suggestions) > 0
        # Should suggest something about progress since it's at 35%
        assert any("progress" in suggestion.lower() for suggestion in suggestions)
    
    def test_extract_suggestions_from_text(self, service):
        """Test _extract_suggestions_from_text method"""
        text = """
        I suggest you start with the hardware setup first.
        You might want to consider using a breadboard for prototyping.
        Try connecting the sensors one by one to avoid confusion.
        """
        
        suggestions = service._extract_suggestions_from_text(text)
        
        assert isinstance(suggestions, list)
        assert len(suggestions) >= 3
        assert any("hardware setup" in suggestion.lower() for suggestion in suggestions)
    
    def test_extract_next_steps_from_text(self, service):
        """Test _extract_next_steps_from_text method"""
        text = """
        First, gather all your components.
        Then, connect the power supply.
        1. Connect the Arduino to your computer
        2. Upload the test sketch
        - Verify the connections
        - Test each sensor individually
        """
        
        next_steps = service._extract_next_steps_from_text(text)
        
        assert isinstance(next_steps, list)
        assert len(next_steps) >= 4
        assert any("components" in step.lower() for step in next_steps)
        assert any("arduino" in step.lower() for step in next_steps)
    
    def test_generate_fallback_response_help_keywords(self, service, sample_project_context):
        """Test _generate_fallback_response with help keywords"""
        response = service._generate_fallback_response("I'm stuck and need help", sample_project_context)
        
        assert isinstance(response, dict)
        assert "response" in response
        assert "suggestions" in response
        assert "next_steps" in response
        assert "confidence" in response
        assert "challenge" in response["response"].lower()
        assert response["confidence"] == 0.5
    
    def test_generate_fallback_response_next_step_keywords(self, service):
        """Test _generate_fallback_response with next step keywords"""
        response = service._generate_fallback_response("What should I do next?", None)
        
        assert isinstance(response, dict)
        assert "next steps" in response["response"].lower()
        assert len(response["suggestions"]) > 0
        assert len(response["next_steps"]) > 0
    
    @pytest.mark.asyncio
    async def test_generateResponse_fallback_mode(self, service, sample_project_context, sample_conversation_history):
        """Test generateResponse method in fallback mode (no OpenRouter)"""
        # Mock the analyzeProjectContext method
        service.analyzeProjectContext = AsyncMock(return_value=sample_project_context)
        
        request = GuidanceRequest(
            project_id="test-project-123",
            user_message="How do I connect the sensors?",
            conversation_history=sample_conversation_history
        )
        
        response = await service.generateResponse(request)
        
        assert isinstance(response, GuidanceResponse)
        assert response.response is not None
        assert len(response.response) > 0
        assert isinstance(response.suggestions, list)
        assert isinstance(response.next_steps, list)
        assert 0.0 <= response.confidence <= 1.0
    
    @pytest.mark.asyncio
    async def test_generateResponse_validation_error(self, service):
        """Test generateResponse with invalid input"""
        request = GuidanceRequest(
            project_id="",
            user_message="test message",
            conversation_history=[]
        )
        
        with pytest.raises(ValueError, match="project_id and user_message are required"):
            await service.generateResponse(request)
    
    @pytest.mark.asyncio
    async def test_generateResponse_error_handling(self, service):
        """Test generateResponse error handling"""
        # Mock analyzeProjectContext to raise an exception
        service.analyzeProjectContext = AsyncMock(side_effect=Exception("Database error"))
        
        request = GuidanceRequest(
            project_id="test-project-123",
            user_message="test message",
            conversation_history=[]
        )
        
        response = await service.generateResponse(request)
        
        # Should return error response instead of raising
        assert isinstance(response, GuidanceResponse)
        assert "technical difficulties" in response.response.lower()
        assert response.confidence == 0.1


if __name__ == "__main__":
    # Run a simple test
    async def simple_test():
        service = AIGuidanceService()
        
        # Test formatContextForAI
        context = service.formatContextForAI(None, [])
        print(f"Formatted context length: {len(context)}")
        print("✓ formatContextForAI works")
        
        # Test fallback response
        response = service._generate_fallback_response("I need help", None)
        print(f"Fallback response: {response['response'][:50]}...")
        print("✓ _generate_fallback_response works")
        
        print("All basic tests passed!")
    
    asyncio.run(simple_test())