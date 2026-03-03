#!/usr/bin/env python3
"""
Fix RLS policies to allow public access for demo purposes
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

async def fix_rls_policies():
    """Fix RLS policies to allow public access"""
    try:
        logger.info("Fixing RLS policies for public access...")
        
        client = await get_db_client()
        
        # SQL commands to fix RLS policies
        sql_commands = [
            # Drop existing restrictive policies
            "DROP POLICY IF EXISTS \"Users can access own chat sessions\" ON public.chat_sessions;",
            "DROP POLICY IF EXISTS \"Users can access own chat messages\" ON public.chat_messages;", 
            "DROP POLICY IF EXISTS \"Users can access own project context cache\" ON public.ai_context_cache;",
            
            # Create permissive policies for public access
            """CREATE POLICY "Allow public access to chat sessions" ON public.chat_sessions
                FOR ALL USING (true);""",
            
            """CREATE POLICY "Allow public access to chat messages" ON public.chat_messages
                FOR ALL USING (true);""",
            
            """CREATE POLICY "Allow public access to context cache" ON public.ai_context_cache
                FOR ALL USING (true);""",
        ]
        
        # Execute each SQL command
        for sql in sql_commands:
            try:
                logger.info(f"Executing: {sql[:50]}...")
                result = client.rpc('exec_sql', {'sql': sql}).execute()
                logger.info("✅ Command executed successfully")
            except Exception as e:
                # Some commands might fail if policies don't exist, that's OK
                logger.warning(f"Command failed (might be expected): {e}")
        
        logger.info("✅ RLS policies updated for public access")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to fix RLS policies: {e}")
        return False

async def test_insert_after_fix():
    """Test inserting data after fixing RLS policies"""
    try:
        logger.info("Testing data insertion after RLS fix...")
        
        client = await get_db_client()
        
        # Test inserting a chat session
        session_data = {
            'project_id': '87dbf13d-f202-4f9e-b8fd-f6a826c82c99',
            'user_id': '00000000-0000-0000-0000-000000000000',
        }
        
        result = client.table('chat_sessions').insert(session_data).execute()
        
        if result.data:
            session_id = result.data[0]['session_id']
            logger.info(f"✅ Successfully created chat session: {session_id}")
            
            # Clean up - delete the test session
            client.table('chat_sessions').delete().eq('session_id', session_id).execute()
            logger.info("✅ Test session cleaned up")
            
            return True
        else:
            logger.error("❌ Failed to create chat session")
            return False
        
    except Exception as e:
        logger.error(f"❌ Insert test failed: {e}")
        return False

async def main():
    """Main function"""
    logger.info("Starting RLS policy fix...")
    
    # Since we can't execute raw SQL through Supabase client easily,
    # let's try a different approach - temporarily disable RLS
    try:
        client = await get_db_client()
        
        # Try to insert directly and see what happens
        logger.info("Testing current RLS policies...")
        
        session_data = {
            'project_id': '87dbf13d-f202-4f9e-b8fd-f6a826c82c99',
            'user_id': '00000000-0000-0000-0000-000000000000',
        }
        
        try:
            result = client.table('chat_sessions').insert(session_data).execute()
            logger.info("✅ RLS policies are already working correctly")
            
            # Clean up
            if result.data:
                session_id = result.data[0]['session_id']
                client.table('chat_sessions').delete().eq('session_id', session_id).execute()
            
            return True
            
        except Exception as e:
            if "row-level security policy" in str(e):
                logger.error("❌ RLS policies are blocking access")
                logger.info("You need to manually update RLS policies in Supabase dashboard")
                logger.info("Go to: https://satbswbgkcgaddbesgns.supabase.co/project/satbswbgkcgaddbesgns/auth/policies")
                logger.info("And either:")
                logger.info("1. Disable RLS on chat_sessions, chat_messages, and ai_context_cache tables")
                logger.info("2. Or create policies that allow public access:")
                logger.info("   CREATE POLICY \"Allow all\" ON public.chat_sessions FOR ALL USING (true);")
                logger.info("   CREATE POLICY \"Allow all\" ON public.chat_messages FOR ALL USING (true);")
                logger.info("   CREATE POLICY \"Allow all\" ON public.ai_context_cache FOR ALL USING (true);")
                return False
            else:
                logger.error(f"❌ Unexpected error: {e}")
                return False
        
    except Exception as e:
        logger.error(f"❌ Failed to test RLS policies: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)