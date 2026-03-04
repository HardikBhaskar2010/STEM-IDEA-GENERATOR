# Redis Setup Guide

This guide will help you provision and configure a Redis instance for the STEM Project Generator backend.

## Quick Start

### Option 1: Render (Recommended - Free Tier Available)

1. **Sign up for Render** (if you haven't already)
   - Go to https://render.com/
   - Sign up with GitHub or email

2. **Create Redis Instance**
   - Click "New +" → "Redis"
   - Configure:
     - **Name**: `stem-generator-redis`
     - **Plan**: Free (25 MB) or Starter ($10/month, 256 MB)
     - **Region**: Choose closest to your backend (e.g., Oregon for US West)
     - **Maxmemory Policy**: `allkeys-lru` (recommended for caching)
   - Click "Create Redis"

3. **Get Connection URL**
   - Once created, copy the **Internal Redis URL**
   - It will look like: `redis://red-xxxxxxxxxxxxx:6379`

4. **Update Backend Configuration**
   - Open `backend/.env`
   - Update the Redis URL:
     ```bash
     REDIS_URL=redis://red-xxxxxxxxxxxxx:6379
     ```

5. **Test Connection**
   ```bash
   cd backend
   python scripts/test_redis_connection.py
   ```

### Option 2: AWS ElastiCache (Production Grade)

1. **Go to AWS ElastiCache Console**
   - https://console.aws.amazon.com/elasticache/

2. **Create Redis Cluster**
   - Click "Create" → "Redis"
   - Configure:
     - **Cluster mode**: Disabled (for simplicity)
     - **Name**: `stem-generator-redis`
     - **Node type**: `cache.t3.micro` (free tier eligible)
     - **Number of replicas**: 0 (for development)
     - **Subnet group**: Create new or use existing
     - **Security group**: Allow access from backend servers

3. **Configure Security Group**
   - Add inbound rule:
     - Type: Custom TCP
     - Port: 6379
     - Source: Your backend server security group

4. **Get Connection Endpoint**
   - Once created, copy the **Primary Endpoint**
   - It will look like: `your-cluster.cache.amazonaws.com:6379`

5. **Update Backend Configuration**
   ```bash
   REDIS_URL=redis://your-cluster.cache.amazonaws.com:6379
   ```

### Option 3: Local Redis (Development Only)

**macOS:**
```bash
# Install Redis
brew install redis

# Start Redis
brew services start redis

# Verify it's running
redis-cli ping
# Should return: PONG
```

**Ubuntu/Debian:**
```bash
# Install Redis
sudo apt-get update
sudo apt-get install redis-server

# Start Redis
sudo systemctl start redis-server

# Enable auto-start on boot
sudo systemctl enable redis-server

# Verify it's running
redis-cli ping
# Should return: PONG
```

**Windows (using Docker):**
```bash
# Install Docker Desktop first, then:
docker run -d -p 6379:6379 --name redis redis:7-alpine

# Verify it's running
docker exec redis redis-cli ping
# Should return: PONG
```

**Configuration:**
```bash
REDIS_URL=redis://localhost:6379/0
```

## Verify Installation

After setting up Redis, test the connection:

```bash
cd backend
python scripts/test_redis_connection.py
```

You should see:
```
============================================================
Redis Connection Test
============================================================

Connecting to Redis: redis://...

1. Connecting to Redis...
   ✓ Connected successfully

2. Performing health check...
   ✓ Health check passed
   - Latency: 2.5ms
   - Pool stats: {...}

... (more tests)

============================================================
All tests passed! ✓
============================================================
```

## Configuration Reference

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379/0` | Yes |
| `REDIS_MIN_CONNECTIONS` | Minimum connections in pool | `5` | No |
| `REDIS_MAX_CONNECTIONS` | Maximum connections in pool | `50` | No |
| `REDIS_CONNECTION_TIMEOUT` | Connection timeout (seconds) | `5` | No |
| `REDIS_SOCKET_KEEPALIVE` | Enable socket keepalive | `true` | No |
| `REDIS_HEALTH_CHECK_INTERVAL` | Health check interval (seconds) | `30` | No |

### Example .env Configuration

```bash
# Redis Configuration
REDIS_URL=redis://red-xxxxxxxxxxxxx:6379
REDIS_MIN_CONNECTIONS=5
REDIS_MAX_CONNECTIONS=50
REDIS_CONNECTION_TIMEOUT=5
REDIS_SOCKET_KEEPALIVE=true
REDIS_HEALTH_CHECK_INTERVAL=30
```

## Connection Pool Settings

The Redis client is configured with:
- **Min connections**: 5 (always maintained)
- **Max connections**: 50 (can grow under load)
- **Connection timeout**: 5 seconds
- **Socket keepalive**: Enabled (prevents idle timeouts)
- **Health check interval**: 30 seconds (periodic connection validation)

These settings are optimized for:
- High concurrency (up to 50 simultaneous operations)
- Low latency (5s timeout)
- Connection reliability (keepalive + health checks)
- Resource efficiency (minimum 5 connections)

## Troubleshooting

### Connection Refused

**Error:** `ConnectionError: Error connecting to localhost:6379`

**Solutions:**
1. Check Redis is running:
   ```bash
   # macOS/Linux
   redis-cli ping
   
   # Docker
   docker ps | grep redis
   ```

2. Verify Redis URL in `.env` is correct

3. Check firewall settings (if using remote Redis)

### Authentication Failed

**Error:** `AuthenticationError: invalid password`

**Solutions:**
1. Check if Redis requires password
2. Update REDIS_URL with password:
   ```bash
   REDIS_URL=redis://:your_password@host:6379/0
   ```

### Connection Timeout

**Error:** `TimeoutError: Connection timeout`

**Solutions:**
1. Increase `REDIS_CONNECTION_TIMEOUT` in `.env`
2. Check network latency to Redis server
3. Verify Redis server is not overloaded

### Memory Issues

**Error:** `ResponseError: OOM command not allowed`

**Solutions:**
1. Upgrade Redis plan (increase memory)
2. Set appropriate TTLs on cached data
3. Configure eviction policy (e.g., `allkeys-lru`)
4. Clean up unused keys

## Security Best Practices

### For Production

1. **Use TLS/SSL**
   ```bash
   REDIS_URL=rediss://host:6379/0  # Note: rediss (with double 's')
   ```

2. **Set Strong Password**
   ```bash
   REDIS_URL=rediss://:strong_password_here@host:6379/0
   ```

3. **Restrict Network Access**
   - Use VPC/private network
   - Configure security groups
   - Whitelist only backend servers

4. **Disable Dangerous Commands**
   - In Redis config, disable: `FLUSHDB`, `FLUSHALL`, `CONFIG`, `SHUTDOWN`

5. **Enable AUTH**
   - Require password for all connections

6. **Monitor Access**
   - Enable Redis slow log
   - Monitor for suspicious patterns
   - Set up alerts for unusual activity

## Next Steps

After Redis is set up and tested:

1. **Run the test suite**
   ```bash
   cd backend
   pytest tests/test_redis_client.py -v
   ```

2. **Integrate with application**
   - The Redis client is ready to use
   - Import: `from backend.infrastructure.redis_client import get_redis_client`
   - Initialize: `redis_client = await initialize_redis()`

3. **Implement caching** (Task 2.1)
   - Build Cache Manager on top of Redis client
   - Implement cache-aside pattern
   - Add cache statistics

4. **Implement rate limiting** (Task 2.3)
   - Use Redis for distributed rate limiting
   - Implement sliding window algorithm
   - Track requests per user/IP

5. **Monitor Redis health**
   - Add health check endpoint
   - Monitor connection pool usage
   - Track cache hit rates

## Support

If you encounter issues:

1. Check the logs: `backend/logs/` (if logging is configured)
2. Run the test script: `python scripts/test_redis_connection.py`
3. Review the README: `backend/infrastructure/README_Redis.md`
4. Check Redis status: `redis-cli ping` (for local) or Render/AWS dashboard

## Resources

- [Redis Documentation](https://redis.io/documentation)
- [redis-py Documentation](https://redis-py.readthedocs.io/)
- [Render Redis Guide](https://render.com/docs/redis)
- [AWS ElastiCache Guide](https://docs.aws.amazon.com/elasticache/)
