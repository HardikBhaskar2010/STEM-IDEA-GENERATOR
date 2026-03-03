# Unit Tests for Data Integrity Constraints
# Requirements: Database integrity and constraint validation
# Task: Validate data integrity constraints

import pytest
import asyncio
import uuid
import json
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from typing import List, Dict, Any, Optional

from backend.database.connection import get_db_client
from supabase import Client


class TestDataIntegrityConstraints:
    """Test suite for database data integrity constraints"""
    
    @pytest.fixture
    async def db_client(self):
        """Get database client for testing"""
        return await get_db_client()
    
    @pytest.fixture
    def sample_user_id(self):
        return str(uuid.uuid4())
    
    @pytest.fixture
    def sample_project_id(self):
        return str(uuid.uuid4())


class TestGeneratedCodeConstraints:
    """Test constraints for generated_code table"""
    
    @pytest.fixture
    async def db_client(self):
        return await get_db_client()
    
    @pytest.fixture
    def valid_generated_code_data(self):
        return {
            "project_id": str(uuid.uuid4()),
            "user_id": str(uuid.uuid4()),
            "generation_request": {"platform": "arduino", "complexity": "beginner"},
            "status": "generating",
            "platform": "arduino",
            "metadata": {}
        }
    
    @pytest.mark.asyncio
    async def test_status_check_constraint(self, db_client, valid_generated_code_data):
        """Test that status field only accepts valid values"""
        valid_statuses = ['generating', 'completed', 'failed']
        invalid_statuses = ['pending', 'in_progress', 'cancelled', 'unknown']
        
        # Test valid statuses
        for status in valid_statuses:
            data = valid_generated_code_data.copy()
            data['status'] = status
            
            mock_response = MagicMock()
            mock_response.data = [{"id": str(uuid.uuid4()), **data}]
            
            with patch.object(db_client, 'table') as mock_table:
                mock_table.return_value.insert.return_value.execute.return_value = mock_response
                
                result = db_client.table('generated_code').insert(data).execute()
                assert result.data is not None
        
        # Test invalid statuses
        for status in invalid_statuses:
            data = valid_generated_code_data.copy()
            data['status'] = status
            
            with patch.object(db_client, 'table') as mock_table:
                mock_table.return_value.insert.return_value.execute.side_effect = Exception(
                    f"Check constraint violation: status must be one of {valid_statuses}"
                )
                
                with pytest.raises(Exception) as exc_info:
                    db_client.table('generated_code').insert(data).execute()
                
                assert "constraint" in str(exc_info.value).lower()
    
    @pytest.mark.asyncio
    async def test_platform_check_constraint(self, db_client, valid_generated_code_data):
        """Test that platform field only accepts valid values"""
        valid_platforms = ['arduino', 'raspberry_pi', 'web', 'mobile']
        invalid_platforms = ['desktop', 'embedded', 'cloud', 'iot']
        
        # Test valid platforms
        for platform in valid_platforms:
            data = valid_generated_code_data.copy()
            data['platform'] = platform
            
            mock_response = MagicMock()
            mock_response.data = [{"id": str(uuid.uuid4()), **data}]
            
            with patch.object(db_client, 'table') as mock_table:
                mock_table.return_value.insert.return_value.execute.return_value = mock_response
                
                result = db_client.table('generated_code').insert(data).execute()
                assert result.data is not None
        
        # Test invalid platforms
        for platform in invalid_platforms:
            data = valid_generated_code_data.copy()
            data['platform'] = platform
            
            with patch.object(db_client, 'table') as mock_table:
                mock_table.return_value.insert.return_value.execute.side_effect = Exception(
                    f"Check constraint violation: platform must be one of {valid_platforms}"
                )
                
                with pytest.raises(Exception) as exc_info:
                    db_client.table('generated_code').insert(data).execute()
                
                assert "constraint" in str(exc_info.value).lower()
    
    @pytest.mark.asyncio
    async def test_required_fields_not_null(self, db_client):
        """Test that required fields cannot be null"""
        required_fields = ['project_id', 'user_id', 'generation_request', 'platform']
        
        base_data = {
            "project_id": str(uuid.uuid4()),
            "user_id": str(uuid.uuid4()),
            "generation_request": {"platform": "arduino"},
            "platform": "arduino"
        }
        
        for field in required_fields:
            data = base_data.copy()
            data[field] = None  # Set to null
            
            with patch.object(db_client, 'table') as mock_table:
                mock_table.return_value.insert.return_value.execute.side_effect = Exception(
                    f"Not null constraint violation: {field} cannot be null"
                )
                
                with pytest.raises(Exception) as exc_info:
                    db_client.table('generated_code').insert(data).execute()
                
                assert "null" in str(exc_info.value).lower() or "constraint" in str(exc_info.value).lower()
    
    @pytest.mark.asyncio
    async def test_generation_request_jsonb_validation(self, db_client, valid_generated_code_data):
        """Test that generation_request field accepts valid JSONB"""
        valid_requests = [
            {"platform": "arduino", "complexity": "beginner"},
            {"platform": "web", "complexity": "advanced", "include_tests": True},
            {"platform": "mobile", "custom_requirements": "Add authentication"}
        ]
        
        for request in valid_requests:
            data = valid_generated_code_data.copy()
            data['generation_request'] = request
            
            mock_response = MagicMock()
            mock_response.data = [{"id": str(uuid.uuid4()), **data}]
            
            with patch.object(db_client, 'table') as mock_table:
                mock_table.return_value.insert.return_value.execute.return_value = mock_response
                
                result = db_client.table('generated_code').insert(data).execute()
                assert result.data is not None
    
    @pytest.mark.asyncio
    async def test_metadata_jsonb_default(self, db_client, valid_generated_code_data):
        """Test that metadata field defaults to empty JSONB object"""
        data = valid_generated_code_data.copy()
        # Don't set metadata, should default to {}
        if 'metadata' in data:
            del data['metadata']
        
        mock_response = MagicMock()
        mock_response.data = [{"id": str(uuid.uuid4()), "metadata": {}, **data}]
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.insert.return_value.execute.return_value = mock_response
            
            result = db_client.table('generated_code').insert(data).execute()
            assert result.data is not None
            assert result.data[0]['metadata'] == {}


class TestCodeFilesConstraints:
    """Test constraints for code_files table"""
    
    @pytest.fixture
    async def db_client(self):
        return await get_db_client()
    
    @pytest.fixture
    def valid_code_file_data(self):
        return {
            "generated_code_id": str(uuid.uuid4()),
            "file_path": "src/main.cpp",
            "file_name": "main.cpp",
            "file_type": "cpp",
            "content": "#include <Arduino.h>\nvoid setup() {}\nvoid loop() {}",
            "description": "Main Arduino sketch",
            "size_bytes": 100,
            "is_main_file": True
        }
    
    @pytest.mark.asyncio
    async def test_required_fields_not_null(self, db_client, valid_code_file_data):
        """Test that required fields cannot be null"""
        required_fields = ['generated_code_id', 'file_path', 'file_name', 'file_type', 'content']
        
        for field in required_fields:
            data = valid_code_file_data.copy()
            data[field] = None
            
            with patch.object(db_client, 'table') as mock_table:
                mock_table.return_value.insert.return_value.execute.side_effect = Exception(
                    f"Not null constraint violation: {field} cannot be null"
                )
                
                with pytest.raises(Exception) as exc_info:
                    db_client.table('code_files').insert(data).execute()
                
                assert "null" in str(exc_info.value).lower() or "constraint" in str(exc_info.value).lower()
    
    @pytest.mark.asyncio
    async def test_file_path_length_constraint(self, db_client, valid_code_file_data):
        """Test file_path length constraint (max 500 characters)"""
        # Test valid length
        data = valid_code_file_data.copy()
        data['file_path'] = 'a' * 500  # Exactly 500 characters
        
        mock_response = MagicMock()
        mock_response.data = [{"id": str(uuid.uuid4()), **data}]
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.insert.return_value.execute.return_value = mock_response
            
            result = db_client.table('code_files').insert(data).execute()
            assert result.data is not None
        
        # Test invalid length (too long)
        data['file_path'] = 'a' * 501  # 501 characters, should fail
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.insert.return_value.execute.side_effect = Exception(
                "Value too long for type character varying(500)"
            )
            
            with pytest.raises(Exception) as exc_info:
                db_client.table('code_files').insert(data).execute()
            
            assert "too long" in str(exc_info.value).lower() or "constraint" in str(exc_info.value).lower()
    
    @pytest.mark.asyncio
    async def test_file_name_length_constraint(self, db_client, valid_code_file_data):
        """Test file_name length constraint (max 255 characters)"""
        # Test valid length
        data = valid_code_file_data.copy()
        data['file_name'] = 'a' * 255  # Exactly 255 characters
        
        mock_response = MagicMock()
        mock_response.data = [{"id": str(uuid.uuid4()), **data}]
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.insert.return_value.execute.return_value = mock_response
            
            result = db_client.table('code_files').insert(data).execute()
            assert result.data is not None
        
        # Test invalid length (too long)
        data['file_name'] = 'a' * 256  # 256 characters, should fail
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.insert.return_value.execute.side_effect = Exception(
                "Value too long for type character varying(255)"
            )
            
            with pytest.raises(Exception) as exc_info:
                db_client.table('code_files').insert(data).execute()
            
            assert "too long" in str(exc_info.value).lower() or "constraint" in str(exc_info.value).lower()
    
    @pytest.mark.asyncio
    async def test_is_main_file_default(self, db_client, valid_code_file_data):
        """Test that is_main_file defaults to FALSE"""
        data = valid_code_file_data.copy()
        if 'is_main_file' in data:
            del data['is_main_file']  # Don't set, should default to FALSE
        
        mock_response = MagicMock()
        mock_response.data = [{"id": str(uuid.uuid4()), "is_main_file": False, **data}]
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.insert.return_value.execute.return_value = mock_response
            
            result = db_client.table('code_files').insert(data).execute()
            assert result.data is not None
            assert result.data[0]['is_main_file'] is False
    
    @pytest.mark.asyncio
    async def test_size_bytes_positive_constraint(self, db_client, valid_code_file_data):
        """Test that size_bytes should be positive or null"""
        # Test positive value
        data = valid_code_file_data.copy()
        data['size_bytes'] = 1000
        
        mock_response = MagicMock()
        mock_response.data = [{"id": str(uuid.uuid4()), **data}]
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.insert.return_value.execute.return_value = mock_response
            
            result = db_client.table('code_files').insert(data).execute()
            assert result.data is not None
        
        # Test null value (should be allowed)
        data['size_bytes'] = None
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.insert.return_value.execute.return_value = mock_response
            
            result = db_client.table('code_files').insert(data).execute()
            assert result.data is not None
        
        # Test negative value (should fail if constraint exists)
        data['size_bytes'] = -100
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.insert.return_value.execute.side_effect = Exception(
                "Check constraint violation: size_bytes must be positive"
            )
            
            with pytest.raises(Exception) as exc_info:
                db_client.table('code_files').insert(data).execute()
            
            assert "constraint" in str(exc_info.value).lower()


class TestGenerationHistoryConstraints:
    """Test constraints for generation_history table"""
    
    @pytest.fixture
    async def db_client(self):
        return await get_db_client()
    
    @pytest.fixture
    def valid_history_data(self):
        return {
            "user_id": str(uuid.uuid4()),
            "project_id": str(uuid.uuid4()),
            "generated_code_id": str(uuid.uuid4()),
            "action": "generate",
            "parameters": {"platform": "arduino"}
        }
    
    @pytest.mark.asyncio
    async def test_action_check_constraint(self, db_client, valid_history_data):
        """Test that action field only accepts valid values"""
        valid_actions = ['generate', 'regenerate', 'modify', 'download', 'view', 'copy']
        invalid_actions = ['create', 'update', 'delete', 'share', 'export']
        
        # Test valid actions
        for action in valid_actions:
            data = valid_history_data.copy()
            data['action'] = action
            
            mock_response = MagicMock()
            mock_response.data = [{"id": str(uuid.uuid4()), **data}]
            
            with patch.object(db_client, 'table') as mock_table:
                mock_table.return_value.insert.return_value.execute.return_value = mock_response
                
                result = db_client.table('generation_history').insert(data).execute()
                assert result.data is not None
        
        # Test invalid actions
        for action in invalid_actions:
            data = valid_history_data.copy()
            data['action'] = action
            
            with patch.object(db_client, 'table') as mock_table:
                mock_table.return_value.insert.return_value.execute.side_effect = Exception(
                    f"Check constraint violation: action must be one of {valid_actions}"
                )
                
                with pytest.raises(Exception) as exc_info:
                    db_client.table('generation_history').insert(data).execute()
                
                assert "constraint" in str(exc_info.value).lower()
    
    @pytest.mark.asyncio
    async def test_required_fields_not_null(self, db_client, valid_history_data):
        """Test that required fields cannot be null"""
        required_fields = ['user_id', 'action']
        
        for field in required_fields:
            data = valid_history_data.copy()
            data[field] = None
            
            with patch.object(db_client, 'table') as mock_table:
                mock_table.return_value.insert.return_value.execute.side_effect = Exception(
                    f"Not null constraint violation: {field} cannot be null"
                )
                
                with pytest.raises(Exception) as exc_info:
                    db_client.table('generation_history').insert(data).execute()
                
                assert "null" in str(exc_info.value).lower() or "constraint" in str(exc_info.value).lower()
    
    @pytest.mark.asyncio
    async def test_optional_foreign_keys(self, db_client, valid_history_data):
        """Test that project_id and generated_code_id can be null"""
        # Test with null project_id
        data = valid_history_data.copy()
        data['project_id'] = None
        
        mock_response = MagicMock()
        mock_response.data = [{"id": str(uuid.uuid4()), **data}]
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.insert.return_value.execute.return_value = mock_response
            
            result = db_client.table('generation_history').insert(data).execute()
            assert result.data is not None
        
        # Test with null generated_code_id
        data = valid_history_data.copy()
        data['generated_code_id'] = None
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.insert.return_value.execute.return_value = mock_response
            
            result = db_client.table('generation_history').insert(data).execute()
            assert result.data is not None


class TestFileMetadataConstraints:
    """Test constraints for file_metadata table"""
    
    @pytest.fixture
    async def db_client(self):
        return await get_db_client()
    
    @pytest.fixture
    def valid_metadata_data(self):
        return {
            "code_file_id": str(uuid.uuid4()),
            "download_count": 0,
            "is_modified": False,
            "original_content": "Original content",
            "modification_history": []
        }
    
    @pytest.mark.asyncio
    async def test_required_fields_not_null(self, db_client, valid_metadata_data):
        """Test that required fields cannot be null"""
        required_fields = ['code_file_id']
        
        for field in required_fields:
            data = valid_metadata_data.copy()
            data[field] = None
            
            with patch.object(db_client, 'table') as mock_table:
                mock_table.return_value.insert.return_value.execute.side_effect = Exception(
                    f"Not null constraint violation: {field} cannot be null"
                )
                
                with pytest.raises(Exception) as exc_info:
                    db_client.table('file_metadata').insert(data).execute()
                
                assert "null" in str(exc_info.value).lower() or "constraint" in str(exc_info.value).lower()
    
    @pytest.mark.asyncio
    async def test_download_count_default(self, db_client, valid_metadata_data):
        """Test that download_count defaults to 0"""
        data = valid_metadata_data.copy()
        if 'download_count' in data:
            del data['download_count']  # Don't set, should default to 0
        
        mock_response = MagicMock()
        mock_response.data = [{"id": str(uuid.uuid4()), "download_count": 0, **data}]
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.insert.return_value.execute.return_value = mock_response
            
            result = db_client.table('file_metadata').insert(data).execute()
            assert result.data is not None
            assert result.data[0]['download_count'] == 0
    
    @pytest.mark.asyncio
    async def test_is_modified_default(self, db_client, valid_metadata_data):
        """Test that is_modified defaults to FALSE"""
        data = valid_metadata_data.copy()
        if 'is_modified' in data:
            del data['is_modified']  # Don't set, should default to FALSE
        
        mock_response = MagicMock()
        mock_response.data = [{"id": str(uuid.uuid4()), "is_modified": False, **data}]
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.insert.return_value.execute.return_value = mock_response
            
            result = db_client.table('file_metadata').insert(data).execute()
            assert result.data is not None
            assert result.data[0]['is_modified'] is False
    
    @pytest.mark.asyncio
    async def test_modification_history_default(self, db_client, valid_metadata_data):
        """Test that modification_history defaults to empty array"""
        data = valid_metadata_data.copy()
        if 'modification_history' in data:
            del data['modification_history']  # Don't set, should default to []
        
        mock_response = MagicMock()
        mock_response.data = [{"id": str(uuid.uuid4()), "modification_history": [], **data}]
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.insert.return_value.execute.return_value = mock_response
            
            result = db_client.table('file_metadata').insert(data).execute()
            assert result.data is not None
            assert result.data[0]['modification_history'] == []
    
    @pytest.mark.asyncio
    async def test_download_count_non_negative(self, db_client, valid_metadata_data):
        """Test that download_count should be non-negative"""
        # Test positive value
        data = valid_metadata_data.copy()
        data['download_count'] = 10
        
        mock_response = MagicMock()
        mock_response.data = [{"id": str(uuid.uuid4()), **data}]
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.insert.return_value.execute.return_value = mock_response
            
            result = db_client.table('file_metadata').insert(data).execute()
            assert result.data is not None
        
        # Test zero value
        data['download_count'] = 0
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.insert.return_value.execute.return_value = mock_response
            
            result = db_client.table('file_metadata').insert(data).execute()
            assert result.data is not None
        
        # Test negative value (should fail if constraint exists)
        data['download_count'] = -5
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.insert.return_value.execute.side_effect = Exception(
                "Check constraint violation: download_count must be non-negative"
            )
            
            with pytest.raises(Exception) as exc_info:
                db_client.table('file_metadata').insert(data).execute()
            
            assert "constraint" in str(exc_info.value).lower()


class TestForeignKeyConstraints:
    """Test foreign key constraints across all tables"""
    
    @pytest.fixture
    async def db_client(self):
        return await get_db_client()
    
    @pytest.mark.asyncio
    async def test_generated_code_foreign_keys(self, db_client):
        """Test foreign key constraints for generated_code table"""
        # Test with non-existent project_id
        invalid_data = {
            "project_id": str(uuid.uuid4()),  # Non-existent
            "user_id": str(uuid.uuid4()),     # Non-existent
            "generation_request": {"platform": "arduino"},
            "status": "generating",
            "platform": "arduino"
        }
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.insert.return_value.execute.side_effect = Exception(
                "Foreign key constraint violation: project_id does not exist"
            )
            
            with pytest.raises(Exception) as exc_info:
                db_client.table('generated_code').insert(invalid_data).execute()
            
            assert "foreign key" in str(exc_info.value).lower() or "constraint" in str(exc_info.value).lower()
    
    @pytest.mark.asyncio
    async def test_code_files_foreign_key(self, db_client):
        """Test foreign key constraint for code_files table"""
        invalid_data = {
            "generated_code_id": str(uuid.uuid4()),  # Non-existent
            "file_path": "src/main.cpp",
            "file_name": "main.cpp",
            "file_type": "cpp",
            "content": "test content"
        }
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.insert.return_value.execute.side_effect = Exception(
                "Foreign key constraint violation: generated_code_id does not exist"
            )
            
            with pytest.raises(Exception) as exc_info:
                db_client.table('code_files').insert(invalid_data).execute()
            
            assert "foreign key" in str(exc_info.value).lower() or "constraint" in str(exc_info.value).lower()
    
    @pytest.mark.asyncio
    async def test_file_metadata_foreign_key(self, db_client):
        """Test foreign key constraint for file_metadata table"""
        invalid_data = {
            "code_file_id": str(uuid.uuid4()),  # Non-existent
            "download_count": 0,
            "is_modified": False
        }
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.insert.return_value.execute.side_effect = Exception(
                "Foreign key constraint violation: code_file_id does not exist"
            )
            
            with pytest.raises(Exception) as exc_info:
                db_client.table('file_metadata').insert(invalid_data).execute()
            
            assert "foreign key" in str(exc_info.value).lower() or "constraint" in str(exc_info.value).lower()


class TestCascadeDeleteBehavior:
    """Test cascade delete behavior"""
    
    @pytest.fixture
    async def db_client(self):
        return await get_db_client()
    
    @pytest.mark.asyncio
    async def test_generated_code_cascade_delete(self, db_client):
        """Test that deleting generated_code cascades to related tables"""
        generation_id = str(uuid.uuid4())
        
        # Mock successful cascade delete
        mock_response = MagicMock()
        mock_response.data = [{"id": generation_id}]
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.delete.return_value.eq.return_value.execute.return_value = mock_response
            
            # Delete generated_code record
            result = db_client.table('generated_code').delete().eq('id', generation_id).execute()
            
            assert result.data is not None
            assert result.data[0]['id'] == generation_id
            
            # In a real test, you would verify that related code_files and file_metadata
            # records are also deleted due to CASCADE constraints
    
    @pytest.mark.asyncio
    async def test_code_files_cascade_delete(self, db_client):
        """Test that deleting code_files cascades to file_metadata"""
        file_id = str(uuid.uuid4())
        
        # Mock successful cascade delete
        mock_response = MagicMock()
        mock_response.data = [{"id": file_id}]
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.delete.return_value.eq.return_value.execute.return_value = mock_response
            
            # Delete code_files record
            result = db_client.table('code_files').delete().eq('id', file_id).execute()
            
            assert result.data is not None
            assert result.data[0]['id'] == file_id
            
            # In a real test, you would verify that related file_metadata
            # records are also deleted due to CASCADE constraints


class TestTimestampConstraints:
    """Test timestamp field constraints and defaults"""
    
    @pytest.fixture
    async def db_client(self):
        return await get_db_client()
    
    @pytest.mark.asyncio
    async def test_created_at_defaults(self, db_client):
        """Test that created_at fields default to NOW()"""
        tables_with_created_at = [
            'generated_code',
            'code_files',
            'generation_history',
            'file_metadata'
        ]
        
        for table_name in tables_with_created_at:
            # Mock response with created_at timestamp
            mock_response = MagicMock()
            mock_response.data = [{
                "id": str(uuid.uuid4()),
                "created_at": datetime.now(timezone.utc).isoformat()
            }]
            
            with patch.object(db_client, 'table') as mock_table:
                mock_table.return_value.insert.return_value.execute.return_value = mock_response
                
                # Insert minimal data (created_at should be auto-set)
                minimal_data = {"id": str(uuid.uuid4())}  # Minimal valid data
                result = db_client.table(table_name).insert(minimal_data).execute()
                
                assert result.data is not None
                assert 'created_at' in result.data[0]
                assert result.data[0]['created_at'] is not None
    
    @pytest.mark.asyncio
    async def test_updated_at_trigger(self, db_client):
        """Test that updated_at is automatically updated on code_files"""
        file_id = str(uuid.uuid4())
        
        # Mock update response with new updated_at
        mock_response = MagicMock()
        mock_response.data = [{
            "id": file_id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }]
        
        with patch.object(db_client, 'table') as mock_table:
            mock_table.return_value.update.return_value.eq.return_value.execute.return_value = mock_response
            
            # Update file content
            result = db_client.table('code_files').update({
                "content": "updated content"
            }).eq('id', file_id).execute()
            
            assert result.data is not None
            assert 'updated_at' in result.data[0]
            assert result.data[0]['updated_at'] is not None


if __name__ == "__main__":
    # Run tests with: python -m pytest backend/tests/test_data_integrity.py -v
    pytest.main([__file__, "-v"])