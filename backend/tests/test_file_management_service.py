"""
Unit tests for FileManagementService

Tests the file management functionality including:
- CRUD operations for generated files
- ZIP archive generation
- File upload/download with security validation
- File modification tracking and history
- README generation for projects
"""

import pytest
import tempfile
import os
import zipfile
import json
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone
import hashlib

from backend.services.file_management_service import FileManagementService
from backend.database.connection import get_db_connection


class TestFileManagementService:
    """Test suite for FileManagementService"""

    @pytest.fixture
    def service(self):
        """Create a FileManagementService instance for testing"""
        return FileManagementService()

    @pytest.fixture
    def mock_db_connection(self):
        """Mock database connection"""
        with patch('backend.services.file_management_service.get_db_connection') as mock_conn:
            mock_cursor = Mock()
            mock_conn.return_value.__enter__.return_value = mock_cursor
            yield mock_cursor

    @pytest.fixture
    def sample_file_data(self):
        """Sample file data for testing"""
        return {
            'id': 'file_123',
            'generation_id': 'gen_123',
            'file_name': 'main.ino',
            'file_path': 'src/main.ino',
            'file_type': 'ino',
            'content': '// Arduino code\nvoid setup() {\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(13, HIGH);\n  delay(1000);\n  digitalWrite(13, LOW);\n  delay(1000);\n}',
            'description': 'Main Arduino sketch file',
            'size_bytes': 150,
            'is_main_file': True,
            'created_at': datetime.now(timezone.utc),
            'updated_at': datetime.now(timezone.utc)
        }

    @pytest.fixture
    def sample_files_list(self):
        """Sample list of files for testing"""
        return [
            {
                'id': 'file_1',
                'file_name': 'main.ino',
                'file_path': 'src/main.ino',
                'file_type': 'ino',
                'content': '// Main Arduino file',
                'size_bytes': 100,
                'is_main_file': True
            },
            {
                'id': 'file_2',
                'file_name': 'config.h',
                'file_path': 'src/config.h',
                'file_type': 'h',
                'content': '// Configuration header',
                'size_bytes': 50,
                'is_main_file': False
            },
            {
                'id': 'file_3',
                'file_name': 'README.md',
                'file_path': 'README.md',
                'file_type': 'md',
                'content': '# Project README',
                'size_bytes': 30,
                'is_main_file': False
            }
        ]

    def test_service_initialization(self, service):
        """Test service initializes correctly"""
        assert service is not None
        assert hasattr(service, 'upload_dir')
        assert hasattr(service, 'max_file_size')

    @pytest.mark.asyncio
    async def test_create_file_success(self, service, mock_db_connection):
        """Test successful file creation"""
        generation_id = 'gen_123'
        file_data = {
            'file_name': 'test.ino',
            'file_path': 'test.ino',
            'file_type': 'ino',
            'content': '// Test content',
            'description': 'Test file',
            'is_main_file': True
        }
        
        mock_db_connection.lastrowid = 456
        
        result = await service.create_file(generation_id, file_data)
        
        assert result is not None
        assert result['file_name'] == file_data['file_name']
        assert result['size_bytes'] == len(file_data['content'])
        mock_db_connection.execute.assert_called()

    @pytest.mark.asyncio
    async def test_create_file_validation_error(self, service):
        """Test file creation with validation errors"""
        generation_id = 'gen_123'
        invalid_file_data = {
            'file_name': '',  # Empty name should fail
            'content': 'test'
        }
        
        with pytest.raises(ValueError, match="File name is required"):
            await service.create_file(generation_id, invalid_file_data)

    @pytest.mark.asyncio
    async def test_get_file_by_id(self, service, mock_db_connection, sample_file_data):
        """Test retrieving file by ID"""
        file_id = 'file_123'
        mock_db_connection.fetchone.return_value = sample_file_data
        
        result = await service.get_file_by_id(file_id)
        
        assert result is not None
        assert result['id'] == file_id
        assert result['file_name'] == sample_file_data['file_name']

    @pytest.mark.asyncio
    async def test_get_file_by_id_not_found(self, service, mock_db_connection):
        """Test retrieving non-existent file"""
        file_id = 'nonexistent_file'
        mock_db_connection.fetchone.return_value = None
        
        result = await service.get_file_by_id(file_id)
        
        assert result is None

    @pytest.mark.asyncio
    async def test_get_files_by_generation(self, service, mock_db_connection, sample_files_list):
        """Test retrieving all files for a generation"""
        generation_id = 'gen_123'
        mock_db_connection.fetchall.return_value = sample_files_list
        
        result = await service.get_files_by_generation(generation_id)
        
        assert len(result) == 3
        assert result[0]['file_name'] == 'main.ino'
        assert result[1]['file_name'] == 'config.h'

    @pytest.mark.asyncio
    async def test_update_file_content(self, service, mock_db_connection, sample_file_data):
        """Test updating file content"""
        file_id = 'file_123'
        new_content = '// Updated Arduino code\nvoid setup() { /* updated */ }'
        
        # Mock existing file
        mock_db_connection.fetchone.return_value = sample_file_data
        
        result = await service.update_file_content(file_id, new_content)
        
        assert result is not None
        assert result['content'] == new_content
        assert result['size_bytes'] == len(new_content)
        mock_db_connection.execute.assert_called()

    @pytest.mark.asyncio
    async def test_delete_file(self, service, mock_db_connection):
        """Test file deletion"""
        file_id = 'file_123'
        
        result = await service.delete_file(file_id)
        
        assert result is True
        mock_db_connection.execute.assert_called()

    @pytest.mark.asyncio
    async def test_generate_zip_archive(self, service, sample_files_list):
        """Test ZIP archive generation"""
        generation_id = 'gen_123'
        
        with patch.object(service, 'get_files_by_generation', return_value=sample_files_list):
            zip_path = await service.generate_zip_archive(generation_id)
            
            assert zip_path is not None
            assert os.path.exists(zip_path)
            assert zip_path.endswith('.zip')
            
            # Verify ZIP contents
            with zipfile.ZipFile(zip_path, 'r') as zip_file:
                file_names = zip_file.namelist()
                assert 'src/main.ino' in file_names
                assert 'src/config.h' in file_names
                assert 'README.md' in file_names
            
            # Cleanup
            os.unlink(zip_path)

    @pytest.mark.asyncio
    async def test_generate_zip_with_readme(self, service, sample_files_list):
        """Test ZIP generation with auto-generated README"""
        generation_id = 'gen_123'
        
        with patch.object(service, 'get_files_by_generation', return_value=sample_files_list):
            zip_path = await service.generate_zip_archive(generation_id, include_readme=True)
            
            with zipfile.ZipFile(zip_path, 'r') as zip_file:
                file_names = zip_file.namelist()
                assert 'PROJECT_README.md' in file_names
                
                # Check README content
                readme_content = zip_file.read('PROJECT_README.md').decode('utf-8')
                assert 'Generated Code Project' in readme_content
                assert 'main.ino' in readme_content
            
            os.unlink(zip_path)

    def test_validate_file_content_valid(self, service):
        """Test file content validation with valid content"""
        valid_content = '// Valid Arduino code\nvoid setup() {}\nvoid loop() {}'
        file_type = 'ino'
        
        result = service.validate_file_content(valid_content, file_type)
        
        assert result['is_valid'] is True
        assert len(result['errors']) == 0

    def test_validate_file_content_invalid(self, service):
        """Test file content validation with invalid content"""
        invalid_content = 'invalid code with { unmatched braces'
        file_type = 'ino'
        
        result = service.validate_file_content(invalid_content, file_type)
        
        assert result['is_valid'] is False
        assert len(result['errors']) > 0

    def test_validate_file_size_valid(self, service):
        """Test file size validation with valid size"""
        content = 'Small file content'
        
        result = service._validate_file_size(content)
        
        assert result is True

    def test_validate_file_size_too_large(self, service):
        """Test file size validation with oversized content"""
        # Create content larger than max size
        large_content = 'x' * (service.max_file_size + 1)
        
        with pytest.raises(ValueError, match="File size exceeds maximum"):
            service._validate_file_size(large_content)

    def test_sanitize_filename(self, service):
        """Test filename sanitization"""
        dangerous_name = '../../../etc/passwd'
        safe_name = service._sanitize_filename(dangerous_name)
        
        assert safe_name == 'passwd'
        assert '..' not in safe_name
        assert '/' not in safe_name

    def test_get_file_extension(self, service):
        """Test file extension extraction"""
        assert service._get_file_extension('test.ino') == 'ino'
        assert service._get_file_extension('config.h') == 'h'
        assert service._get_file_extension('README.md') == 'md'
        assert service._get_file_extension('noextension') == ''

    def test_calculate_file_hash(self, service):
        """Test file content hash calculation"""
        content = 'test content for hashing'
        hash1 = service._calculate_file_hash(content)
        hash2 = service._calculate_file_hash(content)
        
        # Same content should produce same hash
        assert hash1 == hash2
        
        # Different content should produce different hash
        different_content = 'different content'
        hash3 = service._calculate_file_hash(different_content)
        assert hash1 != hash3

    @pytest.mark.asyncio
    async def test_track_file_modification(self, service, mock_db_connection):
        """Test file modification tracking"""
        file_id = 'file_123'
        user_id = 'user_123'
        old_content = 'original content'
        new_content = 'modified content'
        
        await service._track_file_modification(file_id, user_id, old_content, new_content)
        
        # Verify modification record was created
        mock_db_connection.execute.assert_called()

    @pytest.mark.asyncio
    async def test_get_file_modification_history(self, service, mock_db_connection):
        """Test retrieving file modification history"""
        file_id = 'file_123'
        mock_history = [
            {
                'id': 'mod_1',
                'user_id': 'user_123',
                'timestamp': datetime.now(timezone.utc),
                'change_description': 'Updated function',
                'content_hash': 'hash123'
            }
        ]
        
        mock_db_connection.fetchall.return_value = mock_history
        
        result = await service.get_file_modification_history(file_id)
        
        assert len(result) == 1
        assert result[0]['user_id'] == 'user_123'

    def test_generate_readme_content(self, service, sample_files_list):
        """Test README content generation"""
        project_name = 'Test Project'
        
        readme = service._generate_readme_content(sample_files_list, project_name)
        
        assert project_name in readme
        assert 'main.ino' in readme
        assert 'config.h' in readme
        assert 'Files' in readme
        assert 'Generated on:' in readme

    def test_detect_file_type_from_content(self, service):
        """Test file type detection from content"""
        arduino_content = 'void setup() {}\nvoid loop() {}'
        assert service._detect_file_type_from_content(arduino_content) == 'arduino'
        
        python_content = 'import os\nprint("Hello")'
        assert service._detect_file_type_from_content(python_content) == 'python'
        
        html_content = '<html><body>Hello</body></html>'
        assert service._detect_file_type_from_content(html_content) == 'html'

    @pytest.mark.asyncio
    async def test_batch_create_files(self, service, mock_db_connection):
        """Test batch file creation"""
        generation_id = 'gen_123'
        files_data = [
            {
                'file_name': 'file1.ino',
                'content': '// File 1',
                'file_type': 'ino'
            },
            {
                'file_name': 'file2.h',
                'content': '// File 2',
                'file_type': 'h'
            }
        ]
        
        mock_db_connection.lastrowid = 456
        
        results = await service.batch_create_files(generation_id, files_data)
        
        assert len(results) == 2
        assert all(result is not None for result in results)

    @pytest.mark.asyncio
    async def test_get_file_statistics(self, service, mock_db_connection):
        """Test file statistics retrieval"""
        generation_id = 'gen_123'
        mock_stats = {
            'total_files': 5,
            'total_size': 1024,
            'file_types': {'ino': 2, 'h': 2, 'md': 1},
            'main_files': 1
        }
        
        mock_db_connection.fetchone.return_value = mock_stats
        
        result = await service.get_file_statistics(generation_id)
        
        assert result['total_files'] == 5
        assert result['total_size'] == 1024

    def test_compress_file_content(self, service):
        """Test file content compression"""
        large_content = 'This is a test content that should be compressed. ' * 100
        
        compressed = service._compress_content(large_content)
        decompressed = service._decompress_content(compressed)
        
        assert len(compressed) < len(large_content)
        assert decompressed == large_content

    @pytest.mark.asyncio
    async def test_file_security_scan(self, service):
        """Test security scanning of file content"""
        safe_content = '// Safe Arduino code\nvoid setup() {}'
        unsafe_content = 'eval(user_input); // Dangerous code'
        
        safe_result = await service._security_scan_content(safe_content)
        unsafe_result = await service._security_scan_content(unsafe_content)
        
        assert safe_result['is_safe'] is True
        assert unsafe_result['is_safe'] is False
        assert len(unsafe_result['warnings']) > 0

    @pytest.mark.asyncio
    async def test_file_backup_and_restore(self, service, mock_db_connection, sample_file_data):
        """Test file backup and restore functionality"""
        file_id = 'file_123'
        
        # Mock existing file
        mock_db_connection.fetchone.return_value = sample_file_data
        
        # Create backup
        backup_id = await service.create_file_backup(file_id)
        assert backup_id is not None
        
        # Restore from backup
        result = await service.restore_file_from_backup(file_id, backup_id)
        assert result is True

    def test_file_path_validation(self, service):
        """Test file path validation and sanitization"""
        valid_paths = ['src/main.ino', 'lib/config.h', 'README.md']
        invalid_paths = ['../../../etc/passwd', '/absolute/path', 'path\\with\\backslashes']
        
        for path in valid_paths:
            assert service._validate_file_path(path) is True
        
        for path in invalid_paths:
            assert service._validate_file_path(path) is False

    @pytest.mark.asyncio
    async def test_concurrent_file_operations(self, service, mock_db_connection):
        """Test concurrent file operations"""
        import asyncio
        
        generation_id = 'gen_123'
        mock_db_connection.lastrowid = 456
        
        # Create multiple files concurrently
        tasks = []
        for i in range(5):
            file_data = {
                'file_name': f'file_{i}.ino',
                'content': f'// File {i} content',
                'file_type': 'ino'
            }
            tasks.append(service.create_file(generation_id, file_data))
        
        results = await asyncio.gather(*tasks)
        
        assert len(results) == 5
        assert all(result is not None for result in results)

    def test_memory_efficient_zip_creation(self, service, sample_files_list):
        """Test memory-efficient ZIP creation for large files"""
        # Mock large files
        large_files = []
        for i in range(10):
            large_files.append({
                'id': f'file_{i}',
                'file_name': f'large_file_{i}.txt',
                'file_path': f'large_file_{i}.txt',
                'content': 'x' * 10000,  # 10KB each
                'file_type': 'txt'
            })
        
        with patch.object(service, 'get_files_by_generation', return_value=large_files):
            zip_path = service._create_zip_streaming(large_files)
            
            assert os.path.exists(zip_path)
            assert os.path.getsize(zip_path) > 0
            
            os.unlink(zip_path)

    @pytest.mark.asyncio
    async def test_file_metadata_management(self, service, mock_db_connection):
        """Test file metadata creation and management"""
        file_id = 'file_123'
        metadata = {
            'download_count': 0,
            'last_accessed': datetime.now(timezone.utc),
            'tags': ['arduino', 'led'],
            'custom_properties': {'author': 'AI Generator'}
        }
        
        await service.create_file_metadata(file_id, metadata)
        
        mock_db_connection.execute.assert_called()

    def test_error_handling_invalid_zip(self, service):
        """Test error handling for invalid ZIP operations"""
        with pytest.raises(ValueError, match="No files provided"):
            service._create_zip_streaming([])

    @pytest.mark.asyncio
    async def test_cleanup_temporary_files(self, service):
        """Test cleanup of temporary files"""
        # Create some temporary files
        temp_files = []
        for i in range(3):
            temp_file = tempfile.NamedTemporaryFile(delete=False)
            temp_file.write(b'test content')
            temp_file.close()
            temp_files.append(temp_file.name)
        
        # Cleanup
        await service._cleanup_temporary_files(temp_files)
        
        # Verify files are deleted
        for temp_file in temp_files:
            assert not os.path.exists(temp_file)

    def test_file_type_specific_validation(self, service):
        """Test file type specific validation rules"""
        # Arduino file validation
        valid_arduino = 'void setup() {}\nvoid loop() {}'
        invalid_arduino = 'invalid arduino code'
        
        assert service._validate_arduino_syntax(valid_arduino) is True
        assert service._validate_arduino_syntax(invalid_arduino) is False
        
        # Python file validation
        valid_python = 'import os\nprint("hello")'
        invalid_python = 'invalid python syntax {'
        
        assert service._validate_python_syntax(valid_python) is True
        assert service._validate_python_syntax(invalid_python) is False


if __name__ == '__main__':
    pytest.main([__file__])