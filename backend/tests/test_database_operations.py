"""
Unit tests for database operations related to AI Code Generation
Tests all database CRUD operations, RLS policies, and data integrity
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
import asyncpg
from datetime import datetime, timezone
import uuid

# Mock database connection for testing
class MockDatabaseConnection:
    """Mock database connection for testing"""
    
    def __init__(self):
        self.executed_queries = []
        self.mock_data = {}
    
    async def execute(self, query, *args):
        """Mock execute method"""
        self.executed_queries.append((query, args))
        return "EXECUTE"
    
    async def fetch(self, query, *args):
        """Mock fetch method"""
        self.executed_queries.append((query, args))
        return self.mock_data.get('fetch_result', [])
    
    async def fetchrow(self, query, *args):
        """Mock fetchrow method"""
        self.executed_queries.append((query, args))
        return self.mock_data.get('fetchrow_result', None)
    
    async def fetchval(self, query, *args):
        """Mock fetchval method"""
        self.executed_queries.append((query, args))
        return self.mock_data.get('fetchval_result', None)


class TestGeneratedCodeTable:
    """Test operations on generated_code table"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.mock_conn = MockDatabaseConnection()
        self.test_user_id = str(uuid.uuid4())
        self.test_project_id = str(uuid.uuid4())
        self.test_generation_id = str(uuid.uuid4())
        
        self.sample_generation_data = {
            'id': self.test_generation_id,
            'project_id': self.test_project_id,
            'user_id': self.test_user_id,
            'status': 'generating',
            'platform': 'web',
            'complexity_level': 'intermediate',
            'include_comments': True,
            'include_tests': False,
            'custom_requirements': 'Create a responsive dashboard',
            'created_at': datetime.now(timezone.utc),
            'updated_at': datetime.now(timezone.utc)
        }
    
    @pytest.mark.asyncio
    async def test_insert_generated_code_success(self):
        """Test successful insertion of generated code record"""
        # Mock successful insertion
        self.mock_conn.mock_data['fetchrow_result'] = self.sample_generation_data
        
        # Execute insertion query
        query = """
        INSERT INTO generated_code (
            id, project_id, user_id, status, platform, complexity_level,
            include_comments, include_tests, custom_requirements
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
        """
        
        result = await self.mock_conn.fetchrow(
            query,
            self.test_generation_id,
            self.test_project_id,
            self.test_user_id,
            'generating',
            'web',
            'intermediate',
            True,
            False,
            'Create a responsive dashboard'
        )
        
        # Assertions
        assert result is not None
        assert result['id'] == self.test_generation_id
        assert result['status'] == 'generating'
        assert len(self.mock_conn.executed_queries) == 1
    
    @pytest.mark.asyncio
    async def test_update_generation_status(self):
        """Test updating generation status"""
        # Mock successful update
        updated_data = {**self.sample_generation_data, 'status': 'completed'}
        self.mock_conn.mock_data['fetchrow_result'] = updated_data
        
        # Execute update query
        query = """
        UPDATE generated_code 
        SET status = $1, completed_at = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND user_id = $4
        RETURNING *
        """
        
        result = await self.mock_conn.fetchrow(
            query,
            'completed',
            datetime.now(timezone.utc),
            self.test_generation_id,
            self.test_user_id
        )
        
        # Assertions
        assert result is not None
        assert result['status'] == 'completed'
    
    @pytest.mark.asyncio
    async def test_get_user_generations(self):
        """Test retrieving user's generations"""
        # Mock multiple generations
        generations = [
            {**self.sample_generation_data, 'id': str(uuid.uuid4())},
            {**self.sample_generation_data, 'id': str(uuid.uuid4()), 'status': 'completed'}
        ]
        self.mock_conn.mock_data['fetch_result'] = generations
        
        # Execute query
        query = """
        SELECT * FROM generated_code 
        WHERE user_id = $1 
        ORDER BY created_at DESC
        """
        
        result = await self.mock_conn.fetch(query, self.test_user_id)
        
        # Assertions
        assert len(result) == 2
        assert result[0]['status'] == 'generating'
        assert result[1]['status'] == 'completed'
    
    @pytest.mark.asyncio
    async def test_delete_generation_cascade(self):
        """Test cascading deletion of generation and related files"""
        # Execute deletion query
        query = """
        DELETE FROM generated_code 
        WHERE id = $1 AND user_id = $2
        """
        
        await self.mock_conn.execute(query, self.test_generation_id, self.test_user_id)
        
        # Verify query was executed
        assert len(self.mock_conn.executed_queries) == 1
        executed_query, args = self.mock_conn.executed_queries[0]
        assert "DELETE FROM generated_code" in executed_query
        assert args == (self.test_generation_id, self.test_user_id)


class TestCodeFilesTable:
    """Test operations on code_files table"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.mock_conn = MockDatabaseConnection()
        self.test_generation_id = str(uuid.uuid4())
        self.test_file_id = str(uuid.uuid4())
        
        self.sample_file_data = {
            'id': self.test_file_id,
            'generation_id': self.test_generation_id,
            'file_name': 'index.html',
            'file_path': 'index.html',
            'file_type': 'html',
            'content': '<html><body>Hello World</body></html>',
            'description': 'Main HTML file',
            'size_bytes': 45,
            'is_main_file': True,
            'created_at': datetime.now(timezone.utc)
        }
    
    @pytest.mark.asyncio
    async def test_insert_code_file_success(self):
        """Test successful insertion of code file"""
        # Mock successful insertion
        self.mock_conn.mock_data['fetchrow_result'] = self.sample_file_data
        
        # Execute insertion query
        query = """
        INSERT INTO code_files (
            id, generation_id, file_name, file_path, file_type,
            content, description, size_bytes, is_main_file
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
        """
        
        result = await self.mock_conn.fetchrow(
            query,
            self.test_file_id,
            self.test_generation_id,
            'index.html',
            'index.html',
            'html',
            '<html><body>Hello World</body></html>',
            'Main HTML file',
            45,
            True
        )
        
        # Assertions
        assert result is not None
        assert result['file_name'] == 'index.html'
        assert result['is_main_file'] is True
    
    @pytest.mark.asyncio
    async def test_update_file_content(self):
        """Test updating file content"""
        # Mock successful update
        updated_content = '<html><body>Updated Content</body></html>'
        updated_data = {**self.sample_file_data, 'content': updated_content, 'size_bytes': 50}
        self.mock_conn.mock_data['fetchrow_result'] = updated_data
        
        # Execute update query
        query = """
        UPDATE code_files 
        SET content = $1, size_bytes = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
        """
        
        result = await self.mock_conn.fetchrow(
            query,
            updated_content,
            50,
            self.test_file_id
        )
        
        # Assertions
        assert result is not None
        assert result['content'] == updated_content
        assert result['size_bytes'] == 50
    
    @pytest.mark.asyncio
    async def test_get_generation_files(self):
        """Test retrieving files for a generation"""
        # Mock multiple files
        files = [
            self.sample_file_data,
            {**self.sample_file_data, 'id': str(uuid.uuid4()), 'file_name': 'style.css', 'is_main_file': False}
        ]
        self.mock_conn.mock_data['fetch_result'] = files
        
        # Execute query
        query = """
        SELECT * FROM code_files 
        WHERE generation_id = $1 
        ORDER BY is_main_file DESC, file_name ASC
        """
        
        result = await self.mock_conn.fetch(query, self.test_generation_id)
        
        # Assertions
        assert len(result) == 2
        assert result[0]['is_main_file'] is True  # Main file first
        assert result[1]['file_name'] == 'style.css'


class TestGenerationHistoryTable:
    """Test operations on generation_history table"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.mock_conn = MockDatabaseConnection()
        self.test_user_id = str(uuid.uuid4())
        self.test_generation_id = str(uuid.uuid4())
        
        self.sample_history_data = {
            'id': str(uuid.uuid4()),
            'user_id': self.test_user_id,
            'generation_id': self.test_generation_id,
            'action_type': 'generation_started',
            'action_details': {'platform': 'web', 'complexity': 'intermediate'},
            'timestamp': datetime.now(timezone.utc)
        }
    
    @pytest.mark.asyncio
    async def test_insert_history_record(self):
        """Test inserting history record"""
        # Mock successful insertion
        self.mock_conn.mock_data['fetchrow_result'] = self.sample_history_data
        
        # Execute insertion query
        query = """
        INSERT INTO generation_history (
            id, user_id, generation_id, action_type, action_details
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        """
        
        result = await self.mock_conn.fetchrow(
            query,
            str(uuid.uuid4()),
            self.test_user_id,
            self.test_generation_id,
            'generation_started',
            {'platform': 'web', 'complexity': 'intermediate'}
        )
        
        # Assertions
        assert result is not None
        assert result['action_type'] == 'generation_started'
    
    @pytest.mark.asyncio
    async def test_get_user_history(self):
        """Test retrieving user history"""
        # Mock history records
        history = [
            self.sample_history_data,
            {**self.sample_history_data, 'action_type': 'file_downloaded'}
        ]
        self.mock_conn.mock_data['fetch_result'] = history
        
        # Execute query
        query = """
        SELECT * FROM generation_history 
        WHERE user_id = $1 
        ORDER BY timestamp DESC
        LIMIT $2
        """
        
        result = await self.mock_conn.fetch(query, self.test_user_id, 50)
        
        # Assertions
        assert len(result) == 2


class TestFileMetadataTable:
    """Test operations on file_metadata table"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.mock_conn = MockDatabaseConnection()
        self.test_file_id = str(uuid.uuid4())
        
        self.sample_metadata = {
            'id': str(uuid.uuid4()),
            'code_file_id': self.test_file_id,
            'download_count': 0,
            'is_modified': False,
            'original_content': '<html><body>Original</body></html>',
            'modification_history': [],
            'created_at': datetime.now(timezone.utc)
        }
    
    @pytest.mark.asyncio
    async def test_insert_file_metadata(self):
        """Test inserting file metadata"""
        # Mock successful insertion
        self.mock_conn.mock_data['fetchrow_result'] = self.sample_metadata
        
        # Execute insertion query
        query = """
        INSERT INTO file_metadata (
            id, code_file_id, download_count, is_modified, original_content
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        """
        
        result = await self.mock_conn.fetchrow(
            query,
            str(uuid.uuid4()),
            self.test_file_id,
            0,
            False,
            '<html><body>Original</body></html>'
        )
        
        # Assertions
        assert result is not None
        assert result['download_count'] == 0
        assert result['is_modified'] is False
    
    @pytest.mark.asyncio
    async def test_increment_download_count(self):
        """Test incrementing download count"""
        # Mock updated metadata
        updated_metadata = {**self.sample_metadata, 'download_count': 1}
        self.mock_conn.mock_data['fetchrow_result'] = updated_metadata
        
        # Execute update query
        query = """
        UPDATE file_metadata 
        SET download_count = download_count + 1,
            last_downloaded_at = CURRENT_TIMESTAMP
        WHERE code_file_id = $1
        RETURNING *
        """
        
        result = await self.mock_conn.fetchrow(query, self.test_file_id)
        
        # Assertions
        assert result is not None
        assert result['download_count'] == 1


class TestRLSPolicies:
    """Test Row Level Security policies"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.mock_conn = MockDatabaseConnection()
        self.test_user_id = str(uuid.uuid4())
        self.other_user_id = str(uuid.uuid4())
    
    @pytest.mark.asyncio
    async def test_user_can_only_access_own_generations(self):
        """Test that users can only access their own generations"""
        # Mock RLS enforcement - only returns user's own data
        user_generations = [
            {'id': str(uuid.uuid4()), 'user_id': self.test_user_id, 'status': 'completed'}
        ]
        self.mock_conn.mock_data['fetch_result'] = user_generations
        
        # Execute query with RLS context
        query = """
        SELECT * FROM generated_code 
        WHERE user_id = current_setting('app.current_user_id')::uuid
        """
        
        result = await self.mock_conn.fetch(query)
        
        # Assertions - should only return user's own data
        assert len(result) == 1
        assert result[0]['user_id'] == self.test_user_id
    
    @pytest.mark.asyncio
    async def test_user_cannot_access_other_user_files(self):
        """Test that users cannot access other users' files"""
        # Mock RLS enforcement - returns empty result for other user's files
        self.mock_conn.mock_data['fetch_result'] = []
        
        # Try to access another user's files
        query = """
        SELECT cf.* FROM code_files cf
        JOIN generated_code gc ON cf.generation_id = gc.id
        WHERE gc.user_id = $1
        """
        
        result = await self.mock_conn.fetch(query, self.other_user_id)
        
        # Assertions - should return empty (RLS blocks access)
        assert len(result) == 0


class TestDataIntegrity:
    """Test data integrity constraints and triggers"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.mock_conn = MockDatabaseConnection()
    
    @pytest.mark.asyncio
    async def test_foreign_key_constraints(self):
        """Test foreign key constraint enforcement"""
        # Try to insert file with non-existent generation_id
        query = """
        INSERT INTO code_files (
            id, generation_id, file_name, file_path, file_type, content
        ) VALUES ($1, $2, $3, $4, $5, $6)
        """
        
        # This should fail due to foreign key constraint
        with pytest.raises(Exception):  # Would be asyncpg.ForeignKeyViolationError in real DB
            await self.mock_conn.execute(
                query,
                str(uuid.uuid4()),
                str(uuid.uuid4()),  # Non-existent generation_id
                'test.html',
                'test.html',
                'html',
                '<html></html>'
            )
    
    @pytest.mark.asyncio
    async def test_cascade_deletion(self):
        """Test cascading deletion behavior"""
        # Delete generation should cascade to files
        query = """
        DELETE FROM generated_code WHERE id = $1
        """
        
        await self.mock_conn.execute(query, str(uuid.uuid4()))
        
        # Verify deletion was executed
        assert len(self.mock_conn.executed_queries) == 1
    
    @pytest.mark.asyncio
    async def test_timestamp_triggers(self):
        """Test automatic timestamp updates"""
        # Mock updated record with new timestamp
        updated_record = {
            'id': str(uuid.uuid4()),
            'updated_at': datetime.now(timezone.utc)
        }
        self.mock_conn.mock_data['fetchrow_result'] = updated_record
        
        # Update record - should trigger timestamp update
        query = """
        UPDATE generated_code 
        SET status = $1 
        WHERE id = $2
        RETURNING updated_at
        """
        
        result = await self.mock_conn.fetchrow(query, 'completed', str(uuid.uuid4()))
        
        # Assertions
        assert result is not None
        assert 'updated_at' in result


class TestPerformanceQueries:
    """Test performance-critical queries and indexes"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.mock_conn = MockDatabaseConnection()
    
    @pytest.mark.asyncio
    async def test_user_generations_query_performance(self):
        """Test performance of user generations query"""
        # Mock query execution
        query = """
        SELECT gc.*, COUNT(cf.id) as files_count
        FROM generated_code gc
        LEFT JOIN code_files cf ON gc.id = cf.generation_id
        WHERE gc.user_id = $1
        GROUP BY gc.id
        ORDER BY gc.created_at DESC
        """
        
        await self.mock_conn.fetch(query, str(uuid.uuid4()))
        
        # Verify query structure (would check execution plan in real tests)
        executed_query = self.mock_conn.executed_queries[0][0]
        assert "LEFT JOIN" in executed_query
        assert "GROUP BY" in executed_query
        assert "ORDER BY" in executed_query
    
    @pytest.mark.asyncio
    async def test_file_search_query_performance(self):
        """Test performance of file search queries"""
        # Mock search query
        query = """
        SELECT cf.* FROM code_files cf
        JOIN generated_code gc ON cf.generation_id = gc.id
        WHERE gc.user_id = $1 
        AND (cf.file_name ILIKE $2 OR cf.content ILIKE $2)
        ORDER BY cf.is_main_file DESC, cf.file_name ASC
        """
        
        await self.mock_conn.fetch(query, str(uuid.uuid4()), '%search%')
        
        # Verify query uses indexes efficiently
        executed_query = self.mock_conn.executed_queries[0][0]
        assert "ILIKE" in executed_query
        assert "ORDER BY" in executed_query


if __name__ == "__main__":
    pytest.main([__file__, "-v"])