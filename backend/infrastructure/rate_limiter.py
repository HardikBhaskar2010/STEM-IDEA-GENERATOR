"""
Rate Limiter with sliding window algorithm.

This module provides rate limiting functionality with:
- Sliding window algorithm using Redis sorted sets
- Per-user, per-IP, and per-endpoint rate limiting
- Automatic cleanup of old entries outside window
- Fallback to in-memory rate limiting on Redis failure
- Rate limit statistics and monitoring

Requirements: 4.1, 4.2, 4.4, 4.5, 4.6, 4.7
"""

import time
import logging
import uuid
from enum import Enum
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from collections import defaultdict, deque

from backend.infrastructure.redis_client import RedisClient

logger = logging.getLogger(__name__)


class RateLimitStrategy(Enum):
    """Rate limiting strategy types."""
    FIXED_WINDOW = "fixed_window"
    SLIDING_WINDOW = "sliding_window"
    TOKEN_BUCKET = "token_bucket"
    LEAKY_BUCKET = "leaky_bucket"


class RateLimitResult:
    """
    Result of rate limit check.
    
    Attributes:
        allowed: Whether the request is allowed
        remaining: Number of remaining requests in current window
        reset_at: Timestamp when the rate limit resets
        retry_after: Seconds to wait before retrying (None if allowed)
    """
    
    def __init__(
        self,
        allowed: bool,
        remaining: int,
        reset_at: datetime,
        retry_after: Optional[int] = None
    ):
        self.allowed = allowed
        self.remaining = remaining
        self.reset_at = reset_at
        self.retry_after = retry_after
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "allowed": self.allowed,
            "remaining": self.remaining,
            "reset_at": self.reset_at.isoformat(),
            "retry_after": self.retry_after
        }
    
    def __repr__(self) -> str:
        return (
            f"RateLimitResult(allowed={self.allowed}, remaining={self.remaining}, "
            f"reset_at={self.reset_at}, retry_after={self.retry_after})"
        )


class InMemoryRateLimiter:
    """
    In-memory rate limiter fallback.
    
    Used when Redis is unavailable. Provides basic rate limiting
    per instance (not distributed).
    """
    
    def __init__(self):
        """Initialize in-memory rate limiter."""
        # Store request timestamps per identifier
        # Format: {identifier: deque([timestamp1, timestamp2, ...])}
        self._requests: Dict[str, deque] = defaultdict(deque)
        logger.info("Initialized in-memory rate limiter (fallback)")
    
    def check_rate_limit(
        self,
        identifier: str,
        limit: int,
        window: timedelta
    ) -> RateLimitResult:
        """
        Check rate limit using in-memory storage.
        
        Args:
            identifier: Unique identifier (user ID, IP, etc.)
            limit: Maximum requests allowed in window
            window: Time window duration
        
        Returns:
            RateLimitResult with rate limit status
        """
        current_time = time.time()
        window_start = current_time - window.total_seconds()
        
        # Get request queue for this identifier
        request_queue = self._requests[identifier]
        
        # Remove old entries outside window
        while request_queue and request_queue[0] < window_start:
            request_queue.popleft()
        
        # Count requests in current window
        request_count = len(request_queue)
        
        # Check if limit exceeded
        if request_count >= limit:
            # Calculate retry_after based on oldest request
            oldest_request = request_queue[0]
            reset_at = datetime.fromtimestamp(oldest_request + window.total_seconds())
            retry_after = int(reset_at.timestamp() - current_time)
            
            return RateLimitResult(
                allowed=False,
                remaining=0,
                reset_at=reset_at,
                retry_after=max(0, retry_after)
            )
        
        # Add current request to window
        request_queue.append(current_time)
        
        remaining = limit - (request_count + 1)
        reset_at = datetime.fromtimestamp(current_time + window.total_seconds())
        
        return RateLimitResult(
            allowed=True,
            remaining=remaining,
            reset_at=reset_at,
            retry_after=None
        )
    
    def get_remaining(
        self,
        identifier: str,
        limit: int,
        window: timedelta
    ) -> int:
        """
        Get remaining requests in current window.
        
        Args:
            identifier: Unique identifier
            limit: Maximum requests allowed
            window: Time window duration
        
        Returns:
            Number of remaining requests
        """
        current_time = time.time()
        window_start = current_time - window.total_seconds()
        
        # Get request queue for this identifier
        request_queue = self._requests[identifier]
        
        # Remove old entries outside window
        while request_queue and request_queue[0] < window_start:
            request_queue.popleft()
        
        # Calculate remaining
        request_count = len(request_queue)
        return max(0, limit - request_count)
    
    def reset(self, identifier: str) -> bool:
        """
        Reset rate limit for identifier.
        
        Args:
            identifier: Unique identifier
        
        Returns:
            True if reset successful
        """
        if identifier in self._requests:
            del self._requests[identifier]
            logger.info(f"Reset in-memory rate limit for: {identifier}")
            return True
        return False
    
    def cleanup_old_entries(self, max_age_seconds: int = 3600) -> int:
        """
        Cleanup old entries to prevent memory leaks.
        
        Args:
            max_age_seconds: Maximum age of entries to keep (default: 1 hour)
        
        Returns:
            Number of identifiers cleaned up
        """
        current_time = time.time()
        cutoff_time = current_time - max_age_seconds
        
        identifiers_to_remove = []
        
        for identifier, request_queue in self._requests.items():
            # Remove old entries from queue
            while request_queue and request_queue[0] < cutoff_time:
                request_queue.popleft()
            
            # If queue is empty, mark identifier for removal
            if not request_queue:
                identifiers_to_remove.append(identifier)
        
        # Remove empty identifiers
        for identifier in identifiers_to_remove:
            del self._requests[identifier]
        
        if identifiers_to_remove:
            logger.info(f"Cleaned up {len(identifiers_to_remove)} old rate limit entries")
        
        return len(identifiers_to_remove)


class RateLimiter:
    """
    Redis-based rate limiter with sliding window algorithm.
    
    Provides distributed rate limiting with:
    - Sliding window algorithm using Redis sorted sets
    - Automatic cleanup of old entries
    - Per-user, per-IP, and per-endpoint limits
    - Fallback to in-memory rate limiting on Redis failure
    - Rate limit statistics
    
    Requirements:
    - 4.1: Implement sliding window rate limiting algorithm
    - 4.2: Check if request count is within configured limit
    - 4.4: Increment request count for identifier
    - 4.5: Support per-user, per-IP, and per-endpoint rate limiting
    - 4.6: Support different rate limit tiers
    - 4.7: Fallback to in-memory rate limiting on Redis failure
    """
    
    def __init__(
        self,
        redis_client: RedisClient,
        strategy: RateLimitStrategy = RateLimitStrategy.SLIDING_WINDOW
    ):
        """
        Initialize rate limiter.
        
        Args:
            redis_client: Redis client instance
            strategy: Rate limiting strategy (default: SLIDING_WINDOW)
        """
        self.redis = redis_client
        self.strategy = strategy
        
        # In-memory fallback
        self._fallback = InMemoryRateLimiter()
        
        # Statistics tracking
        self._stats = {
            "allowed": 0,
            "denied": 0,
            "fallback_used": 0
        }
        
        logger.info(f"Initialized RateLimiter with strategy: {strategy.value}")
    
    async def check_rate_limit(
        self,
        identifier: str,
        limit: int,
        window: timedelta,
        cost: int = 1
    ) -> RateLimitResult:
        """
        Check if request is within rate limit using sliding window algorithm.
        
        Algorithm:
        1. Remove old entries outside the time window
        2. Count requests in current window
        3. If count >= limit, deny request
        4. Otherwise, add current request to window
        5. Return result with remaining count and reset time
        
        Args:
            identifier: Unique identifier (user ID, IP address, API key, etc.)
            limit: Maximum requests allowed in window
            window: Time window duration
            cost: Cost of this request in terms of rate limit (default: 1)
        
        Returns:
            RateLimitResult with rate limit status
        
        Requirements:
        - 4.1: Implement sliding window rate limiting algorithm
        - 4.2: Check if request count is within configured limit
        - 4.4: Increment request count for identifier
        - 4.7: Fallback to in-memory rate limiting on Redis failure
        """
        # Validate inputs
        if not identifier:
            raise ValueError("Identifier cannot be empty")
        if limit <= 0:
            raise ValueError("Limit must be positive")
        if cost <= 0:
            raise ValueError("Cost must be positive")
        
        # Check if Redis is available
        if not self.redis or not self.redis.is_connected:
            logger.warning(
                f"Redis not available, using in-memory fallback for: {identifier}"
            )
            self._stats["fallback_used"] += 1
            return self._fallback.check_rate_limit(identifier, limit, window)
        
        try:
            # Use Redis for distributed rate limiting
            result = await self._check_rate_limit_redis(
                identifier, limit, window, cost
            )
            
            # Update statistics
            if result.allowed:
                self._stats["allowed"] += 1
            else:
                self._stats["denied"] += 1
            
            return result
        
        except Exception as e:
            logger.error(
                f"Error checking rate limit for {identifier}, using fallback: {e}"
            )
            self._stats["fallback_used"] += 1
            return self._fallback.check_rate_limit(identifier, limit, window)
    
    async def _check_rate_limit_redis(
        self,
        identifier: str,
        limit: int,
        window: timedelta,
        cost: int = 1
    ) -> RateLimitResult:
        """
        Check rate limit using Redis sorted sets (sliding window).
        
        Uses Redis sorted set where:
        - Key: "ratelimit:{identifier}"
        - Score: timestamp (for sorting and range queries)
        - Member: unique request ID
        
        Args:
            identifier: Unique identifier
            limit: Maximum requests allowed
            window: Time window duration
            cost: Request cost
        
        Returns:
            RateLimitResult with rate limit status
        """
        current_time = time.time()
        window_start = current_time - window.total_seconds()
        key = f"ratelimit:{identifier}"
        
        async with self.redis.get_client() as client:
            # Step 1: Remove old entries outside window
            # ZREMRANGEBYSCORE removes members with score < window_start
            await client.zremrangebyscore(key, 0, window_start)
            
            # Step 2: Count requests in current window
            # ZCARD returns the number of members in the sorted set
            request_count = await client.zcard(key)
            
            # Step 3: Check if limit exceeded
            if request_count + cost > limit:
                # Get oldest request timestamp for retry-after calculation
                oldest_requests = await client.zrange(key, 0, 0, withscores=True)
                
                if oldest_requests:
                    oldest_timestamp = oldest_requests[0][1]  # (member, score)
                    reset_at = datetime.fromtimestamp(
                        oldest_timestamp + window.total_seconds()
                    )
                    retry_after = int(reset_at.timestamp() - current_time)
                else:
                    # No requests in window (edge case)
                    reset_at = datetime.fromtimestamp(
                        current_time + window.total_seconds()
                    )
                    retry_after = int(window.total_seconds())
                
                logger.debug(
                    f"Rate limit exceeded for {identifier}: "
                    f"{request_count}/{limit} requests"
                )
                
                return RateLimitResult(
                    allowed=False,
                    remaining=0,
                    reset_at=reset_at,
                    retry_after=max(0, retry_after)
                )
            
            # Step 4: Add current request(s) to window
            # Add 'cost' number of requests with current timestamp
            members_to_add = {}
            for _ in range(cost):
                request_id = f"{current_time}:{uuid.uuid4().hex[:8]}"
                members_to_add[request_id] = current_time
            
            # ZADD adds members with scores to sorted set
            await client.zadd(key, members_to_add)
            
            # Set expiration on key to prevent memory leaks
            # Key expires after window duration (no requests will be older)
            await client.expire(key, int(window.total_seconds()) + 60)
            
            # Calculate remaining requests
            remaining = limit - (request_count + cost)
            reset_at = datetime.fromtimestamp(current_time + window.total_seconds())
            
            logger.debug(
                f"Rate limit check passed for {identifier}: "
                f"{request_count + cost}/{limit} requests, {remaining} remaining"
            )
            
            return RateLimitResult(
                allowed=True,
                remaining=remaining,
                reset_at=reset_at,
                retry_after=None
            )
    
    async def get_remaining(
        self,
        identifier: str,
        limit: int,
        window: timedelta
    ) -> int:
        """
        Get remaining requests in current window.
        
        Args:
            identifier: Unique identifier
            limit: Maximum requests allowed
            window: Time window duration
        
        Returns:
            Number of remaining requests
        
        Requirements:
        - 4.2: Check if request count is within configured limit
        - 4.7: Fallback to in-memory rate limiting on Redis failure
        """
        # Check if Redis is available
        if not self.redis or not self.redis.is_connected:
            return self._fallback.get_remaining(identifier, limit, window)
        
        try:
            current_time = time.time()
            window_start = current_time - window.total_seconds()
            key = f"ratelimit:{identifier}"
            
            async with self.redis.get_client() as client:
                # Remove old entries
                await client.zremrangebyscore(key, 0, window_start)
                
                # Count requests in window
                request_count = await client.zcard(key)
                
                # Calculate remaining
                remaining = max(0, limit - request_count)
                
                return remaining
        
        except Exception as e:
            logger.error(f"Error getting remaining for {identifier}: {e}")
            return self._fallback.get_remaining(identifier, limit, window)
    
    async def reset(self, identifier: str) -> bool:
        """
        Reset rate limit for identifier.
        
        Useful for testing or admin operations.
        
        Args:
            identifier: Unique identifier to reset
        
        Returns:
            True if reset successful, False otherwise
        
        Requirements:
        - 4.7: Fallback to in-memory rate limiting on Redis failure
        """
        # Reset in-memory fallback
        self._fallback.reset(identifier)
        
        # Check if Redis is available
        if not self.redis or not self.redis.is_connected:
            logger.warning("Redis not available, only reset in-memory fallback")
            return True
        
        try:
            key = f"ratelimit:{identifier}"
            
            async with self.redis.get_client() as client:
                deleted_count = await client.delete(key)
                
                if deleted_count > 0:
                    logger.info(f"Reset rate limit for: {identifier}")
                    return True
                
                return False
        
        except Exception as e:
            logger.error(f"Error resetting rate limit for {identifier}: {e}")
            return False
    
    async def get_stats(self, identifier: str) -> Dict[str, Any]:
        """
        Get rate limit statistics for identifier.
        
        Args:
            identifier: Unique identifier
        
        Returns:
            Dict with rate limit statistics
        """
        if not self.redis or not self.redis.is_connected:
            return {
                "identifier": identifier,
                "request_count": len(self._fallback._requests.get(identifier, [])),
                "using_fallback": True
            }
        
        try:
            key = f"ratelimit:{identifier}"
            
            async with self.redis.get_client() as client:
                # Get total requests in window
                request_count = await client.zcard(key)
                
                # Get TTL
                ttl = await client.ttl(key)
                
                return {
                    "identifier": identifier,
                    "request_count": request_count,
                    "ttl_seconds": ttl,
                    "using_fallback": False
                }
        
        except Exception as e:
            logger.error(f"Error getting stats for {identifier}: {e}")
            return {
                "identifier": identifier,
                "error": str(e),
                "using_fallback": False
            }
    
    def get_global_stats(self) -> Dict[str, Any]:
        """
        Get global rate limiter statistics.
        
        Returns:
            Dict with global statistics
        """
        stats = self._stats.copy()
        
        # Calculate rates
        total_requests = stats["allowed"] + stats["denied"]
        
        if total_requests > 0:
            stats["allow_rate"] = round(stats["allowed"] / total_requests, 4)
            stats["deny_rate"] = round(stats["denied"] / total_requests, 4)
            stats["fallback_rate"] = round(stats["fallback_used"] / total_requests, 4)
        else:
            stats["allow_rate"] = 0.0
            stats["deny_rate"] = 0.0
            stats["fallback_rate"] = 0.0
        
        return stats
    
    def reset_stats(self) -> None:
        """Reset global statistics."""
        self._stats = {
            "allowed": 0,
            "denied": 0,
            "fallback_used": 0
        }
        logger.info("Rate limiter statistics reset")
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Perform health check on rate limiter.
        
        Returns:
            Dict with health status information
        """
        if not self.redis or not self.redis.is_connected:
            return {
                "healthy": True,  # Still functional with fallback
                "redis_available": False,
                "using_fallback": True,
                "warning": "Redis not available, using in-memory fallback"
            }
        
        try:
            # Test Redis connectivity
            redis_health = await self.redis.health_check()
            
            # Get global stats
            stats = self.get_global_stats()
            
            return {
                "healthy": redis_health.get("healthy", False),
                "redis_available": True,
                "using_fallback": False,
                "redis": redis_health,
                "stats": {
                    "allowed": stats["allowed"],
                    "denied": stats["denied"],
                    "allow_rate": stats["allow_rate"]
                }
            }
        
        except Exception as e:
            logger.error(f"Rate limiter health check failed: {e}")
            return {
                "healthy": True,  # Still functional with fallback
                "redis_available": False,
                "using_fallback": True,
                "error": str(e)
            }


# Global rate limiter instance
_rate_limiter: Optional[RateLimiter] = None


def get_rate_limiter() -> Optional[RateLimiter]:
    """
    Get global rate limiter instance.
    
    Returns:
        RateLimiter instance or None if not initialized
    """
    return _rate_limiter


async def initialize_rate_limiter(
    redis_client: RedisClient,
    strategy: RateLimitStrategy = RateLimitStrategy.SLIDING_WINDOW
) -> RateLimiter:
    """
    Initialize global rate limiter.
    
    Args:
        redis_client: Redis client instance
        strategy: Rate limiting strategy to use
    
    Returns:
        Initialized RateLimiter instance
    """
    global _rate_limiter
    
    if _rate_limiter is None:
        _rate_limiter = RateLimiter(
            redis_client=redis_client,
            strategy=strategy
        )
        logger.info("Global rate limiter initialized")
    
    return _rate_limiter


def shutdown_rate_limiter() -> None:
    """Shutdown global rate limiter."""
    global _rate_limiter
    
    if _rate_limiter:
        logger.info("Shutting down rate limiter")
        _rate_limiter = None
