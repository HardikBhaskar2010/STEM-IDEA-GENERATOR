#!/usr/bin/env python3
"""
Test AI Guidance Service to identify the source of 500 errors
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

from services.ai_guidance_service import AIGuidanceService
from models.ai_guidance import ChatRequest

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_ai_service():
    """Test AI guidance service initialization and basic operations"""
    try:
        logger.info("Testing AI Guidance Service initialization...")
        
        # Initialize the service
        ai_service = AIGuidanceService()
        logger.info("✅ AI Guidance Service initialized successfully")
        
        # Test a simple chat request
        logger.info("Testing process_chat_request method...")
        
        test_project_id = "87dbf13d-f202-4f9e-b8fd-f6a826c82c99"
        test_user_id = "00000000-0000-0000-0000-000000000000"
        
        chat_request = ChatRequest(
            message="Hello, I need help with my project",
            session_id=None
        )
        
        # This should be the method that's failing
        response = await ai_service.process_chat_request(
            project_id=test_project_id,
            user_id=test_user_id,
            request=chat_request
        )
        
        logger.info("✅ Chat request processed successfully")
        logger.info(f"Response: {response.response[:100]}...")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ AI Service test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_openrouter_config():
    """Test OpenRouter configuration"""
    try:
        logger.info("Testing OpenRouter configuration...")
        
        # Import OpenRouter config
        from server import openrouter_config, openrouter_client
        
        if openrouter_config is None:
            logger.error("❌ OpenRouter config is None")
            return False
        
        logger.info("✅ OpenRouter config loaded")
        logger.info(f"Model: {openrouter_config.model}")
        logger.info(f"Base URL: {openrouter_config.base_url}")
        
        if openrouter_client is None:
            logger.error("❌ OpenRouter client is None")
            return False
        
        logger.info("✅ OpenRouter client initialized")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ OpenRouter config test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Main test function"""
    logger.info("Starting AI Service tests...")
    
    # Test OpenRouter configuration first
    openrouter_ok = await test_openrouter_config()
    if not openrouter_ok:
        logger.error("OpenRouter configuration failed - this might cause issues")
    
    # Test AI service
    ai_service_ok = await test_ai_service()
    
    if ai_service_ok:
        logger.info("✅ All AI Service tests passed!")
        return True
    else:
        logger.error("❌ AI Service tests failed!")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)