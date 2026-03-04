"""
CacheManager Integration Example

This example demonstrates how to use the CacheManager in a real service.
"""

import asyncio
from datetime import timedelta
from typing import Optional, Dict, Any, List

from backend.infrastructure.redis_client import initialize_redis, shutdown_redis
from backend.infrastructure.cache_manager import (
    initialize_cache_manager,
    get_cache_manager,
    shutdown_cache_manager,
    CacheStrategy
)
from backend.infrastructure.base_service import BaseService


# Example 1: Using CacheManager directly
async def example_direct_usage():
    """Example of using CacheManager directly."""
    print("\n=== Example 1: Direct CacheManager Usage ===\n")
    
    # Initialize Redis and CacheManager
    redis_client = await initialize_redis()
    cache_manager = await initialize_cache_manager(
        redis_client=redis_client,
        default_ttl=timedelta(hours=1),
        strategy=CacheStrategy.CACHE_ASIDE
    )
    
    # Basic set and get
    print("1. Basic set and get:")
    await cache_manager.set("user:123", {"name": "John", "age": 30})
    user = await cache_manager.get("user:123")
    print(f"   User: {user}")
    
    # Get or set with fetch function
    print("\n2. Get or set with fetch function:")
    
    async def fetch_user_from_db(user_id: str) -> Dict[str, Any]:
        print(f"   Fetching user {user_id} from database...")
        await asyncio.sleep(0.1)  # Simulate DB query
        return {"id": user_id, "name": "Jane", "age": 25}
    
    # First call - cache miss, fetches from DB
    user = await cache_manager.get_or_set(
        key="user:456",
        fetch_func=lambda: fetch_user_from_db("456"),
        ttl=timedelta(minutes=30)
    )
    print(f"   User (from DB): {user}")
    
    # Second call - cache hit, no DB query
    user = await cache_manager.get_or_set(
        key="user:456",
        fetch_func=lambda: fetch_user_from_db("456"),
        ttl=timedelta(minutes=30)
    )
    print(f"   User (from cache): {user}")
    
    # Pattern-based invalidation
    print("\n3. Pattern-based invalidation:")
    await cache_manager.set("user:100", {"name": "Alice"})
    await cache_manager.set("user:200", {"name": "Bob"})
    await cache_manager.set("session:300", {"token": "abc"})
    
    deleted = await cache_manager.delete_pattern("user:*")
    print(f"   Deleted {deleted} user cache entries")
    
    # Tag-based invalidation
    print("\n4. Tag-based invalidation:")
    await cache_manager.set("user:101", {"name": "Charlie", "team": "A"})
    await cache_manager.add_tags("user:101", ["user", "team:A"])
    
    await cache_manager.set("user:102", {"name": "David", "team": "A"})
    await cache_manager.add_tags("user:102", ["user", "team:A"])
    
    await cache_manager.set("user:103", {"name": "Eve", "team": "B"})
    await cache_manager.add_tags("user:103", ["user", "team:B"])
    
    deleted = await cache_manager.invalidate_tags(["team:A"])
    print(f"   Deleted {deleted} cache entries for team A")
    
    # Cache statistics
    print("\n5. Cache statistics:")
    stats = await cache_manager.get_stats()
    print(f"   Hit Rate: {stats['hit_rate']:.2%}")
    print(f"   Miss Rate: {stats['miss_rate']:.2%}")
    print(f"   Total Hits: {stats['hits']}")
    print(f"   Total Misses: {stats['misses']}")
    print(f"   Total Entries: {stats['total_entries']}")
    
    # Health check
    print("\n6. Health check:")
    health = await cache_manager.health_check()
    print(f"   Healthy: {health['healthy']}")
    print(f"   Latency: {health['redis'].get('latency_ms', 'N/A')} ms")
    
    # Cleanup
    await shutdown_cache_manager()
    await shutdown_redis()


# Example 2: Using CacheManager with BaseService
class UserService(BaseService):
    """Example service using CacheManager through BaseService."""
    
    def __init__(self, cache, logger, db_client):
        super().__init__(cache, logger, db_client)
        self._db_calls = 0  # Track DB calls for demo
    
    async def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user with caching."""
        return await self.get_cached_or_fetch(
            cache_key=f"user:{user_id}",
            fetch_func=lambda: self._fetch_user_from_db(user_id),
            ttl=timedelta(hours=1)
        )
    
    async def _fetch_user_from_db(self, user_id: str) -> Dict[str, Any]:
        """Simulate fetching user from database."""
        self._db_calls += 1
        print(f"   DB call #{self._db_calls}: Fetching user {user_id}")
        await asyncio.sleep(0.1)  # Simulate DB query
        return {
            "id": user_id,
            "name": f"User {user_id}",
            "email": f"user{user_id}@example.com"
        }
    
    async def update_user(self, user_id: str, data: Dict[str, Any]) -> bool:
        """Update user and invalidate cache."""
        # Update database
        print(f"   Updating user {user_id} in database")
        await asyncio.sleep(0.1)  # Simulate DB update
        
        # Invalidate cache
        await self.delete_cache(f"user:{user_id}")
        print(f"   Invalidated cache for user {user_id}")
        
        return True
    
    async def get_users_by_team(self, team_id: str) -> List[Dict[str, Any]]:
        """Get all users in a team with caching."""
        return await self.get_cached_or_fetch(
            cache_key=f"team:{team_id}:users",
            fetch_func=lambda: self._fetch_team_users_from_db(team_id),
            ttl=timedelta(minutes=30)
        )
    
    async def _fetch_team_users_from_db(self, team_id: str) -> List[Dict[str, Any]]:
        """Simulate fetching team users from database."""
        self._db_calls += 1
        print(f"   DB call #{self._db_calls}: Fetching users for team {team_id}")
        await asyncio.sleep(0.1)  # Simulate DB query
        return [
            {"id": "1", "name": "User 1", "team": team_id},
            {"id": "2", "name": "User 2", "team": team_id},
        ]
    
    async def invalidate_team_cache(self, team_id: str):
        """Invalidate all cache entries for a team."""
        await self.invalidate_cache(f"team:{team_id}:*")
        print(f"   Invalidated all cache for team {team_id}")
    
    async def health_check(self) -> Dict[str, Any]:
        """Service health check."""
        base_health = await self.base_health_check()
        base_health["db_calls"] = self._db_calls
        return base_health


async def example_service_integration():
    """Example of using CacheManager with BaseService."""
    print("\n=== Example 2: BaseService Integration ===\n")
    
    # Initialize Redis and CacheManager
    redis_client = await initialize_redis()
    cache_manager = await initialize_cache_manager(redis_client)
    
    # Create service
    service = UserService(
        cache=redis_client,
        logger=None,
        db_client=None
    )
    
    # Get user - first call (cache miss)
    print("1. Get user (cache miss):")
    user = await service.get_user("123")
    print(f"   User: {user}")
    
    # Get user - second call (cache hit)
    print("\n2. Get user (cache hit):")
    user = await service.get_user("123")
    print(f"   User: {user}")
    
    # Update user and invalidate cache
    print("\n3. Update user and invalidate cache:")
    await service.update_user("123", {"name": "Updated User"})
    
    # Get user - cache miss after invalidation
    print("\n4. Get user after invalidation (cache miss):")
    user = await service.get_user("123")
    print(f"   User: {user}")
    
    # Get team users
    print("\n5. Get team users (cache miss):")
    users = await service.get_users_by_team("team-A")
    print(f"   Team users: {users}")
    
    # Get team users - cache hit
    print("\n6. Get team users (cache hit):")
    users = await service.get_users_by_team("team-A")
    print(f"   Team users: {users}")
    
    # Invalidate team cache
    print("\n7. Invalidate team cache:")
    await service.invalidate_team_cache("team-A")
    
    # Health check
    print("\n8. Service health check:")
    health = await service.health_check()
    print(f"   Healthy: {health['healthy']}")
    print(f"   Total DB calls: {health['db_calls']}")
    
    # Cleanup
    await shutdown_cache_manager()
    await shutdown_redis()


# Example 3: Advanced caching patterns
async def example_advanced_patterns():
    """Example of advanced caching patterns."""
    print("\n=== Example 3: Advanced Caching Patterns ===\n")
    
    # Initialize Redis and CacheManager
    redis_client = await initialize_redis()
    cache_manager = await initialize_cache_manager(redis_client)
    
    # 1. Cache warming - pre-populate cache
    print("1. Cache warming:")
    popular_users = ["1", "2", "3", "4", "5"]
    for user_id in popular_users:
        await cache_manager.set(
            f"user:{user_id}",
            {"id": user_id, "name": f"User {user_id}"},
            ttl=timedelta(hours=24)
        )
    print(f"   Warmed cache with {len(popular_users)} users")
    
    # 2. Tiered TTL - different TTL for different data types
    print("\n2. Tiered TTL:")
    await cache_manager.set(
        "config:app",
        {"version": "1.0"},
        ttl=timedelta(hours=24)  # Long TTL for static config
    )
    await cache_manager.set(
        "session:abc",
        {"user_id": "123"},
        ttl=timedelta(minutes=30)  # Short TTL for sessions
    )
    print("   Set config with 24h TTL, session with 30m TTL")
    
    # 3. Cache stampede prevention with get_or_set
    print("\n3. Cache stampede prevention:")
    
    async def expensive_computation():
        print("   Running expensive computation...")
        await asyncio.sleep(1)
        return {"result": "computed"}
    
    # Multiple concurrent requests - only one computes
    results = await asyncio.gather(
        cache_manager.get_or_set("computation:1", expensive_computation),
        cache_manager.get_or_set("computation:1", expensive_computation),
        cache_manager.get_or_set("computation:1", expensive_computation),
    )
    print(f"   All requests got result: {results[0]}")
    
    # 4. Hierarchical cache invalidation
    print("\n4. Hierarchical cache invalidation:")
    await cache_manager.set("user:1:profile", {"name": "User 1"})
    await cache_manager.set("user:1:settings", {"theme": "dark"})
    await cache_manager.set("user:1:preferences", {"lang": "en"})
    
    # Invalidate all user:1 data
    deleted = await cache_manager.delete_pattern("user:1:*")
    print(f"   Deleted {deleted} cache entries for user 1")
    
    # 5. Cache statistics monitoring
    print("\n5. Cache statistics:")
    stats = await cache_manager.get_stats()
    print(f"   Hit Rate: {stats['hit_rate']:.2%}")
    print(f"   Miss Rate: {stats['miss_rate']:.2%}")
    
    if stats['hit_rate'] < 0.5:
        print("   ⚠️  Low hit rate - consider adjusting TTL or caching strategy")
    else:
        print("   ✓ Good hit rate")
    
    # Cleanup
    await shutdown_cache_manager()
    await shutdown_redis()


async def main():
    """Run all examples."""
    try:
        await example_direct_usage()
        await example_service_integration()
        await example_advanced_patterns()
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
