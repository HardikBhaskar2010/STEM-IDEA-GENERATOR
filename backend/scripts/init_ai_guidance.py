#!/usr/bin/env python3
# AI Guidance Database Initialization Script
# Requirements: 7.1, 7.2

import os
import sys
import asyncio
import logging
from pathlib import Path

# Add the project root directory to the Python path
project_root = Path(__file__).parent.parent.parent
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

try:
    from backend.database.connection import DatabaseConnection, test_db_connection
    from backend.database.ai_guidance_crud import AIContextCacheCRUD
    from backend.services.ai_guidance_service import AIGuidanceService
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


async def test_database_setup():
    """Test the database setup and basic operations"""
    
    print("🔧 AI Project Guidance Database Setup")
    print("=" * 50)
    
    # Test 1: Database Connection
    print("\n1. Testing database connection...")
    try:
        connection_ok = test_db_connection()
        if connection_ok:
            print("✅ Database connection successful")
        else:
            print("❌ Database connection failed")
            return False
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        return False
    
    # Test 2: Database Configuration
    print("\n2. Checking database configuration...")
    try:
        db_conn = DatabaseConnection()
        config_info = db_conn.config.get_connection_info()
        print(f"✅ Supabase URL: {config_info['url']}")
        print(f"✅ API Key configured: {config_info['key_configured']}")
    except Exception as e:
        print(f"❌ Configuration error: {e}")
        return False
    
    # Test 3: Service Initialization
    print("\n3. Testing service initialization...")
    try:
        service = AIGuidanceService()
        print("✅ AI Guidance Service initialized")
    except Exception as e:
        print(f"❌ Service initialization error: {e}")
        return False
    
    # Test 4: Context Cache Operations (if tables exist)
    print("\n4. Testing context cache operations...")
    try:
        context_crud = AIContextCacheCRUD()
        # Try to clean up expired cache (this will work even if table is empty)
        cleaned_count = await context_crud.cleanup_expired_cache()
        print(f"✅ Context cache operations working (cleaned {cleaned_count} expired entries)")
    except Exception as e:
        print(f"⚠️  Context cache test failed (tables may not exist yet): {e}")
        print("   This is expected if you haven't run the database migration yet.")
    
    return True


def check_migration_file():
    """Check if the migration file exists"""
    migration_file = backend_dir / "migrations" / "001_ai_guidance_schema.sql"
    
    print("\n5. Checking migration file...")
    if migration_file.exists():
        print(f"✅ Migration file found: {migration_file}")
        print("\n📋 Migration file contents preview:")
        print("-" * 40)
        
        with open(migration_file, 'r') as f:
            lines = f.readlines()
            # Show first 10 lines
            for i, line in enumerate(lines[:10]):
                print(f"{i+1:2d}: {line.rstrip()}")
            
            if len(lines) > 10:
                print(f"... ({len(lines) - 10} more lines)")
        
        print("-" * 40)
        return True
    else:
        print(f"❌ Migration file not found: {migration_file}")
        return False


def show_next_steps():
    """Show next steps for completing the setup"""
    print("\n🚀 Next Steps")
    print("=" * 50)
    
    print("\n1. Run Database Migration:")
    print("   - Open your Supabase SQL Editor")
    print("   - Copy and paste the contents of backend/migrations/001_ai_guidance_schema.sql")
    print("   - Execute the SQL to create the tables")
    
    print("\n2. Verify Tables Created:")
    print("   - Check that these tables exist in your Supabase database:")
    print("     • chat_sessions")
    print("     • chat_messages") 
    print("     • ai_context_cache")
    
    print("\n3. Test the Setup:")
    print("   - Run this script again after migration: python backend/scripts/init_ai_guidance.py")
    print("   - All tests should pass")
    
    print("\n4. Integration:")
    print("   - Add AI guidance endpoints to your FastAPI server")
    print("   - Integrate with existing project data models")
    print("   - Connect to OpenRouter AI service")
    
    print("\n5. Frontend Integration:")
    print("   - Use the TypeScript interfaces in frontend/src/types/aiGuidance.ts")
    print("   - Implement chat components")
    print("   - Add guidance button to project pages")


def check_environment():
    """Check environment variables"""
    print("\n6. Checking environment variables...")
    
    required_vars = ["SUPABASE_URL", "SUPABASE_KEY"]
    missing_vars = []
    
    for var in required_vars:
        value = os.getenv(var)
        if value:
            print(f"✅ {var}: {'*' * 10}...{value[-4:] if len(value) > 4 else '****'}")
        else:
            print(f"❌ {var}: Not set")
            missing_vars.append(var)
    
    if missing_vars:
        print(f"\n⚠️  Missing environment variables: {', '.join(missing_vars)}")
        print("   Make sure these are set in your backend/.env file")
        return False
    
    return True


async def main():
    """Main initialization function"""
    print("🎯 AI Project Guidance - Database Setup & Verification")
    print("=" * 60)
    
    # Check environment
    env_ok = check_environment()
    
    # Check migration file
    migration_ok = check_migration_file()
    
    # Test database setup
    if env_ok:
        db_ok = await test_database_setup()
    else:
        print("\n❌ Skipping database tests due to missing environment variables")
        db_ok = False
    
    # Show results
    print("\n📊 Setup Summary")
    print("=" * 30)
    print(f"Environment Variables: {'✅ OK' if env_ok else '❌ Missing'}")
    print(f"Migration File:        {'✅ OK' if migration_ok else '❌ Missing'}")
    print(f"Database Connection:   {'✅ OK' if db_ok else '❌ Failed'}")
    
    if env_ok and migration_ok and db_ok:
        print("\n🎉 All checks passed! Your AI Guidance setup is ready.")
        print("\n💡 You can now:")
        print("   - Start implementing the API endpoints")
        print("   - Build the frontend components")
        print("   - Test the complete chat functionality")
    else:
        print("\n⚠️  Some checks failed. Please review the issues above.")
        show_next_steps()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n👋 Setup interrupted by user")
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        logger.exception("Setup failed with unexpected error")
        sys.exit(1)