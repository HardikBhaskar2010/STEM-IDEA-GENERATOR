"""
Simple script to test database connection pool
"""

import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from infrastructure.db_pool import get_db_pool, close_db_pool


async def test_pool():
    """Test database connection pool"""
    print("Testing database connection pool...")
    
    try:
        # Get pool instance
        print("\n1. Initializing connection pool...")
        pool = await get_db_pool()
        print("   ✓ Pool initialized successfully")
        
        # Test basic query
        print("\n2. Testing basic query...")
        result = await pool.fetchval("SELECT 1")
        print(f"   ✓ Query result: {result}")
        
        # Test health check
        print("\n3. Testing health check...")
        is_healthy = await pool.health_check()
        print(f"   ✓ Health check: {'PASSED' if is_healthy else 'FAILED'}")
        
        # Get pool statistics
        print("\n4. Getting pool statistics...")
        stats = pool.get_pool_stats()
        print(f"   ✓ Pool size: {stats.get('size', 'N/A')}")
        print(f"   ✓ Free connections: {stats.get('free_size', 'N/A')}")
        print(f"   ✓ Active connections: {stats.get('active_connections', 'N/A')}")
        print(f"   ✓ Total queries: {stats.get('total_queries_executed', 0)}")
        
        # Test concurrent queries
        print("\n5. Testing concurrent queries (10 queries)...")
        async def query_task(i):
            return await pool.fetchval(f"SELECT {i}")
        
        tasks = [query_task(i) for i in range(10)]
        results = await asyncio.gather(*tasks)
        print(f"   ✓ All queries completed: {results}")
        
        # Final statistics
        print("\n6. Final statistics...")
        final_stats = pool.get_pool_stats()
        print(f"   ✓ Total queries executed: {final_stats.get('total_queries_executed', 0)}")
        print(f"   ✓ Average query time: {final_stats.get('average_query_time_ms', 0)}ms")
        
        print("\n✅ All tests passed!")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        # Close pool
        print("\n7. Closing connection pool...")
        await close_db_pool()
        print("   ✓ Pool closed")
    
    return True


if __name__ == "__main__":
    success = asyncio.run(test_pool())
    sys.exit(0 if success else 1)
