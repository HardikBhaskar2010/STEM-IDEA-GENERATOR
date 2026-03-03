"""
Unit tests for CodeGenerationService

Tests the core code generation functionality including:
- Anthropic Claude API integration
- Streaming code generation
- Project analysis and component extraction
- Error handling and retry logic
- Code validation and syntax checking
"""

import pytest
import asyncio
import json
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime, timezone
import tempfile
import os

from backend.services.code_generation_service import CodeGenerationService
from backend.database.connection import get_db_connection


class TestCodeGenerationService:
    """Test suite for CodeGenerationService"""

    @pytest.fixture
    def service(self):
        """Create a CodeGenerationService instance for testing"""
        return CodeGenerationService()

    @pytest.fixture
    def mock_db_connection(self):
        """Mock database connection"""
        with patch('backend.services.code_generation_service.get_db_connection') as mock_conn:
            mock_cursor = Mock()
            mock_conn.return_value.__enter__.return_value = mock_cursor
            yield mock_cursor

    @pytest.fixture
    def sample_project_data(self):
        """Sample project data for testing"""
        return {
            'id': 'test_project_123',
            'title': 'LED Blink Controller',
            'description': 'Simple Arduino LED controller',
            'difficulty': 'beginner',
            'components': ['Arduino Uno', 'LED', 'Resistor'],
            'skills': ['Arduino Programming', 'Basic Electronics']
        }

    @pytest.fixture
    def sample_generation_params(self):
        """Sample generation parameters"""
        return {
            'platform': 'arduino',
            'complexity_level': 'beginner',
            'include_comments': True,
            'include_tests': False,
            'custom_requirements': 'Make the LED blink every 500ms'
        }

    def test_service_initialization(self, service):
        """Test service initializes correctly"""
        assert service is not None
        assert hasattr(service, 'anthropic_client')
        assert hasattr(service, 'generation_cache')

    @patch('anthropic.Anthropic')
    def test_anthropic_client_initialization(self, mock_anthropic):
        """Test Anthropic client is initialized with correct API key"""
        service = CodeGenerationService()
        mock_anthropic.assert_called_once()

    @pytest.mark.asyncio
    async def test_start_generation_success(self, service, mock_db_connection, sample_project_data, sample_generation_params):
        """Test successful code generation start"""
        user_id = 'test_user_123'
        
        # Mock database responses
        mock_db_connection.fetchone.return_value = sample_project_data
        mock_db_connection.lastrowid = 456
        
        with patch.object(service, '_validate_generation_params', return_value=True), \
             patch.object(service, '_create_generation_record', return_value='gen_123'):
            
            result = await service.start_generation(
                user_id=user_id,
                project_id=sample_project_data['id'],
                params=sample_generation_params
            )
            
            assert result is not None
            assert 'generation_id' in result
            assert result['status'] == 'generating'

    @pytest.mark.asyncio
    async def test_start_generation_invalid_project(self, service, mock_db_connection, sample_generation_params):
        """Test generation fails with invalid project ID"""
        user_id = 'test_user_123'
        invalid_project_id = 'nonexistent_project'
        
        # Mock database to return None for invalid project
        mock_db_connection.fetchone.return_value = None
        
        with pytest.raises(ValueError, match="Project not found"):
            await service.start_generation(
                user_id=user_id,
                project_id=invalid_project_id,
                params=sample_generation_params
            )

    def test_validate_generation_params_valid(self, service, sample_generation_params):
        """Test parameter validation with valid params"""
        result = service._validate_generation_params(sample_generation_params)
        assert result is True

    def test_validate_generation_params_invalid_platform(self, service):
        """Test parameter validation with invalid platform"""
        invalid_params = {
            'platform': 'invalid_platform',
            'complexity_level': 'beginner'
        }
        
        with pytest.raises(ValueError, match="Invalid platform"):
            service._validate_generation_params(invalid_params)

    def test_validate_generation_params_missing_platform(self, service):
        """Test parameter validation with missing platform"""
        invalid_params = {
            'complexity_level': 'beginner'
        }
        
        with pytest.raises(ValueError, match="Platform is required"):
            service._validate_generation_params(invalid_params)

    @pytest.mark.asyncio
    async def test_generate_code_with_anthropic(self, service, sample_project_data, sample_generation_params):
        """Test code generation using Anthropic API"""
        mock_response = Mock()
        mock_response.content = [Mock(text="// Generated Arduino code\nvoid setup() {\n  // Setup code\n}\n\nvoid loop() {\n  // Main loop\n}")]
        
        with patch.object(service.anthropic_client.messages, 'create', return_value=mock_response):
            result = await service._generate_code_with_anthropic(
                project_data=sample_project_data,
                params=sample_generation_params
            )
            
            assert result is not None
            assert 'files' in result
            assert len(result['files']) > 0

    @pytest.mark.asyncio
    async def test_streaming_generation(self, service, sample_project_data, sample_generation_params):
        """Test streaming code generation"""
        generation_id = 'test_gen_123'
        
        # Mock the streaming response
        async def mock_stream():
            yield {'type': 'progress', 'data': {'stage': 'analyzing', 'progress': 25}}
            yield {'type': 'file_generated', 'data': {'file_name': 'main.ino', 'content': '// Test code'}}
            yield {'type': 'completion', 'data': {'status': 'completed'}}
        
        with patch.object(service, '_stream_generation', return_value=mock_stream()):
            events = []
            async for event in service.stream_generation(generation_id):
                events.append(event)
            
            assert len(events) == 3
            assert events[0]['type'] == 'progress'
            assert events[1]['type'] == 'file_generated'
            assert events[2]['type'] == 'completion'

    def test_extract_project_components(self, service, sample_project_data):
        """Test project component extraction"""
        components = service._extract_project_components(sample_project_data)
        
        assert 'components' in components
        assert 'skills' in components
        assert 'difficulty' in components
        assert components['components'] == sample_project_data['components']

    def test_generate_system_prompt(self, service, sample_project_data, sample_generation_params):
        """Test system prompt generation"""
        prompt = service._generate_system_prompt(sample_project_data, sample_generation_params)
        
        assert isinstance(prompt, str)
        assert len(prompt) > 0
        assert sample_generation_params['platform'] in prompt.lower()
        assert sample_project_data['title'] in prompt

    @pytest.mark.asyncio
    async def test_validate_generated_code(self, service):
        """Test code validation functionality"""
        valid_arduino_code = """
        void setup() {
            pinMode(13, OUTPUT);
        }
        
        void loop() {
            digitalWrite(13, HIGH);
            delay(1000);
            digitalWrite(13, LOW);
            delay(1000);
        }
        """
        
        result = await service._validate_generated_code(valid_arduino_code, 'arduino')
        assert result['is_valid'] is True
        assert len(result['errors']) == 0

    @pytest.mark.asyncio
    async def test_validate_generated_code_invalid(self, service):
        """Test code validation with invalid code"""
        invalid_code = "this is not valid code {"
        
        result = await service._validate_generated_code(invalid_code, 'arduino')
        assert result['is_valid'] is False
        assert len(result['errors']) > 0

    def test_parse_generated_files(self, service):
        """Test parsing of generated files from AI response"""
        ai_response = """
        Here are the generated files:
        
        **main.ino**
        ```cpp
        void setup() {
            // Setup code
        }
        void loop() {
            // Loop code
        }
        ```
        
        **README.md**
        ```markdown
        # Project README
        This is a test project.
        ```
        """
        
        files = service._parse_generated_files(ai_response)
        
        assert len(files) == 2
        assert files[0]['file_name'] == 'main.ino'
        assert files[1]['file_name'] == 'README.md'
        assert 'void setup()' in files[0]['content']

    @pytest.mark.asyncio
    async def test_error_handling_anthropic_failure(self, service, sample_project_data, sample_generation_params):
        """Test error handling when Anthropic API fails"""
        with patch.object(service.anthropic_client.messages, 'create', side_effect=Exception("API Error")):
            with pytest.raises(Exception, match="Code generation failed"):
                await service._generate_code_with_anthropic(
                    project_data=sample_project_data,
                    params=sample_generation_params
                )

    @pytest.mark.asyncio
    async def test_retry_logic(self, service, sample_project_data, sample_generation_params):
        """Test retry logic for failed API calls"""
        call_count = 0
        
        def mock_api_call(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise Exception("Temporary failure")
            return Mock(content=[Mock(text="Success after retries")])
        
        with patch.object(service.anthropic_client.messages, 'create', side_effect=mock_api_call):
            result = await service._generate_code_with_anthropic(
                project_data=sample_project_data,
                params=sample_generation_params
            )
            
            assert call_count == 3  # Should retry twice before success
            assert result is not None

    def test_cache_functionality(self, service, sample_project_data, sample_generation_params):
        """Test generation result caching"""
        cache_key = service._generate_cache_key(sample_project_data, sample_generation_params)
        test_result = {'files': [{'name': 'test.ino', 'content': 'test'}]}
        
        # Test cache set
        service._set_cache(cache_key, test_result)
        
        # Test cache get
        cached_result = service._get_cache(cache_key)
        assert cached_result == test_result

    def test_generate_cache_key(self, service, sample_project_data, sample_generation_params):
        """Test cache key generation"""
        key1 = service._generate_cache_key(sample_project_data, sample_generation_params)
        key2 = service._generate_cache_key(sample_project_data, sample_generation_params)
        
        # Same inputs should generate same key
        assert key1 == key2
        
        # Different inputs should generate different keys
        different_params = sample_generation_params.copy()
        different_params['platform'] = 'raspberry_pi'
        key3 = service._generate_cache_key(sample_project_data, different_params)
        assert key1 != key3

    @pytest.mark.asyncio
    async def test_get_generation_status(self, service, mock_db_connection):
        """Test getting generation status"""
        generation_id = 'test_gen_123'
        mock_status = {
            'id': generation_id,
            'status': 'completed',
            'progress': 100,
            'created_at': datetime.now(timezone.utc),
            'completed_at': datetime.now(timezone.utc)
        }
        
        mock_db_connection.fetchone.return_value = mock_status
        
        result = await service.get_generation_status(generation_id)
        
        assert result is not None
        assert result['status'] == 'completed'
        assert result['progress'] == 100

    @pytest.mark.asyncio
    async def test_cancel_generation(self, service, mock_db_connection):
        """Test generation cancellation"""
        generation_id = 'test_gen_123'
        
        result = await service.cancel_generation(generation_id)
        
        assert result is True
        # Verify database update was called
        mock_db_connection.execute.assert_called()

    def test_platform_specific_generation(self, service, sample_project_data):
        """Test platform-specific code generation"""
        # Test Arduino
        arduino_params = {'platform': 'arduino', 'complexity_level': 'beginner'}
        arduino_prompt = service._generate_system_prompt(sample_project_data, arduino_params)
        assert 'arduino' in arduino_prompt.lower()
        assert 'void setup()' in arduino_prompt or 'setup()' in arduino_prompt
        
        # Test Raspberry Pi
        rpi_params = {'platform': 'raspberry_pi', 'complexity_level': 'intermediate'}
        rpi_prompt = service._generate_system_prompt(sample_project_data, rpi_params)
        assert 'raspberry pi' in rpi_prompt.lower() or 'python' in rpi_prompt.lower()
        
        # Test Web
        web_params = {'platform': 'web', 'complexity_level': 'advanced'}
        web_prompt = service._generate_system_prompt(sample_project_data, web_params)
        assert any(tech in web_prompt.lower() for tech in ['html', 'css', 'javascript', 'web'])

    @pytest.mark.asyncio
    async def test_concurrent_generations(self, service, sample_project_data, sample_generation_params):
        """Test handling multiple concurrent generations"""
        user_id = 'test_user_123'
        
        with patch.object(service, '_create_generation_record', side_effect=['gen_1', 'gen_2', 'gen_3']), \
             patch.object(service, '_validate_generation_params', return_value=True), \
             patch('backend.services.code_generation_service.get_db_connection') as mock_conn:
            
            mock_cursor = Mock()
            mock_conn.return_value.__enter__.return_value = mock_cursor
            mock_cursor.fetchone.return_value = sample_project_data
            
            # Start multiple generations concurrently
            tasks = [
                service.start_generation(user_id, sample_project_data['id'], sample_generation_params)
                for _ in range(3)
            ]
            
            results = await asyncio.gather(*tasks)
            
            assert len(results) == 3
            assert all(result['status'] == 'generating' for result in results)
            assert len(set(result['generation_id'] for result in results)) == 3  # All unique IDs

    def test_memory_management(self, service):
        """Test memory management for large generations"""
        # Test that cache doesn't grow indefinitely
        initial_cache_size = len(service.generation_cache)
        
        # Add many items to cache
        for i in range(1000):
            service._set_cache(f'test_key_{i}', {'data': f'test_data_{i}'})
        
        # Cache should have a reasonable size limit
        assert len(service.generation_cache) <= 100  # Assuming max cache size of 100

    @pytest.mark.asyncio
    async def test_cleanup_resources(self, service):
        """Test proper cleanup of resources"""
        generation_id = 'test_gen_cleanup'
        
        # Start a generation
        with patch.object(service, '_create_generation_record', return_value=generation_id):
            # Simulate cleanup
            await service._cleanup_generation_resources(generation_id)
            
            # Verify resources are cleaned up
            assert generation_id not in service.active_generations

    def test_configuration_validation(self, service):
        """Test service configuration validation"""
        # Test that required environment variables are checked
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ValueError, match="ANTHROPIC_API_KEY"):
                CodeGenerationService()

    @pytest.mark.asyncio
    async def test_rate_limiting(self, service, sample_project_data, sample_generation_params):
        """Test rate limiting functionality"""
        user_id = 'test_user_rate_limit'
        
        with patch.object(service, '_check_rate_limit', return_value=False):
            with pytest.raises(Exception, match="Rate limit exceeded"):
                await service.start_generation(
                    user_id=user_id,
                    project_id=sample_project_data['id'],
                    params=sample_generation_params
                )

    def test_logging_functionality(self, service, caplog):
        """Test that appropriate logging occurs"""
        with caplog.at_level('INFO'):
            service._log_generation_event('test_gen_123', 'started', {'platform': 'arduino'})
            
        assert 'Generation started' in caplog.text
        assert 'test_gen_123' in caplog.text


if __name__ == '__main__':
    pytest.main([__file__])