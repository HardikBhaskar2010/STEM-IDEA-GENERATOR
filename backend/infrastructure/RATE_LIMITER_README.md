# Rate Limiter Implementation

## Overview

The RateLimiter provides distributed rate limiting functionality using Redis sorted sets with a sliding window algorithm. It protects API endpoints from abuse and ensures fair resource usage across all users.

**Requirements Implemented:** 4.1, 4.2, 4.4, 4.5, 4.6, 4.7

## Features

- **Sliding Window Algorithm**: Accurate rate limiting using Redis sorted sets
- **Distributed Rate Limiting**: Works across multiple server instances
- **Automatic Cleanup**: Old entries outside the time window are automatically removed
- **Flexible Identifiers**: Support for per-user, per-IP, and per-endpoint limits
- **Cost-Based Limiting**: Support for requests with different costs
- **Fallback Mechanism**: Automatic fallback to in-memory rate limiting when Redis is unavailable
- **Statistics Tracking**: Monitor allowed/denied requests and fallback usage
- **Health Checks**: Built-in health check functionality

## Architecture

### Sliding Window Algorithm

The rate limiter uses Redis sorted sets to implement a sliding window algorithm:

1. **Key Structure**: `ratelimit:{identifier}`
2. **Sorted Set**: Each request is stored as a member with timestamp as score
3. **Window Sliding**: Old entries outside the window are removed before checking
4. **Atomic Operations**: All Redis operations are atomic to prevent race conditions

```
Time Window (60 seconds)
|<-------------------------------->|
[req1][req2][req3][req4][req5]    [current_time]
  ^                                      ^
  window_start                           now
  
Requests older than window_start are removed
```

### Components

1. **RateLimiter**: Main class with Redis-based rate limiting
2. **InMemoryRateLimiter**: Fallback implementation for when Redis is unavailable
3. **RateLimitResult**: Result object containing rate limit status

## Usage

### Basic Usage

```python
from datetime import timedelta
from backend.infrastructure.redis_client import get_redis_client
from backend.infrastructure.rate_limiter import RateLimiter, RateLimitStrategy

# Initialize Redis client
redis_client = get_redis_client()
await redis_client.connect()

# Create rate limiter
rate_limiter = RateLimiter(
    redis_client=redis_client,
    strategy=RateLimitStrategy.SLIDING_WINDOW
)

# Check rate limit
identifier = "user:123"
limit = 100  # 100 requests
window = timedelta(minutes=1)  # per minute

result = await rate_limiter.check_rate_limit(
    identifier=identifier,
    limit=limit,
    window=window
)

if result.allowed:
    # Process request
    print(f"Request allowed. Remaining: {result.remaining}")
else:
    # Reject request
    print(f"Rate limit exceeded. Retry after: {result.retry_after} seconds")
```

### Per-User Rate Limiting

```python
# Rate limit per user
user_id = "user:123"
result = await rate_limiter.check_rate_limit(
    identifier=f"user:{user_id}",
    limit=60,  # 60 requests
    window=timedelta(minutes=1)  # per minute
)
```

### Per-IP Rate Limiting

```python
# Rate limit per IP address
ip_address = "192.168.1.100"
result = await rate_limiter.check_rate_limit(
    identifier=f"ip:{ip_address}",
    limit=100,  # 100 requests
    window=timedelta(minutes=1)  # per minute
)
```

### Per-Endpoint Rate Limiting

```python
# Rate limit per endpoint
endpoint = "/api/chat/message"
user_id = "user:123"
result = await rate_limiter.check_rate_limit(
    identifier=f"endpoint:{endpoint}:user:{user_id}",
    limit=20,  # 20 requests
    window=timedelta(minutes=1)  # per minute
)
```

### Cost-Based Rate Limiting

```python
# Different requests can have different costs
# For example, AI generation might cost more than simple queries

# Simple query (cost = 1)
result = await rate_limiter.check_rate_limit(
    identifier="user:123",
    limit=100,
    window=timedelta(minutes=1),
    cost=1
)

# AI generation (cost = 10)
result = await rate_limiter.check_rate_limit(
    identifier="user:123",
    limit=100,
    window=timedelta(minutes=1),
    cost=10  # This request costs 10 units
)
```

### Get Remaining Requests

```python
# Check how many requests are remaining without consuming quota
remaining = await rate_limiter.get_remaining(
    identifier="user:123",
    limit=100,
    window=timedelta(minutes=1)
)

print(f"Remaining requests: {remaining}")
```

### Reset Rate Limit

```python
# Reset rate limit for a user (useful for testing or admin operations)
success = await rate_limiter.reset("user:123")

if success:
    print("Rate limit reset successfully")
```

### Get Statistics

```python
# Get statistics for a specific identifier
stats = await rate_limiter.get_stats("user:123")
print(f"Request count: {stats['request_count']}")
print(f"TTL: {stats['ttl_seconds']} seconds")

# Get global statistics
global_stats = rate_limiter.get_global_stats()
print(f"Allowed: {global_stats['allowed']}")
print(f"Denied: {global_stats['denied']}")
print(f"Allow rate: {global_stats['allow_rate']}")
print(f"Fallback used: {global_stats['fallback_used']}")
```

### Health Check

```python
# Check rate limiter health
health = await rate_limiter.health_check()

if health["healthy"]:
    print("Rate limiter is healthy")
    if health["redis_available"]:
        print("Using Redis for distributed rate limiting")
    else:
        print("Using in-memory fallback")
else:
    print("Rate limiter is unhealthy")
```

## Rate Limit Tiers

You can implement different rate limit tiers for different user types:

```python
# Define rate limit tiers
RATE_LIMIT_TIERS = {
    "anonymous": {"limit": 10, "window": timedelta(minutes=1)},
    "authenticated": {"limit": 60, "window": timedelta(minutes=1)},
    "premium": {"limit": 300, "window": timedelta(minutes=1)},
    "admin": {"limit": 1000, "window": timedelta(minutes=1)}
}

# Apply rate limit based on user tier
async def check_user_rate_limit(user_id: str, user_tier: str):
    tier_config = RATE_LIMIT_TIERS.get(user_tier, RATE_LIMIT_TIERS["anonymous"])
    
    result = await rate_limiter.check_rate_limit(
        identifier=f"user:{user_id}",
        limit=tier_config["limit"],
        window=tier_config["window"]
    )
    
    return result
```

## FastAPI Integration

### Middleware Example

```python
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse

app = FastAPI()

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    # Extract identifier (user ID, IP, etc.)
    user_id = request.state.user_id if hasattr(request.state, "user_id") else None
    ip_address = request.client.host
    
    identifier = f"user:{user_id}" if user_id else f"ip:{ip_address}"
    
    # Check rate limit
    result = await rate_limiter.check_rate_limit(
        identifier=identifier,
        limit=100,
        window=timedelta(minutes=1)
    )
    
    # Add rate limit headers to response
    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = "100"
    response.headers["X-RateLimit-Remaining"] = str(result.remaining)
    response.headers["X-RateLimit-Reset"] = result.reset_at.isoformat()
    
    if not result.allowed:
        response.headers["Retry-After"] = str(result.retry_after)
        return JSONResponse(
            status_code=429,
            content={
                "error": "RATE_LIMIT_EXCEEDED",
                "message": "Too many requests",
                "retry_after": result.retry_after
            }
        )
    
    return response
```

### Dependency Example

```python
from fastapi import Depends, HTTPException

async def rate_limit_dependency(
    request: Request,
    limit: int = 60,
    window_seconds: int = 60
):
    """Rate limit dependency for FastAPI endpoints."""
    user_id = request.state.user_id if hasattr(request.state, "user_id") else None
    ip_address = request.client.host
    
    identifier = f"user:{user_id}" if user_id else f"ip:{ip_address}"
    
    result = await rate_limiter.check_rate_limit(
        identifier=identifier,
        limit=limit,
        window=timedelta(seconds=window_seconds)
    )
    
    if not result.allowed:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "RATE_LIMIT_EXCEEDED",
                "message": "Too many requests",
                "retry_after": result.retry_after
            },
            headers={
                "Retry-After": str(result.retry_after),
                "X-RateLimit-Reset": result.reset_at.isoformat()
            }
        )
    
    return result

# Use in endpoint
@app.post("/api/chat/message")
async def send_message(
    message: str,
    rate_limit: RateLimitResult = Depends(rate_limit_dependency)
):
    # Process message
    return {"status": "success", "remaining": rate_limit.remaining}
```

## Fallback Behavior

When Redis is unavailable, the rate limiter automatically falls back to in-memory rate limiting:

- **Automatic Detection**: Detects Redis connection failures
- **Seamless Fallback**: Switches to in-memory limiter without errors
- **Per-Instance Limiting**: In-memory limiter works per server instance (not distributed)
- **Statistics Tracking**: Tracks fallback usage in statistics

```python
# Fallback is automatic - no code changes needed
result = await rate_limiter.check_rate_limit(
    identifier="user:123",
    limit=100,
    window=timedelta(minutes=1)
)

# Check if fallback was used
if rate_limiter._stats["fallback_used"] > 0:
    print("Warning: Using in-memory fallback (Redis unavailable)")
```

## Best Practices

### 1. Choose Appropriate Identifiers

```python
# Good: Specific identifiers
"user:123"
"ip:192.168.1.100"
"endpoint:/api/chat:user:123"

# Bad: Too generic
"user"
"request"
```

### 2. Set Reasonable Limits

```python
# Consider your API capacity and user needs
# Too strict: Frustrates users
# Too loose: Doesn't protect against abuse

# Example: Chat API
CHAT_LIMITS = {
    "send_message": {"limit": 60, "window": timedelta(minutes=1)},
    "get_history": {"limit": 100, "window": timedelta(minutes=1)},
    "create_session": {"limit": 10, "window": timedelta(minutes=1)}
}
```

### 3. Use Cost-Based Limiting for Expensive Operations

```python
# Expensive operations should cost more
async def handle_ai_generation(user_id: str):
    result = await rate_limiter.check_rate_limit(
        identifier=f"user:{user_id}",
        limit=100,
        window=timedelta(minutes=1),
        cost=10  # AI generation costs 10 units
    )
    
    if not result.allowed:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
```

### 4. Monitor Statistics

```python
# Regularly check statistics to tune limits
stats = rate_limiter.get_global_stats()

if stats["deny_rate"] > 0.1:  # More than 10% denied
    print("Warning: High rate limit denial rate")
    print("Consider increasing limits or investigating abuse")

if stats["fallback_rate"] > 0:
    print("Warning: Redis unavailable, using fallback")
    print("Check Redis connection and health")
```

### 5. Implement Graceful Degradation

```python
# Always handle rate limit errors gracefully
try:
    result = await rate_limiter.check_rate_limit(
        identifier="user:123",
        limit=100,
        window=timedelta(minutes=1)
    )
    
    if not result.allowed:
        # Return user-friendly error
        return {
            "error": "Too many requests",
            "retry_after": result.retry_after,
            "message": f"Please wait {result.retry_after} seconds before trying again"
        }
except Exception as e:
    # Log error but don't fail the request
    logger.error(f"Rate limit check failed: {e}")
    # Allow request to proceed (fail open)
```

## Configuration

### Environment Variables

```bash
# Redis configuration (used by RedisClient)
REDIS_URL=redis://localhost:6379/0
REDIS_MIN_CONNECTIONS=5
REDIS_MAX_CONNECTIONS=50
REDIS_CONNECTION_TIMEOUT=5
REDIS_SOCKET_KEEPALIVE=true
REDIS_HEALTH_CHECK_INTERVAL=30
```

### Rate Limit Configuration

```python
# Define rate limits in configuration file
RATE_LIMITS = {
    # Per-user limits
    "user": {
        "default": {"limit": 60, "window": timedelta(minutes=1)},
        "premium": {"limit": 300, "window": timedelta(minutes=1)},
        "admin": {"limit": 1000, "window": timedelta(minutes=1)}
    },
    
    # Per-IP limits (for anonymous users)
    "ip": {
        "default": {"limit": 10, "window": timedelta(minutes=1)}
    },
    
    # Per-endpoint limits
    "endpoints": {
        "/api/chat/message": {"limit": 20, "window": timedelta(minutes=1)},
        "/api/code/generate": {"limit": 5, "window": timedelta(minutes=1)},
        "/api/projects": {"limit": 100, "window": timedelta(minutes=1)}
    }
}
```

## Testing

### Unit Tests

Run the unit tests:

```bash
pytest backend/tests/test_rate_limiter.py -v
```

### Manual Testing

```python
# Test rate limiting manually
import asyncio
from datetime import timedelta

async def test_rate_limiting():
    # Initialize
    redis_client = get_redis_client()
    await redis_client.connect()
    
    rate_limiter = RateLimiter(redis_client=redis_client)
    
    # Test: Make requests up to limit
    identifier = "test:user:123"
    limit = 5
    window = timedelta(seconds=10)
    
    print(f"Testing rate limit: {limit} requests per {window.total_seconds()} seconds")
    
    for i in range(limit + 2):
        result = await rate_limiter.check_rate_limit(identifier, limit, window)
        
        print(f"Request {i+1}: allowed={result.allowed}, remaining={result.remaining}")
        
        if not result.allowed:
            print(f"Rate limit exceeded! Retry after: {result.retry_after} seconds")
    
    # Cleanup
    await rate_limiter.reset(identifier)
    await redis_client.disconnect()

# Run test
asyncio.run(test_rate_limiting())
```

## Performance

### Redis Operations

- **ZREMRANGEBYSCORE**: O(log(N) + M) where N is number of elements, M is removed elements
- **ZCARD**: O(1)
- **ZADD**: O(log(N)) per element
- **ZRANGE**: O(log(N) + M) where M is returned elements

### Optimization Tips

1. **Use appropriate window sizes**: Smaller windows = more frequent cleanup
2. **Set key expiration**: Prevents memory leaks
3. **Monitor Redis memory**: Use `INFO memory` to track usage
4. **Use connection pooling**: Reuse Redis connections

## Troubleshooting

### High Denial Rate

```python
# Check statistics
stats = rate_limiter.get_global_stats()
print(f"Deny rate: {stats['deny_rate']}")

# Possible causes:
# 1. Limits too strict
# 2. Legitimate traffic spike
# 3. Abuse/attack

# Solutions:
# 1. Increase limits for legitimate users
# 2. Implement tiered limits
# 3. Add IP-based blocking for abuse
```

### Redis Connection Issues

```python
# Check health
health = await rate_limiter.health_check()

if not health["redis_available"]:
    print("Redis unavailable - using fallback")
    # Check Redis connection
    # Verify REDIS_URL environment variable
    # Check Redis server status
```

### Memory Usage

```python
# Monitor Redis memory
async with redis_client.get_client() as client:
    info = await client.info("memory")
    print(f"Used memory: {info['used_memory_human']}")
    print(f"Peak memory: {info['used_memory_peak_human']}")

# If memory is high:
# 1. Reduce window sizes
# 2. Ensure key expiration is set
# 3. Increase Redis memory limit
```

## Summary

The RateLimiter provides robust, distributed rate limiting with:

✅ Sliding window algorithm for accurate rate limiting  
✅ Redis-based distributed limiting across multiple servers  
✅ Automatic fallback to in-memory limiting  
✅ Support for per-user, per-IP, and per-endpoint limits  
✅ Cost-based limiting for different request types  
✅ Comprehensive statistics and monitoring  
✅ Health checks and error handling  

**Requirements Validated:**
- 4.1: Sliding window rate limiting algorithm ✅
- 4.2: Check if request count is within configured limit ✅
- 4.4: Increment request count for identifier ✅
- 4.5: Support per-user, per-IP, and per-endpoint limits ✅
- 4.6: Support different rate limit tiers ✅
- 4.7: Fallback to in-memory rate limiting on Redis failure ✅
