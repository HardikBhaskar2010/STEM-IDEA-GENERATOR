#!/usr/bin/env python3
"""
Simple integration test for the chat endpoint
Task: 4.1 Implement chat endpoint (POST /api/projects/{projectId}/guidance/chat)
"""

import requests
import json
import uuid
import time
import subprocess
import sys
import os
from threading import Thread


def start_server():
    """Start the FastAPI server in a subprocess"""
    try:
        # Start server
        process = subprocess.Popen([
            sys.executable, "-m", "uvicorn", "server:app", 
            "--host", "0.0.0.0", "--port", "8001"
        ], cwd=os.path.dirname(os.path.abspath(__file__)))
        
        # Wait for server to start
        time.sleep(3)
        
        return process
    except Exception as e:
        print(f"Failed to start server: {e}")
        return None


def test_chat_endpoint():
    """Test the chat endpoint with a real request"""
    base_url = "http://localhost:8001"
    
    # Generate test project ID
    project_id = str(uuid.uuid4())
    
    print(f"Testing chat endpoint with project ID: {project_id}")
    
    # Test 1: Basic chat request
    print("\n1. Testing basic chat request...")
    
    chat_request = {
        "message": "I need help with my IoT project. Can you guide me through the next steps?"
    }
    
    try:
        response = requests.post(
            f"{base_url}/api/projects/{project_id}/guidance/chat",
            json=chat_request,
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Chat endpoint working!")
            print(f"Response: {data.get('response', 'No response')[:100]}...")
            print(f"Session ID: {data.get('session_id', 'No session ID')}")
            print(f"Suggestions: {len(data.get('suggestions', []))} suggestions")
            print(f"Next Steps: {len(data.get('next_steps', []))} next steps")
            
            # Test 2: Follow-up message with session ID
            print("\n2. Testing follow-up message...")
            
            follow_up_request = {
                "message": "What sensors should I use for temperature monitoring?",
                "session_id": data.get('session_id')
            }
            
            follow_up_response = requests.post(
                f"{base_url}/api/projects/{project_id}/guidance/chat",
                json=follow_up_request,
                timeout=30
            )
            
            if follow_up_response.status_code == 200:
                follow_up_data = follow_up_response.json()
                print("✅ Follow-up message working!")
                print(f"Response: {follow_up_data.get('response', 'No response')[:100]}...")
            else:
                print(f"❌ Follow-up failed: {follow_up_response.status_code}")
                print(follow_up_response.text)
            
        else:
            print(f"❌ Chat endpoint failed: {response.status_code}")
            print(response.text)
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
    
    # Test 3: Context endpoint
    print("\n3. Testing context endpoint...")
    
    try:
        context_response = requests.get(
            f"{base_url}/api/projects/{project_id}/guidance/context",
            timeout=30
        )
        
        print(f"Context Status Code: {context_response.status_code}")
        
        if context_response.status_code == 200:
            context_data = context_response.json()
            print("✅ Context endpoint working!")
            print(f"Project Title: {context_data.get('project', {}).get('title', 'No title')}")
            print(f"Recommendations: {len(context_data.get('recommendations', []))} recommendations")
        elif context_response.status_code == 404:
            print("ℹ️ Project not found (expected for test project)")
        else:
            print(f"❌ Context endpoint failed: {context_response.status_code}")
            print(context_response.text)
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Context request failed: {e}")
    
    # Test 4: History endpoint
    print("\n4. Testing history endpoint...")
    
    try:
        history_response = requests.get(
            f"{base_url}/api/projects/{project_id}/guidance/history",
            timeout=30
        )
        
        print(f"History Status Code: {history_response.status_code}")
        
        if history_response.status_code == 200:
            history_data = history_response.json()
            print("✅ History endpoint working!")
            print(f"Messages: {len(history_data.get('messages', []))} messages")
        else:
            print(f"❌ History endpoint failed: {history_response.status_code}")
            print(history_response.text)
            
    except requests.exceptions.RequestException as e:
        print(f"❌ History request failed: {e}")
    
    # Test 5: Invalid project ID
    print("\n5. Testing invalid project ID...")
    
    try:
        invalid_response = requests.post(
            f"{base_url}/api/projects/invalid-uuid/guidance/chat",
            json=chat_request,
            timeout=30
        )
        
        if invalid_response.status_code == 400:
            print("✅ Invalid project ID validation working!")
        else:
            print(f"❌ Expected 400, got {invalid_response.status_code}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Invalid ID test failed: {e}")


def main():
    """Main test function"""
    print("Starting AI Guidance Chat Endpoint Integration Test")
    print("=" * 60)
    
    # Start server
    print("Starting server...")
    server_process = start_server()
    
    if not server_process:
        print("❌ Failed to start server")
        return
    
    try:
        # Wait a bit more for server to be ready
        print("Waiting for server to be ready...")
        time.sleep(2)
        
        # Check if server is responding
        try:
            health_response = requests.get("http://localhost:8001/api/health", timeout=5)
            if health_response.status_code == 200:
                print("✅ Server is ready!")
            else:
                print(f"⚠️ Server health check returned {health_response.status_code}")
        except:
            print("⚠️ Server health check failed, but continuing with tests...")
        
        # Run tests
        test_chat_endpoint()
        
    finally:
        # Clean up
        print("\nShutting down server...")
        server_process.terminate()
        server_process.wait()
        print("✅ Server shut down")
    
    print("\n" + "=" * 60)
    print("Integration test completed!")


if __name__ == "__main__":
    main()