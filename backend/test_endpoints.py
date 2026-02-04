#!/usr/bin/env python3
"""
Test the actual server endpoints
"""

import os
import sys
import asyncio
import logging
import json
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_chat_endpoint():
    """Test the chat endpoint directly"""
    try:
        logger.info("Testing chat endpoint...")
        
        # Test data
        project_id = "87dbf13d-f202-4f9e-b8fd-f6a826c82c99"
        chat_request = {
            "message": "Hello, I need help with my project",
            "session_id": None
        }
        
        # Make request to local server (assuming it's running)
        url = f"http://localhost:8001/api/projects/{project_id}/guidance/chat"
        
        response = requests.post(
            url,
            json=chat_request,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        logger.info(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            logger.info("✅ Chat endpoint working!")
            logger.info(f"Response: {data['response'][:100]}...")
            logger.info(f"Session ID: {data['session_id']}")
            logger.info(f"Suggestions: {len(data.get('suggestions', []))}")
            return True
        else:
            logger.error(f"❌ Chat endpoint failed: {response.status_code}")
            logger.error(f"Response: {response.text}")
            return False
        
    except requests.exceptions.ConnectionError:
        logger.error("❌ Could not connect to server. Is it running on localhost:8001?")
        logger.info("To start the server, run: uvicorn server:app --host 0.0.0.0 --port 8001")
        return False
    except Exception as e:
        logger.error(f"❌ Chat endpoint test failed: {e}")
        return False

def test_project_sync_endpoint():
    """Test the project sync endpoint"""
    try:
        logger.info("Testing project sync endpoint...")
        
        # Test project data
        project_data = {
            "id": "87dbf13d-f202-4f9e-b8fd-f6a826c82c99",
            "title": "IoT Temperature Monitor",
            "description": "A smart temperature monitoring system using sensors and WiFi",
            "difficulty": "intermediate",
            "estimatedTime": "2-3 weeks",
            "estimatedCost": "$50-100",
            "components": ["ESP32", "DHT22 sensor", "WiFi module"],
            "skills": ["Arduino programming", "IoT", "Sensors"],
            "steps": ["Setup hardware", "Program microcontroller", "Test system"],
            "status": "planning",
            "progress": 10,
            "notes": "Initial planning phase",
            "starred": False,
            "tags": ["IoT", "sensors", "monitoring"],
            "completed_steps": [],
            "generated_from_params": {"projectType": "IoT"},
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z"
        }
        
        url = "http://localhost:8001/api/projects/sync"
        
        response = requests.post(
            url,
            json=project_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        logger.info(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            logger.info("✅ Project sync endpoint working!")
            logger.info(f"Success: {data['success']}")
            logger.info(f"Message: {data['message']}")
            return True
        else:
            logger.error(f"❌ Project sync endpoint failed: {response.status_code}")
            logger.error(f"Response: {response.text}")
            return False
        
    except requests.exceptions.ConnectionError:
        logger.error("❌ Could not connect to server. Is it running on localhost:8001?")
        return False
    except Exception as e:
        logger.error(f"❌ Project sync endpoint test failed: {e}")
        return False

def main():
    """Main test function"""
    logger.info("Testing server endpoints...")
    logger.info("Make sure the server is running: uvicorn server:app --host 0.0.0.0 --port 8001")
    
    # Test endpoints
    chat_ok = test_chat_endpoint()
    sync_ok = test_project_sync_endpoint()
    
    if chat_ok and sync_ok:
        logger.info("✅ All endpoint tests passed!")
        logger.info("The server is working correctly with localStorage-compatible endpoints")
        return True
    else:
        logger.error("❌ Some endpoint tests failed!")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)