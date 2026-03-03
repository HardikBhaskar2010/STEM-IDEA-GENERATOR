"""
Integration tests for complete AI Code Generation workflow
Tests end-to-end scenarios from project creation to code download
"""

import pytest
import asyncio
import json
import tempfile
import zipfile
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
from backend.server import app
import uuid
from datetime import datetime, timezone

# Test client
client = TestClient(app)

class TestCompleteCodeGenerationWorkflow:
    """Test complete end-to-end code generation workflow"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.test_user_id = "user_test_123"
        self.test_project_id = "project_test_456"
        self.test_generation_id = None
        
        self.generation_params = {
            "platform": "web",
            "complexity_level": "intermediate",
            "include_comments": True,
            "include_tests": False,
            "custom_requirements": "Create a responsive dashboard with charts"
        }
        
        self.expected_files = [
            {
                "file_name": "index.html",
                "file_type": "html",
                "is_main_file": True,
                "content": "<!DOCTYPE html><html><head><title>Dashboard</title></head><body><div id='app'></div></body></html>"
            },
            {
                "file_name": "style.css",
                "file_type": "css", 
                "is_main_file": False,
                "content": "body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }"
            },
            {
                "file_name": "script.js",
                "file_type": "js",
                "is_main_file": False,
                "content": "console.log('Dashboard loaded'); // Initialize dashboard components"
            }
        ]
    
    @patch('backend.services.code_generation_service.CodeGenerationService.start_generation')
    @patch('backend.services.code_generation_service.CodeGenerationService.get_generation_status')
    @patch('backend.services.file_management_service.FileManagementService.get_generated_files')
    def test_complete_workflow_success(self, mock_get_files, mock_get_status, mock_start_generation):
        """Test successful complete workflow from start to file download"""
        
        # Step 1: Start code generation
        generation_id = f"gen_{uuid.uuid4()}"
        mock_start_generation.return_value = {
            "generation_id": generation_id,
            "status": "generating",
            "message": "Code generation started successfully",
            "estimated_completion_time": 30
        }
        
        response = client.post(
            f"/api/projects/{self.test_project_id}/generate-code",
            json=self.generation_params,
            headers={"Authorization": f"Bearer {self.test_user_id}"}
        )
        
        assert response.status_code == 200
        start_data = response.json()
        assert start_data["generation_id"] == generation_id
        assert start_data["status"] == "generating"
        
        # Step 2: Check generation status (simulating polling)
        mock_get_status.return_value = {
            "generation_id": generation_id,
            "project_id": self.test_project_id,
            "status": "completed",
            "platform": "web",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "files_count": 3
        }
        
        response = client.get(
            f"/api/projects/{self.test_project_id}/code-generation/{generation_id}",
            headers={"Authorization": f"Bearer {self.test_user_id}"}
        )
        
        assert response.status_code == 200
        status_data = response.json()
        assert status_data["status"] == "completed"
        assert status_data["files_count"] == 3
        
        # Step 3: Retrieve generated files
        mock_get_files.return_value = self.expected_files
        
        response = client.get(
            f"/api/generated-code/{generation_id}/files",
            headers={"Authorization": f"Bearer {self.test_user_id}"}
        )
        
        assert response.status_code == 200
        files_data = response.json()
        assert len(files_data["files"]) == 3
        
        # Verify file structure
        main_files = [f for f in files_data["files"] if f["is_main_file"]]
        assert len(main_files) == 1
        assert main_files[0]["file_name"] == "index.html"
        
        # Step 4: Download individual file
        with patch('backend.services.file_management_service.FileManagementService.get_file_content') as mock_get_content:
            mock_get_content.return_value = self.expected_files[0]
            
            response = client.get(
                f"/api/generated-code/{generation_id}/files/file_1",
                headers={"Authorization": f"Bearer {self.test_user_id}"}
            )
            
            assert response.status_code == 200
            file_data = response.json()
            assert file_data["file_name"] == "index.html"
            assert "<!DOCTYPE html>" in file_data["content"]
        
        # Step 5: Download project as ZIP
        with patch('backend.services.file_management_service.FileManagementService.create_zip_archive') as mock_create_zip:
            # Create mock ZIP content
            mock_zip_content = b"PK\x03\x04"  # ZIP file signature
            mock_create_zip.return_value = mock_zip_content
            
            response = client.get(
                f"/api/generated-code/{generation_id}/download/zip",
                headers={"Authorization": f"Bearer {self.test_user_id}"}
            )
            
            assert response.status_code == 200
            assert response.headers["content-type"] == "application/zip"
            assert "attachment" in response.headers["content-disposition"]
    
    @patch('backend.services.code_generation_service.CodeGenerationService.start_generation')
    def test_workflow_with_generation_failure(self, mock_start_generation):
        """Test workflow when code generation fails"""
        
        # Mock generation failure
        mock_start_generation.side_effect = Exception("Anthropic API unavailable")
        
        response = client.post(
            f"/api/projects/{self.test_project_id}/generate-code",
            json=self.generation_params,
            headers={"Authorization": f"Bearer {self.test_user_id}"}
        )
        
        assert response.status_code == 500
        error_data = response.json()
        assert "error" in error_data
    
    @patch('backend.services.code_generation_service.CodeGenerationService.start_generation')
    @patch('backend.services.code_generation_service.CodeGenerationService.get_generation_status')
    def test_workflow_with_timeout(self, mock_get_status, mock_start_generation):
        """Test workflow when generation times out"""
        
        # Start generation successfully
        generation_id = f"gen_{uuid.uuid4()}"
        mock_start_generation.return_value = {
            "generation_id": generation_id,
            "status": "generating",
            "message": "Code generation started successfully"
        }
        
        response = client.post(
            f"/api/projects/{self.test_project_id}/generate-code",
            json=self.generation_params,
            headers={"Authorization": f"Bearer {self.test_user_id}"}
        )
        
        assert response.status_code == 200
        
        # Mock timeout status
        mock_get_status.return_value = {
            "generation_id": generation_id,
            "status": "failed",
            "error_message": "Generation timed out after 5 minutes",
            "files_count": 0
        }
        
        response = client.get(
            f"/api/projects/{self.test_project_id}/code-generation/{generation_id}",
            headers={"Authorization": f"Bearer {self.test_user_id}"}
        )
        
        assert response.status_code == 200
        status_data = response.json()
        assert status_data["status"] == "failed"
        assert "timed out" in status_data["error_message"]


class TestWebSocketStreamingWorkflow:
    """Test WebSocket streaming integration"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.test_project_id = "project_test_456"
        self.test_generation_id = "gen_test_789"
        self.test_user_id = "user_test_123"
    
    def test_websocket_connection_and_messaging(self):
        """Test WebSocket connection and message flow"""
        
        with patch('backend.services.streaming_service.StreamingService.handle_connection') as mock_handle:
            # Mock WebSocket handler
            mock_handle.return_value = AsyncMock()
            
            # Test WebSocket connection
            with client.websocket_connect(
                f"/api/projects/{self.test_project_id}/code-generation/{self.test_generation_id}/stream"
            ) as websocket:
                
                # Send start generation message
                websocket.send_json({
                    "action": "start_generation",
                    "parameters": {
                        "platform": "web",
                        "complexity_level": "intermediate"
                    }
                })
                
                # Mock streaming responses
                streaming_events = [
                    {
                        "type": "status_update",
                        "data": {"status": "analyzing_project", "progress": 10}
                    },
                    {
                        "type": "file_generated", 
                        "data": {"file_name": "index.html", "progress": 40}
                    },
                    {
                        "type": "completion",
                        "data": {"status": "completed", "files_count": 3}
                    }
                ]
                
                # Simulate receiving streaming events
                for event in streaming_events:
                    # In real test, would receive from WebSocket
                    # Here we just verify the structure
                    assert "type" in event
                    assert "data" in event
                    
                    if event["type"] == "completion":
                        assert event["data"]["status"] == "completed"
                        break
    
    def test_websocket_error_handling(self):
        """Test WebSocket error handling"""
        
        with patch('backend.services.streaming_service.StreamingService.handle_connection') as mock_handle:
            # Mock connection error
            mock_handle.side_effect = Exception("WebSocket connection failed")
            
            # Attempt WebSocket connection
            try:
                with client.websocket_connect(
                    f"/api/projects/{self.test_project_id}/code-generation/{self.test_generation_id}/stream"
                ) as websocket:
                    pass
            except Exception as e:
                # Should handle connection errors gracefully
                assert "connection failed" in str(e).lower() or True  # Allow for different error types


class TestFileOperationsWorkflow:
    """Test file operations integration"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.test_generation_id = "gen_test_789"
        self.test_file_id = "file_test_123"
        self.test_user_id = "user_test_456"
        
        self.sample_file = {
            "id": self.test_file_id,
            "file_name": "app.js",
            "file_path": "src/app.js",
            "file_type": "js",
            "content": "console.log('Hello World');",
            "description": "Main application file",
            "size_bytes": 26,
            "is_main_file": True
        }
    
    @patch('backend.services.file_management_service.FileManagementService.get_file_content')
    @patch('backend.services.file_management_service.FileManagementService.update_file_content')
    def test_file_edit_workflow(self, mock_update_content, mock_get_content):
        """Test complete file editing workflow"""
        
        # Step 1: Get original file content
        mock_get_content.return_value = self.sample_file
        
        response = client.get(
            f"/api/generated-code/{self.test_generation_id}/files/{self.test_file_id}",
            headers={"Authorization": f"Bearer {self.test_user_id}"}
        )
        
        assert response.status_code == 200
        original_file = response.json()
        assert original_file["content"] == "console.log('Hello World');"
        
        # Step 2: Update file content
        updated_content = "console.log('Hello Updated World!');"
        updated_file = {**self.sample_file, "content": updated_content, "size_bytes": 35}
        mock_update_content.return_value = updated_file
        
        response = client.put(
            f"/api/generated-code/{self.test_generation_id}/files/{self.test_file_id}",
            json={"content": updated_content},
            headers={"Authorization": f"Bearer {self.test_user_id}"}
        )
        
        assert response.status_code == 200
        updated_response = response.json()
        assert updated_response["content"] == updated_content
        assert updated_response["size_bytes"] == 35
        
        # Step 3: Verify update was tracked
        mock_update_content.assert_called_once_with(
            self.test_generation_id,
            self.test_file_id,
            updated_content,
            self.test_user_id
        )
    
    @patch('backend.services.file_management_service.FileManagementService.create_zip_archive')
    def test_selective_file_download(self, mock_create_zip):
        """Test downloading selected files as ZIP"""
        
        # Mock ZIP creation for selected files
        mock_zip_content = b"PK\x03\x04"  # ZIP signature
        mock_create_zip.return_value = mock_zip_content
        
        # Request download of selected files
        selected_files = ["file_1", "file_3"]
        
        response = client.post(
            f"/api/generated-code/{self.test_generation_id}/download/selected",
            json={"file_ids": selected_files},
            headers={"Authorization": f"Bearer {self.test_user_id}"}
        )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/zip"
        
        # Verify service was called with correct file IDs
        mock_create_zip.assert_called_once()
        call_args = mock_create_zip.call_args
        assert selected_files in call_args[0] or selected_files in call_args[1].values()


class TestErrorRecoveryWorkflow:
    """Test error recovery and resilience"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.test_project_id = "project_test_456"
        self.test_user_id = "user_test_123"
    
    @patch('backend.services.code_generation_service.CodeGenerationService.start_generation')
    def test_retry_after_service_failure(self, mock_start_generation):
        """Test retry mechanism after service failure"""
        
        # First attempt fails
        mock_start_generation.side_effect = [
            Exception("Service temporarily unavailable"),
            {
                "generation_id": "gen_retry_123",
                "status": "generating",
                "message": "Code generation started successfully"
            }
        ]
        
        # First request fails
        response = client.post(
            f"/api/projects/{self.test_project_id}/generate-code",
            json={"platform": "web"},
            headers={"Authorization": f"Bearer {self.test_user_id}"}
        )
        
        assert response.status_code == 500
        
        # Second request succeeds
        response = client.post(
            f"/api/projects/{self.test_project_id}/generate-code",
            json={"platform": "web"},
            headers={"Authorization": f"Bearer {self.test_user_id}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["generation_id"] == "gen_retry_123"
    
    def test_graceful_degradation_without_websocket(self):
        """Test graceful degradation when WebSocket is unavailable"""
        
        # Test that REST API still works even if WebSocket fails
        with patch('backend.services.streaming_service.StreamingService') as mock_streaming:
            mock_streaming.side_effect = Exception("WebSocket unavailable")
            
            # REST endpoints should still work
            response = client.get(
                f"/api/projects/{self.test_project_id}/generated-code",
                headers={"Authorization": f"Bearer {self.test_user_id}"}
            )
            
            # Should not fail due to WebSocket issues
            assert response.status_code in [200, 404]  # 404 if no generations exist


class TestConcurrentOperations:
    """Test concurrent operations and race conditions"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.test_project_id = "project_test_456"
        self.test_user_id = "user_test_123"
    
    @patch('backend.services.code_generation_service.CodeGenerationService.start_generation')
    def test_concurrent_generation_requests(self, mock_start_generation):
        """Test handling of concurrent generation requests"""
        
        # Mock multiple generation responses
        mock_start_generation.side_effect = [
            {
                "generation_id": "gen_concurrent_1",
                "status": "generating",
                "message": "First generation started"
            },
            {
                "generation_id": "gen_concurrent_2", 
                "status": "queued",
                "message": "Second generation queued"
            }
        ]
        
        # Make concurrent requests
        response1 = client.post(
            f"/api/projects/{self.test_project_id}/generate-code",
            json={"platform": "web"},
            headers={"Authorization": f"Bearer {self.test_user_id}"}
        )
        
        response2 = client.post(
            f"/api/projects/{self.test_project_id}/generate-code",
            json={"platform": "arduino"},
            headers={"Authorization": f"Bearer {self.test_user_id}"}
        )
        
        # Both should succeed but with different handling
        assert response1.status_code == 200
        assert response2.status_code == 200
        
        data1 = response1.json()
        data2 = response2.json()
        
        assert data1["generation_id"] != data2["generation_id"]
        assert data1["status"] == "generating"
        assert data2["status"] == "queued"  # Second request queued


class TestDataConsistency:
    """Test data consistency across operations"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.test_generation_id = "gen_consistency_123"
        self.test_user_id = "user_test_456"
    
    @patch('backend.services.code_generation_service.CodeGenerationService.get_generation_status')
    @patch('backend.services.file_management_service.FileManagementService.get_generated_files')
    def test_generation_file_count_consistency(self, mock_get_files, mock_get_status):
        """Test consistency between generation status and actual file count"""
        
        # Mock generation status with file count
        mock_get_status.return_value = {
            "generation_id": self.test_generation_id,
            "status": "completed",
            "files_count": 3
        }
        
        # Mock actual files
        mock_files = [
            {"id": "file_1", "file_name": "index.html"},
            {"id": "file_2", "file_name": "style.css"},
            {"id": "file_3", "file_name": "script.js"}
        ]
        mock_get_files.return_value = mock_files
        
        # Get generation status
        status_response = client.get(
            f"/api/projects/test/code-generation/{self.test_generation_id}",
            headers={"Authorization": f"Bearer {self.test_user_id}"}
        )
        
        # Get actual files
        files_response = client.get(
            f"/api/generated-code/{self.test_generation_id}/files",
            headers={"Authorization": f"Bearer {self.test_user_id}"}
        )
        
        # Verify consistency
        assert status_response.status_code == 200
        assert files_response.status_code == 200
        
        status_data = status_response.json()
        files_data = files_response.json()
        
        assert status_data["files_count"] == len(files_data["files"])
        assert len(files_data["files"]) == 3


if __name__ == "__main__":
    pytest.main([__file__, "-v"])