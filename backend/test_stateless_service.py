#!/usr/bin/env python3
"""
Test the stateless AI guidance service
"""

import os
import sys
import asyncio
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.stateless_ai_guidance_service import StatelessAIGuidanceService
from models.ai_guidance import ChatRequest

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_stateless_service():
    """Test the stateless AI guidance service"""
    try:
        logger.info("Testing Stateless AI Guidance Service...")
        
        # Initialize the service
        ai_service = StatelessAIGuidanceService()
        logger.info("✅ Stateless AI Guidance Service initialized successfully")
        
        # Test a simple chat request
        logger.info("Testing process_chat_request method...")
        
        test_project_id = "87dbf13d-f202-4f9e-b8fd-f6a826c82c99"
        
        chat_request = ChatRequest(
            message="Hello, I need help with my IoT temperature monitoring project",
            session_id=None
        )
        
        # This should work without database dependencies
        response = await ai_service.process_chat_request(
            project_id=test_project_id,
            request=chat_request
        )
        
        logger.info("✅ Chat request processed successfully")
        logger.info(f"Response: {response.response[:100]}...")
        logger.info(f"Session ID: {response.session_id}")
        logger.info(f"Suggestions: {len(response.suggestions)}")
        logger.info(f"Next Steps: {len(response.next_steps)}")
        
        # Test another message
        chat_request2 = ChatRequest(
            message="What sensors should I use for temperature monitoring?",
            session_id=response.session_id
        )
        
        response2 = await ai_service.process_chat_request(
            project_id=test_project_id,
            request=chat_request2
        )
        
        logger.info("✅ Second chat request processed successfully")
        logger.info(f"Response 2: {response2.response[:100]}...")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Stateless service test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_without_project_context():
    """Test with a project that doesn't exist in database"""
    try:
        logger.info("Testing with non-existent project...")
        
        ai_service = StatelessAIGuidanceService()
        
        # Use a project ID that doesn't exist
        fake_project_id = "00000000-0000-0000-0000-000000000000"
        
        chat_request = ChatRequest(
            message="How do I build a robot?",
            session_id=None
        )
        
        response = await ai_service.process_chat_request(
            project_id=fake_project_id,
            request=chat_request
        )
        
        logger.info("✅ Request with non-existent project processed successfully")
        logger.info(f"Response: {response.response[:100]}...")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Non-existent project test failed: {e}")
        return False

async def main():
    """Main test function"""
    logger.info("Starting Stateless AI Service tests...")
    
    # Test basic functionality
    basic_test_ok = await test_stateless_service()
    
    # Test without project context
    no_context_test_ok = await test_without_project_context()
    
    if basic_test_ok and no_context_test_ok:
        logger.info("✅ All Stateless AI Service tests passed!")
        logger.info("The service can now handle chat requests without database dependencies")
        return True
    else:
        logger.error("❌ Some tests failed!")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)