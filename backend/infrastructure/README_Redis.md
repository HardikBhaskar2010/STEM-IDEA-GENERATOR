# Redis Infrastructure

This document describes the Redis infrastructure setup for the STEM Project Generator backend services.

## Overview

The Redis infrastructure provides:
- **Connection pooling** (min: 5, max: 50 connections)
- **Connection timeout** (5 seconds) and keepalive
- **Comprehensive error handling** with automatic fallback
- **Health check functionality** for monitoring
- **Automatic reconnection** on failures

## Architecture

```
┌─────────────────────────────────────────┐
│         Application Layer               │
│  (Services, Cache Manager, Rate Limiter)│
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         RedisClient Wrapper             │
│  - Connection pooling                   │
│  - Error handling                       │
│  - Health checks                        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      Redis Connection Pool              │
│  Min: 5 connections                     │
│  Max: 50 connections                    │
│  Timeout: 5 seconds                     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Redis Server                    │
│  (Render, AWS ElastiCache, or Local)    │
└─────────────────────────────────────────┘
```

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379/0
REDIS_MIN_CONNECTIONS=5
REDIS_MAX_CONNECTIONS=50
REDIS_CONNECTION_TIMEOUT=5
REDIS_SOCKET_KEEPALIVE=true
REDIS_HEALTH_CHECK_INTERVAL=30
```

### Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379/0` |
| `REDIS_MIN_CONNECTIONS` | Minimum connections in pool | `5` |
| `REDIS_MAX_CONNECTIONS` | Maximum connections in pool | `50` |
| `REDIS_CONNECTION_TIMEOUT` | Connection timeout (seconds) | `5` |
| `REDIS_SOCKET_KEEPALIVE` | Enable socket keepalive | `true` |
| `REDIS_HEALTH_CHECK_INTERVAL` | Health check interval (seconds) | `30` |

## Redis Deployment Options

### Option 1: Render (Recommended for Production)

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Redis"
3. Configure:
   - Name: `stem-generator-redis`
   - Plan: Free (25 MB) or Starter ($10/month, 256 MB)
   - Region: Choose closest to your backend
4. Copy the Internal Redis URL
5. Update `.env`:
   ```bash
   REDIS_URL=redis://red-xxxxx:6379
   ```

**Pros:**
- Managed service (automatic backups, monitoring)
- Free tier available
- Easy setup
- Automatic SSL/TLS

**Cons:**
- Free tier has 25 MB limit
- Shared resources on free tier

### Option 2: AWS ElastiCache

1. Go to AWS ElastiCache Console
2. Create Redis cluster:
   - Engine: Redis
   - Node type: cache.t3.micro (free tier eligible)
   - Number of replicas: 0 (for development)
3. Configure security group to allow access from backend
4. Copy the Primary Endpoint
5. Update `.env`:
   ```bash
   REDIS_URL=redis://your-cluster.cache.amazonaws.com:6379
   ```

**Pros:**
- Highly scalable
- Production-grade reliability
- Advanced features (clustering, replication)
- Free tier available (750 hours/month)

**Cons:**
- More complex setup
- Requires AWS account
- VPC configuration needed

### Option 3: Local Redis (Development Only)

**macOS:**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis-server
```

**Docker:**
```bash
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

**Configuration:**
```bash
REDIS_URL=redis://localhost:6379/0
```

**Pros:**
- Free
- Fast (no network latency)
- Full control

**Cons:**
- Not suitable for production
- No automatic backups
- Single point of failure

## Usage

### Basic Usage

```python
from backend.infrastructure.redis_client import get_redis_client, initialize_redis

# Initialize Redis (call once at startup)
redis_client = await initialize_redis()

# Set a value
await redis_client.set("key", "value")

# Get a value
value = await redis_client.get("key")

# Set with expiration (60 seconds)
await redis_client.set("session:123", "user_data", ex=60)

# Delete a key
await redis_client.delete("key")

# Check if key exists
exists = await redis_client.exists("key")

# Get keys by pattern
user_keys = await redis_client.keys("user:*")
```

### Using Context Manager

```python
from backend.infrastructure.redis_client import get_redis_client

redis_client = get_redis_client()

async with redis_client.get_client() as client:
    # Use raw Redis client for advanced operations
    await client.zadd("leaderboard", {"player1": 100, "player2": 200})
    scores = await client.zrange("leaderboard", 0, -1, withscores=True)
```

### Health Checks

```python
from backend.infrastructure.redis_client import get_redis_client

redis_client = get_redis_client()

# Perform health check
health = await redis_client.health_check()

if health["healthy"]:
    print(f"Redis is healthy (latency: {health['latency_ms']}ms)")
    print(f"Pool stats: {health['pool_stats']}")
else:
    print(f"Redis is unhealthy: {health['error']}")
```

## Testing

### Run Unit Tests

```bash
cd backend
pytest tests/test_redis_client.py -v
```

### Run Manual Connection Test

```bash
cd backend
python scripts/test_redis_connection.py
```

This script will:
1. Connect to Redis
2. Perform health check
3. Test basic operations (SET, GET, DELETE, etc.)
4. Test expiration
5. Test pattern matching
6. Test concurrent operations
7. Clean up test data

## Connection Pooling

The Redis client uses connection pooling to efficiently manage connections:

- **Minimum connections (5)**: Always maintained in the pool
- **Maximum connections (50)**: Pool can grow up to this limit under load
- **Connection timeout (5s)**: Maximum time to wait for a connection
- **Socket keepalive**: Keeps connections alive to prevent timeouts
- **Health check interval (30s)**: Periodic health checks on idle connections

### Pool Behavior

1. **Initial state**: Pool starts with 5 connections
2. **Under load**: Pool grows up to 50 connections as needed
3. **Idle connections**: Automatically closed after timeout
4. **Failed connections**: Automatically removed and replaced
5. **Health checks**: Periodic checks ensure connection validity

## Error Handling

The Redis client handles errors gracefully:

### Connection Errors
- **Automatic retry**: Failed connections are retried automatically
- **Fallback**: Operations return safe defaults (None, False, 0) on failure
- **Logging**: All errors are logged with context

### Operation Errors
- **Non-blocking**: Failed operations don't crash the application
- **Safe defaults**: Operations return appropriate defaults on failure
- **Error logging**: All errors are logged for debugging

### Example Error Handling

```python
# Operations handle errors gracefully
value = await redis_client.get("key")  # Returns None on error
success = await redis_client.set("key", "value")  # Returns False on error
deleted = await redis_client.delete("key")  # Returns 0 on error
```

## Monitoring

### Health Check Endpoint

Add to your FastAPI application:

```python
from fastapi import FastAPI
from backend.infrastructure.redis_client import get_redis_client

app = FastAPI()

@app.get("/health/redis")
async def redis_health():
    redis_client = get_redis_client()
    health = await redis_client.health_check()
    
    if health["healthy"]:
        return {
            "status": "healthy",
            "latency_ms": health["latency_ms"],
            "pool": health["pool_stats"]
        }
    else:
        return {
            "status": "unhealthy",
            "error": health["error"]
        }, 503
```

### Metrics to Monitor

1. **Connection pool utilization**
   - Available connections
   - In-use connections
   - Pool exhaustion events

2. **Operation latency**
   - Average latency
   - P95/P99 latency
   - Slow operations (>100ms)

3. **Error rate**
   - Connection errors
   - Operation errors
   - Timeout errors

4. **Cache hit rate** (when using for caching)
   - Hits vs misses
   - Eviction rate
   - Memory usage

## Best Practices

### 1. Use Appropriate TTLs

```python
# Short-lived data (sessions)
await redis_client.set("session:123", data, ex=3600)  # 1 hour

# Medium-lived data (cache)
await redis_client.set("cache:user:123", data, ex=7200)  # 2 hours

# Long-lived data (configuration)
await redis_client.set("config:feature_flags", data, ex=86400)  # 24 hours
```

### 2. Use Key Namespaces

```python
# Good: Organized with namespaces
await redis_client.set("user:123:profile", data)
await redis_client.set("session:abc:data", data)
await redis_client.set("cache:project:456", data)

# Bad: Flat keys
await redis_client.set("user123", data)
await redis_client.set("sessionabc", data)
```

### 3. Handle Errors Gracefully

```python
# Always check return values
value = await redis_client.get("key")
if value is None:
    # Key doesn't exist or error occurred
    # Fetch from database as fallback
    value = await fetch_from_database()
```

### 4. Clean Up Test Data

```python
# In tests, always clean up
async def test_something(redis_client):
    # Test code
    await redis_client.set("test:key", "value")
    
    # Clean up
    await redis_client.delete("test:key")
```

### 5. Use Connection Pool Efficiently

```python
# Good: Reuse client instance
redis_client = get_redis_client()
for i in range(100):
    await redis_client.set(f"key:{i}", f"value:{i}")

# Bad: Create new client each time
for i in range(100):
    client = RedisClient()
    await client.connect()
    await client.set(f"key:{i}", f"value:{i}")
    await client.disconnect()
```

## Troubleshooting

### Connection Refused

**Error:** `ConnectionError: Error connecting to Redis`

**Solutions:**
1. Check Redis is running: `redis-cli ping`
2. Verify REDIS_URL is correct
3. Check firewall/security group settings
4. Ensure Redis is listening on correct port

### Connection Timeout

**Error:** `TimeoutError: Connection timeout`

**Solutions:**
1. Increase `REDIS_CONNECTION_TIMEOUT`
2. Check network latency to Redis server
3. Verify Redis server is not overloaded
4. Check connection pool is not exhausted

### Pool Exhausted

**Error:** `ConnectionError: Connection pool exhausted`

**Solutions:**
1. Increase `REDIS_MAX_CONNECTIONS`
2. Reduce connection hold time
3. Check for connection leaks
4. Scale Redis server

### Memory Issues

**Error:** `ResponseError: OOM command not allowed`

**Solutions:**
1. Increase Redis memory limit
2. Set appropriate TTLs on keys
3. Implement eviction policy
4. Clean up unused keys

## Security

### Production Checklist

- [ ] Use TLS/SSL for Redis connections
- [ ] Set strong Redis password
- [ ] Restrict Redis access to backend servers only
- [ ] Use private network for Redis (VPC)
- [ ] Enable Redis AUTH
- [ ] Disable dangerous commands (FLUSHDB, FLUSHALL)
- [ ] Monitor for suspicious activity
- [ ] Regular security updates

### Secure Connection String

```bash
# With password
REDIS_URL=redis://:password@host:6379/0

# With TLS
REDIS_URL=rediss://host:6379/0

# With password and TLS
REDIS_URL=rediss://:password@host:6379/0
```

## Next Steps

After setting up Redis:

1. **Implement Cache Manager** (Task 2.1)
   - Use RedisClient for caching operations
   - Implement cache-aside, write-through patterns
   - Add cache statistics

2. **Implement Rate Limiter** (Task 2.3)
   - Use Redis sorted sets for sliding window
   - Track request counts per user/IP
   - Enforce rate limits

3. **Implement Circuit Breaker** (Task 2.5)
   - Store circuit state in Redis
   - Track failure/success counts
   - Coordinate across multiple instances

## References

- [Redis Documentation](https://redis.io/documentation)
- [redis-py Documentation](https://redis-py.readthedocs.io/)
- [Render Redis](https://render.com/docs/redis)
- [AWS ElastiCache](https://aws.amazon.com/elasticache/)
