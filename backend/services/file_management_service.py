# File Management Service
# Requirements: 3.1, 3.2
# Task: 2.2 Implement FileManagementService for CRUD operations

import logging
import zipfile
import io
import os
import hashlib
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, BinaryIO
from pathlib import Path

from database.connection import get_db_client
from services.code_generation_service import CodeFile

logger = logging.getLogger(__name__)


class FileOperation:
    """Represents a file operation for tracking"""
    def __init__(
        self,
        operation_type: str,
        file_id: str,
        user_id: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.operation_type = operation_type  # create, read, update, delete, download
        self.file_id = file_id
        self.user_id = user_id
        self.metadata = metadata or {}
        self.timestamp = datetime.now(timezone.utc)


class FileModification:
    """Represents a file modification for history tracking"""
    def __init__(
        self,
        user_id: str,
        original_content: str,
        new_content: str,
        change_description: Optional[str] = None
    ):
        self.user_id = user_id
        self.original_content = original_content
        self.new_content = new_content
        self.change_description = change_description
        self.timestamp = datetime.now(timezone.utc)
        self.content_hash = hashlib.sha256(new_content.encode()).hexdigest()


class FileManagementService:
    """
    Service for managing generated code files
    Handles CRUD operations, ZIP generation, and file tracking
    """
    
    def __init__(self):
        """Initialize the file management service"""
        self.max_file_size = 10 * 1024 * 1024  # 10MB max file size
        self.allowed_extensions = {
            'code': ['.js', '.ts', '.py', '.cpp', '.h', '.html', '.css', '.dart', '.java', '.c'],
            'config': ['.json', '.yaml', '.yml', '.ini', '.toml', '.xml'],
            'docs': ['.md', '.txt', '.rst'],
            'arduino': ['.ino'],
            'other': ['.gitignore', '.env.example']
        }
        
        # Security patterns to block
        self.blocked_patterns = [
            'eval(',
            'exec(',
            'system(',
            'shell_exec(',
            'passthru(',
            'file_get_contents(',
            '__import__',
            'subprocess.',
            'os.system'
        ]
    
    async def get_file(self, file_id: str, user_id: str) -> Optional[CodeFile]:
        """
        Get a file by ID with user authorization
        
        Args:
            file_id: ID of the file
            user_id: ID of the user requesting the file
            
        Returns:
            CodeFile object or None if not found/unauthorized
        """
        try:
            client = await get_db_client()
            
            # Get file with user authorization check
            result = client.table("code_files").select(
                "*, generated_code!inner(user_id)"
            ).eq("id", file_id).eq("generated_code.user_id", user_id).execute()
            
            if not result.data:
                logger.warning(f"File {file_id} not found or unauthorized for user {user_id}")
                return None
            
            file_data = result.data[0]
            
            # Track file access
            await self._track_file_operation("read", file_id, user_id)
            
            return CodeFile(
                file_path=file_data["file_path"],
                file_name=file_data["file_name"],
                file_type=file_data["file_type"],
                content=file_data["content"],
                description=file_data["description"],
                is_main_file=file_data["is_main_file"]
            )
            
        except Exception as e:
            logger.error(f"Error getting file {file_id}: {e}")
            return None
    
    async def update_file(
        self, 
        file_id: str, 
        new_content: str, 
        user_id: str,
        change_description: Optional[str] = None
    ) -> bool:
        """
        Update file content with modification tracking
        
        Args:
            file_id: ID of the file to update
            new_content: New file content
            user_id: ID of the user making the change
            change_description: Optional description of the change
            
        Returns:
            True if update successful, False otherwise
        """
        try:
            # Validate content
            if not self._validate_file_content(new_content):
                logger.warning(f"File content validation failed for file {file_id}")
                return False
            
            client = await get_db_client()
            
            # Get current file content for history
            current_file = await self.get_file(file_id, user_id)
            if not current_file:
                logger.error(f"File {file_id} not found or unauthorized")
                return False
            
            # Update file content
            update_data = {
                "content": new_content,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "size_bytes": len(new_content.encode('utf-8'))
            }
            
            result = client.table("code_files").update(update_data).eq("id", file_id).execute()
            
            if not result.data:
                logger.error(f"Failed to update file {file_id}")
                return False
            
            # Track modification in file_metadata
            await self._track_file_modification(
                file_id, user_id, current_file.content, new_content, change_description
            )
            
            # Track operation
            await self._track_file_operation("update", file_id, user_id, {
                "change_description": change_description,
                "content_length": len(new_content)
            })
            
            logger.info(f"Updated file {file_id} for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating file {file_id}: {e}")
            return False
    
    async def delete_file(self, file_id: str, user_id: str) -> bool:
        """
        Delete a file with user authorization
        
        Args:
            file_id: ID of the file to delete
            user_id: ID of the user requesting deletion
            
        Returns:
            True if deletion successful, False otherwise
        """
        try:
            client = await get_db_client()
            
            # Verify user authorization first
            file = await self.get_file(file_id, user_id)
            if not file:
                logger.error(f"File {file_id} not found or unauthorized for deletion")
                return False
            
            # Delete file (cascade will handle file_metadata)
            result = client.table("code_files").delete().eq("id", file_id).execute()
            
            if result.data:
                # Track operation
                await self._track_file_operation("delete", file_id, user_id)
                logger.info(f"Deleted file {file_id} for user {user_id}")
                return True
            else:
                logger.error(f"Failed to delete file {file_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error deleting file {file_id}: {e}")
            return False
    
    async def get_generation_files(self, generation_id: str, user_id: str) -> List[CodeFile]:
        """
        Get all files for a generation with user authorization
        
        Args:
            generation_id: ID of the generation
            user_id: ID of the user
            
        Returns:
            List of code files
        """
        try:
            client = await get_db_client()
            
            # Get files with user authorization check
            result = client.table("code_files").select(
                "*, generated_code!inner(user_id)"
            ).eq("generated_code_id", generation_id).eq("generated_code.user_id", user_id).execute()
            
            files = []
            if result.data:
                for file_data in result.data:
                    file = CodeFile(
                        file_path=file_data["file_path"],
                        file_name=file_data["file_name"],
                        file_type=file_data["file_type"],
                        content=file_data["content"],
                        description=file_data["description"],
                        is_main_file=file_data["is_main_file"]
                    )
                    files.append(file)
            
            logger.info(f"Retrieved {len(files)} files for generation {generation_id}")
            return files
            
        except Exception as e:
            logger.error(f"Error getting generation files: {e}")
            return []
    
    async def create_zip_archive(self, generation_id: str, user_id: str) -> Optional[bytes]:
        """
        Create ZIP archive of all files in a generation
        
        Args:
            generation_id: ID of the generation
            user_id: ID of the user
            
        Returns:
            ZIP file bytes or None if failed
        """
        try:
            # Get all files for the generation
            files = await self.get_generation_files(generation_id, user_id)
            
            if not files:
                logger.warning(f"No files found for generation {generation_id}")
                return None
            
            # Create ZIP in memory
            zip_buffer = io.BytesIO()
            
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                for file in files:
                    # Add file to ZIP with proper path structure
                    zip_file.writestr(file.file_path, file.content)
                
                # Add README if not already present
                if not any(f.file_name.lower().startswith('readme') for f in files):
                    readme_content = await self._generate_zip_readme(generation_id, files)
                    zip_file.writestr("README.md", readme_content)
            
            zip_bytes = zip_buffer.getvalue()
            
            # Track download operation
            await self._track_file_operation("download_zip", generation_id, user_id, {
                "file_count": len(files),
                "zip_size": len(zip_bytes)
            })
            
            logger.info(f"Created ZIP archive for generation {generation_id} ({len(zip_bytes)} bytes)")
            return zip_bytes
            
        except Exception as e:
            logger.error(f"Error creating ZIP archive: {e}")
            return None
    
    async def track_file_download(self, file_id: str, user_id: str) -> bool:
        """
        Track file download for analytics
        
        Args:
            file_id: ID of the downloaded file
            user_id: ID of the user
            
        Returns:
            True if tracking successful
        """
        try:
            client = await get_db_client()
            
            # Update file metadata download count
            result = client.table("file_metadata").select("*").eq("code_file_id", file_id).execute()
            
            if result.data:
                # Update existing metadata
                metadata = result.data[0]
                update_data = {
                    "download_count": metadata["download_count"] + 1,
                    "last_downloaded_at": datetime.now(timezone.utc).isoformat()
                }
                client.table("file_metadata").update(update_data).eq("id", metadata["id"]).execute()
            else:
                # Create new metadata record
                metadata_data = {
                    "code_file_id": file_id,
                    "download_count": 1,
                    "last_downloaded_at": datetime.now(timezone.utc).isoformat(),
                    "is_modified": False,
                    "modification_history": []
                }
                client.table("file_metadata").insert(metadata_data).execute()
            
            # Track operation
            await self._track_file_operation("download", file_id, user_id)
            
            return True
            
        except Exception as e:
            logger.error(f"Error tracking file download: {e}")
            return False
    
    async def get_file_metadata(self, file_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get file metadata including download count and modification history
        
        Args:
            file_id: ID of the file
            user_id: ID of the user
            
        Returns:
            File metadata or None if not found
        """
        try:
            # Verify user has access to the file
            file = await self.get_file(file_id, user_id)
            if not file:
                return None
            
            client = await get_db_client()
            
            result = client.table("file_metadata").select("*").eq("code_file_id", file_id).execute()
            
            if result.data:
                return result.data[0]
            else:
                # Return default metadata if none exists
                return {
                    "code_file_id": file_id,
                    "download_count": 0,
                    "last_downloaded_at": None,
                    "is_modified": False,
                    "modification_history": []
                }
                
        except Exception as e:
            logger.error(f"Error getting file metadata: {e}")
            return None
    
    async def get_modification_history(self, file_id: str, user_id: str) -> List[Dict[str, Any]]:
        """
        Get modification history for a file
        
        Args:
            file_id: ID of the file
            user_id: ID of the user
            
        Returns:
            List of modification records
        """
        try:
            metadata = await self.get_file_metadata(file_id, user_id)
            if not metadata:
                return []
            
            return metadata.get("modification_history", [])
            
        except Exception as e:
            logger.error(f"Error getting modification history: {e}")
            return []
    
    def _validate_file_content(self, content: str) -> bool:
        """
        Validate file content for security and size limits
        
        Args:
            content: File content to validate
            
        Returns:
            True if content is valid, False otherwise
        """
        try:
            # Check size limit
            if len(content.encode('utf-8')) > self.max_file_size:
                logger.warning("File content exceeds size limit")
                return False
            
            # Check for blocked patterns (basic security)
            content_lower = content.lower()
            for pattern in self.blocked_patterns:
                if pattern in content_lower:
                    logger.warning(f"File content contains blocked pattern: {pattern}")
                    return False
            
            # Check for valid UTF-8 encoding
            try:
                content.encode('utf-8')
            except UnicodeEncodeError:
                logger.warning("File content contains invalid UTF-8 characters")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating file content: {e}")
            return False
    
    async def _track_file_operation(
        self, 
        operation_type: str, 
        file_id: str, 
        user_id: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Track file operation for analytics
        
        Args:
            operation_type: Type of operation (read, update, delete, download, etc.)
            file_id: ID of the file
            user_id: ID of the user
            metadata: Optional operation metadata
        """
        try:
            client = await get_db_client()
            
            # Log to generation_history table
            history_data = {
                "user_id": user_id,
                "generated_code_id": None,  # Will be populated if needed
                "action": operation_type,
                "parameters": {
                    "file_id": file_id,
                    **(metadata or {})
                },
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            client.table("generation_history").insert(history_data).execute()
            
        except Exception as e:
            logger.error(f"Error tracking file operation: {e}")
    
    async def _track_file_modification(
        self,
        file_id: str,
        user_id: str,
        original_content: str,
        new_content: str,
        change_description: Optional[str] = None
    ) -> None:
        """
        Track file modification in metadata
        
        Args:
            file_id: ID of the file
            user_id: ID of the user
            original_content: Original file content
            new_content: New file content
            change_description: Optional description of changes
        """
        try:
            client = await get_db_client()
            
            # Get or create file metadata
            result = client.table("file_metadata").select("*").eq("code_file_id", file_id).execute()
            
            modification_record = {
                "user_id": user_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "change_description": change_description,
                "content_hash": hashlib.sha256(new_content.encode()).hexdigest(),
                "content_length": len(new_content)
            }
            
            if result.data:
                # Update existing metadata
                metadata = result.data[0]
                modification_history = metadata.get("modification_history", [])
                modification_history.append(modification_record)
                
                update_data = {
                    "is_modified": True,
                    "original_content": original_content if not metadata.get("is_modified") else metadata.get("original_content"),
                    "modification_history": modification_history
                }
                
                client.table("file_metadata").update(update_data).eq("id", metadata["id"]).execute()
            else:
                # Create new metadata record
                metadata_data = {
                    "code_file_id": file_id,
                    "download_count": 0,
                    "is_modified": True,
                    "original_content": original_content,
                    "modification_history": [modification_record]
                }
                
                client.table("file_metadata").insert(metadata_data).execute()
            
        except Exception as e:
            logger.error(f"Error tracking file modification: {e}")
    
    async def _generate_zip_readme(self, generation_id: str, files: List[CodeFile]) -> str:
        """
        Generate README content for ZIP archive
        
        Args:
            generation_id: ID of the generation
            files: List of files in the archive
            
        Returns:
            README content
        """
        try:
            client = await get_db_client()
            
            # Get generation details
            result = client.table("generated_code").select("*").eq("id", generation_id).execute()
            
            readme_lines = [
                "# Generated Code Project",
                "",
                f"Generated on: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC",
                f"Generation ID: {generation_id}",
                "",
                "## Files Included",
            ]
            
            for file in files:
                readme_lines.append(f"- `{file.file_name}` - {file.description or 'Generated file'}")
            
            if result.data:
                generation_data = result.data[0]
                platform = generation_data.get("platform", "unknown")
                
                readme_lines.extend([
                    "",
                    "## Project Details",
                    f"- Platform: {platform}",
                    f"- Status: {generation_data.get('status', 'unknown')}",
                    "",
                    "## Setup Instructions",
                ])
                
                # Add platform-specific instructions
                if platform == "arduino":
                    readme_lines.extend([
                        "1. Open the .ino file in Arduino IDE",
                        "2. Connect your Arduino board",
                        "3. Upload the code to your board"
                    ])
                elif platform == "web":
                    readme_lines.extend([
                        "1. Open index.html in a web browser",
                        "2. Or serve files using a local web server"
                    ])
                elif platform == "raspberry_pi":
                    readme_lines.extend([
                        "1. Copy files to your Raspberry Pi",
                        "2. Install dependencies if needed",
                        "3. Run the main Python script"
                    ])
                elif platform == "mobile":
                    readme_lines.extend([
                        "1. Ensure Flutter is installed",
                        "2. Run 'flutter pub get'",
                        "3. Run 'flutter run' to start the app"
                    ])
            
            readme_lines.extend([
                "",
                "## Notes",
                "This project was generated using AI assistance.",
                "Please review and test the code before production use."
            ])
            
            return "\n".join(readme_lines)
            
        except Exception as e:
            logger.error(f"Error generating ZIP README: {e}")
            return "# Generated Code Project\n\nThis archive contains AI-generated code files."
    
    async def cleanup_old_files(self, days_old: int = 30) -> int:
        """
        Clean up old generated files (for maintenance)
        
        Args:
            days_old: Number of days after which to consider files old
            
        Returns:
            Number of files cleaned up
        """
        try:
            # This would be implemented based on your cleanup policy
            # For now, just return 0 as a placeholder
            logger.info(f"Cleanup would remove files older than {days_old} days")
            return 0
            
        except Exception as e:
            logger.error(f"Error during file cleanup: {e}")
            return 0
    
    async def get_user_file_stats(self, user_id: str) -> Dict[str, Any]:
        """
        Get file statistics for a user
        
        Args:
            user_id: ID of the user
            
        Returns:
            Dictionary with file statistics
        """
        try:
            client = await get_db_client()
            
            # Get user's generated code records
            result = client.table("generated_code").select(
                "id, created_at, platform, status"
            ).eq("user_id", user_id).execute()
            
            if not result.data:
                return {
                    "total_generations": 0,
                    "total_files": 0,
                    "total_downloads": 0,
                    "platforms_used": [],
                    "recent_activity": []
                }
            
            generation_ids = [gen["id"] for gen in result.data]
            
            # Get file counts
            file_result = client.table("code_files").select(
                "id, file_type, size_bytes"
            ).in_("generated_code_id", generation_ids).execute()
            
            # Get download counts
            download_result = client.table("file_metadata").select(
                "download_count"
            ).in_("code_file_id", [f["id"] for f in file_result.data]).execute()
            
            total_downloads = sum(meta.get("download_count", 0) for meta in download_result.data)
            platforms_used = list(set(gen["platform"] for gen in result.data))
            
            stats = {
                "total_generations": len(result.data),
                "total_files": len(file_result.data),
                "total_downloads": total_downloads,
                "platforms_used": platforms_used,
                "file_types": {},
                "total_size_bytes": sum(f.get("size_bytes", 0) for f in file_result.data)
            }
            
            # Count file types
            for file in file_result.data:
                file_type = file.get("file_type", "unknown")
                stats["file_types"][file_type] = stats["file_types"].get(file_type, 0) + 1
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting user file stats: {e}")
            return {"error": str(e)}