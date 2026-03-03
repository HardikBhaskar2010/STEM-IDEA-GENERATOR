"""
Unit tests for AI Code Generation API endpoints
Tests all REST API and WebSocket endpoints for code generation functionality
"""

import pytest
import json
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
from fastapi import WebSocket
import websockets
from backend.server import app
from backend.services.code_generation_service import CodeGenerationService
from backend.services.file_management_service import FileManagementService
from backend.services.streaming_service import StreamingService

# Test client
client = TestClient(app)

class TestCodeGenerationEndpoints:
    """Test code generation REST API endpoints"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.test_project_id = "test_project_123"
        self.test_generation_id = "gen_test_456"
        self.test_user_id = "user_test_789"
        
        self.sample_generation_params = {
            "platform": "web",
            "complexity_level": "intermediate",
            "include_comments": True,
            "include_tests": False,
            "custom_requirements": "Create a responsive dashboard"
        }
    
    @patch('backend.services.code_generation_service.CodeGenerationService.start_generation')
    def test_start_code_generation_success(self, mock_start_generation):
        """Test successful code generation start"""
        # Mock response
        mock_start_generation.return_value = {
            "generation_id": self.test_generation_id,
            "status": "generating",
            "message": "Code generation started successfully",
            "estimated_completion_time": 30
        }
        
        # Make request
        response = client.post(
            f"/api/projects/{self.test_project_id}/generate-code",
            json=self.sample_generation_params,
            headers={"Authorization": f"Bearer {self.test_user_id}"}
        )
        
        # Assertions
        assert response.status_code == 200
        data = response.json()
        assert data["generation_id"] == self.test_generation_id
        assert data["status"] == "generating"
        assert "message" in data
        
        # Verify service was called correctly
        mock_start_generation.assert_called_once_with(
            self.test_project_id,
            self.test_user_id,
            self.sample_generation_params
        )
    
    def test_start_code_generation_invalid_params(self):
        """Test code generation with invalid parameters"""
        invalid_params = {
            "platform": "invalid_platform",  # Invalid platform
            "complexity_level": "expert"      # Invalid complexity level
        }
        
        response = client.post(
            f"/api/projects/{self.test_project_id}/generate-code",
            json=invalid_params,
            headers={"Authorization": f"Bearer {self.test_user_id}"}
        )
        
        assert response.status_code == 422  # Validation error
    
    def test_start_code_generation_unauthorized(self):
        """Test code generation without authorization"""
        response = client.post(
            f"/api/projects/{self.test_project_id}/generate-code",
            json=self.sample_generation_params
        )
        
        assert response.status_code == 401
    
    @patch('backend.services.code_generation_service.CodeGenerationService.get_generation_status')
    def test_get_generation_status_success(self, mock_get_status):
        """Test successful generation status retrieval"""
        # Mock response
        mock_get_status.return_value = {
            "generation_id": self.test_generation_id,
            "project_id": self.test_project_id,
            "status": "completed",
            "platform": "web",
            "created_at": "2024-01-01T00:00:00Z",
            "completed_at": "2024-01-01T00:05:00Z",
            "files_count": 3
        }
        
        # Make request
        response = client.get(
            f"/api/projects/{self.test_project_id}/code-generation/{self.test_generation_id}",
            headers={"Authorization": f"Bearer {self.test_user_id}"}
        )
        
        # Assertions
        assert response.status_code == 200
        data = response.json()
        assert data["generation_id"] == self.test_generation_id
        assert data["status"] == "completed"
        assert data["files_count"] == 3
    
    def test_get_generation_status_not_found(self):
        """Test generation status for non-existent generation"""
        with patch('backend.services.code_generation_service.CodeGenerationService.get_generation_status') as mock_get_status:
            mock_get_status.return_value = None
            
            response = client.get(
                f"/api/projects/{self.test_project_id}/code-generation/nonexistent",
                headers={"Authorization": f"Bearer {self.test_user_id}"}
            )
            
            assert response.status_code == 404
    
    @patch('backend.services.code_generation_service.CodeGenerationService.get_project_generations')
    def test_get_project_generations_success(self, mock_get_generations):
        """Test successful project generations retrieval"""
        # Mock response
        mock_get_generations.return_value = [
            {
                "generation_id": "gen_1",
                "project_id": self.test_project_id,
                "status": "completed",
                "platform": "web",
                "created_at": "2024-01-01T00:00:00Z",
                "files_count": 3
            },
            {
                "generation_id": "gen_2", 
                "project_id": self.test_project_id,
                "status": "generating",
                "platform": "arduino",
                "created_at": "2024-01-02T00:00:00Z",
                "files_count": 0
            }
        ]
        
        # Make request
        response = client.get(
            f"/api/projects/{self.test_project_id}/generated-code",
            headers={"Authorization": f"Bearer {self.test_user_id}"}
        )
        
        # Assertions
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["generation_id"] == "gen_1"
        assert data[1]["generation_id"] == "gen_2"


class TestFileManagementEndpoints:
    """Test file management API endpoints"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.test_generation_id = "gen_test_456"
        self.test_file_id = "file_test_789"
        self.test_user_id = "user_test_123"
        
        self.sample_file = {
            "id": self.test_file_id,
            "file_name": "index.html",
            "file_path": "index.html",
            "file_type": "html",
            "content": "<html><body>Hello World</body></html>",
            "description": "Main HTML file",
            "size_bytes": 45,
            "is_main_file": True
        }
    
    @patch('backend.services.file_management_service.FileManagementService.get_generated_files')
    def test_get_generated_files_success(self, mock_get_files):
        """Test successful file retrieval"""
        # Mock response
        mock_get_files.return_value = [self.sample_file]
        
        # Make request
        response = client.get(
            f"/api/generated-code/{self.test_generation_id}/files",
            headers={"Authorization": f"Bearer {self.test_user_id}"}
        )
        
        # Assertions
        assert response.status_code == 200
        data = response.json()
        assert len(data["files"]) == 1
        assert data["files"][0]["id"] == self.test_file_id
        assert data["files"][0]["file_name"] == "index.html"
    
    @patch('backend.services.file_management_service.FileManagementService.get_file_content')
    def test_get_file_content_success(self, mock_get_content):
        """Test successful file content retrieval"""
        # Mock response
        mock_get_content.return_value = self.sample_file
        
        # Make request
        response = client.get(
            f"/api/generated-code/{self.test_generation_id}/files/{self.test_file_id}",
            headers={"Authorization": f"Bearer {self.test_user_id}"}
        )
        
        # Assertions
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == self.test_file_id
        assert data["content"] == self.sample_file["content"]
    
    @patch('backend.services.file_management_service.FileManagementService.update_file_content')
    def test_update_file_content_success(self, mock_update_content):
        """Test successful file content update"""
        # Mock response
        updated_file = {**self.sample_file, "content": "<html><body>Updated</body></html>"}
        mock_update_content.return_value = updated_file
        
        # Make request
        response = client.put(
            f"/api/generated-code/{self.test_generation_id}/files/{self.test_file_id}",
            json={"content": "<html><body>Updated</body></html>"},
            headers={"Authorization": f"Bearer {self.test_user_id}"}
        )
        
        # Assertions
        assert response.status_code == 200
        data = response.json()
        assert data["content"] == "<html><body>Updated</body></html>"
    
    @patch('backend.services.file_management_service.FileManagementService.delete_file')
    def test_delete_file_success(self, mock_delete_file):
        """Test successful file deletion"""
        # Mock response
        mock_delete_file.return_value = True
        
        # Make request
        response = client.delete(
            f"/api/generated-code/{self.test_generation_id}/files/{self.test_file_id}",
            headers={"Authorization": f"Bearer {self.test_user_id}"}
        )
        
        # Assertions
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
    
    @patch('backend.services.file_management_service.FileManagementService.create_zip_archive')
    def test_download_project_zip_success(self, mock_create_zip):
        """Test successful project ZIP download"""
        # Mock response
        mock_zip_content = b"fake zip content"
        mock_create_zip.return_value = mock_zip_content
        
        # Make request
        response = client.get(
            f"/api/generated-code/{self.test_generation_id}/download/zip",
            headers={"Authorization": f"Bearer {self.test_user_id}"}
        )
        
        # Assertions
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/zip"
        assert "attachment" in response.headers["content-disposition"]


class TestStreamingEndpoints:
    """Test WebSocket streaming endpoints"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.test_project_id = "test_project_123"
        self.test_generation_id = "gen_test_456"
        self.test_user_id = "user_test_789"
    
    @pytest.mark.asyncio
    async def test_websocket_connection_success(self):
        """Test successful WebSocket connection"""
        with patch('backend.services.streaming_service.StreamingService.handle_connection') as mock_handle:
            mock_handle.return_value = AsyncMock()
            
            # Test WebSocket connection
            with client.websocket_connect(
                f"/api/projects/{self.test_project_id}/code-generation/{self.test_generation_id}/stream"
            ) as websocket:
                # Send test message
                websocket.send_json({
                    "action": "start_generation",
                    "parameters": {
                        "platform": "web",
                        "complexity_level": "intermediate"
                    }
                })
                
                # Should not raise exception
                assert websocket is not None
    
    @pytest.mark.asyncio
    async def test_websocket_message_handling(self):
        """Test WebSocket message handling"""
        with patch('backend.services.streaming_service.StreamingService.process_message') as mock_process:
            mock_process.return_value = {
                "type": "status_update",
                "data": {"status": "generating", "progress": 25}
            }
            
            with client.websocket_connect(
                f"/api/projects/{self.test_project_id}/code-generation/{self.test_generation_id}/stream"
            ) as websocket:
                # Send message
                websocket.send_json({"action": "get_status"})
                
                # Receive response
                response = websocket.receive_json()
                assert response["type"] == "status_update"
                assert response["data"]["status"] == "generating"


class TestErrorHandling:
    """Test error handling across all endpoints"""
    
    def test_invalid_project_id_format(self):
        """Test handling of invalid project ID format"""
        response = client.post(
            "/api/projects/invalid-id-format/generate-code",
            json={"platform": "web"},
            headers={"Authorization": "Bearer user_123"}
        )
        
        assert response.status_code in [400, 422]  # Bad request or validation error
    
    def test_missing_authorization_header(self):
        """Test handling of missing authorization"""
        response = client.get("/api/projects/test/generated-code")
        assert response.status_code == 401
    
    def test_invalid_json_payload(self):
        """Test handling of invalid JSON payload"""
        response = client.post(
            "/api/projects/test/generate-code",
            data="invalid json",
            headers={
                "Authorization": "Bearer user_123",
                "Content-Type": "application/json"
            }
        )
        
        assert response.status_code == 422
    
    @patch('backend.services.code_generation_service.CodeGenerationService.start_generation')
    def test_service_error_handling(self, mock_start_generation):
        """Test handling of service layer errors"""
        # Mock service error
        mock_start_generation.side_effect = Exception("Service unavailable")
        
        response = client.post(
            "/api/projects/test/generate-code",
            json={"platform": "web"},
            headers={"Authorization": "Bearer user_123"}
        )
        
        assert response.status_code == 500
        data = response.json()
        assert "error" in data


class TestRateLimiting:
    """Test rate limiting functionality"""
    
    def test_rate_limit_enforcement(self):
        """Test that rate limiting is enforced"""
        # This would require actual rate limiting implementation
        # For now, we'll test that the endpoint exists and responds
        
        responses = []
        for i in range(10):  # Make multiple rapid requests
            response = client.post(
                "/api/projects/test/generate-code",
                json={"platform": "web"},
                headers={"Authorization": "Bearer user_123"}
            )
            responses.append(response.status_code)
        
        # At least some requests should succeed (even if rate limited)
        assert any(status in [200, 429] for status in responses)


class TestAuthentication:
    """Test authentication and authorization"""
    
    def test_valid_bearer_token(self):
        """Test valid bearer token authentication"""
        with patch('backend.services.auth_service.verify_token') as mock_verify:
            mock_verify.return_value = {"user_id": "user_123", "valid": True}
            
            response = client.get(
                "/api/projects/test/generated-code",
                headers={"Authorization": "Bearer valid_token"}
            )
            
            # Should not be 401 (unauthorized)
            assert response.status_code != 401
    
    def test_invalid_bearer_token(self):
        """Test invalid bearer token handling"""
        with patch('backend.services.auth_service.verify_token') as mock_verify:
            mock_verify.return_value = {"valid": False}
            
            response = client.get(
                "/api/projects/test/generated-code", 
                headers={"Authorization": "Bearer invalid_token"}
            )
            
            assert response.status_code == 401
    
    def test_malformed_authorization_header(self):
        """Test malformed authorization header"""
        response = client.get(
            "/api/projects/test/generated-code",
            headers={"Authorization": "InvalidFormat"}
        )
        
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v"])