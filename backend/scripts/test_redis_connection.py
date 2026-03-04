"""
Script to test Redis connection and basic operations.

This script can be run manually to verify Redis is properly configured
and accessible.
"""

import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from infrastructure.redis_client import RedisClient


async def test_redis_connection():
    """Test Redis connection and basic operations."""
    print("=" * 60)
    print("Redis Connection Test")
    print("=" * 60)
    
    # Get Redis URL from environment
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    print(f"\nConnecting to Redis: {redis_url}")
    
    # Create Redis client
    client = RedisClient(
        redis_url=redis_url,
        min_connections=5,
        max_connections=50,
        connection_timeout=5
    )
    
    try:
        # Connect to Redis
        print("\n1. Connecting to Redis...")
        await client.connect()
        print("   ✓ Connected successfully")
        
        # Health check
        print("\n2. Performing health check...")
        health = await client.health_check()
        if health["healthy"]:
            print(f"   ✓ Health check passed")
            print(f"   - Latency: {health['latency_ms']}ms")
            print(f"   - Pool stats: {health['pool_stats']}")
        else:
            print(f"   ✗ Health check failed: {health.get('error')}")
            return False
        
        # Test SET operation
        print("\n3. Testing SET operation...")
        success = await client.set("test_key", "Hello, Redis!")
        if success:
            print("   ✓ SET operation successful")
        else:
            print("   ✗ SET operation failed")
            return False
        
        # Test GET operation
        print("\n4. Testing GET operation...")
        value = await client.get("test_key")
        if value == "Hello, Redis!":
            print(f"   ✓ GET operation successful: {value}")
        else:
            print(f"   ✗ GET operation failed: expected 'Hello, Redis!', got '{value}'")
            return False
        
        # Test SET with expiration
        print("\n5. Testing SET with expiration...")
        success = await client.set("expire_key", "This will expire", ex=2)
        if success:
            print("   ✓ SET with expiration successful")
            
            # Check TTL
            ttl = await client.ttl("expire_key")
            print(f"   - TTL: {ttl} seconds")
            
            # Wait for expiration
            print("   - Waiting for expiration (2 seconds)...")
            await asyncio.sleep(2.1)
            
            # Verify key is gone
            value = await client.get("expire_key")
            if value is None:
                print("   ✓ Key expired as expected")
            else:
                print("   ✗ Key did not expire")
                return False
        else:
            print("   ✗ SET with expiration failed")
            return False
        
        # Test DELETE operation
        print("\n6. Testing DELETE operation...")
        await client.set("delete_key", "Delete me")
        deleted = await client.delete("delete_key")
        if deleted == 1:
            print("   ✓ DELETE operation successful")
        else:
            print("   ✗ DELETE operation failed")
            return False
        
        # Test EXISTS operation
        print("\n7. Testing EXISTS operation...")
        await client.set("exist_key", "I exist")
        exists = await client.exists("exist_key", "nonexistent_key")
        if exists == 1:
            print("   ✓ EXISTS operation successful")
        else:
            print(f"   ✗ EXISTS operation failed: expected 1, got {exists}")
            return False
        
        # Test KEYS pattern matching
        print("\n8. Testing KEYS pattern matching...")
        await client.set("user:1:name", "Alice")
        await client.set("user:2:name", "Bob")
        await client.set("product:1:name", "Widget")
        
        user_keys = await client.keys("user:*")
        if len(user_keys) == 2:
            print(f"   ✓ KEYS pattern matching successful: found {len(user_keys)} user keys")
        else:
            print(f"   ✗ KEYS pattern matching failed: expected 2, got {len(user_keys)}")
            return False
        
        # Test concurrent operations
        print("\n9. Testing concurrent operations...")
        tasks = []
        for i in range(10):
            tasks.append(client.set(f"concurrent_{i}", f"value_{i}"))
        
        results = await asyncio.gather(*tasks)
        if all(results):
            print("   ✓ Concurrent operations successful (10 operations)")
        else:
            print("   ✗ Some concurrent operations failed")
            return False
        
        # Clean up test keys
        print("\n10. Cleaning up test keys...")
        test_keys = await client.keys("test_*")
        test_keys.extend(await client.keys("user:*"))
        test_keys.extend(await client.keys("product:*"))
        test_keys.extend(await client.keys("concurrent_*"))
        test_keys.extend(await client.keys("exist_key"))
        
        if test_keys:
            deleted = await client.delete(*test_keys)
            print(f"   ✓ Cleaned up {deleted} test keys")
        
        print("\n" + "=" * 60)
        print("All tests passed! ✓")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        # Disconnect
        print("\nDisconnecting from Redis...")
        await client.disconnect()
        print("Disconnected")


def main():
    """Main entry point."""
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    # Run tests
    success = asyncio.run(test_redis_connection())
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
