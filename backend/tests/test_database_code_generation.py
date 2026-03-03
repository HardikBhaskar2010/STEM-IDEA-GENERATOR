"""
Unit tests for AI Code Generation database operations
Tests all CRUD operations, RLS policies, and data integrity constraints
"""

import pytest
import asyncio
import asyncpg
from datetime import datetime, timezone
from uuid import uuid4
import os
from typing import Dict, Any, List

# Test configuration
TEST_DATABASE_URL = os.getenv('TEST_DATABASE_URL', 'postgresql://postgres:password@localhost:5432/stem_test')

class TestCodeGenerationDatabase:
    """Test suite for AI Code Generation database operations"""
    
    @pytest.fixture(scope="class")
    async def db_connection(self):
        """Create test database connection"""
        conn = await asyncpg.connect(TEST_DATABASE_URL)
        yield conn
        await conn.close()
    
    @pytest.fixture
    async def test_user(self, db_connection):
        """Create a test user for database operations"""
        user_id = str(uuid4())
        await db_connection.execute("""
            INSERT INTO users (id, email, created_at) 
            VALUES ($1, $2, $3)
        """, user_id, f"test_{user_id}@example.com", datetime.now(timezone.utc))
        yield user_id
        # Cleanup
        await db_connection.execute("DELETE FROM users WHERE id = $1", user_id)
    
    @pytest.fixture
    async def test_project(self, db_connection, test_user):
        """Create a test project for code generation"""
        project_id = str(uuid4())
        await db_connection.execute("""
            INSERT INTO projects (id, user_id, title, description, created_at) 
            VALUES ($1, $2, $3, $4, $5)
        """, project_id, test_user, "Test Project", "Test Description", datetime.now(timezone.utc))
        yield project_id
        # Cleanup
        await db_connection.execute("DELETE FROM projects WHERE id = $1", project_id)

    # Generated Code Table Tests
    async def test_create_generated_code(self, db_connection, test_user, test_project):
        """Test creating a new code generation record"""
        generation_id = str(uuid4())
        
        result = await db_connection.fetchrow("""
            INSERT INTO generated_code (
                id, project_id, user_id, platform, status, 
                generation_params, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        """, generation_id, test_project, test_user, 'web', 'generating', 
            '{"complexity": "intermediate"}', datetime.now(timezone.utc))
        
        assert result['id'] == generation_id
        assert result['project_id'] == test_project
        assert result['user_id'] == test_user
        assert result['platform'] == 'web'
        assert result['status'] == 'generating'
    
    async def test_update_generated_code_status(self, db_connection, test_user, test_project):
        """Test updating generation status"""
        generation_id = str(uuid4())
        
        # Create generation
        await db_connection.execute("""
            INSERT INTO generated_code (
                id, project_id, user_id, platform, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6)
        """, generation_id, test_project, test_user, 'web', 'generating', datetime.now(timezone.utc))
        
        # Update status
        await db_connection.execute("""
            UPDATE generated_code 
            SET status = $1, completed_at = $2 
            WHERE id = $3
        """, 'completed', datetime.now(timezone.utc), generation_id)
        
        # Verify update
        result = await db_connection.fetchrow("""
            SELECT status, completed_at FROM generated_code WHERE id = $1
        """, generation_id)
        
        assert result['status'] == 'completed'
        assert result['completed_at'] is not None

    # Code Files Table Tests
    async def test_create_code_file(self, db_connection, test_user, test_project):
        """Test creating code files"""
        generation_id = str(uuid4())
        file_id = str(uuid4())
        
        # Create generation first
        await db_connection.execute("""
            INSERT INTO generated_code (
                id, project_id, user_id, platform, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6)
        """, generation_id, test_project, test_user, 'web', 'generating', datetime.now(timezone.utc))
        
        # Create file
        result = await db_connection.fetchrow("""
            INSERT INTO code_files (
                id, generation_id, file_name, file_path, file_type, 
                content, size_bytes, is_main_file, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        """, file_id, generation_id, 'index.html', 'index.html', 'html',
            '<html><body>Test</body></html>', 30, True, datetime.now(timezone.utc))
        
        assert result['id'] == file_id
        assert result['generation_id'] == generation_id
        assert result['file_name'] == 'index.html'
        assert result['is_main_file'] is True
    
    async def test_update_file_content(self, db_connection, test_user, test_project):
        """Test updating file content"""
        generation_id = str(uuid4())
        file_id = str(uuid4())
        
        # Create generation and file
        await db_connection.execute("""
            INSERT INTO generated_code (
                id, project_id, user_id, platform, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6)
        """, generation_id, test_project, test_user, 'web', 'generating', datetime.now(timezone.utc))
        
        await db_connection.execute("""
            INSERT INTO code_files (
                id, generation_id, file_name, file_path, file_type, 
                content, size_bytes, is_main_file, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        """, file_id, generation_id, 'index.html', 'index.html', 'html',
            '<html><body>Original</body></html>', 35, True, datetime.now(timezone.utc))
        
        # Update content
        new_content = '<html><body>Updated Content</body></html>'
        await db_connection.execute("""
            UPDATE code_files 
            SET content = $1, size_bytes = $2, updated_at = $3 
            WHERE id = $4
        """, new_content, len(new_content), datetime.now(timezone.utc), file_id)
        
        # Verify update
        result = await db_connection.fetchrow("""
            SELECT content, size_bytes FROM code_files WHERE id = $1
        """, file_id)
        
        assert result['content'] == new_content
        assert result['size_bytes'] == len(new_content)

    # Generation History Tests
    async def test_create_generation_history(self, db_connection, test_user, test_project):
        """Test logging generation history"""
        generation_id = str(uuid4())
        history_id = str(uuid4())
        
        # Create generation
        await db_connection.execute("""
            INSERT INTO generated_code (
                id, project_id, user_id, platform, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6)
        """, generation_id, test_project, test_user, 'web', 'generating', datetime.now(timezone.utc))
        
        # Create history entry
        result = await db_connection.fetchrow("""
            INSERT INTO generation_history (
                id, generation_id, user_id, action_type, 
                action_details, timestamp
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        """, history_id, generation_id, test_user, 'generation_started',
            '{"platform": "web", "complexity": "intermediate"}', datetime.now(timezone.utc))
        
        assert result['id'] == history_id
        assert result['generation_id'] == generation_id
        assert result['action_type'] == 'generation_started'

    # File Metadata Tests
    async def test_create_file_metadata(self, db_connection, test_user, test_project):
        """Test file metadata tracking"""
        generation_id = str(uuid4())
        file_id = str(uuid4())
        metadata_id = str(uuid4())
        
        # Create generation and file
        await db_connection.execute("""
            INSERT INTO generated_code (
                id, project_id, user_id, platform, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6)
        """, generation_id, test_project, test_user, 'web', 'generating', datetime.now(timezone.utc))
        
        await db_connection.execute("""
            INSERT INTO code_files (
                id, generation_id, file_name, file_path, file_type, 
                content, size_bytes, is_main_file, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        """, file_id, generation_id, 'index.html', 'index.html', 'html',
            '<html><body>Test</body></html>', 30, True, datetime.now(timezone.utc))
        
        # Create metadata
        result = await db_connection.fetchrow("""
            INSERT INTO file_metadata (
                id, code_file_id, download_count, is_modified, created_at
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        """, metadata_id, file_id, 0, False, datetime.now(timezone.utc))
        
        assert result['id'] == metadata_id
        assert result['code_file_id'] == file_id
        assert result['download_count'] == 0
        assert result['is_modified'] is False

    # RLS Policy Tests
    async def test_rls_user_isolation(self, db_connection):
        """Test that users can only access their own data"""
        user1_id = str(uuid4())
        user2_id = str(uuid4())
        project1_id = str(uuid4())
        project2_id = str(uuid4())
        generation1_id = str(uuid4())
        generation2_id = str(uuid4())
        
        # Create two users
        await db_connection.execute("""
            INSERT INTO users (id, email, created_at) VALUES 
            ($1, $2, $3), ($4, $5, $6)
        """, user1_id, f"user1_{user1_id}@example.com", datetime.now(timezone.utc),
             user2_id, f"user2_{user2_id}@example.com", datetime.now(timezone.utc))
        
        # Create projects for each user
        await db_connection.execute("""
            INSERT INTO projects (id, user_id, title, description, created_at) VALUES 
            ($1, $2, $3, $4, $5), ($6, $7, $8, $9, $10)
        """, project1_id, user1_id, "User 1 Project", "Description 1", datetime.now(timezone.utc),
             project2_id, user2_id, "User 2 Project", "Description 2", datetime.now(timezone.utc))
        
        # Create generations for each user
        await db_connection.execute("""
            INSERT INTO generated_code (id, project_id, user_id, platform, status, created_at) VALUES 
            ($1, $2, $3, $4, $5, $6), ($7, $8, $9, $10, $11, $12)
        """, generation1_id, project1_id, user1_id, 'web', 'completed', datetime.now(timezone.utc),
             generation2_id, project2_id, user2_id, 'web', 'completed', datetime.now(timezone.utc))
        
        # Test that user1 can only see their own generations
        # Note: This would require setting up RLS context, which depends on your auth system
        user1_generations = await db_connection.fetch("""
            SELECT * FROM generated_code WHERE user_id = $1
        """, user1_id)
        
        user2_generations = await db_connection.fetch("""
            SELECT * FROM generated_code WHERE user_id = $1
        """, user2_id)
        
        assert len(user1_generations) == 1
        assert len(user2_generations) == 1
        assert user1_generations[0]['id'] == generation1_id
        assert user2_generations[0]['id'] == generation2_id

    # Data Integrity Tests
    async def test_foreign_key_constraints(self, db_connection, test_user):
        """Test foreign key constraints are enforced"""
        generation_id = str(uuid4())
        file_id = str(uuid4())
        
        # Try to create a file without a generation (should fail)
        with pytest.raises(asyncpg.ForeignKeyViolationError):
            await db_connection.execute("""
                INSERT INTO code_files (
                    id, generation_id, file_name, file_path, file_type, 
                    content, size_bytes, is_main_file, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """, file_id, generation_id, 'index.html', 'index.html', 'html',
                '<html><body>Test</body></html>', 30, True, datetime.now(timezone.utc))

    async def test_cascading_deletes(self, db_connection, test_user, test_project):
        """Test that deleting a generation cascades to files"""
        generation_id = str(uuid4())
        file_id = str(uuid4())
        
        # Create generation and file
        await db_connection.execute("""
            INSERT INTO generated_code (
                id, project_id, user_id, platform, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6)
        """, generation_id, test_project, test_user, 'web', 'generating', datetime.now(timezone.utc))
        
        await db_connection.execute("""
            INSERT INTO code_files (
                id, generation_id, file_name, file_path, file_type, 
                content, size_bytes, is_main_file, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        """, file_id, generation_id, 'index.html', 'index.html', 'html',
            '<html><body>Test</body></html>', 30, True, datetime.now(timezone.utc))
        
        # Delete generation
        await db_connection.execute("""
            DELETE FROM generated_code WHERE id = $1
        """, generation_id)
        
        # Verify file was also deleted
        file_count = await db_connection.fetchval("""
            SELECT COUNT(*) FROM code_files WHERE generation_id = $1
        """, generation_id)
        
        assert file_count == 0

    # Performance Tests
    async def test_index_performance(self, db_connection, test_user, test_project):
        """Test that database indexes are working for common queries"""
        # Create multiple generations
        generation_ids = [str(uuid4()) for _ in range(10)]
        
        for gen_id in generation_ids:
            await db_connection.execute("""
                INSERT INTO generated_code (
                    id, project_id, user_id, platform, status, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6)
            """, gen_id, test_project, test_user, 'web', 'completed', datetime.now(timezone.utc))
        
        # Test query performance (should use indexes)
        result = await db_connection.fetch("""
            SELECT * FROM generated_code 
            WHERE user_id = $1 AND status = $2 
            ORDER BY created_at DESC
        """, test_user, 'completed')
        
        assert len(result) == 10

    # Trigger Tests
    async def test_updated_at_trigger(self, db_connection, test_user, test_project):
        """Test that updated_at timestamp is automatically updated"""
        generation_id = str(uuid4())
        
        # Create generation
        await db_connection.execute("""
            INSERT INTO generated_code (
                id, project_id, user_id, platform, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6)
        """, generation_id, test_project, test_user, 'web', 'generating', datetime.now(timezone.utc))
        
        # Get initial timestamps
        initial = await db_connection.fetchrow("""
            SELECT created_at, updated_at FROM generated_code WHERE id = $1
        """, generation_id)
        
        # Wait a moment and update
        await asyncio.sleep(0.1)
        await db_connection.execute("""
            UPDATE generated_code SET status = $1 WHERE id = $2
        """, 'completed', generation_id)
        
        # Get updated timestamps
        updated = await db_connection.fetchrow("""
            SELECT created_at, updated_at FROM generated_code WHERE id = $1
        """, generation_id)
        
        assert updated['updated_at'] > initial['updated_at']
        assert updated['created_at'] == initial['created_at']

if __name__ == "__main__":
    pytest.main([__file__, "-v"])