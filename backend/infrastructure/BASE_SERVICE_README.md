# BaseService Implementation

## Overview

The BaseService class provides common functionality for all services in the backend, including caching, logging, database access, and health checks. This implementation follows the service layer pattern and enables dependency injection through the ServiceRegistry.

## Requirements Addressed

- **Requirement 2.5**: Base service provides common functionality including caching, logging, and database access
- **Requirement 3.2**: Cache-aside pattern with fetch function support
- **Requirement 3.3**: Pattern-based cache invalidation
- **Requirement 10.4**: Service-specific health check interface

## Components

### 1. BaseService (Abstract Base Class)

The `BaseService` class is an abstract base class that all services should extend. It provides:

#### Core Features

1. **Caching with Redis**
   - Cache-aside pattern implementation
   - Automatic serialization/deserialization (JSON)
   - TTL support for cache entries
   - Graceful fallback when cache is unavailable
   - Service-namespaced cache keys

2. **Cache Operations**
   - `get_cached_or_fetch()`: Get from cache or fetch and cache
   - `invalidate_cache()`: Pattern-based cache invalidation
   - `set_cache()`: Manually set cache values
   - `get_cache()`: Manually get cache values
   - `delete_cache()`: Delete specific cache keys

3. **Health Checks**
   - Abstract `health_check()` method for service-specific checks
   - `base_health_check()` for common dependency checks (cache, database)

4. **Dependency Injection**
   - Optional Redis cache client
   - Optional structured logger
   - Optional database connection pool

#### Usage Example

```python
from backend.infrastructure.base_service import BaseService
from backend.infrastructure.redis_client import get_redis_client
from backend.infrastructure.db_pool import get_db_pool
from datetime import timedelta
from typing import Dict, Any

class MyService(BaseService):
    """Example service implementation"""
    
    async def get_user(self, user_id: str) -> Dict[str, Any]:
        """Get user with caching"""
        
        async def fetch_user():
            # Fetch from database
            result = await self.db.fetchrow(
                "SELECT * FROM users WHERE id = $1",
                user_id
            )
            return dict(result) if result else None
        
        # Use cache-aside pattern
        user = await self.get_cached_or_fetch(
            cache_key=f"user:{user_id}",
            fetch_func=fetch_user,
            ttl=timedelta(hours=1)
        )
        
        return user
    
    async def update_user(self, user_id: str, data: Dict[str, Any]) -> None:
        """Update user and invalidate cache"""
        
        # Update database
        await self.db.execute(
            "UPDATE users SET name = $1 WHERE id = $2",
            data["name"],
            user_id
        )
        
        # Invalidate cache
        await self.invalidate_cache(f"user:{user_id}")
    
    async def health_check(self) -> Dict[str, Any]:
        """Service-specific health check"""
        base_health = await self.base_health_check()
        
        # Add service-specific checks
        return {
            **base_health,
            "custom_check": "healthy"
        }

# Initialize service with dependencies
redis_client = await get_redis_client()
db_pool = await get_db_pool()

my_service = MyService(
    cache=redis_client,
    db_client=db_pool
)
```

### 2. ServiceRegistry

The `ServiceRegistry` class provides dependency injection and service management:

#### Features

1. **Service Registration**
   - Register services by name
   - Validate services extend BaseService
   - Prevent duplicate registrations

2. **Service Retrieval**
   - Get services by name (singleton pattern)
   - Get all registered services
   - Check if service exists

3. **Health Check Aggregation**
   - Check health of all registered services
   - Aggregate health status

#### Usage Example

```python
from backend.infrastructure.base_service import get_service_registry

# Get global registry
registry = get_service_registry()

# Register services
registry.register("user_service", user_service)
registry.register("project_service", project_service)

# Retrieve services
user_service = registry.get("user_service")

# Check all services health
health = await registry.health_check_all()
print(health)
# {
#     "healthy": True,
#     "services": {
#         "user_service": {"healthy": True, ...},
#         "project_service": {"healthy": True, ...}
#     }
# }
```

## Cache-Aside Pattern

The `get_cached_or_fetch()` method implements the cache-aside pattern:

1. **Check Cache**: Try to get data from Redis cache
2. **Cache Hit**: Return cached data (deserialized)
3. **Cache Miss**: Call fetch function to get data
4. **Store in Cache**: Cache the fetched data with TTL
5. **Return Data**: Return the fetched data

### Benefits

- **Performance**: Reduces database load by caching frequently accessed data
- **Resilience**: Falls back to database if cache is unavailable
- **Simplicity**: Single method call handles caching logic
- **Flexibility**: Configurable TTL per operation

### Example

```python
# Without caching (old way)
async def get_project(project_id: str):
    result = await db.fetchrow(
        "SELECT * FROM projects WHERE id = $1",
        project_id
    )
    return dict(result)

# With caching (new way)
async def get_project(project_id: str):
    async def fetch_project():
        result = await self.db.fetchrow(
            "SELECT * FROM projects WHERE id = $1",
            project_id
        )
        return dict(result)
    
    return await self.get_cached_or_fetch(
        cache_key=f"project:{project_id}",
        fetch_func=fetch_project,
        ttl=timedelta(hours=2)
    )
```

## Cache Invalidation

The `invalidate_cache()` method supports pattern-based invalidation using Redis glob patterns:

### Patterns

- `*` - matches any characters
- `?` - matches a single character
- `[abc]` - matches a, b, or c

### Examples

```python
# Invalidate all user caches
await service.invalidate_cache("user:*")

# Invalidate specific session
await service.invalidate_cache("session:123:*")

# Invalidate all project contexts
await service.invalidate_cache("project:*:context")
```

## Health Checks

Services must implement the `health_check()` method to provide service-specific health information:

```python
async def health_check(self) -> Dict[str, Any]:
    """Service-specific health check"""
    
    # Get base health (cache, database)
    base_health = await self.base_health_check()
    
    # Add service-specific checks
    try:
        # Check external API
        api_healthy = await self.check_external_api()
        
        return {
            **base_health,
            "external_api": {
                "healthy": api_healthy
            }
        }
    except Exception as e:
        return {
            **base_health,
            "healthy": False,
            "external_api": {
                "healthy": False,
                "error": str(e)
            }
        }
```

## Cache Key Namespacing

All cache keys are automatically prefixed with the service name to prevent collisions:

```python
# In UserService
await self.set_cache("user:123", data)
# Actual Redis key: "UserService:user:123"

# In ProjectService
await self.set_cache("user:123", data)
# Actual Redis key: "ProjectService:user:123"
```

## Error Handling

The BaseService implements graceful error handling:

1. **Cache Unavailable**: Falls back to direct database queries
2. **Cache Errors**: Logs warning and continues with fetch
3. **Deserialization Errors**: Falls back to fetch
4. **Health Check Errors**: Returns unhealthy status with error details

## Testing

Comprehensive unit tests are provided in `backend/tests/test_base_service.py`:

- Cache hit/miss scenarios
- Cache unavailable fallback
- Cache error handling
- Deserialization error handling
- Pattern-based invalidation
- Service registration and retrieval
- Health check aggregation

Run tests:
```bash
pytest backend/tests/test_base_service.py -v
```

## Integration with Existing Infrastructure

The BaseService integrates with:

1. **RedisClient** (from task 1.1)
   - Connection pooling (5-50 connections)
   - Health checks
   - Error handling

2. **DatabaseConnectionPool** (from task 1.2)
   - Connection pooling (5-20 connections)
   - Query execution
   - Health checks

3. **StructuredLogger** (existing)
   - JSON-formatted logs
   - Request context
   - Error tracking

## Next Steps

Task 1.4 will implement the ServiceRegistry initialization and service lifecycle management, integrating with the FastAPI application startup/shutdown.

## Performance Considerations

1. **Cache TTL**: Configure appropriate TTL values based on data volatility
   - User sessions: 1 hour
   - Project context: 2 hours
   - Technology stacks: 24 hours
   - Chat history: 30 minutes

2. **Serialization**: Use `serialize=False` for simple string values to avoid JSON overhead

3. **Pattern Invalidation**: Use specific patterns to minimize Redis KEYS command impact

4. **Connection Pooling**: Reuses existing Redis and database connections for efficiency

## Summary

The BaseService implementation provides:

✅ Cache-aside pattern with automatic fallback  
✅ Pattern-based cache invalidation  
✅ Service-namespaced cache keys  
✅ Health check interface  
✅ Dependency injection support  
✅ Comprehensive error handling  
✅ Full test coverage (33 tests passing)  

This foundation enables all unified services to benefit from consistent caching, logging, and database access patterns.
