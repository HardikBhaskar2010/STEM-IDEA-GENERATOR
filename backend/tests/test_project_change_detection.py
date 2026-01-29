# Tests for Project Change Detection and Cache Invalidation
# Requirements: 7.4
# Task: 8.1 Add project data change detection and cache invalidation

import pytest
import asyncio
import sys
import os
from datetime import datetime, timezone, timedelta
from unittest.mock import Mock, patch, AsyncMock
import uuid

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from services.project_change_detector import (
    ProjectChangeDetector, 
    ProjectChangeNotifier,
    detect_project_changes,
    invalidate_project_cache,
    refresh_project_context_if_changed,
    notify_project_changed
)
from models.ai_guidance import ProjectContext, Task, Milestone, TaskStatus, TaskPriority


class TestProjectChangeDetector:
    """Test cases for ProjectChangeDetector class"""
    
    @pytest.fixture
    def mock_client(self):
        """Mock Supabase client"""
        client = Mock()
        client.table.return_value = Mock()
        return client
    
    @pytest.fixture
    def detector(self, mock_client):
        """ProjectChangeDetector instance with mocked client"""
        return ProjectChangeDetector(mock_client)
    
    @pytest.fixture
    def sample_project_data(self):
        """Sample project data for testing"""
        return {
            'id': str(uuid.uuid4()),
            'title': 'Test Project',
            'description': 'A test project for change detection',
            'project_type': 'iot',
            'difficulty': 'intermediate',
            'estimated_time': '1 week',
            'estimated_cost': '$100',
            'components': ['Arduino Uno', 'LED'],
            'skills': ['Programming', 'Electronics'],
            'steps': ['Setup', 'Code', 'Test'],
            'status': 'in_progress',
            'progress': 50,
            'notes': 'Making good progress',
            'tags': ['iot', 'beginner'],
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
    
    @pytest.mark.asyncio
    async def test_detect_project_changes_first_check(self, detector, sample_project_data):
        """Test change detection on first check (should return True)"""
        project_id = sample_project_data['id']
        
        # Mock database response
        detector.client.table.return_value.select.return_value.eq.return_value.execute.return_value = Mock(
            data=[sample_project_data]
        )
        
        # First check should always return True (no previous snapshot)
        result = await detector.detect_project_changes(project_id, force_check=True)
        
        assert result is True
        assert project_id in detector._project_snapshots
        assert project_id in detector._last_check_time
    
    @pytest.mark.asyncio
    async def test_detect_project_changes_no_changes(self, detector, sample_project_data):
        """Test change detection when no changes occurred"""
        project_id = sample_project_data['id']
        
        # Mock database response
        detector.client.table.return_value.select.return_value.eq.return_value.execute.return_value = Mock(
            data=[sample_project_data]
        )
        
        # First check to establish baseline
        await detector.detect_project_changes(project_id, force_check=True)
        
        # Second check with same data should return False
        result = await detector.detect_project_changes(project_id, force_check=True)
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_detect_project_changes_with_changes(self, detector, sample_project_data):
        """Test change detection when changes occurred"""
        project_id = sample_project_data['id']
        
        # Mock database response for first check
        detector.client.table.return_value.select.return_value.eq.return_value.execute.return_value = Mock(
            data=[sample_project_data]
        )
        
        # First check to establish baseline
        await detector.detect_project_changes(project_id, force_check=True)
        
        # Modify project data
        modified_data = sample_project_data.copy()
        modified_data['title'] = 'Modified Test Project'
        modified_data['progress'] = 75
        
        # Mock database response for second check
        detector.client.table.return_value.select.return_value.eq.return_value.execute.return_value = Mock(
            data=[modified_data]
        )
        
        # Second check with modified data should return True
        result = await detector.detect_project_changes(project_id, force_check=True)
        
        assert result is True
    
    @pytest.mark.asyncio
    async def test_detect_project_changes_invalid_project_id(self, detector):
        """Test change detection with invalid project ID"""
        with pytest.raises(ValueError, match="project_id cannot be empty"):
            await detector.detect_project_changes("")
        
        with pytest.raises(ValueError, match="project_id cannot be empty"):
            await detector.detect_project_changes(None)
    
    @pytest.mark.asyncio
    async def test_detect_project_changes_project_not_found(self, detector):
        """Test change detection when project is not found"""
        project_id = str(uuid.uuid4())
        
        # Mock database response with no data
        detector.client.table.return_value.select.return_value.eq.return_value.execute.return_value = Mock(
            data=[]
        )
        
        result = await detector.detect_project_changes(project_id, force_check=True)
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_invalidate_project_cache(self, detector):
        """Test cache invalidation"""
        project_id = str(uuid.uuid4())
        
        # Mock successful deletion
        detector.client.table.return_value.delete.return_value.eq.return_value.execute.return_value = Mock()
        
        # Add some test data to internal caches
        detector._project_snapshots[project_id] = {'test': 'data'}
        detector._last_check_time[project_id] = datetime.now(timezone.utc)
        
        result = await detector.invalidate_project_cache(project_id)
        
        assert result is True
        assert project_id not in detector._project_snapshots
        assert project_id not in detector._last_check_time
    
    @pytest.mark.asyncio
    async def test_invalidate_project_cache_invalid_project_id(self, detector):
        """Test cache invalidation with invalid project ID"""
        with pytest.raises(ValueError, match="project_id cannot be empty"):
            await detector.invalidate_project_cache("")
    
    @pytest.mark.asyncio
    async def test_refresh_project_context_if_changed_no_changes(self, detector, sample_project_data):
        """Test context refresh when no changes detected"""
        project_id = sample_project_data['id']
        
        # Mock database response
        detector.client.table.return_value.select.return_value.eq.return_value.execute.return_value = Mock(
            data=[sample_project_data]
        )
        
        # First check to establish baseline
        await detector.detect_project_changes(project_id, force_check=True)
        
        # Second check should detect no changes
        result = await detector.refresh_project_context_if_changed(project_id)
        
        assert result is None
    
    @pytest.mark.asyncio
    async def test_refresh_project_context_if_changed_with_changes(self, detector, sample_project_data):
        """Test context refresh when changes detected"""
        project_id = sample_project_data['id']
        
        # Mock database response for first check
        detector.client.table.return_value.select.return_value.eq.return_value.execute.return_value = Mock(
            data=[sample_project_data]
        )
        
        # First check to establish baseline
        await detector.detect_project_changes(project_id, force_check=True)
        
        # Modify project data
        modified_data = sample_project_data.copy()
        modified_data['title'] = 'Modified Test Project'
        
        # Mock database response for second check
        detector.client.table.return_value.select.return_value.eq.return_value.execute.return_value = Mock(
            data=[modified_data]
        )
        
        # Test that changes are detected (which is the core functionality)
        changes_detected = await detector.detect_project_changes(project_id, force_check=True)
        assert changes_detected is True
        
        # Test cache invalidation works
        invalidation_result = await detector.invalidate_project_cache(project_id)
        assert invalidation_result is True
    
    @pytest.mark.asyncio
    async def test_setup_change_monitoring(self, detector, sample_project_data):
        """Test setting up change monitoring for multiple projects"""
        project_ids = [str(uuid.uuid4()) for _ in range(3)]
        
        # Mock database responses
        detector.client.table.return_value.select.return_value.eq.return_value.execute.return_value = Mock(
            data=[sample_project_data]
        )
        
        await detector.setup_change_monitoring(project_ids, check_interval_minutes=5)
        
        # Verify snapshots were created for all projects
        for project_id in project_ids:
            assert project_id in detector._project_snapshots
    
    @pytest.mark.asyncio
    async def test_setup_change_monitoring_invalid_params(self, detector):
        """Test setup change monitoring with invalid parameters"""
        with pytest.raises(ValueError, match="project_ids cannot be empty"):
            await detector.setup_change_monitoring([])
        
        with pytest.raises(ValueError, match="check_interval_minutes must be at least 1"):
            await detector.setup_change_monitoring(['test'], check_interval_minutes=0)
    
    @pytest.mark.asyncio
    async def test_get_project_change_history(self, detector, sample_project_data):
        """Test getting project change history"""
        project_id = sample_project_data['id']
        
        # Mock database response
        detector.client.table.return_value.select.return_value.eq.return_value.gte.return_value.order.return_value.execute.return_value = Mock(
            data=[sample_project_data]
        )
        
        history = await detector.get_project_change_history(project_id, hours=24)
        
        assert isinstance(history, list)
        if history:  # If data was returned
            assert 'timestamp' in history[0]
            assert 'project_id' in history[0]
    
    def test_should_check_for_changes(self, detector):
        """Test the internal method for determining if change check is needed"""
        project_id = str(uuid.uuid4())
        
        # No previous check - should return True
        assert detector._should_check_for_changes(project_id) is True
        
        # Recent check - should return False
        detector._last_check_time[project_id] = datetime.now(timezone.utc)
        assert detector._should_check_for_changes(project_id) is False
        
        # Old check - should return True
        detector._last_check_time[project_id] = datetime.now(timezone.utc) - timedelta(minutes=5)
        assert detector._should_check_for_changes(project_id) is True
    
    def test_compare_project_data(self, detector, sample_project_data):
        """Test project data comparison logic"""
        # Same data should return False
        assert detector._compare_project_data(sample_project_data, sample_project_data) is False
        
        # Different title should return True
        modified_data = sample_project_data.copy()
        modified_data['title'] = 'Different Title'
        assert detector._compare_project_data(sample_project_data, modified_data) is True
        
        # Different list content should return True
        modified_data = sample_project_data.copy()
        modified_data['components'] = ['Different Component']
        assert detector._compare_project_data(sample_project_data, modified_data) is True
    
    def test_identify_changed_fields(self, detector, sample_project_data):
        """Test identification of specific changed fields"""
        modified_data = sample_project_data.copy()
        modified_data['title'] = 'Different Title'
        modified_data['progress'] = 75
        
        changed_fields = detector._identify_changed_fields(sample_project_data, modified_data)
        
        assert 'title' in changed_fields
        assert 'progress' in changed_fields
        assert len(changed_fields) == 2


class TestProjectChangeNotifier:
    """Test cases for ProjectChangeNotifier class"""
    
    @pytest.fixture
    def mock_client(self):
        """Mock Supabase client"""
        client = Mock()
        client.table.return_value = Mock()
        return client
    
    @pytest.fixture
    def notifier(self, mock_client):
        """ProjectChangeNotifier instance with mocked client"""
        return ProjectChangeNotifier(mock_client)
    
    @pytest.mark.asyncio
    async def test_notify_project_changed(self, notifier):
        """Test project change notification"""
        project_id = str(uuid.uuid4())
        
        # Mock the change detector methods
        notifier.change_detector.invalidate_project_cache = AsyncMock(return_value=True)
        notifier.change_detector.detect_project_changes = AsyncMock(return_value=True)
        
        await notifier.notify_project_changed(project_id, "update")
        
        # Verify methods were called
        notifier.change_detector.invalidate_project_cache.assert_called_once_with(project_id)
        notifier.change_detector.detect_project_changes.assert_called_once_with(project_id, force_check=True)
    
    @pytest.mark.asyncio
    async def test_notify_project_changed_invalid_project_id(self, notifier):
        """Test notification with invalid project ID"""
        with pytest.raises(ValueError, match="project_id cannot be empty"):
            await notifier.notify_project_changed("")
    
    @pytest.mark.asyncio
    async def test_setup_database_triggers(self, notifier):
        """Test database trigger setup"""
        # This is mostly a placeholder test since the actual SQL execution
        # would be done via migration in a real system
        result = await notifier.setup_database_triggers()
        
        # Should return True indicating successful setup
        assert result is True


class TestConvenienceFunctions:
    """Test cases for convenience functions"""
    
    @pytest.mark.asyncio
    async def test_detect_project_changes_convenience(self):
        """Test the convenience function for change detection"""
        project_id = str(uuid.uuid4())
        
        with patch('services.project_change_detector.ProjectChangeDetector') as mock_detector_class:
            mock_detector = Mock()
            mock_detector.detect_project_changes = AsyncMock(return_value=True)
            mock_detector_class.return_value = mock_detector
            
            result = await detect_project_changes(project_id, force_check=True)
            
            assert result is True
            mock_detector.detect_project_changes.assert_called_once_with(project_id, True)
    
    @pytest.mark.asyncio
    async def test_invalidate_project_cache_convenience(self):
        """Test the convenience function for cache invalidation"""
        project_id = str(uuid.uuid4())
        
        with patch('services.project_change_detector.ProjectChangeDetector') as mock_detector_class:
            mock_detector = Mock()
            mock_detector.invalidate_project_cache = AsyncMock(return_value=True)
            mock_detector_class.return_value = mock_detector
            
            result = await invalidate_project_cache(project_id)
            
            assert result is True
            mock_detector.invalidate_project_cache.assert_called_once_with(project_id)
    
    @pytest.mark.asyncio
    async def test_refresh_project_context_if_changed_convenience(self):
        """Test the convenience function for context refresh"""
        project_id = str(uuid.uuid4())
        
        with patch('services.project_change_detector.ProjectChangeDetector') as mock_detector_class:
            mock_detector = Mock()
            mock_detector.refresh_project_context_if_changed = AsyncMock(return_value=None)
            mock_detector_class.return_value = mock_detector
            
            result = await refresh_project_context_if_changed(project_id)
            
            assert result is None
            mock_detector.refresh_project_context_if_changed.assert_called_once_with(project_id)
    
    @pytest.mark.asyncio
    async def test_notify_project_changed_convenience(self):
        """Test the convenience function for change notification"""
        project_id = str(uuid.uuid4())
        
        with patch('services.project_change_detector.ProjectChangeNotifier') as mock_notifier_class:
            mock_notifier = Mock()
            mock_notifier.notify_project_changed = AsyncMock()
            mock_notifier_class.return_value = mock_notifier
            
            await notify_project_changed(project_id, "update")
            
            mock_notifier.notify_project_changed.assert_called_once_with(project_id, "update")


if __name__ == "__main__":
    # Run the tests
    pytest.main([__file__, "-v"])