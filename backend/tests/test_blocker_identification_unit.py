# Unit tests for blocker identification and recommendation logic
# Task: 7.3 Add blocker identification and recommendation logic
# Requirements: 6.1, 6.4

import pytest
import uuid
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, patch

from services.ai_guidance_service import AIGuidanceService
from models.ai_guidance import (
    ProjectContext, Task, Milestone, TaskStatus, TaskPriority, GuidanceRequest
)


class TestBlockerIdentificationAndRecommendations:
    """Test blocker identification and resource-aware recommendation functionality"""
    
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
            return service
    
    @pytest.fixture
    def project_context_with_blockers(self):
        """Create a project context with various blocker scenarios"""
        overdue_date = datetime.now(timezone.utc) - timedelta(days=3)
        future_date = datetime.now(timezone.utc) + timedelta(days=7)
        
        return ProjectContext(
            project_id=str(uuid.uuid4()),
            title="Test Project with Blockers",
            description="A test project with various blocker scenarios",
            goals=["Test goal 1", "Test goal 2"],
            current_phase="Development",
            progress=35.0,
            tasks=[
                # Overdue high priority task
                Task(
                    title="Overdue critical task",
                    description="This task is overdue and high priority",
                    status=TaskStatus.PENDING,
                    priority=TaskPriority.HIGH,
                    due_date=overdue_date
                ),
                # Too many in-progress tasks (6 tasks)
                Task(title="Task 1", description="In progress task 1", status=TaskStatus.IN_PROGRESS, priority=TaskPriority.MEDIUM),
                Task(title="Task 2", description="In progress task 2", status=TaskStatus.IN_PROGRESS, priority=TaskPriority.MEDIUM),
                Task(title="Task 3", description="In progress task 3", status=TaskStatus.IN_PROGRESS, priority=TaskPriority.MEDIUM),
                Task(title="Task 4", description="In progress task 4", status=TaskStatus.IN_PROGRESS, priority=TaskPriority.MEDIUM),
                Task(title="Task 5", description="In progress task 5", status=TaskStatus.IN_PROGRESS, priority=TaskPriority.MEDIUM),
                Task(title="Task 6", description="In progress task 6", status=TaskStatus.IN_PROGRESS, priority=TaskPriority.MEDIUM),
                # Multiple high priority pending tasks
                Task(title="High priority pending 1", description="High priority task", status=TaskStatus.PENDING, priority=TaskPriority.HIGH),
                Task(title="High priority pending 2", description="High priority task", status=TaskStatus.PENDING, priority=TaskPriority.HIGH),
                Task(title="High priority pending 3", description="High priority task", status=TaskStatus.PENDING, priority=TaskPriority.HIGH),
                Task(title="High priority pending 4", description="High priority task", status=TaskStatus.PENDING, priority=TaskPriority.HIGH),
            ],
            milestones=[
                # Overdue milestone
                Milestone(
                    title="Overdue Milestone",
                    description="This milestone is overdue",
                    target_date=overdue_date,
                    completed=False
                )
            ],
            deadlines=[future_date]
        )
    
    @pytest.fixture
    def simple_project_context(self):
        """Create a simple project context for resource recommendation testing"""
        return ProjectContext(
            project_id=str(uuid.uuid4()),
            title="Simple Test Project",
            description="A simple project for testing recommendations",
            goals=["Learn something new"],
            current_phase="Planning",
            progress=15.0,
            tasks=[
                Task(
                    title="High priority task",
                    description="Important task to complete",
                    status=TaskStatus.PENDING,
                    priority=TaskPriority.HIGH,
                    due_date=datetime.now(timezone.utc) + timedelta(days=5)
                ),
                Task(
                    title="Low priority task",
                    description="Less important task",
                    status=TaskStatus.PENDING,
                    priority=TaskPriority.LOW,
                    due_date=datetime.now(timezone.utc) + timedelta(days=10)
                )
            ],
            milestones=[
                Milestone(
                    title="Planning Complete",
                    description="Planning phase completed",
                    target_date=datetime.now(timezone.utc) + timedelta(days=14),
                    completed=False
                )
            ],
            deadlines=[datetime.now(timezone.utc) + timedelta(days=30)]
        )
    
    @pytest.mark.asyncio
    async def test_identify_project_blockers_overdue_tasks(self, service, project_context_with_blockers):
        """Test identification of overdue tasks as blockers"""
        blockers = await service.identifyProjectBlockers(project_context_with_blockers)
        
        assert len(blockers) > 0
        blocker_text = " ".join(blockers).lower()
        assert "overdue" in blocker_text
        assert "task" in blocker_text
    
    @pytest.mark.asyncio
    async def test_identify_project_blockers_overdue_milestones(self, service, project_context_with_blockers):
        """Test identification of overdue milestones as blockers"""
        blockers = await service.identifyProjectBlockers(project_context_with_blockers)
        
        blocker_text = " ".join(blockers).lower()
        assert "milestone" in blocker_text and "overdue" in blocker_text
    
    @pytest.mark.asyncio
    async def test_identify_project_blockers_too_many_in_progress(self, service, project_context_with_blockers):
        """Test identification of too many in-progress tasks as blocker"""
        blockers = await service.identifyProjectBlockers(project_context_with_blockers)
        
        blocker_text = " ".join(blockers).lower()
        assert "too many tasks in progress" in blocker_text or "simultaneously" in blocker_text
    
    @pytest.mark.asyncio
    async def test_identify_project_blockers_high_priority_pending(self, service, project_context_with_blockers):
        """Test identification of multiple high-priority pending tasks as blocker"""
        blockers = await service.identifyProjectBlockers(project_context_with_blockers)
        
        blocker_text = " ".join(blockers).lower()
        assert "high-priority" in blocker_text and "pending" in blocker_text
    
    @pytest.mark.asyncio
    async def test_identify_project_blockers_empty_context(self, service):
        """Test blocker identification with None project context"""
        blockers = await service.identifyProjectBlockers(None)
        
        assert len(blockers) == 1
        assert "no project context available" in blockers[0].lower()
    
    @pytest.mark.asyncio
    async def test_generate_resource_aware_recommendations_time_constrained(self, service, simple_project_context):
        """Test resource-aware recommendations for time-constrained users"""
        user_message = "I need to finish this quickly, I have limited time"
        
        recommendations = await service.generateResourceAwareRecommendations(
            simple_project_context, user_message
        )
        
        assert len(recommendations) > 0
        rec_text = " ".join(recommendations).lower()
        assert any(keyword in rec_text for keyword in ["minimum viable", "core features", "prioritize", "accelerate"])
    
    @pytest.mark.asyncio
    async def test_generate_resource_aware_recommendations_budget_constrained(self, service, simple_project_context):
        """Test resource-aware recommendations for budget-constrained users"""
        user_message = "I'm on a tight budget and can't afford expensive tools"
        
        recommendations = await service.generateResourceAwareRecommendations(
            simple_project_context, user_message
        )
        
        assert len(recommendations) > 0
        rec_text = " ".join(recommendations).lower()
        assert any(keyword in rec_text for keyword in ["free", "open-source", "phased", "community"])
    
    @pytest.mark.asyncio
    async def test_generate_resource_aware_recommendations_skill_constrained(self, service, simple_project_context):
        """Test resource-aware recommendations for skill-constrained users"""
        user_message = "I'm new to this and don't know where to start"
        
        recommendations = await service.generateResourceAwareRecommendations(
            simple_project_context, user_message
        )
        
        assert len(recommendations) > 0
        rec_text = " ".join(recommendations).lower()
        assert any(keyword in rec_text for keyword in ["simpler", "learning", "beginner", "tutorials"])
    
    @pytest.mark.asyncio
    async def test_generate_resource_aware_recommendations_resource_constrained(self, service, simple_project_context):
        """Test resource-aware recommendations for resource-constrained users"""
        user_message = "I don't have access to the latest development tools"
        
        recommendations = await service.generateResourceAwareRecommendations(
            simple_project_context, user_message
        )
        
        assert len(recommendations) > 0
        rec_text = " ".join(recommendations).lower()
        assert any(keyword in rec_text for keyword in ["available resources", "alternative", "community", "dependencies"])
    
    @pytest.mark.asyncio
    async def test_generate_resource_aware_recommendations_general(self, service, simple_project_context):
        """Test resource-aware recommendations for general queries"""
        user_message = "What should I focus on next?"
        
        recommendations = await service.generateResourceAwareRecommendations(
            simple_project_context, user_message
        )
        
        assert len(recommendations) > 0
        # Should include general project optimization recommendations
        rec_text = " ".join(recommendations).lower()
        assert len(recommendations) <= 8  # Should be limited to 8 recommendations
    
    @pytest.mark.asyncio
    async def test_generate_resource_aware_recommendations_empty_context(self, service):
        """Test resource-aware recommendations with None project context"""
        recommendations = await service.generateResourceAwareRecommendations(None, "Help me")
        
        assert len(recommendations) == 1
        assert "no project context available" in recommendations[0].lower()
    
    @pytest.mark.asyncio
    async def test_integrated_blocker_and_recommendation_logic(self, service, project_context_with_blockers):
        """Test that blocker identification and recommendations are integrated in generateResponse"""
        # Mock the analyzeProjectContext method to return our test context
        service.analyzeProjectContext = AsyncMock(return_value=project_context_with_blockers)
        
        request = GuidanceRequest(
            project_id=project_context_with_blockers.project_id,
            user_message="I'm stuck and need help. I have limited time and budget.",
            conversation_history=[]
        )
        
        response = await service.generateResponse(request)
        
        # Should have suggestions and next steps
        assert len(response.suggestions) > 0
        assert len(response.next_steps) > 0
        
        # Should include blocker-related or resource-aware content
        all_content = f"{response.response} {' '.join(response.suggestions)} {' '.join(response.next_steps)}".lower()
        
        # Check for blocker-related content
        blocker_indicators = ["overdue", "blocker", "challenge", "progress", "milestone"]
        resource_indicators = ["limited", "budget", "time", "resource", "constraint", "available"]
        
        has_blocker_content = any(indicator in all_content for indicator in blocker_indicators)
        has_resource_content = any(indicator in all_content for indicator in resource_indicators)
        
        # Should have either blocker-related or resource-aware content (or both)
        assert has_blocker_content or has_resource_content
    
    @pytest.mark.asyncio
    async def test_blocker_identification_requirements_6_1(self, service, project_context_with_blockers):
        """
        Test that Requirement 6.1 is satisfied:
        THE AI_Guidance_System SHALL identify potential blockers or challenges in the current project state
        """
        blockers = await service.identifyProjectBlockers(project_context_with_blockers)
        
        # Should identify multiple types of blockers
        assert len(blockers) >= 3
        
        blocker_text = " ".join(blockers).lower()
        
        # Should identify overdue tasks
        assert "overdue" in blocker_text
        
        # Should identify task management issues
        assert any(phrase in blocker_text for phrase in ["too many", "simultaneously", "progress"])
        
        # Should identify prioritization issues
        assert any(phrase in blocker_text for phrase in ["priority", "prioritization"])
    
    @pytest.mark.asyncio
    async def test_resource_aware_recommendations_requirements_6_4(self, service, simple_project_context):
        """
        Test that Requirement 6.4 is satisfied:
        WHEN providing recommendations, THE AI_Guidance_System SHALL consider the user's available resources and constraints
        """
        # Test different resource constraint scenarios
        test_cases = [
            ("limited time", ["minimum viable", "core features", "prioritize"]),
            ("tight budget", ["free", "open-source", "phased"]),
            ("new to development", ["simpler", "learning", "beginner"]),
            ("no access to tools", ["available resources", "alternative", "community"])
        ]
        
        for constraint_message, expected_keywords in test_cases:
            recommendations = await service.generateResourceAwareRecommendations(
                simple_project_context, f"I have {constraint_message}"
            )
            
            assert len(recommendations) > 0
            rec_text = " ".join(recommendations).lower()
            
            # Should contain at least one expected keyword for the constraint type
            assert any(keyword.lower() in rec_text for keyword in expected_keywords), \
                f"No expected keywords found for constraint '{constraint_message}'. Recommendations: {recommendations}"


# Run a simple test
if __name__ == "__main__":
    async def simple_test():
        service = AIGuidanceService()
        
        # Test with a simple project context
        project_context = ProjectContext(
            project_id=str(uuid.uuid4()),
            title="Test Project",
            description="A test project",
            goals=["Test goal"],
            current_phase="Development",
            progress=50.0,
            tasks=[
                Task(
                    title="Overdue task",
                    description="This task is overdue",
                    status=TaskStatus.PENDING,
                    priority=TaskPriority.HIGH,
                    due_date=datetime.now(timezone.utc) - timedelta(days=1)
                )
            ],
            milestones=[],
            deadlines=[]
        )
        
        blockers = await service.identifyProjectBlockers(project_context)
        print(f"Identified blockers: {blockers}")
        
        recommendations = await service.generateResourceAwareRecommendations(
            project_context, "I need help and have limited time"
        )
        print(f"Generated recommendations: {recommendations}")
    
    import asyncio
    asyncio.run(simple_test())