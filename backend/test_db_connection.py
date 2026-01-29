#!/usr/bin/env python3
"""
Test database connection and setup tables if needed
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

from database.connection import get_db_client, test_db_connection

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_database():
    """Test database connection and basic operations"""
    try:
        logger.info("Testing database connection...")
        
        # Test basic connection
        connection_ok = await test_db_connection()
        if not connection_ok:
            logger.error("Database connection test failed")
            return False
        
        logger.info("Database connection successful!")
        
        # Get client and test basic operations
        client = await get_db_client()
        
        # Test if projects table exists
        try:
            result = client.table('projects').select('count', count='exact').limit(0).execute()
            logger.info(f"Projects table exists with {result.count} records")
        except Exception as e:
            logger.error(f"Projects table test failed: {e}")
            return False
        
        # Test if chat_sessions table exists
        try:
            result = client.table('chat_sessions').select('count', count='exact').limit(0).execute()
            logger.info(f"Chat sessions table exists with {result.count} records")
        except Exception as e:
            logger.error(f"Chat sessions table test failed: {e}")
            return False
        
        # Test if chat_messages table exists
        try:
            result = client.table('chat_messages').select('count', count='exact').limit(0).execute()
            logger.info(f"Chat messages table exists with {result.count} records")
        except Exception as e:
            logger.error(f"Chat messages table test failed: {e}")
            return False
        
        logger.info("All database tests passed!")
        return True
        
    except Exception as e:
        logger.error(f"Database test failed: {e}")
        return False

async def main():
    """Main test function"""
    logger.info("Starting database connection test...")
    
    # Check environment variables
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    if not supabase_url:
        logger.error("SUPABASE_URL environment variable not set")
        return False
    
    if not supabase_key:
        logger.error("SUPABASE_KEY environment variable not set")
        return False
    
    logger.info(f"Supabase URL: {supabase_url}")
    logger.info(f"Supabase Key: {supabase_key[:20]}...")
    
    # Run database tests
    success = await test_database()
    
    if success:
        logger.info("✅ Database connection and setup successful!")
        return True
    else:
        logger.error("❌ Database connection or setup failed!")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)