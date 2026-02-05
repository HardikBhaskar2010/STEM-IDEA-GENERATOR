# Unit Tests for Database Functions and Triggers
# Requirements: Test database functions and triggers that were created
# Task: Test the database functions and triggers (update timestamps, project stats, generation logging)

import pytest
import asyncio
import uuid
import json
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from typing import List, Dict, Any, Optional

from backend.database.connection import get_db_client
from supabase import Client


class TestUpdateTimestampTrigger:
    """Test suite for update_file_updated_at trigger on code_files table"""
    
    @pytest.fixture
    async def db_client(self):
        """Get database client for testing"""
        return await get_db_client()
    
    @pytest.fixture
    def sample_file_data(self):
        """Sample code file data for testing"""
        return {
            "id": str(uuid.uuid4()),
            "generated_code_id": str(uuid.uuid4()),
            "file_path": "src/main.cpp",
            "file_name": "main.cpp",
            "file_type": "cpp",
            "content": "Original content",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    
    @pytest.mark.asyncio
    async def test_updated_at_trigger_on_content_change(self, db_client, sample_file_data):
        """Test that updated_at is automatically updated when content changes"""
        file_id = sample_file_data["id"]
        original_updated_at = sample_file_data["updated_at"]
        
        # Simulate a delay to ensure timestamp difference
        new_updated_at = (datetime.now(timezone.utc) + timedelta(seconds=1)).isoformat()
        
        # Mock 