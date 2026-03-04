# Cache Manager

## Overview

The `CacheManager` provides a unified caching layer with Redis backend, supporting multiple caching strategies, serialization/deserialization, pattern-based and tag-based invalidation, cache statistics tracking, and graceful fallback on cache failures.

## Features

- **Multiple Caching Strategies**: Support for cache-aside, write-through, and write-behind patterns
- **Serialization Support**: Automatic JSON serialization with custom serializer/deserializer support
- **Pattern-Based Invalidation**: Delete cache entries using Redis glob patterns
- **Tag-Based Invalidation**: Associate cache keys with tags for grouped invalidation
- **Cache Statistics**: Track hit rate, miss rate, and total entries
- **Graceful Fallback**: Continue operations even when cache is unavailable
- **Health Checks**: Monitor cache health and performance

## Requirements Satisfied

- **3.1**: Support cache-aside, write-through, and write-behind caching strategies
- **3.2**: Return cached data if available and not expired
- **3.3**: Fetch data using provided fetch function and cache the result
- **3.5**: Support pattern-based cache invalidation using Redis key patterns
- **3.6**: Fall back to direct database queries without failing the request
- **3.7**: Provide cache statistics including hit rate, miss rate, and total entries

## Installation

The CacheManager requires a Redis client instance:

```python
from backend.infrastructure.redis_client import initialize_redis
from backend.infrastructure.cache_manager import initialize_cache_manager, CacheStrategy
from datetime import timedelta

# Initialize Redis
redis_client = await initialize_redis()

# Initialize Cache Manager
cache_manager = await initialize_cache_manager(
    redis_client=redis_client,
    default_ttl=timedelta(hours=1),
    strategy=CacheStrategy.CACHE_ASIDE
)
```

## Usage

### Basic Operations

#### Get from Cache

```python
# Get value from cache
value = await cache_manager.get("user:123")

# Get with custom deserializer
def custom_deserializer(data: str) -> dict:
    return json.loads(data)

value = await cache_manager.get("user:123", deserializer=custom_deserializer)
```

#### Set to Cache

```python
# Set value with default TTL
await cache_manager.set("user:123", {"name": "John", "age": 30})

# Set with custom TTL
from datetime import timedelta
await cache_manager.set(
    "user:123",
    {"name": "John", "age": 30},
    ttl=timedelta(minutes=30)
)

# Set with custom serializer
def custom_serializer(data: dict) -> str:
    return json.dumps(data, indent=2)

await cache_manager.set(
    "user:123",
    {"name": "John", "age": 30},
    serializer=custom_serializer
)
```

#### Delete from Cache

```python
# Delete a single key
await cache_manager.delete("user:123")
```

### Cache-Aside Pattern (get_or_set)

The most common pattern - check cache first, fetch and cache if not found:

```python
async def fetch_user_from_db(user_id: str) -> dict:
    # Fetch from database
    return await db.query("SELECT * FROM users WHERE id = $1", user_id)

# Get from cache or fetch and cache
user = await cache_manager.get_or_set(
    key=f"user:{user_id}",
    fetch_func=lambda: fetch_user_from_db(user_id),
    ttl=timedelta(hours=1)
)
```

### Pattern-Based Invalidation

Delete multiple cache entries using Redis glob patterns:

```python
# Delete all user cache entries
deleted_count = await cache_manager.delete_pattern("user:*")

# Delete specific session entries
deleted_count = await cache_manager.delete_pattern("session:123:*")

# Pattern syntax:
# * - matches any characters
# ? - matches a single character
# [abc] - matches a, b, or c
```

### Tag-Based Invalidation

Associate cache keys with tags for grouped invalidation:

```python
# Add tags to a cache key
await cache_manager.set("user:123", user_data)
await cache_manager.add_tags("user:123", ["user", "profile", "team:5"])

# Invalidate all entries with specific tags
deleted_count = await cache_manager.invalidate_tags(["user", "profile"])
```

### Cache Statistics

Track cache performance:

```python
# Get statistics
stats = await cache_manager.get_stats()

print(f"Hit Rate: {stats['hit_rate']:.2%}")
print(f"Miss Rate: {stats['miss_rate']:.2%}")
print(f"Total Entries: {stats['total_entries']}")
print(f"Hits: {stats['hits']}")
print(f"Misses: {stats['misses']}")
print(f"Sets: {stats['sets']}")
print(f"Deletes: {stats['deletes']}")
print(f"Errors: {stats['errors']}")

# Reset statistics
cache_manager.reset_stats()
```

### Health Check

Monitor cache health:

```python
health = await cache_manager.health_check()

if health["healthy"]:
    print("Cache is healthy")
    print(f"Hit Rate: {health['stats']['hit_rate']:.2%}")
else:
    print(f"Cache is unhealthy: {health['error']}")
```

## Integration with BaseService

The CacheManager integrates seamlessly with BaseService:

```python
from backend.infrastructure.base_service import BaseService
from datetime import timedelta

class UserService(BaseService):
    async def get_user(self, user_id: str) -> dict:
        # Use get_cached_or_fetch from BaseService
        return await self.get_cached_or_fetch(
            cache_key=f"user:{user_id}",
            fetch_func=lambda: self._fetch_user_from_db(user_id),
            ttl=timedelta(hours=1)
        )
    
    async def _fetch_user_from_db(self, user_id: str) -> dict:
        # Database query
        async with self.db.get_connection() as conn:
            return await conn.fetchrow(
                "SELECT * FROM users WHERE id = $1",
                user_id
            )
    
    async def invalidate_user_cache(self, user_id: str):
        # Invalidate specific user cache
        await self.delete_cache(f"user:{user_id}")
    
    async def invalidate_all_users(self):
        # Invalidate all user caches
        await self.invalidate_cache("user:*")
```

## Caching Strategies

### Cache-Aside (Default)

Application checks cache first, fetches from database on miss, and updates cache:

```python
cache_manager = CacheManager(
    redis_client=redis_client,
    strategy=CacheStrategy.CACHE_ASIDE
)

# Use get_or_set for cache-aside pattern
data = await cache_manager.get_or_set(
    key="data:123",
    fetch_func=fetch_from_db
)
```

### Write-Through

Application writes to cache and database simultaneously:

```python
cache_manager = CacheManager(
    redis_client=redis_client,
    strategy=CacheStrategy.WRITE_THROUGH
)

# Write to both cache and database
await cache_manager.set("data:123", data)
await db.save(data)
```

### Write-Behind

Application writes to cache immediately, database write is deferred:

```python
cache_manager = CacheManager(
    redis_client=redis_client,
    strategy=CacheStrategy.WRITE_BEHIND
)

# Write to cache immediately
await cache_manager.set("data:123", data)
# Database write happens asynchronously
```

## Error Handling and Fallback

The CacheManager gracefully handles cache failures:

```python
# If Redis is unavailable, get_or_set falls back to fetch function
try:
    data = await cache_manager.get_or_set(
        key="data:123",
        fetch_func=fetch_from_db
    )
    # Data is returned even if caching fails
except Exception as e:
    # Only fetch function errors are raised
    logger.error(f"Failed to fetch data: {e}")
```

## Best Practices

### 1. Use Appropriate TTL Values

```python
# Short TTL for frequently changing data
await cache_manager.set("session:123", session_data, ttl=timedelta(minutes=30))

# Long TTL for static data
await cache_manager.set("config:app", config_data, ttl=timedelta(hours=24))
```

### 2. Use Namespaced Keys

```python
# Good - namespaced keys
await cache_manager.set("user:123", user_data)
await cache_manager.set("session:456", session_data)

# Bad - no namespace
await cache_manager.set("123", user_data)
```

### 3. Invalidate on Updates

```python
async def update_user(user_id: str, data: dict):
    # Update database
    await db.update_user(user_id, data)
    
    # Invalidate cache
    await cache_manager.delete(f"user:{user_id}")
```

### 4. Use Tags for Related Data

```python
# Tag related cache entries
await cache_manager.set("user:123", user_data)
await cache_manager.add_tags("user:123", ["user", "team:5"])

await cache_manager.set("user:456", user_data)
await cache_manager.add_tags("user:456", ["user", "team:5"])

# Invalidate all team members at once
await cache_manager.invalidate_tags(["team:5"])
```

### 5. Monitor Cache Performance

```python
# Regularly check cache statistics
stats = await cache_manager.get_stats()

if stats["hit_rate"] < 0.5:
    logger.warning(f"Low cache hit rate: {stats['hit_rate']:.2%}")
    # Consider adjusting TTL or caching strategy
```

## Performance Considerations

- **Connection Pooling**: Redis client uses connection pooling (5-50 connections)
- **Serialization**: JSON serialization is fast but consider custom serializers for large objects
- **Pattern Matching**: `delete_pattern` uses KEYS command which can be slow on large datasets
- **Tag Invalidation**: More efficient than pattern matching for grouped invalidation

## Testing

Run the test suite:

```bash
pytest backend/tests/test_cache_manager.py -v
```

Test coverage includes:
- Basic get/set/delete operations
- Serialization/deserialization
- get_or_set with fetch function
- Pattern-based invalidation
- Tag-based invalidation
- Cache statistics
- Fallback behavior on cache failure
- Health checks

## Configuration

Environment variables:

```bash
# Redis connection
REDIS_URL=redis://localhost:6379/0

# Connection pool settings
REDIS_MIN_CONNECTIONS=5
REDIS_MAX_CONNECTIONS=50
REDIS_CONNECTION_TIMEOUT=5
REDIS_SOCKET_KEEPALIVE=true
REDIS_HEALTH_CHECK_INTERVAL=30
```

## Troubleshooting

### Cache Not Working

1. Check Redis connection:
```python
health = await cache_manager.health_check()
print(health)
```

2. Verify Redis is running:
```bash
redis-cli ping
```

### Low Hit Rate

1. Check TTL values - may be too short
2. Monitor cache statistics:
```python
stats = await cache_manager.get_stats()
print(f"Hit Rate: {stats['hit_rate']:.2%}")
```

### High Memory Usage

1. Check total entries:
```python
stats = await cache_manager.get_stats()
print(f"Total Entries: {stats['total_entries']}")
```

2. Reduce TTL values or implement eviction policy

## Related Documentation

- [Redis Client README](./README_Redis.md)
- [Base Service README](./BASE_SERVICE_README.md)
- [Database Pool README](./DB_POOL_README.md)
