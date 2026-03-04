"""
Base Service Layer
Provides common functionality for all services including caching, logging, and database access.

Requirements: 2.5, 3.2, 3.3, 10.4
"""

import logging
import json
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, TypeVar, Generic, Callable, Awaitable
from datetime import timedelta

from backend.infrastructure.redis_client import RedisClient
from backend.infrastructure.db_pool import DatabaseConnectionPool

logger = logging.getLogger(__name__)

T = TypeVar('T')


class BaseService(ABC, Generic[T]):
    """
    Base service class with common functionality for all services.
    
    Provides:
    - Caching with Redis (cache-aside pattern)
    - Structured logging integration
    - Database access through connection pool
    - Health check interface
    - Cache invalidation by pattern
    
    Requirements:
    - 2.5: Base service provides common functionality
    - 3.2: Cache-aside pattern with fetch function
    - 3.3: Pattern-based cache invalidation
    - 10.4: Service-specific health check interface
    """
    
    def __init__(
        self,
        cache: Optional[RedisClient] = None,
        logger_instance: Optional[logging.Logger] = None,
        db_client: Optional[DatabaseConnectionPool] = None
    ):
        """
        Initialize base service with dependencies.
        
        Args:
            cache: Redis client for caching operations
            logger_instance: Logger instance for structured logging
            db_client: Database connection pool for data access
        """
        self.cache = cache
        self.logger = logger_instance or logger
        self.db = db_client
        
        # Service name for logging and cache key prefixing
        self.service_name = self.__class__.__name__
        
        self.logger.info(f"Initialized {self.service_name}")
    
    async def get_cached_or_fetch(
        self,
        cache_key: str,
        fetch_func: Callable[[], Awaitable[T]],
        ttl: timedelta = timedelta(hours=1),
        serialize: bool = True
    ) -> T:
        """
        Get data from cache or fetch and cache it (cache-aside pattern).
        
        This implements the cache-aside pattern:
        1. Check if data exists in cache
        2. If cache hit, return cached data
        3. If cache miss, call fetch_func to get data
        4. Store fetched data in cache with TTL
        5. Return fetched data
        
        Args:
            cache_key: Redis key for caching
            fetch_func: Async function to fetch data if not in cache
            ttl: Time-to-live for cached data (default: 1 hour)
            serialize: Whether to JSON serialize/deserialize (default: True)
        
        Returns:
            Data from cache or fetch function
        
        Requirements:
        - 3.2: Cache-aside pattern with fetch function support
        - 3.6: Fallback to direct queries on cache failure
        """
        # Prefix cache key with service name for namespacing
        prefixed_key = f"{self.service_name}:{cache_key}"
        
        # Try to get from cache
        if self.cache and self.cache.is_connected:
            try:
                cached_value = await self.cache.get(prefixed_key)
                
                if cached_value is not None:
                    self.logger.debug(f"Cache hit for key: {prefixed_key}")
                    
                    # Deserialize if needed
                    if serialize:
                        try:
                            return json.loads(cached_value)
                        except json.JSONDecodeError as e:
                            self.logger.warning(
                                f"Failed to deserialize cached value for {prefixed_key}: {e}"
                            )
                            # Fall through to fetch
                    else:
                        return cached_value
                else:
                    self.logger.debug(f"Cache miss for key: {prefixed_key}")
                    
            except Exception as e:
                self.logger.warning(
                    f"Cache get failed for {prefixed_key}, falling back to fetch: {e}"
                )
                # Fall through to fetch on cache error
        
        # Cache miss or cache unavailable - fetch data
        try:
            data = await fetch_func()
            
            # Try to cache the result
            if self.cache and self.cache.is_connected:
                try:
                    # Serialize if needed
                    cache_value = json.dumps(data) if serialize else data
                    
                    # Store in cache with TTL
                    ttl_seconds = int(ttl.total_seconds())
                    await self.cache.set(prefixed_key, cache_value, ex=ttl_seconds)
                    
                    self.logger.debug(
                        f"Cached data for key: {prefixed_key} with TTL: {ttl_seconds}s"
                    )
                    
                except Exception as e:
                    self.logger.warning(
                        f"Failed to cache data for {prefixed_key}: {e}"
                    )
                    # Continue even if caching fails
            
            return data
            
        except Exception as e:
            self.logger.error(f"Fetch function failed for {cache_key}: {e}")
            raise
    
    async def invalidate_cache(self, pattern: str) -> int:
        """
        Invalidate cache entries matching pattern.
        
        Uses Redis KEYS command to find matching keys and deletes them.
        Pattern supports Redis glob-style patterns:
        - * matches any characters
        - ? matches a single character
        - [abc] matches a, b, or c
        
        Args:
            pattern: Redis key pattern (e.g., "user:*", "session:123:*")
        
        Returns:
            Number of keys invalidated
        
        Requirements:
        - 3.3: Pattern-based cache invalidation
        - 3.5: Support pattern-based cache invalidation using Redis key patterns
        """
        if not self.cache or not self.cache.is_connected:
            self.logger.warning("Cache not available for invalidation")
            return 0
        
        try:
            # Prefix pattern with service name
            prefixed_pattern = f"{self.service_name}:{pattern}"
            
            # Find all matching keys
            matching_keys = await self.cache.keys(prefixed_pattern)
            
            if not matching_keys:
                self.logger.debug(f"No keys found matching pattern: {prefixed_pattern}")
                return 0
            
            # Delete all matching keys
            deleted_count = await self.cache.delete(*matching_keys)
            
            self.logger.info(
                f"Invalidated {deleted_count} cache entries matching pattern: {prefixed_pattern}"
            )
            
            return deleted_count
            
        except Exception as e:
            self.logger.error(f"Cache invalidation failed for pattern {pattern}: {e}")
            return 0
    
    async def set_cache(
        self,
        cache_key: str,
        value: Any,
        ttl: timedelta = timedelta(hours=1),
        serialize: bool = True
    ) -> bool:
        """
        Set a value in cache with TTL.
        
        Args:
            cache_key: Redis key for caching
            value: Value to cache
            ttl: Time-to-live for cached data (default: 1 hour)
            serialize: Whether to JSON serialize (default: True)
        
        Returns:
            True if successful, False otherwise
        """
        if not self.cache or not self.cache.is_connected:
            self.logger.warning("Cache not available for set operation")
            return False
        
        try:
            # Prefix cache key with service name
            prefixed_key = f"{self.service_name}:{cache_key}"
            
            # Serialize if needed
            cache_value = json.dumps(value) if serialize else value
            
            # Store in cache with TTL
            ttl_seconds = int(ttl.total_seconds())
            success = await self.cache.set(prefixed_key, cache_value, ex=ttl_seconds)
            
            if success:
                self.logger.debug(
                    f"Set cache for key: {prefixed_key} with TTL: {ttl_seconds}s"
                )
            
            return success
            
        except Exception as e:
            self.logger.error(f"Failed to set cache for {cache_key}: {e}")
            return False
    
    async def get_cache(
        self,
        cache_key: str,
        deserialize: bool = True
    ) -> Optional[Any]:
        """
        Get a value from cache.
        
        Args:
            cache_key: Redis key for caching
            deserialize: Whether to JSON deserialize (default: True)
        
        Returns:
            Cached value or None if not found
        """
        if not self.cache or not self.cache.is_connected:
            return None
        
        try:
            # Prefix cache key with service name
            prefixed_key = f"{self.service_name}:{cache_key}"
            
            cached_value = await self.cache.get(prefixed_key)
            
            if cached_value is None:
                return None
            
            # Deserialize if needed
            if deserialize:
                try:
                    return json.loads(cached_value)
                except json.JSONDecodeError as e:
                    self.logger.warning(
                        f"Failed to deserialize cached value for {prefixed_key}: {e}"
                    )
                    return None
            
            return cached_value
            
        except Exception as e:
            self.logger.error(f"Failed to get cache for {cache_key}: {e}")
            return None
    
    async def delete_cache(self, cache_key: str) -> bool:
        """
        Delete a specific cache key.
        
        Args:
            cache_key: Redis key to delete
        
        Returns:
            True if deleted, False otherwise
        """
        if not self.cache or not self.cache.is_connected:
            return False
        
        try:
            # Prefix cache key with service name
            prefixed_key = f"{self.service_name}:{cache_key}"
            
            deleted_count = await self.cache.delete(prefixed_key)
            
            if deleted_count > 0:
                self.logger.debug(f"Deleted cache key: {prefixed_key}")
                return True
            
            return False
            
        except Exception as e:
            self.logger.error(f"Failed to delete cache for {cache_key}: {e}")
            return False
    
    @abstractmethod
    async def health_check(self) -> Dict[str, Any]:
        """
        Service-specific health check.
        
        Each service must implement this method to provide health status.
        Should check service-specific dependencies and return status information.
        
        Returns:
            Dict with health status information:
            {
                "service": "ServiceName",
                "healthy": True/False,
                "details": {...}
            }
        
        Requirements:
        - 10.4: Service-specific health check interface
        """
        pass
    
    async def base_health_check(self) -> Dict[str, Any]:
        """
        Base health check for common dependencies.
        
        Checks:
        - Cache connectivity (if configured)
        - Database connectivity (if configured)
        
        Returns:
            Dict with health status of common dependencies
        """
        health_status = {
            "service": self.service_name,
            "healthy": True,
            "cache": None,
            "database": None
        }
        
        # Check cache health
        if self.cache:
            try:
                cache_health = await self.cache.health_check()
                health_status["cache"] = cache_health
                
                if not cache_health.get("healthy", False):
                    health_status["healthy"] = False
                    
            except Exception as e:
                health_status["cache"] = {
                    "healthy": False,
                    "error": str(e)
                }
                health_status["healthy"] = False
        
        # Check database health
        if self.db:
            try:
                db_healthy = await self.db.health_check()
                health_status["database"] = {
                    "healthy": db_healthy
                }
                
                if not db_healthy:
                    health_status["healthy"] = False
                    
            except Exception as e:
                health_status["database"] = {
                    "healthy": False,
                    "error": str(e)
                }
                health_status["healthy"] = False
        
        return health_status


class ServiceRegistry:
    """
    Service registry for dependency injection.
    
    Provides centralized service management with:
    - Service registration by name
    - Service retrieval (singleton pattern)
    - Service validation
    - Health check aggregation
    - Service lifecycle management (initialization and shutdown)
    
    Requirements:
    - 2.1: Service registration by name
    - 2.2: Service retrieval by name
    - 2.3: Service validation
    - 2.4: Singleton pattern for services
    """
    
    def __init__(self):
        """Initialize service registry."""
        self._services: Dict[str, BaseService] = {}
        self._initialized = False
        self._shutdown = False
        logger.info("Service registry initialized")
    
    def register(self, name: str, service: BaseService) -> None:
        """
        Register a service by name.
        
        Args:
            name: Service name (unique identifier)
            service: Service instance (must extend BaseService)
        
        Raises:
            ValueError: If service doesn't extend BaseService
            KeyError: If service name already registered
        
        Requirements:
        - 2.1: Service registration by name
        - 2.3: Service validation
        """
        # Validate service extends BaseService
        if not isinstance(service, BaseService):
            raise ValueError(
                f"Service must extend BaseService, got {type(service).__name__}"
            )
        
        # Check if already registered
        if name in self._services:
            raise KeyError(f"Service '{name}' is already registered")
        
        # Register service
        self._services[name] = service
        logger.info(f"Registered service: {name} ({service.__class__.__name__})")
    
    def get(self, name: str) -> BaseService:
        """
        Get a registered service by name.
        
        Args:
            name: Service name
        
        Returns:
            Service instance (singleton)
        
        Raises:
            KeyError: If service not found
        
        Requirements:
        - 2.2: Service retrieval by name
        - 2.4: Singleton pattern (same instance returned)
        """
        if name not in self._services:
            raise KeyError(f"Service '{name}' not found in registry")
        
        return self._services[name]
    
    def get_all_services(self) -> Dict[str, BaseService]:
        """
        Get all registered services.
        
        Returns:
            Dict mapping service names to service instances
        
        Requirements:
        - 2.2: Service retrieval
        """
        return self._services.copy()
    
    def has_service(self, name: str) -> bool:
        """
        Check if a service is registered.
        
        Args:
            name: Service name
        
        Returns:
            True if service is registered, False otherwise
        """
        return name in self._services
    
    def unregister(self, name: str) -> bool:
        """
        Unregister a service.
        
        Args:
            name: Service name
        
        Returns:
            True if service was unregistered, False if not found
        """
        if name in self._services:
            del self._services[name]
            logger.info(f"Unregistered service: {name}")
            return True
        
        return False
    
    async def health_check_all(self) -> Dict[str, Any]:
        """
        Perform health check on all registered services.
        
        Returns:
            Dict with health status of all services
        """
        health_results = {
            "healthy": True,
            "services": {}
        }
        
        for name, service in self._services.items():
            try:
                service_health = await service.health_check()
                health_results["services"][name] = service_health
                
                # If any service is unhealthy, mark overall as unhealthy
                if not service_health.get("healthy", False):
                    health_results["healthy"] = False
                    
            except Exception as e:
                logger.error(f"Health check failed for service {name}: {e}")
                health_results["services"][name] = {
                    "healthy": False,
                    "error": str(e)
                }
                health_results["healthy"] = False
        
        return health_results
    
    async def initialize_all(self) -> None:
        """
        Initialize all registered services.
        
        Calls the initialize method on each service if it exists.
        This should be called during application startup.
        
        Requirements:
        - 2.4: Service lifecycle management
        """
        if self._initialized:
            logger.warning("Services already initialized")
            return
        
        logger.info("Initializing all registered services...")
        
        for name, service in self._services.items():
            try:
                # Check if service has an initialize method
                if hasattr(service, 'initialize') and callable(getattr(service, 'initialize')):
                    logger.info(f"Initializing service: {name}")
                    await service.initialize()
                    logger.info(f"Service {name} initialized successfully")
                else:
                    logger.debug(f"Service {name} has no initialize method")
                    
            except Exception as e:
                logger.error(f"Failed to initialize service {name}: {e}")
                raise RuntimeError(f"Service initialization failed for {name}") from e
        
        self._initialized = True
        logger.info("All services initialized successfully")
    
    async def shutdown_all(self) -> None:
        """
        Shutdown all registered services.
        
        Calls the shutdown method on each service if it exists.
        This should be called during application shutdown.
        
        Requirements:
        - 2.4: Service lifecycle management
        """
        if self._shutdown:
            logger.warning("Services already shut down")
            return
        
        logger.info("Shutting down all registered services...")
        
        # Shutdown in reverse order of registration
        for name, service in reversed(list(self._services.items())):
            try:
                # Check if service has a shutdown method
                if hasattr(service, 'shutdown') and callable(getattr(service, 'shutdown')):
                    logger.info(f"Shutting down service: {name}")
                    await service.shutdown()
                    logger.info(f"Service {name} shut down successfully")
                else:
                    logger.debug(f"Service {name} has no shutdown method")
                    
            except Exception as e:
                logger.error(f"Failed to shutdown service {name}: {e}")
                # Continue shutting down other services even if one fails
        
        self._shutdown = True
        logger.info("All services shut down successfully")
    
    @property
    def is_initialized(self) -> bool:
        """Check if services have been initialized."""
        return self._initialized
    
    @property
    def is_shutdown(self) -> bool:
        """Check if services have been shut down."""
        return self._shutdown


# Global service registry instance
_service_registry: Optional[ServiceRegistry] = None


def get_service_registry() -> ServiceRegistry:
    """
    Get the global service registry instance.
    
    Returns:
        ServiceRegistry instance (singleton)
    """
    global _service_registry
    
    if _service_registry is None:
        _service_registry = ServiceRegistry()
    
    return _service_registry
