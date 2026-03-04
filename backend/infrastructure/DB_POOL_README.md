# Database Connection Pool Implementation

## Overview

This document describes the asyncpg-based database connection pool implementation for the STEM Project Generator backend. The connection pool provides efficient, scalable database access with proper resource management.

## Requirements Addressed

- **Requirement 12.1**: Database connection pool with minimum 5 and maximum 20 connections
- **Requirement 12.3**: Connection timeout of 30 seconds
- **Requirement 12.4**: Idle timeout of 300 seconds and max lifetime of 1800 seconds
- **Requirement 12.5**: Connection health checks
- **Requirement 12.6**: Connection pool statistics monitoring

## Architecture

### Components

1. **DatabasePoolConfig**: Configuration management for connection pool parameters
2. **ConnectionPoolStats**: Statistics tracking for monitoring and observability
3. **DatabaseConnectionPool**: Main connection pool manager using asyncpg
4. **Global Functions**: Helper functions for easy pool access

### Connection Pool Parameters

```python
# Default configuration (can be overridden via environment variables)
DB_POOL_MIN_SIZE = 5          # Minimum connections (Requirement 12.1)
DB_POOL_MAX_SIZE = 20         # Maximum connections (Requirement 12.1)
DB_CONNECTION_TIMEOUT = 30.0  # Connection acquisition timeout in seconds (Requirement 12.3)
DB_IDLE_TIMEOUT = 300.0       # Idle connection timeout in seconds (Requirement 12.4)
DB_MAX_LIFETIME = 1800.0      # Maximum connection lifetime in seconds (Requirement 12.4)
DB_HEALTH_CHECK_INTERVAL = 60.0  # Health check interval in seconds
```

## Usage

### Basic Usage

```python
from backend.infrastructure.db_pool import get_db_pool

# Get the global pool instance
pool = await get_db_pool()

# Execute a query
result = await pool.fetchval("SELECT COUNT(*) FROM users")

# Fetch multiple rows
rows = await pool.fetch("SELECT * FROM users WHERE active = $1", True)

# Fetch single row
user = await pool.fetchrow("SELECT * FROM users WHERE id = $1", user_id)

# Execute a command
await pool.execute("UPDATE users SET last_login = NOW() WHERE id = $1", user_id)
```

### Advanced Usage - Manual Connection Management

```python
from backend.infrastructure.db_pool import get_db_pool

pool = await get_db_pool()

# Acquire a connection from the pool
connection = await pool.acquire()

try:
    # Use the connection
    async with connection.transaction():
        await connection.execute("INSERT INTO users (name) VALUES ($1)", "John")
        await connection.execute("INSERT INTO profiles (user_id) VALUES ($1)", user_id)
finally:
    # Always release the connection back to the pool
    await pool.release(connection)
```

### Health Checks

```python
from backend.infrastructure.db_pool import get_db_pool

pool = await get_db_pool()

# Perform health check
is_healthy = await pool.health_check()

if not is_healthy:
    logger.error("Database connection pool is unhealthy")
```

### Monitoring and Statistics

```python
from backend.infrastructure.db_pool import get_db_pool

pool = await get_db_pool()

# Get pool statistics
stats = pool.get_pool_stats()

print(f"Active connections: {stats['active_connections']}")
print(f"Free connections: {stats['free_size']}")
print(f"Total queries: {stats['total_queries_executed']}")
print(f"Average query time: {stats['average_query_time_ms']}ms")
print(f"Failed queries: {stats['failed_queries']}")
print(f"Pool exhausted count: {stats['pool_exhausted_count']}")
```

## Configuration

### Environment Variables

Set these environment variables to configure the connection pool:

```bash
# Required
DATABASE_URL=postgresql://user:password@host:5432/database

# Optional (with defaults)
DB_POOL_MIN_SIZE=5
DB_POOL_MAX_SIZE=20
DB_CONNECTION_TIMEOUT=30.0
DB_IDLE_TIMEOUT=300.0
DB_MAX_LIFETIME=1800.0
DB_HEALTH_CHECK_INTERVAL=60.0
```

### Supabase Configuration

For Supabase, the DATABASE_URL should be in the format:

```bash
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

You can find this in your Supabase project settings under "Database" → "Connection string" → "URI".

## Features

### 1. Connection Pooling (Requirement 12.1)

- Maintains a pool of 5-20 database connections
- Connections are reused across requests for efficiency
- Automatic scaling within min/max bounds based on load

### 2. Connection Timeout (Requirement 12.3)

- 30-second timeout when acquiring connections from the pool
- Prevents indefinite waiting when pool is exhausted
- Returns HTTP 503 with Retry-After header when pool is exhausted

### 3. Connection Lifecycle Management (Requirement 12.4)

- **Idle Timeout**: Connections idle for 300 seconds are closed
- **Max Lifetime**: Connections are recycled after 1800 seconds
- **Health Checks**: Periodic health checks every 60 seconds
- Automatic connection cleanup and recreation

### 4. Statistics and Monitoring (Requirement 12.6)

Tracks comprehensive statistics:
- Total connections created/closed
- Active vs. idle connections
- Total queries executed
- Average query time
- Failed queries count
- Connection errors
- Pool exhaustion events
- Health check status

### 5. Error Handling

- Graceful handling of connection failures
- Automatic retry logic for transient errors
- Detailed error logging with context
- Statistics tracking for all error types

## Performance Characteristics

### Connection Reuse

The pool efficiently reuses connections:
- Connections are returned to the pool after use
- No overhead of creating new connections for each request
- Significant performance improvement over creating connections per request

### Concurrency

The pool supports high concurrency:
- Up to 20 concurrent database operations
- Efficient connection distribution across requests
- Automatic queuing when pool is at capacity

### Resource Management

Proper resource cleanup:
- Idle connections are closed to free resources
- Old connections are recycled to prevent stale connections
- Automatic cleanup on application shutdown

## Testing

### Unit Tests

Run the test suite:

```bash
cd backend
pytest tests/test_db_pool.py -v
```

### Load Testing

The test suite includes load tests:
- High concurrency test (100 concurrent queries)
- Sustained load test (100 queries over time)
- Connection reuse verification
- Pool exhaustion handling

### Health Check Testing

```bash
# Test health check endpoint
curl http://localhost:8000/health
```

## Integration with Existing Code

### Migrating from Supabase Client

The connection pool can be used alongside the existing Supabase client:

```python
# Old way (Supabase client)
from backend.database.connection import get_db_client
client = await get_db_client()
result = client.table('users').select('*').execute()

# New way (Connection pool)
from backend.infrastructure.db_pool import get_db_pool
pool = await get_db_pool()
result = await pool.fetch("SELECT * FROM users")
```

### Gradual Migration Strategy

1. Keep existing Supabase client for REST API operations
2. Use connection pool for:
   - High-frequency queries
   - Bulk operations
   - Complex transactions
   - Performance-critical paths

## Troubleshooting

### Pool Exhaustion

If you see "Connection pool exhausted" errors:

1. Check pool statistics to see if max_size is being reached
2. Increase `DB_POOL_MAX_SIZE` if needed
3. Investigate slow queries that hold connections
4. Check for connection leaks (not releasing connections)

### Connection Timeouts

If connections are timing out:

1. Check database server health
2. Verify network connectivity
3. Increase `DB_CONNECTION_TIMEOUT` if needed
4. Check for long-running queries

### Health Check Failures

If health checks are failing:

1. Check database server status
2. Verify connection credentials
3. Check network connectivity
4. Review database logs for errors

## Best Practices

1. **Always release connections**: Use try/finally blocks when manually managing connections
2. **Use pool methods**: Prefer `pool.fetch()` over manual acquire/release
3. **Monitor statistics**: Regularly check pool statistics for issues
4. **Set appropriate timeouts**: Configure timeouts based on your use case
5. **Handle pool exhaustion**: Implement proper error handling for pool exhaustion
6. **Use transactions**: Use asyncpg transactions for multi-statement operations
7. **Avoid long-running queries**: Keep queries fast to avoid holding connections

## Future Enhancements

Potential improvements for future iterations:

1. **Connection load balancing**: Distribute load across multiple database replicas
2. **Query caching**: Cache frequently executed queries
3. **Prepared statements**: Use prepared statements for repeated queries
4. **Connection warming**: Pre-warm connections with common queries
5. **Advanced monitoring**: Integration with Prometheus/Grafana
6. **Circuit breaker**: Implement circuit breaker pattern for database failures

## References

- [asyncpg Documentation](https://magicstack.github.io/asyncpg/)
- [PostgreSQL Connection Pooling](https://www.postgresql.org/docs/current/runtime-config-connection.html)
- [Supabase Database Documentation](https://supabase.com/docs/guides/database)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review pool statistics for insights
3. Check application logs for detailed error messages
4. Consult the asyncpg documentation for advanced usage
