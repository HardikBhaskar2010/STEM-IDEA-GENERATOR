#!/usr/bin/env python3
# Create Projects Table Script
# This script creates the projects table in Supabase

import os
import sys
import asyncio
import logging
from pathlib import Path

# Add the project root directory to the Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

try:
    from backend.database.connection import get_db_client
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("   Make sure you're running this script from the project root directory")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def create_projects_table():
    """Create the projects table"""
    
    print("🚀 Creating Projects Table")
    print("=" * 40)
    
    try:
        client = await get_db_client()
        print("✅ Database client connected")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False
    
    # SQL to create projects table
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS public.projects (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        project_type VARCHAR(100),
        difficulty VARCHAR(50) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'expert')),
        estimated_time VARCHAR(100),
        estimated_cost VARCHAR(100),
        components TEXT[] DEFAULT '{}',
        skills TEXT[] DEFAULT '{}',
        steps TEXT[] DEFAULT '{}',
        status VARCHAR(50) CHECK (status IN ('planning', 'in-progress', 'completed', 'abandoned')) DEFAULT 'planning',
        progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
        notes TEXT DEFAULT '',
        starred BOOLEAN DEFAULT false,
        tags TEXT[] DEFAULT '{}',
        completed_steps INTEGER[] DEFAULT '{}',
        generated_from_params JSONB DEFAULT '{}',
        user_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    """
    
    try:
        # Try to create the table by inserting a test record and then deleting it
        # This is a workaround since we can't execute raw SQL directly
        
        # First, try to query the table to see if it exists
        try:
            result = client.table('projects').select('count', count='exact').limit(0).execute()
            print("✅ Projects table already exists")
            return True
        except Exception:
            print("📋 Projects table doesn't exist, need to create it manually")
            print("\n🔧 Manual Setup Required:")
            print("   1. Go to your Supabase dashboard")
            print("   2. Navigate to SQL Editor")
            print("   3. Run the following SQL:")
            print("\n" + "="*60)
            print(create_table_sql)
            print("="*60)
            print("\n   4. After running the SQL, restart this script")
            return False
            
    except Exception as e:
        print(f"❌ Error creating projects table: {e}")
        return False


async def verify_table():
    """Verify that the projects table exists and is accessible"""
    
    print("\n🔍 Verifying projects table...")
    
    try:
        client = await get_db_client()
        
        # Try to query the table
        result = client.table('projects').select('count', count='exact').limit(0).execute()
        print(f"   ✅ Projects table exists and is accessible")
        print(f"   📊 Current project count: {result.count}")
        return True
        
    except Exception as e:
        print(f"   ❌ Projects table verification failed: {e}")
        return False


async def main():
    """Main function"""
    
    try:
        # Create projects table
        table_created = await create_projects_table()
        
        if table_created:
            # Verify table
            verification_success = await verify_table()
            
            if verification_success:
                print("\n🎉 Projects table setup completed successfully!")
                print("\n🎯 Next Steps:")
                print("   1. The AI Guidance system should now work")
                print("   2. Test the frontend AI Guidance button")
                print("   3. Projects will be synced automatically")
                return True
        
        print("\n⚠️  Manual setup required - see instructions above")
        return False
        
    except KeyboardInterrupt:
        print("\n\n👋 Setup interrupted by user")
        return False
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        logger.exception("Setup failed with unexpected error")
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)