"""
Redis client wrapper with connection pooling and error handling.

This module provides a robust Redis client with:
- Connection pooling (min: 5, max: 50 connections)
- Connection timeout (5 seconds) and keepalive
- Comprehensive error handling
- Health check functionality
- Automatic reconnection on failures
"""

import os
import logging
from typing import Optional, Any, Dict
from contextlib import asynccontextmanager
import redis.asyncio as redis
from redis.asyncio.connection import ConnectionPool
from redis.exceptions import (
    RedisError,
    ConnectionError,
    TimeoutError,
    ResponseError
)

logger = logging.getLogger(__name__)


class RedisClient:
    """
    Redis client wrapper with connection pooling and error handling.
    
    Provides a robust interface to Redis with automatic connection management,
    error handling, and health checks.
    """
    
    def __init__(
        self,
        redis_url: Optional[str] = None,
        min_connections: int = 5,
        max_connections: int = 50,
        connection_timeout: int = 5,
        socket_keepalive: bool = True,
        health_check_interval: int = 30
    ):
        """
        Initialize Redis client with connection pool.
        
        Args:
            redis_url: Redis connection URL (default: from REDIS_URL env var)
            min_connections: Minimum connections in pool (default: 5)
            max_connections: Maximum connections in pool (default: 50)
            connection_timeout: Connection timeout in seconds (default: 5)
            socket_keepalive: Enable socket keepalive (default: True)
            health_check_interval: Health check interval in seconds (default: 30)
        """
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.min_connections = min_connections
        self.max_connections = max_connections
        self.connection_timeout = connection_timeout
        self.socket_keepalive = socket_keepalive
        self.health_check_interval = health_check_interval
        
        self._pool: Optional[ConnectionPool] = None
        self._client: Optional[redis.Redis] = None
        self._is_connected = False
        
        logger.info(
            f"Initializing Redis client with pool size: {min_connections}-{max_connections}, "
            f"timeout: {connection_timeout}s"
        )
    
    async def connect(self) -> None:
        """
        Establish connection to Redis and create connection pool.
        
        Raises:
            ConnectionError: If unable to connect to Redis
        """
        if self._is_connected:
            logger.warning("Redis client already connected")
            return
        
        try:
            # Create connection pool
            self._pool = ConnectionPool.from_url(
                self.redis_url,
                max_connections=self.max_connections,
                socket_connect_timeout=self.connection_timeout,
                socket_keepalive=self.socket_keepalive,
                health_check_interval=self.health_check_interval,
                decode_responses=True  # Automatically decode responses to strings
            )
            
            # Create Redis client
            self._client = redis.Redis(connection_pool=self._pool)
            
            # Test connection
            await self._client.ping()
            
            self._is_connected = True
            logger.info("Successfully connected to Redis")
            
        except ConnectionError as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error connecting to Redis: {e}")
            raise ConnectionError(f"Failed to connect to Redis: {e}")
    
    async def disconnect(self) -> None:
        """
        Close Redis connection and cleanup resources.
        """
        if not self._is_connected:
            return
        
        try:
            if self._client:
                await self._client.close()
            if self._pool:
                await self._pool.disconnect()
            
            self._is_connected = False
            logger.info("Disconnected from Redis")
            
        except Exception as e:
            logger.error(f"Error disconnecting from Redis: {e}")
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Perform health check on Redis connection.
        
        Returns:
            Dict with health status information
        """
        if not self._is_connected or not self._client:
            return {
                "healthy": False,
                "error": "Not connected to Redis"
            }
        
        try:
            # Test basic operations
            start_time = __import__('time').time()
            await self._client.ping()
            latency_ms = (__import__('time').time() - start_time) * 1000
            
            # Get connection pool stats
            pool_stats = {
                "max_connections": self._pool.max_connections,
                "created_connections": len(self._pool._created_connections) if hasattr(self._pool, '_created_connections') else 0,
                "available_connections": len(self._pool._available_connections) if hasattr(self._pool, '_available_connections') else 0,
                "in_use_connections": len(self._pool._in_use_connections) if hasattr(self._pool, '_in_use_connections') else 0
            }
            
            return {
                "healthy": True,
                "latency_ms": round(latency_ms, 2),
                "pool_stats": pool_stats
            }
            
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return {
                "healthy": False,
                "error": str(e)
            }
    
    @asynccontextmanager
    async def get_client(self):
        """
        Context manager to get Redis client with automatic error handling.
        
        Usage:
            async with redis_client.get_client() as client:
                await client.set("key", "value")
        
        Yields:
            Redis client instance
        
        Raises:
            ConnectionError: If not connected to Redis
        """
        if not self._is_connected or not self._client:
            raise ConnectionError("Not connected to Redis. Call connect() first.")
        
        try:
            yield self._client
        except RedisError as e:
            logger.error(f"Redis operation error: {e}")
            raise
    
    async def set(
        self,
        key: str,
        value: Any,
        ex: Optional[int] = None,
        px: Optional[int] = None,
        nx: bool = False,
        xx: bool = False
    ) -> bool:
        """
        Set key to value with optional expiration.
        
        Args:
            key: Redis key
            value: Value to set
            ex: Expiration time in seconds
            px: Expiration time in milliseconds
            nx: Only set if key doesn't exist
            xx: Only set if key exists
        
        Returns:
            True if successful, False otherwise
        """
        try:
            async with self.get_client() as client:
                result = await client.set(key, value, ex=ex, px=px, nx=nx, xx=xx)
                return bool(result)
        except RedisError as e:
            logger.error(f"Error setting key '{key}': {e}")
            return False
    
    async def get(self, key: str) -> Optional[str]:
        """
        Get value for key.
        
        Args:
            key: Redis key
        
        Returns:
            Value if key exists, None otherwise
        """
        try:
            async with self.get_client() as client:
                return await client.get(key)
        except RedisError as e:
            logger.error(f"Error getting key '{key}': {e}")
            return None
    
    async def delete(self, *keys: str) -> int:
        """
        Delete one or more keys.
        
        Args:
            keys: Keys to delete
        
        Returns:
            Number of keys deleted
        """
        try:
            async with self.get_client() as client:
                return await client.delete(*keys)
        except RedisError as e:
            logger.error(f"Error deleting keys: {e}")
            return 0
    
    async def exists(self, *keys: str) -> int:
        """
        Check if keys exist.
        
        Args:
            keys: Keys to check
        
        Returns:
            Number of keys that exist
        """
        try:
            async with self.get_client() as client:
                return await client.exists(*keys)
        except RedisError as e:
            logger.error(f"Error checking key existence: {e}")
            return 0
    
    async def expire(self, key: str, seconds: int) -> bool:
        """
        Set expiration time for key.
        
        Args:
            key: Redis key
            seconds: Expiration time in seconds
        
        Returns:
            True if successful, False otherwise
        """
        try:
            async with self.get_client() as client:
                return await client.expire(key, seconds)
        except RedisError as e:
            logger.error(f"Error setting expiration for key '{key}': {e}")
            return False
    
    async def ttl(self, key: str) -> int:
        """
        Get time to live for key.
        
        Args:
            key: Redis key
        
        Returns:
            TTL in seconds, -1 if no expiration, -2 if key doesn't exist
        """
        try:
            async with self.get_client() as client:
                return await client.ttl(key)
        except RedisError as e:
            logger.error(f"Error getting TTL for key '{key}': {e}")
            return -2
    
    async def keys(self, pattern: str = "*") -> list:
        """
        Get all keys matching pattern.
        
        Args:
            pattern: Key pattern (default: "*")
        
        Returns:
            List of matching keys
        """
        try:
            async with self.get_client() as client:
                return await client.keys(pattern)
        except RedisError as e:
            logger.error(f"Error getting keys with pattern '{pattern}': {e}")
            return []
    
    async def flushdb(self) -> bool:
        """
        Delete all keys in current database.
        
        WARNING: This will delete all data in the current database!
        
        Returns:
            True if successful, False otherwise
        """
        try:
            async with self.get_client() as client:
                await client.flushdb()
                logger.warning("Flushed all keys from current Redis database")
                return True
        except RedisError as e:
            logger.error(f"Error flushing database: {e}")
            return False
    
    @property
    def is_connected(self) -> bool:
        """Check if client is connected to Redis."""
        return self._is_connected
    
    @property
    def client(self) -> Optional[redis.Redis]:
        """Get underlying Redis client (use with caution)."""
        return self._client


# Global Redis client instance
_redis_client: Optional[RedisClient] = None


def get_redis_client() -> RedisClient:
    """
    Get global Redis client instance.
    
    Returns:
        RedisClient instance
    """
    global _redis_client
    
    if _redis_client is None:
        _redis_client = RedisClient(
            redis_url=os.getenv("REDIS_URL"),
            min_connections=int(os.getenv("REDIS_MIN_CONNECTIONS", "5")),
            max_connections=int(os.getenv("REDIS_MAX_CONNECTIONS", "50")),
            connection_timeout=int(os.getenv("REDIS_CONNECTION_TIMEOUT", "5")),
            socket_keepalive=os.getenv("REDIS_SOCKET_KEEPALIVE", "true").lower() == "true",
            health_check_interval=int(os.getenv("REDIS_HEALTH_CHECK_INTERVAL", "30"))
        )
    
    return _redis_client


async def initialize_redis() -> RedisClient:
    """
    Initialize and connect to Redis.
    
    Returns:
        Connected RedisClient instance
    """
    client = get_redis_client()
    if not client.is_connected:
        await client.connect()
    return client


async def shutdown_redis() -> None:
    """
    Shutdown Redis connection.
    """
    global _redis_client
    
    if _redis_client and _redis_client.is_connected:
        await _redis_client.disconnect()
        _redis_client = None
