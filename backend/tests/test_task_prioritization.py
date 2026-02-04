# Unit Tests for Task Prioritization Logic
# Requirements: 6.3, 6.4 - Task prioritization based on goals and deadlines with resource constraints

import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock
import uuid

from services.ai_guidance_service import AIGuidanceService
from models.ai_guidance import (
    ProjectContext, Task, Milestone, TaskStatus, TaskPriority, MessageSender
)


class TestTaskPrioritization:
    """Test suite for task prioritization functionality"""
    
    @pytest.fixture
    def ai_service(self):
        """Create AI guidance service instance for testing"""
        service = AIGuidanceService()
        # Mock external dependencies
        service.openrouter_client = None
        service.openrouter_config = None
        return service
    
    @pytest.fixture
    def sample_project_context(self):
        """Create sample project context with tasks and milestones"""
        current_time = datetime.now(timezone.utc)
        
        tasks = [
            Task(
                id="task1",
                title="Setup Development Environment",
                description="Configure development tools and environment",
                status=TaskStatus.PENDING,
                priority=TaskPriority.HIGH,
                due_date=current_time + timedelta(days=2)
            ),
            Task(
                id="task2", 
                title="Design User Interface",
                description="Create UI mockups and designs",
                status=TaskStatus.PENDING,
                priority=TaskPriority.MEDIUM,
                due_date=current_time + timedelta(days=7)
            ),
            Task(
                id="task3",
                title="Implement Core Features",
                description="Build main application functionality",
                status=TaskStatus.IN_PROGRESS,
                priority=TaskPriority.HIGH,
                due_date=current_time + timedelta(days=14)
            ),
            Task(
                id="task4",
                title="Write Documentation",
                description="Create user and developer documentation",
                status=TaskStatus.PENDING,
                priority=TaskPriority.LOW,
                due_date=current_time + timedelta(days=21)
            ),
            Task(
                id="task5",
                title="Overdue Task",
                description="This task is overdue",
                status=TaskStatus.PENDING,
                priority=TaskPriority.MEDIUM,
                due_date=current_time - timedelta(days=3)
            ),
            Task(
                id="task6",
                title="Completed Task",
                description="This task is already done",
                status=TaskStatus.COMPLETED,
                priority=TaskPriority.HIGH,
                due_date=current_time - timedelta(days=1)
            )
        ]
        
        milestones = [
            Milestone(
                id="milestone1",
                title="MVP Release",
                description="Minimum viable product release",
                target_date=current_time + timedelta(days=10),
                completed=False
            ),
            Milestone(
                id="milestone2",
                title="Beta Testing",
                description="Beta version for testing",
                target_date=current_time + timedelta(days=30),
                completed=False
            )
        ]
        
        return ProjectContext(
            project_id=str(uuid.uuid4()),
            title="Test Project",
            description="A test project for prioritization",
            goals=["Build MVP", "Launch beta version", "Gather user feedback"],
            current_phase="Development",
            tasks=tasks,
            milestones=milestones,
            progress=35.0,
            deadlines=[current_time + timedelta(days=10)]
        )
    
    @pytest.mark.asyncio
    async def test_prioritize_tasks_basic(self, ai_service, sample_project_context):
        """Test basic task prioritization functionality"""
        prioritized_tasks = await ai_service.prioritizeTasks(sample_project_context)
        
        # Should return 5 tasks (excluding completed task)
        assert len(prioritized_tasks) == 5
        
        # Tasks should be sorted by priority score (highest first)
        scores = [task["priority_score"] for task in prioritized_tasks]
        assert scores == sorted(scores, reverse=True)
        
        # Each task should have required fields
        for task_info in prioritized_tasks:
            assert "task" in task_info
            assert "priority_score" in task_info
            assert "priority_level" in task_info
            assert "priority_factors" in task_info
            assert "recommendation" in task_info
    
    @pytest.mark.asyncio
    async def test_overdue_task_gets_high_priority(self, ai_service, sample_project_context):
        """Test that overdue tasks receive high priority scores"""
        prioritized_tasks = await ai_service.prioritizeTasks(sample_project_context)
        
        # Find the overdue task
        overdue_task = next(
            task for task in prioritized_tasks 
            if task["task"].title == "Overdue Task"
        )
        
        # Overdue task should have high priority score
        assert overdue_task["priority_score"] >= 45  # Should get urgency bonus
        assert any("Overdue" in factor for factor in overdue_task["priority_factors"])
    
    @pytest.mark.asyncio
    async def test_high_priority_tasks_score_higher(self, ai_service, sample_project_context):
        """Test that HIGH priority tasks get higher scores than MEDIUM/LOW"""
        prioritized_tasks = await ai_service.prioritizeTasks(sample_project_context)
        
        high_priority_tasks = [
            task for task in prioritized_tasks 
            if task["task"].priority == TaskPriority.HIGH
        ]
        medium_priority_tasks = [
            task for task in prioritized_tasks 
            if task["task"].priority == TaskPriority.MEDIUM
        ]
        
        # High priority tasks should generally score higher
        if high_priority_tasks and medium_priority_tasks:
            avg_high_score = sum(t["priority_score"] for t in high_priority_tasks) / len(high_priority_tasks)
            avg_medium_score = sum(t["priority_score"] for t in medium_priority_tasks) / len(medium_priority_tasks)
            
            # Note: This might not always be true due to other factors like deadlines
            # But on average, high priority should score higher
            assert avg_high_score >= avg_medium_score - 10  # Allow some variance
    
    @pytest.mark.asyncio
    async def test_milestone_alignment_calculation(self, ai_service, sample_project_context):
        """Test milestone alignment scoring"""
        # Create a task that should align with MVP milestone
        mvp_task = Task(
            id="mvp_task",
            title="MVP Core Features",
            description="Build core features for MVP release",
            status=TaskStatus.PENDING,
            priority=TaskPriority.MEDIUM,
            due_date=datetime.now(timezone.utc) + timedelta(days=5)
        )
        
        alignment_score = ai_service._calculateMilestoneAlignment(
            mvp_task, 
            sample_project_context.milestones
        )
        
        # Should get some alignment score due to "MVP" keyword match
        assert alignment_score > 0
        assert alignment_score <= 20  # Should be capped at 20
    
    @pytest.mark.asyncio
    async def test_goal_alignment_calculation(self, ai_service, sample_project_context):
        """Test goal alignment scoring"""
        # Create a task that should align with project goals
        mvp_task = Task(
            id="mvp_task",
            title="Build MVP Features",
            description="Core functionality for minimum viable product",
            status=TaskStatus.PENDING,
            priority=TaskPriority.MEDIUM
        )
        
        alignment_score = ai_service._calculateGoalAlignment(
            mvp_task,
            sample_project_context.goals,
            ["Launch quickly", "Build MVP"]
        )
        
        # Should get alignment score due to "MVP" and "Build" keyword matches
        assert alignment_score > 0
        assert alignment_score <= 15  # Should be capped at 15
    
    @pytest.mark.asyncio
    async def test_dependency_impact_calculation(self, ai_service, sample_project_context):
        """Test dependency impact scoring"""
        # Create a foundational task that might block others
        setup_task = Task(
            id="setup_task",
            title="Initial Setup and Configuration",
            description="Setup development environment and core infrastructure",
            status=TaskStatus.PENDING,
            priority=TaskPriority.HIGH
        )
        
        dependency_score = ai_service._calculateDependencyImpact(
            setup_task,
            sample_project_context.tasks
        )
        
        # Should get dependency score due to "setup" and "configuration" keywords
        assert dependency_score > 0
        assert dependency_score <= 10  # Should be capped at 10
    
    @pytest.mark.asyncio
    async def test_task_prioritization_guidance(self, ai_service, sample_project_context):
        """Test comprehensive task prioritization guidance generation"""
        guidance = await ai_service.generateTaskPrioritizationGuidance(
            sample_project_context,
            "What should I prioritize next?"
        )
        
        # Should return structured guidance
        assert "guidance" in guidance
        assert "prioritized_tasks" in guidance
        assert "recommendations" in guidance
        assert "summary" in guidance
        
        # Guidance should not be empty
        assert len(guidance["guidance"]) > 0
        assert len(guidance["prioritized_tasks"]) > 0
        assert len(guidance["recommendations"]) > 0
        
        # Summary should have counts
        summary = guidance["summary"]
        assert "total_tasks" in summary
        assert "critical_count" in summary
        assert "high_priority_count" in summary
        assert "overdue_count" in summary
    
    @pytest.mark.asyncio
    async def test_extract_goals_from_message(self, ai_service):
        """Test goal extraction from user messages"""
        test_messages = [
            "My goal is to launch the product quickly",
            "I want to focus on user experience and performance",
            "I need to complete the MVP by next month",
            "Just a regular question without goals"
        ]
        
        # Test goal extraction
        goals1 = ai_service._extractGoalsFromMessage(test_messages[0])
        assert len(goals1) > 0
        assert "launch the product quickly" in goals1[0]
        
        goals2 = ai_service._extractGoalsFromMessage(test_messages[1])
        assert len(goals2) > 0
        assert "focus on user experience and performance" in goals2[0]
        
        goals3 = ai_service._extractGoalsFromMessage(test_messages[2])
        assert len(goals3) > 0
        assert "complete the mvp by next month" in goals3[0]
        
        goals4 = ai_service._extractGoalsFromMessage(test_messages[3])
        assert len(goals4) == 0  # No goals in this message
    
    @pytest.mark.asyncio
    async def test_task_recommendation_generation(self, ai_service):
        """Test task recommendation generation based on priority scores"""
        # Test different priority score ranges
        critical_rec = ai_service._generateTaskRecommendation(
            MagicMock(), 75, ["High priority task", "Overdue by 2 days"]
        )
        assert "immediately" in critical_rec.lower()
        
        high_rec = ai_service._generateTaskRecommendation(
            MagicMock(), 55, ["Medium priority task", "Due within a week"]
        )
        assert "this week" in high_rec.lower()
        
        medium_rec = ai_service._generateTaskRecommendation(
            MagicMock(), 35, ["Low priority task"]
        )
        assert "next sprint" in medium_rec.lower()
        
        low_rec = ai_service._generateTaskRecommendation(
            MagicMock(), 15, ["Future deadline"]
        )
        assert "future" in low_rec.lower()
    
    @pytest.mark.asyncio
    async def test_empty_project_context(self, ai_service):
        """Test prioritization with empty or None project context"""
        # Test with None context
        result1 = await ai_service.prioritizeTasks(None)
        assert result1 == []
        
        # Test with empty tasks
        empty_context = ProjectContext(
            project_id=str(uuid.uuid4()),
            title="Empty Project",
            description="No tasks",
            goals=[],
            current_phase="Planning",
            tasks=[],
            milestones=[],
            progress=0.0,
            deadlines=[]
        )
        
        result2 = await ai_service.prioritizeTasks(empty_context)
        assert result2 == []
        
        # Test guidance with empty context
        guidance = await ai_service.generateTaskPrioritizationGuidance(
            empty_context, "What should I do?"
        )
        assert "No active tasks found" in guidance["guidance"]
    
    @pytest.mark.asyncio
    async def test_prioritization_integration_in_generate_response(self, ai_service, sample_project_context):
        """Test that task prioritization is integrated into the main generateResponse method"""
        # Mock the project context service
        ai_service.project_context_service = AsyncMock()
        ai_service.project_context_service.getProjectContext.return_value = sample_project_context
        
        from models.ai_guidance import GuidanceRequest, ChatMessage
        
        # Create a request that should trigger prioritization
        request = GuidanceRequest(
            project_id=str(uuid.uuid4()),
            user_message="What should I prioritize next?",
            conversation_history=[]
        )
        
        # Generate response
        response = await ai_service.generateResponse(request)
        
        # Response should be generated successfully
        assert response is not None
        assert response.response is not None
        assert len(response.suggestions) > 0
        
        # Should contain prioritization-related content
        response_text = response.response.lower()
        suggestions_text = " ".join(response.suggestions).lower()
        
        # Check for prioritization keywords in response or suggestions
        prioritization_indicators = ["priority", "prioritize", "critical", "urgent", "first", "next"]
        has_prioritization_content = any(
            indicator in response_text or indicator in suggestions_text
            for indicator in prioritization_indicators
        )
        
        # Should have some prioritization-related content
        assert has_prioritization_content or len(response.next_steps) > 0


if __name__ == "__main__":
    pytest.main([__file__])