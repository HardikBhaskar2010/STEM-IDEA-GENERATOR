#!/usr/bin/env python3
"""
Disable RLS policies programmatically
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

from database.connection import get_db_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def disable_rls():
    """Attempt to disable RLS using SQL functions"""
    try:
        logger.info("Attempting to disable RLS policies...")
        
        client = await get_db_client()
        
        # Try using the rpc function to execute SQL
        sql_commands = [
            "ALTER TABLE public.chat_sessions DISABLE ROW LEVEL SECURITY",
            "ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY", 
            "ALTER TABLE public.ai_context_cache DISABLE ROW LEVEL SECURITY"
        ]
        
        for sql in sql_commands:
            try:
                logger.info(f"Executing: {sql}")
                # Try different approaches to execute SQL
                
                # Method 1: Try using a stored procedure if it exists
                try:
                    result = client.rpc('exec_sql', {'query': sql}).execute()
                    logger.info("✅ SQL executed via RPC")
                except:
                    # Method 2: Try using a different RPC function name
                    try:
                        result = client.rpc('execute_sql', {'sql': sql}).execute()
                        logger.info("✅ SQL executed via execute_sql RPC")
                    except:
                        logger.warning(f"❌ Could not execute SQL: {sql}")
                        logger.info("Manual intervention required - see URGENT_FIX_INSTRUCTIONS.md")
                        
            except Exception as e:
                logger.warning(f"Command failed: {e}")
        
        # Test if RLS is now disabled by trying to insert
        logger.info("Testing if RLS is disabled...")
        session_data = {
            'project_id': '87dbf13d-f202-4f9e-b8fd-f6a826c82c99',
            'user_id': '00000000-0000-0000-0000-000000000000',
        }
        
        try:
            result = client.table('chat_sessions').insert(session_data).execute()
            if result.data:
                session_id = result.data[0]['session_id']
                logger.info("✅ RLS successfully disabled - insert worked!")
                
                # Clean up test data
                client.table('chat_sessions').delete().eq('session_id', session_id).execute()
                logger.info("✅ Test data cleaned up")
                return True
            
        except Exception as e:
            if "row-level security policy" in str(e):
                logger.error("❌ RLS is still enabled")
                logger.info("Please manually run the SQL commands in Supabase dashboard:")
                logger.info("1. Go to: https://satbswbgkcgaddbesgns.supabase.co/project/satbswbgkcgaddbesgns/sql")
                logger.info("2. Run: ALTER TABLE public.chat_sessions DISABLE ROW LEVEL SECURITY;")
                logger.info("3. Run: ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;")
                logger.info("4. Run: ALTER TABLE public.ai_context_cache DISABLE ROW LEVEL SECURITY;")
                return False
            else:
                logger.error(f"❌ Unexpected error: {e}")
                return False
        
    except Exception as e:
        logger.error(f"❌ Failed to disable RLS: {e}")
        return False

async def main():
    """Main function"""
    logger.info("Starting RLS disable process...")
    
    success = await disable_rls()
    
    if success:
        logger.info("✅ RLS successfully disabled!")
        logger.info("You can now test the API endpoints")
    else:
        logger.error("❌ RLS disable failed - manual intervention required")
        logger.info("See URGENT_FIX_INSTRUCTIONS.md for manual steps")
    
    return success

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)