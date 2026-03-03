# Unit Tests for ProjectContextService
# Requirements: 3.1, 7.1, 7.2
# Task: 2.3 Create ProjectContextService class

import pytest
import asyncio
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from typing import List, Dict, Any

from backend.services.project_context_service import (
    ProjectContextService, get_project_context, get_project_tasks,
    get_project_milestones, calculate_project_progress, refresh_project_context,
    get_project_analytics
)
from backend.models.ai_guidance import (
    ProjectContext, Task, Milestone, TaskStatus, TaskPriority
)


class TestProjectContextService:
    """Test suite for ProjectContextService class"""
    
    @pytest.fixture
    def mock_client(self):
        """Mock Supabase client"""
        client = MagicMock()
        return client
    
    @pytest.fixture
    def project_context_service(self, mock_client):
        """ProjectContextService instance with mocked client"""
        return ProjectContextService(client=mock_client)
    
    @pytest.fixture
    def sample_project_id(self):
        """Sample project ID for testing"""
        return "550e8400-e29b-41d4-a716-446655440000"
    
    @pytest.fixture
    def sample_tasks(self):
        """Sample tasks for testing"""
        return [
            Task(
                title="Task 1",
                description="First task",
                status=TaskStatus.COMPLETED,
                priority=TaskPriority.HIGH,
                due_date=datetime(2024, 1, 15, tzinfo=timezone.utc)
            ),
            Task(
                title="Task 2",
                description="Second task",
                status=TaskStatus.IN_PROGRESS,
                priority=TaskPriority.MEDIUM,
                due_date=datetime(2024, 2, 15, tzinfo=timezone.utc)
            ),
            Task(
                title="Task 3",
                description="Third task",
                status=TaskStatus.PENDING,
                priority=TaskPriority.LOW,
                due_date=datetime(2024, 3, 15, tzinfo=timezone.utc)
            )
        ]
    
    @pytest.fixture
    def sample_milestones(self):
        """Sample milestones for testing"""
        return [
            Milestone(
                title="Milestone 1",
                description="First milestone",
                target_date=datetime(2024, 1, 31, tzinfo=timezone.utc),
                completed=True
            ),
            Milestone(
                title="Milestone 2",
                description="Second milestone",
                target_date=datetime(2024, 2, 28, tzinfo=timezone.utc),
                completed=False
            )
        ]
    
    @pytest.fixture
    def sample_project_context(self, sample_project_id, sample_tasks, sample_milestones):
        """Sample project context for testing"""
        return ProjectContext(
            project_id=sample_project_id,
            title="Test Project",
            description="A test project",
            goals=["Goal 1", "Goal 2"],
            current_phase="Development",
            tasks=sample_tasks,
            milestones=sample_milestones,
            progress=40.0,
            deadlines=[datetime(2024, 3, 31, tzinfo=timezone.utc)]
        )
    
    # Test getProjectContext method
    
    @pytest.mark.asyncio
    async def test_getProjectContext_success(self, project_context_service, sample_project_id, mock_client):
        """Test successful project context retrieval"""
        # Mock no cached context
        mock_client.table.return_value.select.return_value.eq.return_value.gt.return_value.order.return_value.limit.return_value.execute.return_value.data = []
        
        # Mock project data fetch
        with patch.object(project_context_service, '_fetch_project_data', new_callable=AsyncMock) as mock_fetch_data, \
             patch.object(project_context_service, 'getProjectTasks', new_callable=AsyncMock) as mock_get_tasks, \
             patch.object(project_context_service, 'getProjectMilestones', new_callable=AsyncMock) as mock_get_milestones, \
             patch.object(project_context_service, 'calculateProgress', new_callable=AsyncMock) as mock_calc_progress, \
             patch.object(project_context_service, '_cache_project_context', new_callable=AsyncMock) as mock_cache:
            
            mock_fetch_data.return_value = {
                "title": "Test Project",
                "description": "A test project",
                "goals": ["Goal 1", "Goal 2"],
                "current_phase": "Development",
                "deadlines": [datetime(2024, 3, 31, tzinfo=timezone.utc)]
            }
            mock_get_tasks.return_value = []
            mock_get_milestones.return_value = []
            mock_calc_progress.return_value = 0.0
            
            result = await project_context_service.getProjectContext(sample_project_id)
            
            assert result is not None
            assert result.project_id == sample_project_id
            assert result.title == "Test Project"
            assert result.description == "A test project"
            assert result.goals == ["Goal 1", "Goal 2"]
            assert result.current_phase == "Development"
            assert result.progress == 0.0
            
            mock_fetch_data.assert_called_once_with(sample_project_id)
            mock_get_tasks.assert_called_once_with(sample_project_id)
            mock_get_milestones.assert_called_once_with(sample_project_id)
            mock_calc_progress.assert_called_once_with(sample_project_id)
            mock_cache.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_getProjectContext_cached(self, project_context_service, sample_project_id, sample_project_context, mock_client):
        """Test project context retrieval from cache"""
        # Mock cached context
        mock_client.table.return_value.select.return_value.eq.return_value.gt.return_value.order.return_value.limit.return_value.execute.return_value.data = [
            {"context_data": sample_project_context.dict()}
        ]
        
        result = await project_context_service.getProjectContext(sample_project_id)
        
        assert result is not None
        assert result.project_id == sample_project_id
        assert result.title == sample_project_context.title
    
    @pytest.mark.asyncio
    async def test_getProjectContext_empty_project_id(self, project_context_service):
        """Test project context retrieval with empty project_id"""
        with pytest.raises(ValueError, match="project_id cannot be empty"):
            await project_context_service.getProjectContext("")
    
    @pytest.mark.asyncio
    async def test_getProjectContext_project_not_found(self, project_context_service, sample_project_id, mock_client):
        """Test project context retrieval when project not found"""
        # Mock no cached context
        mock_client.table.return_value.select.return_value.eq.return_value.gt.return_value.order.return_value.limit.return_value.execute.return_value.data = []
        
        # Mock project not found
        with patch.object(project_context_service, '_fetch_project_data', new_callable=AsyncMock) as mock_fetch_data:
            mock_fetch_data.return_value = None
            
            result = await project_context_service.getProjectContext(sample_project_id)
            
            assert result is None
    
    # Test getProjectTasks method
    
    @pytest.mark.asyncio
    async def test_getProjectTasks_success(self, project_context_service, sample_project_id, sample_tasks):
        """Test successful project tasks retrieval"""
        with patch.object(project_context_service, '_fetch_project_tasks', new_callable=AsyncMock) as mock_fetch_tasks:
            mock_fetch_tasks.return_value = sample_tasks
            
            result = await project_context_service.getProjectTasks(sample_project_id)
            
            assert len(result) == 3
            assert result[0].title == "Task 1"
            assert result[0].status == TaskStatus.COMPLETED
            assert result[1].title == "Task 2"
            assert result[1].status == TaskStatus.IN_PROGRESS
            
            mock_fetch_tasks.assert_called_once_with(sample_project_id)
    
    @pytest.mark.asyncio
    async def test_getProjectTasks_empty_project_id(self, project_context_service):
        """Test project tasks retrieval with empty project_id"""
        with pytest.raises(ValueError, match="project_id cannot be empty"):
            await project_context_service.getProjectTasks("")
    
    # Test getProjectMilestones method
    
    @pytest.mark.asyncio
    async def test_getProjectMilestones_success(self, project_context_service, sample_project_id, sample_milestones):
        """Test successful project milestones retrieval"""
        with patch.object(project_context_service, '_fetch_project_milestones', new_callable=AsyncMock) as mock_fetch_milestones:
            mock_fetch_milestones.return_value = sample_milestones
            
            result = await project_context_service.getProjectMilestones(sample_project_id)
            
            assert len(result) == 2
            assert result[0].title == "Milestone 1"
            assert result[0].completed is True
            assert result[1].title == "Milestone 2"
            assert result[1].completed is False
            
            mock_fetch_milestones.assert_called_once_with(sample_project_id)
    
    @pytest.mark.asyncio
    async def test_getProjectMilestones_empty_project_id(self, project_context_service):
        """Test project milestones retrieval with empty project_id"""
        with pytest.raises(ValueError, match="project_id cannot be empty"):
            await project_context_service.getProjectMilestones("")
    
    # Test calculateProgress method
    
    @pytest.mark.asyncio
    async def test_calculateProgress_success(self, project_context_service, sample_project_id, sample_tasks, sample_milestones):
        """Test successful progress calculation"""
        with patch.object(project_context_service, 'getProjectTasks', new_callable=AsyncMock) as mock_get_tasks, \
             patch.object(project_context_service, 'getProjectMilestones', new_callable=AsyncMock) as mock_get_milestones:
            
            mock_get_tasks.return_value = sample_tasks  # 1 completed out of 3
            mock_get_milestones.return_value = sample_milestones  # 1 completed out of 2
            
            result = await project_context_service.calculateProgress(sample_project_id)
            
            # Expected: (1 completed task + 1 completed milestone) / (3 tasks + 2 milestones) * 100 = 40%
            assert result == 40.0
            
            mock_get_tasks.assert_called_once_with(sample_project_id)
            mock_get_milestones.assert_called_once_with(sample_project_id)
    
    @pytest.mark.asyncio
    async def test_calculateProgress_no_items(self, project_context_service, sample_project_id):
        """Test progress calculation with no tasks or milestones"""
        with patch.object(project_context_service, 'getProjectTasks', new_callable=AsyncMock) as mock_get_tasks, \
             patch.object(project_context_service, 'getProjectMilestones', new_callable=AsyncMock) as mock_get_milestones:
            
            mock_get_tasks.return_value = []
            mock_get_milestones.return_value = []
            
            result = await project_context_service.calculateProgress(sample_project_id)
            
            assert result == 0.0
    
    @pytest.mark.asyncio
    async def test_calculateProgress_empty_project_id(self, project_context_service):
        """Test progress calculation with empty project_id"""
        with pytest.raises(ValueError, match="project_id cannot be empty"):
            await project_context_service.calculateProgress("")
    
    # Test refreshProjectContext method
    
    @pytest.mark.asyncio
    async def test_refreshProjectContext_success(self, project_context_service, sample_project_id, sample_project_context):
        """Test successful project context refresh"""
        with patch.object(project_context_service, '_clear_cached_context', new_callable=AsyncMock) as mock_clear_cache, \
             patch.object(project_context_service, 'getProjectContext', new_callable=AsyncMock) as mock_get_context:
            
            mock_get_context.return_value = sample_project_context
            
            result = await project_context_service.refreshProjectContext(sample_project_id)
            
            assert result is not None
            assert result.project_id == sample_project_id
            
            mock_clear_cache.assert_called_once_with(sample_project_id)
            mock_get_context.assert_called_once_with(sample_project_id)
    
    @pytest.mark.asyncio
    async def test_refreshProjectContext_empty_project_id(self, project_context_service):
        """Test project context refresh with empty project_id"""
        with pytest.raises(ValueError, match="project_id cannot be empty"):
            await project_context_service.refreshProjectContext("")
    
    # Test updateProjectData method
    
    @pytest.mark.asyncio
    async def test_updateProjectData_success(self, project_context_service, sample_project_id):
        """Test successful project data update"""
        updates = {"title": "Updated Title", "description": "Updated Description"}
        
        with patch.object(project_context_service, '_update_project_data', new_callable=AsyncMock) as mock_update_data, \
             patch.object(project_context_service, '_clear_cached_context', new_callable=AsyncMock) as mock_clear_cache:
            
            mock_update_data.return_value = True
            
            result = await project_context_service.updateProjectData(sample_project_id, updates)
            
            assert result is True
            
            mock_update_data.assert_called_once_with(sample_project_id, updates)
            mock_clear_cache.assert_called_once_with(sample_project_id)
    
    @pytest.mark.asyncio
    async def test_updateProjectData_empty_project_id(self, project_context_service):
        """Test project data update with empty project_id"""
        with pytest.raises(ValueError, match="project_id cannot be empty"):
            await project_context_service.updateProjectData("", {"title": "Test"})
    
    @pytest.mark.asyncio
    async def test_updateProjectData_empty_updates(self, project_context_service, sample_project_id):
        """Test project data update with empty updates"""
        with pytest.raises(ValueError, match="updates cannot be empty"):
            await project_context_service.updateProjectData(sample_project_id, {})
    
    # Test getProjectAnalytics method
    
    @pytest.mark.asyncio
    async def test_getProjectAnalytics_success(self, project_context_service, sample_project_id, sample_project_context):
        """Test successful project analytics retrieval"""
        with patch.object(project_context_service, 'getProjectContext', new_callable=AsyncMock) as mock_get_context:
            mock_get_context.return_value = sample_project_context
            
            result = await project_context_service.getProjectAnalytics(sample_project_id)
            
            assert result is not None
            assert result["project_id"] == sample_project_id
            assert result["title"] == sample_project_context.title
            assert result["progress"] == sample_project_context.progress
            assert "task_stats" in result
            assert "milestone_stats" in result
            assert "completion_rate" in result
            assert "milestone_completion_rate" in result
            
            # Check task stats
            task_stats = result["task_stats"]
            assert task_stats["total"] == 3
            assert task_stats["completed"] == 1
            assert task_stats["in_progress"] == 1
            assert task_stats["pending"] == 1
            
            # Check milestone stats
            milestone_stats = result["milestone_stats"]
            assert milestone_stats["total"] == 2
            assert milestone_stats["completed"] == 1
            
            mock_get_context.assert_called_once_with(sample_project_id)
    
    @pytest.mark.asyncio
    async def test_getProjectAnalytics_project_not_found(self, project_context_service, sample_project_id):
        """Test project analytics when project not found"""
        with patch.object(project_context_service, 'getProjectContext', new_callable=AsyncMock) as mock_get_context:
            mock_get_context.return_value = None
            
            with pytest.raises(ValueError, match=f"Project {sample_project_id} not found"):
                await project_context_service.getProjectAnalytics(sample_project_id)
    
    @pytest.mark.asyncio
    async def test_getProjectAnalytics_empty_project_id(self, project_context_service):
        """Test project analytics with empty project_id"""
        with pytest.raises(ValueError, match="project_id cannot be empty"):
            await project_context_service.getProjectAnalytics("")


class TestConvenienceFunctions:
    """Test suite for convenience functions"""
    
    @pytest.fixture
    def sample_project_id(self):
        """Sample project ID for testing"""
        return "550e8400-e29b-41d4-a716-446655440000"
    
    @pytest.mark.asyncio
    async def test_get_project_context(self, sample_project_id):
        """Test get_project_context convenience function"""
        with patch('backend.services.project_context_service.ProjectContextService') as mock_service_class:
            mock_service = AsyncMock()
            mock_service_class.return_value = mock_service
            mock_service.getProjectContext.return_value = ProjectContext(
                project_id=sample_project_id,
                title="Test Project",
                description="Test Description",
                goals=[],
                current_phase="Planning",
                tasks=[],
                milestones=[],
                progress=0.0,
                deadlines=[]
            )
            
            result = await get_project_context(sample_project_id)
            
            assert result is not None
            assert result.project_id == sample_project_id
            mock_service.getProjectContext.assert_called_once_with(sample_project_id)
    
    @pytest.mark.asyncio
    async def test_get_project_tasks(self, sample_project_id):
        """Test get_project_tasks convenience function"""
        with patch('backend.services.project_context_service.ProjectContextService') as mock_service_class:
            mock_service = AsyncMock()
            mock_service_class.return_value = mock_service
            mock_service.getProjectTasks.return_value = []
            
            result = await get_project_tasks(sample_project_id)
            
            assert result == []
            mock_service.getProjectTasks.assert_called_once_with(sample_project_id)
    
    @pytest.mark.asyncio
    async def test_get_project_milestones(self, sample_project_id):
        """Test get_project_milestones convenience function"""
        with patch('backend.services.project_context_service.ProjectContextService') as mock_service_class:
            mock_service = AsyncMock()
            mock_service_class.return_value = mock_service
            mock_service.getProjectMilestones.return_value = []
            
            result = await get_project_milestones(sample_project_id)
            
            assert result == []
            mock_service.getProjectMilestones.assert_called_once_with(sample_project_id)
    
    @pytest.mark.asyncio
    async def test_calculate_project_progress(self, sample_project_id):
        """Test calculate_project_progress convenience function"""
        with patch('backend.services.project_context_service.ProjectContextService') as mock_service_class:
            mock_service = AsyncMock()
            mock_service_class.return_value = mock_service
            mock_service.calculateProgress.return_value = 50.0
            
            result = await calculate_project_progress(sample_project_id)
            
            assert result == 50.0
            mock_service.calculateProgress.assert_called_once_with(sample_project_id)
    
    @pytest.mark.asyncio
    async def test_refresh_project_context(self, sample_project_id):
        """Test refresh_project_context convenience function"""
        with patch('backend.services.project_context_service.ProjectContextService') as mock_service_class:
            mock_service = AsyncMock()
            mock_service_class.return_value = mock_service
            mock_service.refreshProjectContext.return_value = ProjectContext(
                project_id=sample_project_id,
                title="Refreshed Project",
                description="Refreshed Description",
                goals=[],
                current_phase="Planning",
                tasks=[],
                milestones=[],
                progress=0.0,
                deadlines=[]
            )
            
            result = await refresh_project_context(sample_project_id)
            
            assert result is not None
            assert result.title == "Refreshed Project"
            mock_service.refreshProjectContext.assert_called_once_with(sample_project_id)
    
    @pytest.mark.asyncio
    async def test_get_project_analytics(self, sample_project_id):
        """Test get_project_analytics convenience function"""
        with patch('backend.services.project_context_service.ProjectContextService') as mock_service_class:
            mock_service = AsyncMock()
            mock_service_class.return_value = mock_service
            mock_service.getProjectAnalytics.return_value = {
                "project_id": sample_project_id,
                "title": "Test Project",
                "progress": 50.0
            }
            
            result = await get_project_analytics(sample_project_id)
            
            assert result["project_id"] == sample_project_id
            assert result["title"] == "Test Project"
            assert result["progress"] == 50.0
            mock_service.getProjectAnalytics.assert_called_once_with(sample_project_id)


if __name__ == "__main__":
    pytest.main([__file__])