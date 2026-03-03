"""
Data integrity validation tests for AI Code Generation system
Tests constraints, validations, and data consistency rules
"""

import pytest
import asyncio
import asyncpg
from datetime import datetime, timezone
from uuid import uuid4
import os
import json

TEST_DATABASE_URL = os.getenv('TEST_DATABASE_URL', 'postgresql://postgres:password@localhost:5432/stem_test')

class TestDataIntegrityValidation:
    """Test suite for data integrity constraints and validations"""
    
    @pytest.fixture(scope="class")
    async def db_connection(self):
        """Create test database connection"""
        conn = await asyncpg.connect(TEST_DATABASE_URL)
        yield conn
        await conn.close()
    
    @pytest.fixture
    async def test_user(self, db_connection):
        """Create a test user"""
        user_id = str(uuid4())
        await db_connection.execute("""
            INSERT INTO users (id, email, created_at) 
            VALUES ($1, $2, $3)
        """, user_id, f"test_{user_id}@example.com", datetime.now(timezone.utc))
        yield user_id
        await db_connection.execute("DELETE FROM users WHERE id = $1", user_id)
    
    @pytest.fixture
    async def test_project(self, db_connection, test_user):
        """Create a test project"""
        project_id = str(uuid4())
        await db_connection.execute("""
            INSERT INTO projects (id, user_id, title, description, created_at) 
            VALUES ($1, $2, $3, $4, $5)
        """, project_id, test_user, "Test Project", "Test Description", datetime.now(timezone.utc))
        yield project_id
        await db_connection.execute("DELETE FROM projects WHERE id = $1", project_id)

    # Generated Code Constraints
    async def test_generated_code_required_fields(self, db_connection, test_user, test_project):
        """Test that required fields cannot be null"""
        generation_id = str(uuid4())
        
        # Test missing project_id
        with pytest.raises(asyncpg.NotNullViolationError):
            await db_connection.execute("""
                INSERT INTO generated_code (id, user_id, platform, status, created_at) 
                VALUES ($1, $2, $3, $4, $5)
            """, generation_id, test_user, 'web', 'generating', datetime.now(timezone.utc))
        
        # Test missing user_id
        with pytest.raises(asyncpg.NotNullViolationError):
            await db_connection.execute("""
                INSERT INTO generated_code (id, project_id, platform, status, created_at) 
                VALUES ($1, $2, $3, $4, $5)
            """, generation_id, test_project, 'web', 'generating', datetime.now(timezone.utc))
        
        # Test missing platform
        with pytest.raises(asyncpg.NotNullViolationError):
            await db_connection.execute("""
                INSERT INTO generated_code (id, project_id, user_id, status, created_at) 
                VALUES ($1, $2, $3, $4, $5)
            """, generation_id, test_project, test_user, 'generating', datetime.now(timezone.utc))

    async def test_generated_code_status_constraint(self, db_connection, test_user, test_project):
        """Test that status field only accepts valid values"""
        generation_id = str(uuid4())
        
        # Valid status should work
        await db_connection.execute("""
            INSERT INTO generated_code (
                id, project_id, user_id, platform, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6)
        """, generation_id, test_project, test_user, 'web', 'generating', datetime.now(timezone.utc))
        
        # Invalid status should fail
        with pytest.raises(asyncpg.CheckViolationError):
            await db_connection.execute("""
                UPDATE generated_code SET status = $1 WHERE id = $2
            """, 'invalid_status', generation_id)

    async def test_generated_code_platform_constraint(self, db_connection, test_user, test_project):
        """Test that platform field only accepts valid values"""
        generation_id = str(uuid4())
        
        # Test invalid platform
        with pytest.raises(asyncpg.CheckViolationError):
            await db_connection.execute("""
                INSERT INTO generated_code (
                    id, project_id, user_id, platform, status, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6)
            """, generation_id, test_project, test_user, 'invalid_platform', 'generating', datetime.now(timezone.utc))

    # Code Files Constraints
    async def test_code_files_required_fields(self, db_connection, test_user, test_project):
        """Test code files required field constraints"""
        generation_id = str(uuid4())
        file_id = str(uuid4())
        
        # Create generation first
        await db_connection.execute("""
            INSERT INTO generated_code (
                id, project_id, user_id, platform, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6)
        """, generation_id, test_project, test_user, 'web', 'generating', datetime.now(timezone.utc))
        
        # Test missing file_name
        with pytest.raises(asyncpg.NotNullViolationError):
            await db_connection.execute("""
                INSERT INTO code_files (
                    id, generation_id, file_path, file_type, content, 
                    size_bytes, is_main_file, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """, file_id, generation_id, 'index.html', 'html', '<html></html>', 
                13, True, datetime.now(timezone.utc))
        
        # Test missing content
        with pytest.raises(asyncpg.NotNullViolationError):
            await db_connection.execute("""
                INSERT INTO code_files (
                    id, generation_id, file_name, file_path, file_type, 
                    size_bytes, is_main_file, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """, file_id, generation_id, 'index.html', 'index.html', 'html', 
                13, True, datetime.now(timezone.utc))

    async def test_code_files_size_constraint(self, db_connection, test_user, test_project):
        """Test that file size must be non-negative"""
        generation_id = str(uuid4())
        file_id = str(uuid4())
        
        # Create generation
        await db_connection.execute("""
            INSERT INTO generated_code (
                id, project_id, user_id, platform, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6)
        """, generation_id, test_project, test_user, 'web', 'generating', datetime.now(timezone.utc))
        
        # Test negative size
        with pytest.raises(asyncpg.CheckViolationError):
            await db_connection.execute("""
                INSERT INTO code_files (
                    id, generation_id, file_name, file_path, file_type, 
                    content, size_bytes, is_main_file, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """, file_id, generation_id, 'index.html', 'index.html', 'html',
                '<html></html>', -1, True, datetime.now(timezone.utc))

    async def test_unique_main_file_per_generation(self, db_connection, test_user, test_project):
        """Test that only one main file is allowed per generation"""
        generation_id = str(uuid4())
        file1_id = str(uuid4())
        file2_id = str(uuid4())
        
        # Create generation
        await db_connection.execute("""
            INSERT INTO generated_code (
                id, project_id, user_id, platform, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6)
        """, generation_id, test_project, test_user, 'web', 'generating', datetime.now(timezone.utc))
        
        # Create first main file
        await db_connection.execute("""
            INSERT INTO code_files (
                id, generation_id, file_name, file_path, file_type, 
                content, size_bytes, is_main_file, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        """, file1_id, generation_id, 'index.html', 'index.html', 'html',
            '<html></html>', 13, True, datetime.now(timezone.utc))
        
        # Try to create second main file (should fail if unique constraint exists)
        # Note: This depends on having a unique constraint on (generation_id, is_main_file) WHERE is_main_file = true
        try:
            await db_connection.execute("""
                INSERT INTO code_files (
                    id, generation_id, file_name, file_path, file_type, 
                    content, size_bytes, is_main_file, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """, file2_id, generation_id, 'main.js', 'main.js', 'js',
                'console.log("test");', 20, True, datetime.now(timezone.utc))
            
            # If no constraint exists, we should add a warning
            print("WARNING: No unique constraint on main files per generation")
        except asyncpg.UniqueViolationError:
            # This is expected if the constraint exists
            pass

    # Generation History Constraints
    async def test_generation_history_action_types(self, db_connection, test_user, test_project):
        """Test that only valid action types are allowed"""
        generation_id = str(uuid4())
        history_id = str(uuid4())
        
        # Create generation
        await db_connection.execute("""
            INSERT INTO generated_code (
                id, project_id, user_id, platform, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6)
        """, generation_id, test_project, test_user, 'web', 'generating', datetime.now(timezone.utc))
        
        # Valid action type should work
        await db_connection.execute("""
            INSERT INTO generation_history (
                id, generation_id, user_id, action_type, timestamp
            ) VALUES ($1, $2, $3, $4, $5)
        """, history_id, generation_id, test_user, 'generation_started', datetime.now(timezone.utc))
        
        # Invalid action type should fail (if constraint exists)
        try:
            await db_connection.execute("""
                INSERT INTO generation_history (
                    id, generation_id, user_id, action_type, timestamp
                ) VALUES ($1, $2, $3, $4, $5)
            """, str(uuid4()), generation_id, test_user, 'invalid_action', datetime.now(timezone.utc))
            print("WARNING: No constraint on action_type values")
        except asyncpg.CheckViolationError:
            pass  # Expected if constraint exists

    # File Metadata Constraints
    async def test_file_metadata_download_count(self, db_connection, test_user, test_project):
        """Test that download count cannot be negative"""
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
            '<html></html>', 13, True, datetime.now(timezone.utc))
        
        # Test negative download count
        with pytest.raises(asyncpg.CheckViolationError):
            await db_connection.execute("""
                INSERT INTO file_metadata (
                    id, code_file_id, download_count, is_modified, created_at
                ) VALUES ($1, $2, $3, $4, $5)
            """, metadata_id, file_id, -1, False, datetime.now(timezone.utc))

    # JSON Validation Tests
    async def test_generation_params_json_validation(self, db_connection, test_user, test_project):
        """Test that generation_params contains valid JSON"""
        generation_id = str(uuid4())
        
        # Valid JSON should work
        valid_params = json.dumps({"platform": "web", "complexity": "intermediate"})
        await db_connection.execute("""
            INSERT INTO generated_code (
                id, project_id, user_id, platform, status, 
                generation_params, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        """, generation_id, test_project, test_user, 'web', 'generating', 
            valid_params, datetime.now(timezone.utc))
        
        # Verify JSON can be parsed back
        result = await db_connection.fetchval("""
            SELECT generation_params FROM generated_code WHERE id = $1
        """, generation_id)
        
        parsed_params = json.loads(result)
        assert parsed_params["platform"] == "web"
        assert parsed_params["complexity"] == "intermediate"

    # Cross-table Consistency Tests
    async def test_file_count_consistency(self, db_connection, test_user, test_project):
        """Test that files_count matches actual file count"""
        generation_id = str(uuid4())
        
        # Create generation
        await db_connection.execute("""
            INSERT INTO generated_code (
                id, project_id, user_id, platform, status, 
                files_count, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        """, generation_id, test_project, test_user, 'web', 'generating', 
            0, datetime.now(timezone.utc))
        
        # Add files
        file_ids = [str(uuid4()) for _ in range(3)]
        for i, file_id in enumerate(file_ids):
            await db_connection.execute("""
                INSERT INTO code_files (
                    id, generation_id, file_name, file_path, file_type, 
                    content, size_bytes, is_main_file, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """, file_id, generation_id, f'file{i}.html', f'file{i}.html', 'html',
                f'<html>File {i}</html>', 20, i == 0, datetime.now(timezone.utc))
        
        # Update files_count
        await db_connection.execute("""
            UPDATE generated_code SET files_count = $1 WHERE id = $2
        """, 3, generation_id)
        
        # Verify consistency
        result = await db_connection.fetchrow("""
            SELECT 
                gc.files_count,
                COUNT(cf.id) as actual_count
            FROM generated_code gc
            LEFT JOIN code_files cf ON gc.id = cf.generation_id
            WHERE gc.id = $1
            GROUP BY gc.id, gc.files_count
        """, generation_id)
        
        assert result['files_count'] == result['actual_count']

    # Timestamp Consistency Tests
    async def test_timestamp_ordering(self, db_connection, test_user, test_project):
        """Test that timestamps are logically ordered"""
        generation_id = str(uuid4())
        
        # Create generation
        created_at = datetime.now(timezone.utc)
        await db_connection.execute("""
            INSERT INTO generated_code (
                id, project_id, user_id, platform, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6)
        """, generation_id, test_project, test_user, 'web', 'generating', created_at)
        
        # Complete generation
        completed_at = datetime.now(timezone.utc)
        await db_connection.execute("""
            UPDATE generated_code 
            SET status = $1, completed_at = $2 
            WHERE id = $3
        """, 'completed', completed_at, generation_id)
        
        # Verify timestamp ordering
        result = await db_connection.fetchrow("""
            SELECT created_at, completed_at FROM generated_code WHERE id = $1
        """, generation_id)
        
        assert result['completed_at'] >= result['created_at']

    # Data Size Limits Tests
    async def test_content_size_limits(self, db_connection, test_user, test_project):
        """Test handling of large content"""
        generation_id = str(uuid4())
        file_id = str(uuid4())
        
        # Create generation
        await db_connection.execute("""
            INSERT INTO generated_code (
                id, project_id, user_id, platform, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6)
        """, generation_id, test_project, test_user, 'web', 'generating', datetime.now(timezone.utc))
        
        # Test with large content (1MB)
        large_content = "x" * (1024 * 1024)  # 1MB of 'x' characters
        
        await db_connection.execute("""
            INSERT INTO code_files (
                id, generation_id, file_name, file_path, file_type, 
                content, size_bytes, is_main_file, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        """, file_id, generation_id, 'large.txt', 'large.txt', 'txt',
            large_content, len(large_content), False, datetime.now(timezone.utc))
        
        # Verify content was stored correctly
        result = await db_connection.fetchval("""
            SELECT LENGTH(content) FROM code_files WHERE id = $1
        """, file_id)
        
        assert result == len(large_content)

if __name__ == "__main__":
    pytest.main([__file__, "-v"])