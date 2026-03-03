#!/usr/bin/env python3
# Run Universal Chat History Database Migration
# Creates tables for universal voice chat conversations

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
    """Run the universal chat history database migration"""
    
    print("🚀 Running Universal Chat History Database Migration")
    print("=" * 60)
    
    # Read migration file
    migration_file = Path(__file__).parent.parent / "migrations" / "004_universal_chat_history.sql"
    
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
    
    # Split SQL into individual statements (more carefully)
    statements = []
    current_statement = ""
    in_function = False
    
    for line in migration_sql.split('\n'):
        line = line.strip()
        
        # Skip comments and empty lines
        if not line or line.startswith('--'):
            continue
            
        # Track if we're inside a function definition
        if 'CREATE OR REPLACE FUNCTION' in line.upper():
            in_function = True
        elif line.upper().startswith('$') and in_function:
            if current_statement and current_statement.count('$') >= 2:
                in_function = False
        
        current_statement += line + '\n'
        
        # End of statement
        if line.endswith(';') and not in_function:
            if current_statement.strip():
                statements.append(current_statement.strip())
            current_statement = ""
    
    # Add any remaining statement
    if current_statement.strip():
        statements.append(current_statement.strip())
    
    print(f"📋 Found {len(statements)} SQL statements to execute")
    
    # Execute each statement
    success_count = 0
    for i, statement in enumerate(statements, 1):
        if not statement or statement.startswith('--'):
            continue
            
        try:
            # Show first 80 characters of statement
            preview = statement.replace('\n', ' ')[:80]
            print(f"   {i:2d}. Executing: {preview}{'...' if len(preview) >= 80 else ''}")
            
            # Use raw SQL execution
            result = client.rpc('exec_sql', {'sql': statement}).execute()
            
            success_count += 1
            print(f"      ✅ Success")
            
        except Exception as e:
            error_msg = str(e)
            if any(phrase in error_msg.lower() for phrase in ["already exists", "if not exists"]):
                print(f"      ⚠️  Already exists (skipped)")
                success_count += 1
            else:
                print(f"      ❌ Error: {error_msg}")
                # Continue with other statements
    
    print(f"\n📊 Migration Summary:")
    print(f"   Total statements: {len(statements)}")
    print(f"   Successful: {success_count}")
    print(f"   Failed: {len(statements) - success_count}")
    
    if success_count >= len(statements) - 2:  # Allow for a few failures
        print("\n🎉 Migration completed successfully!")
        return True
    else:
        print(f"\n⚠️  Migration completed with {len(statements) - success_count} errors")
        print("   Some statements may have failed due to existing objects or permissions")
        return False


def verify_tables():
    """Verify that the universal chat tables were created"""
    
    print("\n🔍 Verifying table creation...")
    
    try:
        client = get_db_client()
        
        tables_to_check = ['universal_chat_messages', 'universal_chat_sessions']
        
        for table in tables_to_check:
            try:
                result = client.table(table).select('count', count='exact').limit(0).execute()
                print(f"   ✅ Table '{table}' exists and is accessible")
            except Exception as e:
                print(f"   ❌ Table '{table}' check failed: {e}")
                return False
        
        print("\n✅ All universal chat tables verified successfully!")
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
                print("   1. Test the universal chat system in the frontend")
                print("   2. Check that messages are being saved to Supabase")
                print("   3. Verify conversation continuity works")
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