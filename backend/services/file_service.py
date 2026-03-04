# File Service
# Requirements: 3.2, 6.3, 13.5
# Task: 9.2 Enhance FileService with validation, BaseService inheritance, and caching

import logging
import hashlib
import re
import os
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from pathlib import Path

from backend.infrastructure.base_service import BaseService

logger = logging.getLogger(__name__)


class FileService(BaseService):
    """
    Enhanced file service with validation and caching.
    
    Provides:
    - File upload validation (type, size, content)
    - Secure file path validation
    - Caching for file metadata
    - BaseService inheritance for common functionality
    
    Requirements:
    - 3.2: Caching for file metadata
    - 6.3: Input sanitization and validation
    - 13.5: Secure file path validation
    """
    
    def __init__(self, cache=None, logger_instance=None, db_client=None):
        """Initialize the file service with BaseService capabilities"""
        super().__init__(
            cache=cache,
            logger_instance=logger_instance or logger,
            db_client=db_client
        )
        
        # File validation configuration
        self.max_file_size = 10 * 1024 * 1024  # 10MB
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
            'os.system',
            '<script>',  # XSS prevention
            'javascript:',
        ]
        
        # Path traversal patterns to block
        self.path_traversal_patterns = [
            r'\.\.',  # Parent directory
            r'~',     # Home directory
            r'/etc/', # System directories
            r'/var/',
            r'/usr/',
            r'/bin/',
            r'C:\\',  # Windows system paths
            r'\\\\',  # UNC paths
        ]
        
        # Cache TTL for file metadata
        self.metadata_cache_ttl = timedelta(minutes=30)
        
        self.logger.info("FileService initialized with enhanced validation")
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Service-specific health check.
        
        Returns:
            Dict with health status information
        """
        base_health = await self.base_health_check()
        
        base_health["service_specific"] = {
            "max_file_size_mb": self.max_file_size / (1024 * 1024),
            "allowed_extensions_count": sum(len(exts) for exts in self.allowed_extensions.values())
        }
        
        return base_health
    
    def validate_file_type(self, file_name: str) -> bool:
        """
        Validate file type based on extension.
        
        Args:
            file_name: Name of the file
            
        Returns:
            True if file type is allowed, False otherwise
            
        Requirements: 6.3
        """
        file_ext = Path(file_name).suffix.lower()
        
        # Check if extension is in allowed list
        for category, extensions in self.allowed_extensions.items():
            if file_ext in extensions:
                return True
        
        self.logger.warning(f"File type not allowed: {file_ext}")
        return False
    
    def validate_file_size(self, content: str) -> bool:
        """
        Validate file size.
        
        Args:
            content: File content
            
        Returns:
            True if size is within limits, False otherwise
            
        Requirements: 6.3
        """
        size_bytes = len(content.encode('utf-8'))
        
        if size_bytes > self.max_file_size:
            self.logger.warning(f"File size {size_bytes} exceeds limit {self.max_file_size}")
            return False
        
        return True
    
    def validate_file_path(self, file_path: str) -> bool:
        """
        Validate file path for security (prevent path traversal attacks).
        
        Args:
            file_path: File path to validate
            
        Returns:
            True if path is safe, False otherwise
            
        Requirements: 13.5
        """
        # Check for path traversal patterns
        for pattern in self.path_traversal_patterns:
            if re.search(pattern, file_path, re.IGNORECASE):
                self.logger.warning(f"Path traversal attempt detected: {file_path}")
                return False
        
        # Normalize path and check it doesn't escape
        try:
            normalized = os.path.normpath(file_path)
            
            # Path should not start with / or contain absolute path indicators
            if normalized.startswith('/') or normalized.startswith('\\'):
                self.logger.warning(f"Absolute path not allowed: {file_path}")
                return False
            
            # Check for drive letters (Windows)
            if len(normalized) > 1 and normalized[1] == ':':
                self.logger.warning(f"Drive letter not allowed: {file_path}")
                return False
            
        except Exception as e:
            self.logger.error(f"Path validation error: {e}")
            return False
        
        return True
    
    def validate_file_content(self, content: str, file_name: str = "", file_path: str = "") -> bool:
        """
        Validate file content for security and size limits.
        
        Args:
            content: File content to validate
            file_name: Optional file name for type validation
            file_path: Optional file path for path validation
            
        Returns:
            True if content is valid, False otherwise
            
        Requirements: 6.3, 13.5
        """
        try:
            # Validate file type if file_name provided
            if file_name and not self.validate_file_type(file_name):
                return False
            
            # Validate file path if provided
            if file_path and not self.validate_file_path(file_path):
                return False
            
            # Validate file size
            if not self.validate_file_size(content):
                return False
            
            # Check for blocked patterns (basic security)
            content_lower = content.lower()
            for pattern in self.blocked_patterns:
                if pattern in content_lower:
                    self.logger.warning(f"File content contains blocked pattern: {pattern}")
                    return False
            
            # Check for valid UTF-8 encoding
            try:
                content.encode('utf-8')
            except UnicodeEncodeError:
                self.logger.warning("File content contains invalid UTF-8 characters")
                return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error validating file content: {e}")
            return False
    
    async def get_file_metadata(self, file_id: str) -> Optional[Dict[str, Any]]:
        """
        Get file metadata with caching.
        
        Args:
            file_id: ID of the file
            
        Returns:
            File metadata or None if not found
            
        Requirements: 3.2
        """
        cache_key = f"file_metadata:{file_id}"
        
        async def fetch_metadata():
            # Placeholder for actual database fetch
            # In real implementation, this would query the database
            return {
                "file_id": file_id,
                "size": 0,
                "type": "unknown",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        
        return await self.get_cached_or_fetch(
            cache_key=cache_key,
            fetch_func=fetch_metadata,
            ttl=self.metadata_cache_ttl
        )
    
    async def invalidate_file_cache(self, file_id: str) -> int:
        """
        Invalidate cache for a specific file.
        
        Args:
            file_id: ID of the file
            
        Returns:
            Number of cache entries invalidated
        """
        return await self.invalidate_cache(f"file_metadata:{file_id}")
