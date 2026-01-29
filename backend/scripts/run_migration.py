#!/usr/bin/env python3
# Run AI Guidance Database Migration
# Requirements: 7.1, 7.2

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


def run_migration():
    """Run the database migration"""
    
    print("🚀 Running AI Project Guidance Database Migration")
    print("=" * 60)
    
    # Read migration file
    migration_file = Path(__file__).parent.parent / "migrations" / "001_ai_guidance_schema.sql"
    
    if not migration_file.exists():
        print(f"❌ Migration file not found: {migration_file}")
        return False
    
    print(f"📄 Reading migration file: {migration_file}")
    
    try:
        with open(migration_file, 'r') as f:
            migration_sql = f.read()
    except Exception as e:
        print(f"❌ Error reading migration file: {e}")
        return False
    
    # Get database client
    try:
        client = get_db_client()
        print("✅ Database client connected")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False
    
    # Split SQL into individual statements
    statements = [stmt.strip() for stmt in migration_sql.split(';') if stmt.strip()]
    
    print(f"📋 Found {len(statements)} SQL statements to execute")
    
    # Execute each statement
    success_count = 0
    for i, statement in enumerate(statements, 1):
        if not statement or statement.startswith('--'):
            continue
            
        try:
            print(f"   {i:2d}. Executing: {statement[:50]}{'...' if len(statement) > 50 else ''}")
            
            # Use raw SQL execution
            result = client.rpc('exec_sql', {'sql': statement}).execute()
            
            success_count += 1
            print(f"      ✅ Success")
            
        except Exception as e:
            error_msg = str(e)
            if "already exists" in error_msg.lower() or "if not exists" in statement.lower():
                print(f"      ⚠️  Already exists (skipped)")
                success_count += 1
            else:
                print(f"      ❌ Error: {error_msg}")
                # Continue with other statements
    
    print(f"\n📊 Migration Summary:")
    print(f"   Total statements: {len(statements)}")
    print(f"   Successful: {success_count}")
    print(f"   Failed: {len(statements) - success_count}")
    
    if success_count == len(statements):
        print("\n🎉 Migration completed successfully!")
        return True
    else:
        print(f"\n⚠️  Migration completed with {len(statements) - success_count} errors")
        print("   Some statements may have failed due to existing objects or permissions")
        return False


def verify_tables():
    """Verify that the tables were created"""
    
    print("\n🔍 Verifying table creation...")
    
    try:
        client = get_db_client()
        
        tables_to_check = ['chat_sessions', 'chat_messages', 'ai_context_cache']
        
        for table in tables_to_check:
            try:
                result = client.table(table).select('count', count='exact').limit(0).execute()
                print(f"   ✅ Table '{table}' exists and is accessible")
            except Exception as e:
                print(f"   ❌ Table '{table}' check failed: {e}")
                return False
        
        print("\n✅ All tables verified successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        return False


def main():
    """Main migration function"""
    
    try:
        # Run migration
        migration_success = run_migration()
        
        # Verify tables
        if migration_success:
            verification_success = verify_tables()
            
            if verification_success:
                print("\n🎯 Next Steps:")
                print("   1. Run the setup verification: python backend/scripts/init_ai_guidance.py")
                print("   2. All tests should now pass")
                print("   3. Start implementing the API endpoints")
                return True
        
        print("\n⚠️  Migration may not have completed successfully")
        print("   You may need to run the SQL manually in Supabase SQL Editor")
        return False
        
    except KeyboardInterrupt:
        print("\n\n👋 Migration interrupted by user")
        return False
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        logger.exception("Migration failed with unexpected error")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)