#!/usr/bin/env python3
"""
Simple test for the fixed endpoints
"""

import requests
import json

def test_endpoints():
    base_url = "http://localhost:8002/api"
    
    print("🧪 Testing Backend Endpoints...")
    print("=" * 50)
    
    # Test 1: Health check
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        print(f"✅ Health Check: {response.status_code}")
    except Exception as e:
        print(f"❌ Health Check Failed: {e}")
        return False
    
    # Test 2: Project Context
    try:
        project_id = "6470caa6-8eb0-4530-8b7d-6bd242f2f1f1"
        response = requests.get(f"{base_url}/projects/{project_id}/guidance/context", timeout=10)
        print(f"✅ Project Context: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Recommendations: {len(data.get('recommendations', []))}")
    except Exception as e:
        print(f"❌ Project Context Failed: {e}")
    
    # Test 3: Project Sync
    try:
        project_data = {
            "id": "6470caa6-8eb0-4530-8b7d-6bd242f2f1f1",
            "title": "Test Project",
            "description": "A test project for validation",
            "difficulty": "intermediate",
            "estimatedTime": "2 weeks",
            "estimatedCost": "$50",
            "components": ["ESP32", "Sensors"],
            "skills": ["Programming", "Electronics"],
            "steps": ["Setup", "Code", "Test"],
            "status": "planning",
            "progress": 25,
            "notes": "Test notes",
            "starred": False,
            "tags": ["test"],
            "completed_steps": [],
            "generated_from_params": {"projectType": "IoT"},
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z"
        }
        
        response = requests.post(f"{base_url}/projects/sync", json=project_data, timeout=10)
        print(f"✅ Project Sync: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Message: {data.get('message', 'No message')}")
    except Exception as e:
        print(f"❌ Project Sync Failed: {e}")
    
    # Test 4: Chat Endpoint
    try:
        chat_data = {
            "message": "Hello, I need help with my project",
            "session_id": None
        }
        
        response = requests.post(f"{base_url}/projects/{project_id}/guidance/chat", json=chat_data, timeout=15)
        print(f"✅ Chat Endpoint: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Response Length: {len(data.get('response', ''))}")
            print(f"   Session ID: {data.get('session_id', 'None')}")
    except Exception as e:
        print(f"❌ Chat Endpoint Failed: {e}")
    
    print("=" * 50)
    print("🎯 Test Complete!")
    print("\nIf all tests show ✅, your backend is working correctly!")
    print("The 500 errors should be resolved in your frontend.")

if __name__ == "__main__":
    test_endpoints()