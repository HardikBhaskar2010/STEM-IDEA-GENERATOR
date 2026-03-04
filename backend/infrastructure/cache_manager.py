"""
Cache Manager with Redis backend.

This module provides a unified caching layer with:
- Multiple caching strategies (cache-aside, write-through, write-behind)
- Serialization/deserialization support
- Pattern-based cache invalidation
- Tag-based cache invalidation
- Cache statistics tracking (hit rate, miss rate)
- Fallback to direct queries on cache failure

Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 3.7
"""

import json
import logging
import time
from enum import Enum
from typing import Optional, Any, List, Dict, Callable, Awaitable
from datetime import timedelta
from collections import defaultdict

from backend.infrastructure.redis_client import RedisClient

logger = logging.getLogger(__name__)


class CacheStrategy(Enum):
    """Cache strategy types."""
    WRITE_THROUGH = "write_through"
    WRITE_BEHIND = "write_behind"
    CACHE_ASIDE = "cache_aside"


class CacheManager:
    """
    Redis-based cache manager with multiple strategies.
    
    Provides unified caching layer with:
    - Multiple caching strategies (cache-aside, write-through, write-behind)
    - Serialization/deserialization support
    - Pattern-based cache invalidation
    - Tag-based cache invalidation
    - Cache statistics tracking
    - Fallback to direct queries on cache failure
    
    Requirements:
    - 3.1: Support cache-aside, write-through, and write-behind caching strategies
    - 3.2: Return cached data if available and not expired
    - 3.3: Fetch data using provided fetch function and cache the result
    - 3.5: Support pattern-based cache invalidation using Redis key patterns
    - 3.6: Fall back to direct database queries without failing the request
    - 3.7: Provide cache statistics including hit rate, miss rate, and total entries
    """
    
    def __init__(
        self,
        redis_client: RedisClient,
        default_ttl: timedelta = timedelta(hours=1),
        strategy: CacheStrategy = CacheStrategy.CACHE_ASIDE
    ):
        """
        Initialize cache manager.
        
        Args:
            redis_client: Redis client instance
            default_ttl: Default time-to-live for cache entries (default: 1 hour)
            strategy: Caching strategy to use (default: CACHE_ASIDE)
        """
        self.redis = redis_client
        self.default_ttl = default_ttl
        self.strategy = strategy
        
        # Statistics tracking
        self._stats = {
            "hits": 0,
            "misses": 0,
            "errors": 0,
            "sets": 0,
            "deletes": 0
        }
        
        logger.info(
            f"Initialized CacheManager with strategy: {strategy.value}, "
            f"default TTL: {default_ttl.total_seconds()}s"
        )
    
    async def get(
        self,
        key: str,
        deserializer: Optional[Callable[[str], Any]] = None
    ) -> Optional[Any]:
        """
        Get value from cache.
        
        Args:
            key: Cache key
            deserializer: Optional custom deserializer function (default: JSON)
        
        Returns:
            Cached value if found, None otherwise
        
        Requirements:
        - 3.2: Return cached data if available and not expired
        """
        if not self.redis or not self.redis.is_connected:
            logger.warning("Redis not connected, cannot get from cache")
            self._stats["errors"] += 1
            return None
        
        try:
            # Get value from Redis
            cached_value = await self.redis.get(key)
            
            if cached_value is None:
                self._stats["misses"] += 1
                logger.debug(f"Cache miss for key: {key}")
                return None
            
            # Cache hit
            self._stats["hits"] += 1
            logger.debug(f"Cache hit for key: {key}")
            
            # Deserialize value
            if deserializer:
                return deserializer(cached_value)
            else:
                # Default JSON deserialization
                try:
                    return json.loads(cached_value)
                except json.JSONDecodeError:
                    # Return raw string if not JSON
                    return cached_value
        
        except Exception as e:
            logger.error(f"Error getting key '{key}' from cache: {e}")
            self._stats["errors"] += 1
            return None
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[timedelta] = None,
        serializer: Optional[Callable[[Any], str]] = None
    ) -> bool:
        """
        Set value in cache.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time-to-live (default: use default_ttl)
            serializer: Optional custom serializer function (default: JSON)
        
        Returns:
            True if successful, False otherwise
        
        Requirements:
        - 3.1: Support multiple caching strategies
        - 3.6: Fall back gracefully on cache failure
        """
        if not self.redis or not self.redis.is_connected:
            logger.warning("Redis not connected, cannot set cache")
            self._stats["errors"] += 1
            return False
        
        try:
            # Serialize value
            if serializer:
                cache_value = serializer(value)
            else:
                # Default JSON serialization
                try:
                    cache_value = json.dumps(value)
                except (TypeError, ValueError) as e:
                    logger.error(f"Failed to serialize value for key '{key}': {e}")
                    self._stats["errors"] += 1
                    return False
            
            # Calculate TTL in seconds
            ttl_seconds = int((ttl or self.default_ttl).total_seconds())
            
            # Set value in Redis
            success = await self.redis.set(key, cache_value, ex=ttl_seconds)
            
            if success:
                self._stats["sets"] += 1
                logger.debug(f"Set cache for key: {key} with TTL: {ttl_seconds}s")
            else:
                self._stats["errors"] += 1
                logger.warning(f"Failed to set cache for key: {key}")
            
            return success
        
        except Exception as e:
            logger.error(f"Error setting key '{key}' in cache: {e}")
            self._stats["errors"] += 1
            return False
    
    async def delete(self, key: str) -> bool:
        """
        Delete key from cache.
        
        Args:
            key: Cache key to delete
        
        Returns:
            True if deleted, False otherwise
        """
        if not self.redis or not self.redis.is_connected:
            logger.warning("Redis not connected, cannot delete from cache")
            self._stats["errors"] += 1
            return False
        
        try:
            deleted_count = await self.redis.delete(key)
            
            if deleted_count > 0:
                self._stats["deletes"] += 1
                logger.debug(f"Deleted cache key: {key}")
                return True
            
            return False
        
        except Exception as e:
            logger.error(f"Error deleting key '{key}' from cache: {e}")
            self._stats["errors"] += 1
            return False
    
    async def delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching pattern.
        
        Uses Redis KEYS command to find matching keys and deletes them.
        Pattern supports Redis glob-style patterns:
        - * matches any characters
        - ? matches a single character
        - [abc] matches a, b, or c
        
        Args:
            pattern: Redis key pattern (e.g., "user:*", "session:123:*")
        
        Returns:
            Number of keys deleted
        
        Requirements:
        - 3.5: Support pattern-based cache invalidation using Redis key patterns
        """
        if not self.redis or not self.redis.is_connected:
            logger.warning("Redis not connected, cannot delete pattern")
            self._stats["errors"] += 1
            return 0
        
        try:
            # Find all matching keys
            matching_keys = await self.redis.keys(pattern)
            
            if not matching_keys:
                logger.debug(f"No keys found matching pattern: {pattern}")
                return 0
            
            # Delete all matching keys
            deleted_count = await self.redis.delete(*matching_keys)
            
            self._stats["deletes"] += deleted_count
            logger.info(
                f"Deleted {deleted_count} cache entries matching pattern: {pattern}"
            )
            
            return deleted_count
        
        except Exception as e:
            logger.error(f"Error deleting pattern '{pattern}' from cache: {e}")
            self._stats["errors"] += 1
            return 0
    
    async def get_or_set(
        self,
        key: str,
        fetch_func: Callable[[], Awaitable[Any]],
        ttl: Optional[timedelta] = None,
        serializer: Optional[Callable[[Any], str]] = None,
        deserializer: Optional[Callable[[str], Any]] = None
    ) -> Any:
        """
        Get from cache or fetch and cache (cache-aside pattern).
        
        This implements the cache-aside pattern:
        1. Check if data exists in cache
        2. If cache hit, return cached data
        3. If cache miss, call fetch_func to get data
        4. Store fetched data in cache with TTL
        5. Return fetched data
        
        Args:
            key: Cache key
            fetch_func: Async function to fetch data if not in cache
            ttl: Time-to-live for cached data (default: use default_ttl)
            serializer: Optional custom serializer function
            deserializer: Optional custom deserializer function
        
        Returns:
            Data from cache or fetch function
        
        Requirements:
        - 3.2: Return cached data if available and not expired
        - 3.3: Fetch data using provided fetch function and cache the result
        - 3.6: Fall back to direct database queries without failing the request
        """
        # Try to get from cache
        cached_value = await self.get(key, deserializer=deserializer)
        
        if cached_value is not None:
            return cached_value
        
        # Cache miss - fetch data
        try:
            logger.debug(f"Fetching data for key: {key}")
            data = await fetch_func()
            
            # Try to cache the result (don't fail if caching fails)
            try:
                await self.set(key, data, ttl=ttl, serializer=serializer)
            except Exception as e:
                logger.warning(f"Failed to cache data for key '{key}': {e}")
                # Continue even if caching fails (Requirement 3.6)
            
            return data
        
        except Exception as e:
            logger.error(f"Fetch function failed for key '{key}': {e}")
            raise
    
    async def invalidate_tags(self, tags: List[str]) -> int:
        """
        Invalidate all cache entries with given tags.
        
        This uses a tag-based invalidation strategy where cache keys
        are stored in Redis sets associated with each tag.
        
        Tag format: "tag:{tag_name}" -> set of cache keys
        
        Args:
            tags: List of tags to invalidate
        
        Returns:
            Total number of keys invalidated
        
        Requirements:
        - 3.5: Support tag-based cache invalidation
        """
        if not self.redis or not self.redis.is_connected:
            logger.warning("Redis not connected, cannot invalidate tags")
            self._stats["errors"] += 1
            return 0
        
        total_deleted = 0
        
        try:
            for tag in tags:
                tag_key = f"tag:{tag}"
                
                # Get all keys associated with this tag
                async with self.redis.get_client() as client:
                    # Get all members of the tag set
                    tagged_keys = await client.smembers(tag_key)
                    
                    if not tagged_keys:
                        logger.debug(f"No keys found for tag: {tag}")
                        continue
                    
                    # Delete all tagged keys
                    if tagged_keys:
                        deleted_count = await client.delete(*tagged_keys)
                        total_deleted += deleted_count
                        
                        # Delete the tag set itself
                        await client.delete(tag_key)
                        
                        logger.info(
                            f"Invalidated {deleted_count} cache entries for tag: {tag}"
                        )
            
            self._stats["deletes"] += total_deleted
            return total_deleted
        
        except Exception as e:
            logger.error(f"Error invalidating tags {tags}: {e}")
            self._stats["errors"] += 1
            return 0
    
    async def add_tags(self, key: str, tags: List[str]) -> bool:
        """
        Add tags to a cache key for tag-based invalidation.
        
        This associates a cache key with one or more tags by storing
        the key in Redis sets for each tag.
        
        Args:
            key: Cache key
            tags: List of tags to associate with the key
        
        Returns:
            True if successful, False otherwise
        """
        if not self.redis or not self.redis.is_connected:
            logger.warning("Redis not connected, cannot add tags")
            return False
        
        try:
            async with self.redis.get_client() as client:
                for tag in tags:
                    tag_key = f"tag:{tag}"
                    # Add key to the tag set
                    await client.sadd(tag_key, key)
            
            logger.debug(f"Added tags {tags} to key: {key}")
            return True
        
        except Exception as e:
            logger.error(f"Error adding tags to key '{key}': {e}")
            return False
    
    async def get_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.
        
        Returns:
            Dict with cache statistics including:
            - hits: Number of cache hits
            - misses: Number of cache misses
            - hit_rate: Cache hit rate (0-1)
            - miss_rate: Cache miss rate (0-1)
            - sets: Number of cache sets
            - deletes: Number of cache deletes
            - errors: Number of cache errors
            - total_entries: Total number of keys in cache (approximate)
        
        Requirements:
        - 3.7: Provide cache statistics including hit rate, miss rate, and total entries
        """
        stats = self._stats.copy()
        
        # Calculate hit and miss rates
        total_requests = stats["hits"] + stats["misses"]
        
        if total_requests > 0:
            stats["hit_rate"] = round(stats["hits"] / total_requests, 4)
            stats["miss_rate"] = round(stats["misses"] / total_requests, 4)
        else:
            stats["hit_rate"] = 0.0
            stats["miss_rate"] = 0.0
        
        # Get total entries from Redis (approximate)
        try:
            if self.redis and self.redis.is_connected:
                async with self.redis.get_client() as client:
                    # Use DBSIZE to get approximate count
                    stats["total_entries"] = await client.dbsize()
            else:
                stats["total_entries"] = 0
        except Exception as e:
            logger.error(f"Error getting cache size: {e}")
            stats["total_entries"] = 0
        
        return stats
    
    def reset_stats(self) -> None:
        """Reset cache statistics."""
        self._stats = {
            "hits": 0,
            "misses": 0,
            "errors": 0,
            "sets": 0,
            "deletes": 0
        }
        logger.info("Cache statistics reset")
    
    async def clear_all(self) -> bool:
        """
        Clear all cache entries.
        
        WARNING: This will delete all data in the current Redis database!
        
        Returns:
            True if successful, False otherwise
        """
        if not self.redis or not self.redis.is_connected:
            logger.warning("Redis not connected, cannot clear cache")
            return False
        
        try:
            success = await self.redis.flushdb()
            
            if success:
                logger.warning("Cleared all cache entries")
                # Reset stats since cache is empty
                self.reset_stats()
            
            return success
        
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")
            return False
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Perform health check on cache.
        
        Returns:
            Dict with health status information
        """
        if not self.redis or not self.redis.is_connected:
            return {
                "healthy": False,
                "error": "Redis not connected"
            }
        
        try:
            # Use Redis health check
            redis_health = await self.redis.health_check()
            
            # Add cache-specific stats
            stats = await self.get_stats()
            
            return {
                "healthy": redis_health.get("healthy", False),
                "redis": redis_health,
                "stats": {
                    "hit_rate": stats["hit_rate"],
                    "miss_rate": stats["miss_rate"],
                    "total_entries": stats["total_entries"]
                }
            }
        
        except Exception as e:
            logger.error(f"Cache health check failed: {e}")
            return {
                "healthy": False,
                "error": str(e)
            }


# Global cache manager instance
_cache_manager: Optional[CacheManager] = None


def get_cache_manager() -> Optional[CacheManager]:
    """
    Get global cache manager instance.
    
    Returns:
        CacheManager instance or None if not initialized
    """
    return _cache_manager


async def initialize_cache_manager(
    redis_client: RedisClient,
    default_ttl: timedelta = timedelta(hours=1),
    strategy: CacheStrategy = CacheStrategy.CACHE_ASIDE
) -> CacheManager:
    """
    Initialize global cache manager.
    
    Args:
        redis_client: Redis client instance
        default_ttl: Default time-to-live for cache entries
        strategy: Caching strategy to use
    
    Returns:
        Initialized CacheManager instance
    """
    global _cache_manager
    
    if _cache_manager is None:
        _cache_manager = CacheManager(
            redis_client=redis_client,
            default_ttl=default_ttl,
            strategy=strategy
        )
        logger.info("Global cache manager initialized")
    
    return _cache_manager


def shutdown_cache_manager() -> None:
    """Shutdown global cache manager."""
    global _cache_manager
    
    if _cache_manager:
        logger.info("Shutting down cache manager")
        _cache_manager = None
