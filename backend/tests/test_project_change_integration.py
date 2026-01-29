# Integration Tests for Project Change Detection
# Requirements: 7.4
# Task: 8.1 Add project data change detection and cache invalidation

import pytest
import asyncio
import sys
import os
from datetime import datetime, timezone
import uuid

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from database.connection import get_db_client


class TestProjectChangeIntegration:
    """Integration tests for project change detection with real database"""
    
    @pytest.fixture
    def client(self):
        """Get database client"""
        return get_db_client()
    
    @pytest.fixture
    def test_project_id(self):
        """Generate a test project ID"""
        return str(uuid.uuid4())
    
    def test_database_triggers_exist(self, client):
        """Test that the database triggers and functions exist"""
        # Check if the trigger function exists
        result = client.execute("""
            SELECT EXISTS (
                SELECT 1 FROM pg_proc 
                WHERE proname = 'notify_project_change'
            );
        """)
        
        assert result.data[0]['exists'] is True, "notify_project_change function should exist"
        
        # Check if the trigger exists
        result = client.execute("""
            SELECT EXISTS (
                SELECT 1 FROM pg_trigger 
                WHERE tgname = 'project_change_trigger'
            );
        """)
        
        assert result.data[0]['exists'] is True, "project_change_trigger should exist"
    
    def test_cleanup_function_exists(self, client):
        """Test that the cleanup function exists"""
        result = client.execute("""
            SELECT EXISTS (
                SELECT 1 FROM pg_proc 
                WHERE proname = 'cleanup_expired_ai_cache'
            );
        """)
        
        assert result.data[0]['exists'] is True, "cleanup_expired_ai_cache function should exist"
    
    def test_project_change_summary_function_exists(self, client):
        """Test that the project change summary function exists"""
        result = client.execute("""
            SELECT EXISTS (
                SELECT 1 FROM pg_proc 
                WHERE proname = 'get_project_change_summary'
            );
        """)
        
        assert result.data[0]['exists'] is True, "get_project_change_summary function should exist"
    
    def test_required_indexes_exist(self, client):
        """Test that the required indexes exist"""
        # Check for ai_context_cache indexes
        result = client.execute("""
            SELECT EXISTS (
                SELECT 1 FROM pg_indexes 
                WHERE indexname = 'idx_ai_context_cache_project_expires'
            );
        """)
        
        assert result.data[0]['exists'] is True, "idx_ai_context_cache_project_expires index should exist"
        
        # Check for projects updated_at index
        result = client.execute("""
            SELECT EXISTS (
                SELECT 1 FROM pg_indexes 
                WHERE indexname = 'idx_projects_updated_at'
            );
        """)
        
        assert result.data[0]['exists'] is True, "idx_projects_updated_at index should exist"
    
    def test_cleanup_expired_cache_function(self, client):
        """Test the cleanup function works"""
        # Call the cleanup function
        result = client.execute("SELECT cleanup_expired_ai_cache();")
        
        # Should return a count (even if 0)
        assert 'cleanup_expired_ai_cache' in result.data[0]
        assert isinstance(result.data[0]['cleanup_expired_ai_cache'], int)
    
    def test_get_project_change_summary_function(self, client, test_project_id):
        """Test the project change summary function"""
        # This will return null for non-existent project, but function should work
        result = client.execute(f"""
            SELECT get_project_change_summary('{test_project_id}'::uuid, 24);
        """)
        
        # Function should execute without error
        assert result.data is not None


if __name__ == "__main__":
    # Run the tests
    pytest.main([__file__, "-v"])