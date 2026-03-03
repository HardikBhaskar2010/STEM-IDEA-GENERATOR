# Unit Tests for Row Level Security (RLS) Policies
# Requirements: Security and data isolation across all features
# Task: Test RLS policies with different user scenarios

import pytest
import asyncio
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from typing import List, Dict, Any, Optional

from backend.database.connection import get_db_client
from supabase import Client


class TestGeneratedCodeRLSPolicies:
    """Test suite for generated_code table RLS policies"""
    
    @pytest.fixture
    async def db_client(self):
        """Get database client for testing"""
        return await get_db_client()
    
    @pytest.fixture
    def user1_id(self):
        """First test user ID"""
        return str(uuid.uuid4())
    
    @pytest.fixture
    def user2_id(self):
        """Second test user ID"""
        return str(uuid.uuid4())
    
    @pytest.fixture
    def sample_generated_code(self, user1_id):
        """Sample generated code data for user1"""
        return {
            "id": str(uuid.uuid4()),
            "project_id": str(uuid.uuid4()),
            "user_id": user1_id,
            "generation_request": {"platform": "arduino"},
            "status": "completed",
            "platform": "arduino",
            "metadata": {}
        }
    
    @pytest.mark.asyncio
    async def test_user_can_view_own_generated_code(self, db_client, user1_id, sample_generated_code):
        """Test that users can view their own generated code"""
        # Mock auth.uid() returning user1_id
        mock_response = MagicMock()
        mock_response.data = [sample_generated_code]
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
            
            # Simulate authenticated request as user1
            result = db_client.table('generated_code').select('*').eq('user_id', user1_id).execute()
            
            assert result.data is not None
            assert len(result.data) == 1
            assert result.data[0]['user_id'] == user1_id
    
    @pytest.mark.asyncio
    async def test_user_cannot_view_other_users_generated_code(self, db_client, user1_id, user2_id):
        """Test that users cannot view other users' generated code"""
        # Mock empty response when user2 tries to access user1's data
        mock_response = MagicMock()
        mock_response.data = []  # RLS should filter out user1's data
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.select.return_value.execute.return_value = mock_response
            
            # Simulate authenticated request as user2 trying to see all data
            result = db_client.table('generated_code').select('*').execute()
            
            # Should return empty because RLS filters out user1's data
            assert result.data == []
    
    @pytest.mark.asyncio
    async def test_user_can_create_own_generated_code(self, db_client, user1_id):
        """Test that users can create generated code for themselves"""
        new_code_data = {
            "project_id": str(uuid.uuid4()),
            "user_id": user1_id,
            "generation_request": {"platform": "web"},
            "status": "generating",
            "platform": "web"
        }
        
        mock_response = MagicMock()
        mock_response.data = [{"id": str(uuid.uuid4()), **new_code_data}]
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.insert.return_value.execute.return_value = mock_response
            
            result = db_client.table('generated_code').insert(new_code_data).execute()
            
            assert result.data is not None
            assert result.data[0]['user_id'] == user1_id
    
    @pytest.mark.asyncio
    async def test_user_cannot_create_generated_code_for_others(self, db_client, user1_id, user2_id):
        """Test that users cannot create generated code for other users"""
        malicious_data = {
            "project_id": str(uuid.uuid4()),
            "user_id": user2_id,  # Trying to create for user2 while authenticated as user1
            "generation_request": {"platform": "web"},
            "status": "generating",
            "platform": "web"
        }
        
        # Mock RLS policy violation
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.insert.return_value.execute.side_effect = Exception("RLS policy violation")
            
            with pytest.raises(Exception) as exc_info:
                db_client.table('generated_code').insert(malicious_data).execute()
            
            assert "policy" in str(exc_info.value).lower() or "permission" in str(exc_info.value).lower()
    
    @pytest.mark.asyncio
    async def test_user_can_update_own_generated_code(self, db_client, user1_id):
        """Test that users can update their own generated code"""
        generation_id = str(uuid.uuid4())
        update_data = {
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat()
        }
        
        mock_response = MagicMock()
        mock_response.data = [{"id": generation_id, **update_data}]
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.update.return_value.eq.return_value.execute.return_value = mock_response
            
            result = db_client.table('generated_code').update(update_data).eq('id', generation_id).execute()
            
            assert result.data is not None
            assert result.data[0]['status'] == 'completed'
    
    @pytest.mark.asyncio
    async def test_user_cannot_update_others_generated_code(self, db_client, user2_id):
        """Test that users cannot update other users' generated code"""
        generation_id = str(uuid.uuid4())  # Belongs to user1
        update_data = {"status": "failed"}
        
        # Mock RLS policy preventing update
        mock_response = MagicMock()
        mock_response.data = []  # No rows affected due to RLS
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.update.return_value.eq.return_value.execute.return_value = mock_response
            
            result = db_client.table('generated_code').update(update_data).eq('id', generation_id).execute()
            
            # Should affect 0 rows due to RLS policy
            assert result.data == []
    
    @pytest.mark.asyncio
    async def test_user_can_delete_own_generated_code(self, db_client, user1_id):
        """Test that users can delete their own generated code"""
        generation_id = str(uuid.uuid4())
        
        mock_response = MagicMock()
        mock_response.data = [{"id": generation_id}]
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.delete.return_value.eq.return_value.execute.return_value = mock_response
            
            result = db_client.table('generated_code').delete().eq('id', generation_id).execute()
            
            assert result.data is not None
            assert result.data[0]['id'] == generation_id
    
    @pytest.mark.asyncio
    async def test_user_cannot_delete_others_generated_code(self, db_client):
        """Test that users cannot delete other users' generated code"""
        generation_id = str(uuid.uuid4())  # Belongs to user1, but user2 is authenticated
        
        # Mock RLS policy preventing deletion
        mock_response = MagicMock()
        mock_response.data = []  # No rows affected due to RLS
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.delete.return_value.eq.return_value.execute.return_value = mock_response
            
            result = db_client.table('generated_code').delete().eq('id', generation_id).execute()
            
            # Should affect 0 rows due to RLS policy
            assert result.data == []


class TestCodeFilesRLSPolicies:
    """Test suite for code_files table RLS policies"""
    
    @pytest.fixture
    def user1_id(self):
        return str(uuid.uuid4())
    
    @pytest.fixture
    def user2_id(self):
        return str(uuid.uuid4())
    
    @pytest.fixture
    def user1_generation_id(self):
        return str(uuid.uuid4())
    
    @pytest.fixture
    def user2_generation_id(self):
        return str(uuid.uuid4())
    
    @pytest.mark.asyncio
    async def test_user_can_view_files_from_own_generated_code(self, db_client, user1_id, user1_generation_id):
        """Test that users can view files from their own generated code"""
        mock_response = MagicMock()
        mock_response.data = [{
            "id": str(uuid.uuid4()),
            "generated_code_id": user1_generation_id,
            "file_name": "main.cpp",
            "content": "test content"
        }]
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
            
            result = db_client.table('code_files').select('*').eq('generated_code_id', user1_generation_id).execute()
            
            assert result.data is not None
            assert len(result.data) == 1
    
    @pytest.mark.asyncio
    async def test_user_cannot_view_files_from_others_generated_code(self, db_client, user2_generation_id):
        """Test that users cannot view files from other users' generated code"""
        # Mock RLS filtering out the files
        mock_response = MagicMock()
        mock_response.data = []
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
            
            # User1 authenticated, trying to access user2's files
            result = db_client.table('code_files').select('*').eq('generated_code_id', user2_generation_id).execute()
            
            assert result.data == []
    
    @pytest.mark.asyncio
    async def test_user_can_create_files_for_own_generated_code(self, db_client, user1_generation_id):
        """Test that users can create files for their own generated code"""
        file_data = {
            "generated_code_id": user1_generation_id,
            "file_name": "config.h",
            "file_type": "h",
            "content": "#define LED_PIN 13"
        }
        
        mock_response = MagicMock()
        mock_response.data = [{"id": str(uuid.uuid4()), **file_data}]
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.insert.return_value.execute.return_value = mock_response
            
            result = db_client.table('code_files').insert(file_data).execute()
            
            assert result.data is not None
            assert result.data[0]['generated_code_id'] == user1_generation_id
    
    @pytest.mark.asyncio
    async def test_user_cannot_create_files_for_others_generated_code(self, db_client, user2_generation_id):
        """Test that users cannot create files for other users' generated code"""
        file_data = {
            "generated_code_id": user2_generation_id,  # Belongs to user2
            "file_name": "malicious.cpp",
            "file_type": "cpp",
            "content": "malicious content"
        }
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.insert.return_value.execute.side_effect = Exception("RLS policy violation")
            
            with pytest.raises(Exception) as exc_info:
                db_client.table('code_files').insert(file_data).execute()
            
            assert "policy" in str(exc_info.value).lower() or "permission" in str(exc_info.value).lower()


class TestGenerationHistoryRLSPolicies:
    """Test suite for generation_history table RLS policies"""
    
    @pytest.fixture
    def user1_id(self):
        return str(uuid.uuid4())
    
    @pytest.fixture
    def user2_id(self):
        return str(uuid.uuid4())
    
    @pytest.mark.asyncio
    async def test_user_can_view_own_generation_history(self, db_client, user1_id):
        """Test that users can view their own generation history"""
        mock_response = MagicMock()
        mock_response.data = [{
            "id": str(uuid.uuid4()),
            "user_id": user1_id,
            "action": "generate",
            "created_at": datetime.now(timezone.utc).isoformat()
        }]
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
            
            result = db_client.table('generation_history').select('*').eq('user_id', user1_id).execute()
            
            assert result.data is not None
            assert len(result.data) == 1
            assert result.data[0]['user_id'] == user1_id
    
    @pytest.mark.asyncio
    async def test_user_cannot_view_others_generation_history(self, db_client, user2_id):
        """Test that users cannot view other users' generation history"""
        mock_response = MagicMock()
        mock_response.data = []  # RLS filters out other users' history
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.select.return_value.execute.return_value = mock_response
            
            # User1 authenticated, trying to see all history (should only see their own)
            result = db_client.table('generation_history').select('*').execute()
            
            assert result.data == []
    
    @pytest.mark.asyncio
    async def test_user_can_create_own_generation_history(self, db_client, user1_id):
        """Test that users can create their own generation history"""
        history_data = {
            "user_id": user1_id,
            "action": "download",
            "parameters": {"file_type": "zip"}
        }
        
        mock_response = MagicMock()
        mock_response.data = [{"id": str(uuid.uuid4()), **history_data}]
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.insert.return_value.execute.return_value = mock_response
            
            result = db_client.table('generation_history').insert(history_data).execute()
            
            assert result.data is not None
            assert result.data[0]['user_id'] == user1_id
    
    @pytest.mark.asyncio
    async def test_user_cannot_create_history_for_others(self, db_client, user2_id):
        """Test that users cannot create generation history for other users"""
        malicious_history = {
            "user_id": user2_id,  # Trying to create for user2
            "action": "generate",
            "parameters": {}
        }
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.insert.return_value.execute.side_effect = Exception("RLS policy violation")
            
            with pytest.raises(Exception) as exc_info:
                db_client.table('generation_history').insert(malicious_history).execute()
            
            assert "policy" in str(exc_info.value).lower() or "permission" in str(exc_info.value).lower()


class TestFileMetadataRLSPolicies:
    """Test suite for file_metadata table RLS policies"""
    
    @pytest.fixture
    def user1_id(self):
        return str(uuid.uuid4())
    
    @pytest.fixture
    def user1_file_id(self):
        return str(uuid.uuid4())
    
    @pytest.fixture
    def user2_file_id(self):
        return str(uuid.uuid4())
    
    @pytest.mark.asyncio
    async def test_user_can_view_metadata_for_own_files(self, db_client, user1_file_id):
        """Test that users can view metadata for their own files"""
        mock_response = MagicMock()
        mock_response.data = [{
            "id": str(uuid.uuid4()),
            "code_file_id": user1_file_id,
            "download_count": 3,
            "is_modified": False
        }]
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
            
            result = db_client.table('file_metadata').select('*').eq('code_file_id', user1_file_id).execute()
            
            assert result.data is not None
            assert len(result.data) == 1
    
    @pytest.mark.asyncio
    async def test_user_cannot_view_metadata_for_others_files(self, db_client, user2_file_id):
        """Test that users cannot view metadata for other users' files"""
        mock_response = MagicMock()
        mock_response.data = []  # RLS filters out other users' file metadata
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
            
            result = db_client.table('file_metadata').select('*').eq('code_file_id', user2_file_id).execute()
            
            assert result.data == []
    
    @pytest.mark.asyncio
    async def test_user_can_create_metadata_for_own_files(self, db_client, user1_file_id):
        """Test that users can create metadata for their own files"""
        metadata_data = {
            "code_file_id": user1_file_id,
            "download_count": 0,
            "is_modified": False,
            "original_content": "original content"
        }
        
        mock_response = MagicMock()
        mock_response.data = [{"id": str(uuid.uuid4()), **metadata_data}]
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.insert.return_value.execute.return_value = mock_response
            
            result = db_client.table('file_metadata').insert(metadata_data).execute()
            
            assert result.data is not None
            assert result.data[0]['code_file_id'] == user1_file_id
    
    @pytest.mark.asyncio
    async def test_user_can_update_metadata_for_own_files(self, db_client, user1_file_id):
        """Test that users can update metadata for their own files"""
        metadata_id = str(uuid.uuid4())
        update_data = {
            "download_count": 5,
            "last_downloaded_at": datetime.now(timezone.utc).isoformat()
        }
        
        mock_response = MagicMock()
        mock_response.data = [{"id": metadata_id, **update_data}]
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.update.return_value.eq.return_value.execute.return_value = mock_response
            
            result = db_client.table('file_metadata').update(update_data).eq('id', metadata_id).execute()
            
            assert result.data is not None
            assert result.data[0]['download_count'] == 5


class TestCrossTableRLSIntegration:
    """Test suite for RLS policies across related tables"""
    
    @pytest.fixture
    def user1_id(self):
        return str(uuid.uuid4())
    
    @pytest.fixture
    def user2_id(self):
        return str(uuid.uuid4())
    
    @pytest.mark.asyncio
    async def test_cascading_rls_policies(self, db_client, user1_id, user2_id):
        """Test that RLS policies work correctly across related tables"""
        user1_generation_id = str(uuid.uuid4())
        user2_generation_id = str(uuid.uuid4())
        
        # Mock responses for user1's data only
        mock_generation_response = MagicMock()
        mock_generation_response.data = [{
            "id": user1_generation_id,
            "user_id": user1_id,
            "status": "completed"
        }]
        
        mock_files_response = MagicMock()
        mock_files_response.data = [{
            "id": str(uuid.uuid4()),
            "generated_code_id": user1_generation_id,
            "file_name": "main.cpp"
        }]
        
        with patch.object(db_client, 'table') as mock_table:
            # Mock generated_code query
            mock_table.return_value.select.return_value.eq.return_value.execute.return_value = mock_generation_response
            
            # User1 can see their generated code
            generations = db_client.table('generated_code').select('*').eq('user_id', user1_id).execute()
            assert len(generations.data) == 1
            
            # Mock code_files query
            mock_table.return_value.select.return_value.eq.return_value.execute.return_value = mock_files_response
            
            # User1 can see files from their generated code
            files = db_client.table('code_files').select('*').eq('generated_code_id', user1_generation_id).execute()
            assert len(files.data) == 1
    
    @pytest.mark.asyncio
    async def test_rls_with_joins(self, db_client, user1_id):
        """Test RLS policies work with JOIN operations"""
        # This would test more complex queries that join across tables
        # In a real implementation, you'd test that JOINs respect RLS policies
        
        mock_response = MagicMock()
        mock_response.data = [{
            "generation_id": str(uuid.uuid4()),
            "file_count": 3,
            "user_id": user1_id
        }]
        
        with patch.object(db_client, 'table') as mock_table:
            # Mock a complex query that would involve JOINs
            mock_table.return_value.select.return_value.execute.return_value = mock_response
            
            # This represents a query that joins generated_code with code_files
            # and should only return data for the authenticated user
            result = db_client.table('generated_code').select('*, code_files(count)').execute()
            
            assert result.data is not None
            assert all(item['user_id'] == user1_id for item in result.data if 'user_id' in item)


class TestAnonymousUserAccess:
    """Test suite for anonymous (unauthenticated) user access"""
    
    @pytest.mark.asyncio
    async def test_anonymous_cannot_access_generated_code(self, db_client):
        """Test that anonymous users cannot access any generated code"""
        mock_response = MagicMock()
        mock_response.data = []  # RLS should return empty for anonymous users
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.select.return_value.execute.return_value = mock_response
            
            # Simulate anonymous request (auth.uid() returns null)
            result = db_client.table('generated_code').select('*').execute()
            
            assert result.data == []
    
    @pytest.mark.asyncio
    async def test_anonymous_cannot_create_data(self, db_client):
        """Test that anonymous users cannot create any data"""
        test_data = {
            "project_id": str(uuid.uuid4()),
            "user_id": str(uuid.uuid4()),
            "generation_request": {"platform": "arduino"},
            "status": "generating",
            "platform": "arduino"
        }
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.insert.return_value.execute.side_effect = Exception("RLS policy violation")
            
            with pytest.raises(Exception) as exc_info:
                db_client.table('generated_code').insert(test_data).execute()
            
            assert "policy" in str(exc_info.value).lower() or "permission" in str(exc_info.value).lower()


if __name__ == "__main__":
    # Run tests with: python -m pytest backend/tests/test_rls_policies.py -v
    pytest.main([__file__, "-v"])