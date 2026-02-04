"""
Unit tests for ambiguity detection and follow-up question logic
Tests the implementation of task 7.1
"""

import pytest
import asyncio
from datetime import datetime, timezone

from services.ai_guidance_service import AIGuidanceService
from models.ai_guidance import (
    GuidanceRequest, ProjectContext, Task, Milestone, 
    TaskStatus, TaskPriority, AmbiguityAnalysis
)


class TestAmbiguityDetection:
    """Test cases for ambiguity detection functionality"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.service = AIGuidanceService()
        self.project_context = ProjectContext(
            project_id="550e8400-e29b-41d4-a716-446655440000",
            title="Smart Home IoT System",
            description="Building an IoT system for home automation",
            goals=["Implement sensor network", "Create mobile app"],
            current_phase="Development",
            tasks=[
                Task(
                    title="Install temperature sensors",
                    description="Set up temperature monitoring",
                    status=TaskStatus.IN_PROGRESS,
                    priority=TaskPriority.HIGH
                )
            ],
            milestones=[
                Milestone(
                    title="Sensor Network Complete",
                    description="All sensors installed",
                    target_date=datetime.now(timezone.utc),
                    completed=False
                )
            ],
            progress=35.0
        )
    
    @pytest.mark.asyncio
    async def test_clear_specific_question_not_ambiguous(self):
        """Test that clear, specific questions are not flagged as ambiguous"""
        message = "How do I configure the temperature sensor calibration settings for the DHT22 sensors?"
        
        analysis = await self.service.analyzeQueryAmbiguity(
            message, self.project_context, []
        )
        
        assert not analysis.is_ambiguous
        assert analysis.ambiguity_score < 0.3
        assert not analysis.clarification_needed
    
    @pytest.mark.asyncio
    async def test_vague_question_is_ambiguous(self):
        """Test that vague questions are correctly flagged as ambiguous"""
        message = "Help me with this"
        
        analysis = await self.service.analyzeQueryAmbiguity(
            message, self.project_context, []
        )
        
        assert analysis.is_ambiguous
        assert analysis.ambiguity_score > 0.8
        assert analysis.clarification_needed
        assert "Contains vague language" in analysis.ambiguous_aspects
        assert "Uses pronouns without clear context" in analysis.ambiguous_aspects
    
    @pytest.mark.asyncio
    async def test_short_unclear_question_is_ambiguous(self):
        """Test that short unclear questions are flagged as ambiguous"""
        message = "What next?"
        
        analysis = await self.service.analyzeQueryAmbiguity(
            message, self.project_context, []
        )
        
        assert analysis.is_ambiguous
        assert analysis.ambiguity_score > 0.5
        assert analysis.clarification_needed
        assert len(analysis.follow_up_questions) > 0
    
    @pytest.mark.asyncio
    async def test_multiple_topics_is_ambiguous(self):
        """Test that questions with multiple topics are flagged as ambiguous"""
        message = "I need help with sensors and also the mobile app and maybe the backend too"
        
        analysis = await self.service.analyzeQueryAmbiguity(
            message, self.project_context, []
        )
        
        assert analysis.is_ambiguous
        assert "Multiple topics mentioned" in analysis.ambiguous_aspects
        assert analysis.clarification_needed
    
    @pytest.mark.asyncio
    async def test_follow_up_questions_generated(self):
        """Test that appropriate follow-up questions are generated"""
        message = "I'm stuck"
        
        analysis = await self.service.analyzeQueryAmbiguity(
            message, self.project_context, []
        )
        
        assert len(analysis.follow_up_questions) > 0
        assert any("specific" in q.lower() for q in analysis.follow_up_questions)
    
    @pytest.mark.asyncio
    async def test_clarification_request_generation(self):
        """Test that clarification requests are properly generated"""
        message = "Help me"
        
        analysis = await self.service.analyzeQueryAmbiguity(
            message, self.project_context, []
        )
        
        clarification = await self.service.generateClarificationRequest(
            message, analysis, self.project_context
        )
        
        assert clarification.original_query == message
        assert clarification.requires_user_input
        assert len(clarification.suggested_questions) > 0
        assert "Smart Home IoT System" in clarification.clarification_prompt
    
    @pytest.mark.asyncio
    async def test_guidance_response_with_ambiguity(self):
        """Test that guidance responses include ambiguity information when needed"""
        request = GuidanceRequest(
            project_id=self.project_context.project_id,
            user_message="Help me with this",
            conversation_history=[]
        )
        
        # Mock the project context service to return our test context
        original_method = self.service.analyzeProjectContext
        async def mock_analyze_context(project_id):
            return self.project_context
        self.service.analyzeProjectContext = mock_analyze_context
        
        try:
            response = await self.service.generateResponse(request)
            
            assert response.requires_clarification
            assert response.ambiguity_analysis is not None
            assert response.ambiguity_analysis.is_ambiguous
            assert response.clarification_request is not None
        finally:
            # Restore original method
            self.service.analyzeProjectContext = original_method
    
    @pytest.mark.asyncio
    async def test_guidance_response_without_ambiguity(self):
        """Test that clear questions don't trigger clarification"""
        request = GuidanceRequest(
            project_id=self.project_context.project_id,
            user_message="What sensors should I use for temperature monitoring?",
            conversation_history=[]
        )
        
        # Mock the project context service to return our test context
        original_method = self.service.analyzeProjectContext
        async def mock_analyze_context(project_id):
            return self.project_context
        self.service.analyzeProjectContext = mock_analyze_context
        
        try:
            response = await self.service.generateResponse(request)
            
            assert not response.requires_clarification
            # May still have ambiguity_analysis but shouldn't require clarification
        finally:
            # Restore original method
            self.service.analyzeProjectContext = original_method
    
    def test_follow_up_question_categorization(self):
        """Test that follow-up questions are properly categorized"""
        questions = [
            "What specific aspect are you working on?",
            "What is your timeline?", 
            "What resources do you need?",
            "Are you asking about a task or milestone?",  # Changed to avoid "which" keyword
            "What is your approach?"
        ]
        
        expected_categories = [
            "specificity",  # "specific" keyword
            "timeline",     # "timeline" keyword
            "resources",    # "resources" keyword
            "scope",        # "task" and "milestone" keywords
            "methodology"   # "approach" keyword
        ]
        
        for question, expected_category in zip(questions, expected_categories):
            category = self.service._categorizeFollowUpQuestion(question)
            assert category == expected_category
    
    def test_clarification_prompt_generation(self):
        """Test that clarification prompts are user-friendly"""
        analysis = AmbiguityAnalysis(
            is_ambiguous=True,
            ambiguity_score=0.8,
            ambiguous_aspects=["Contains vague language"],
            follow_up_questions=["What specifically do you need help with?"],
            clarification_needed=True
        )
        
        prompt = self.service._generateClarificationPrompt(
            "Help me", analysis, self.project_context
        )
        
        assert "Help me" in prompt
        assert "Smart Home IoT System" in prompt
        assert "Development phase" in prompt
        assert "What specifically do you need help with?" in prompt


if __name__ == "__main__":
    pytest.main([__file__])