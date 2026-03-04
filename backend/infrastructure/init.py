"""
Infrastructure Initialization Module

Provides centralized initialization and shutdown for all infrastructure components:
- Redis connection
- Database connection pool
- Service registry

This module integrates with FastAPI startup/shutdown events to ensure
proper lifecycle management of all infrastructure components.

Requirements: 2.1, 2.2, 2.3, 2.4, 12.1, 12.2
"""

import logging
import os
from typing import Optional

from backend.infrastructure.redis_client import RedisClient
from backend.infrastructure.db_pool import DatabaseConnectionPool
from backend.infrastructure.base_service import ServiceRegistry, get_service_registry
from backend.infrastructure.monitoring_service import initialize_monitoring_service, MonitoringService
from backend.infrastructure.metrics import metrics
from backend.infrastructure.sentry_config import init_sentry
from backend.infrastructure.tracing import init_tracing

logger = logging.getLogger(__name__)


class InfrastructureManager:
    """
    Manages initialization and shutdown of all infrastructure components.
    
    Provides:
    - Redis client initialization and cleanup
    - Database connection pool initialization and cleanup
    - Service registry initialization and cleanup
    - Centralized error handling for infrastructure setup
    
    Requirements:
    - 2.4: Service lifecycle management
    - 12.1: Database connection pool management
    - 12.2: Redis connection pool management
    """
    
    def __init__(self):
        """Initialize infrastructure manager."""
        self.redis_client: Optional[RedisClient] = None
        self.db_pool: Optional[DatabaseConnectionPool] = None
        self.service_registry: Optional[ServiceRegistry] = None
        self.monitoring_service: Optional[MonitoringService] = None
        self._initialized = False
        self._shutdown = False
        
        logger.info("Infrastructure manager created")
    
    async def initialize(self) -> None:
        """
        Initialize all infrastructure components.
        
        Order of initialization:
        1. Sentry (error tracking)
        2. OpenTelemetry (distributed tracing)
        3. Redis client
        4. Database connection pool
        5. Service registry
        6. Monitoring service
        
        Raises:
            RuntimeError: If initialization fails
        """
        if self._initialized:
            logger.warning("Infrastructure already initialized")
            return
        
        logger.info("Initializing infrastructure components...")
        
        try:
            # Initialize Sentry for error tracking
            self._initialize_sentry()
            
            # Initialize OpenTelemetry for distributed tracing
            self._initialize_tracing()
            
            # Initialize Redis client
            await self._initialize_redis()
            
            # Initialize database connection pool
            await self._initialize_database()
            
            # Initialize service registry
            await self._initialize_service_registry()
            
            # Initialize monitoring service
            self._initialize_monitoring()
            
            self._initialized = True
            logger.info("Infrastructure initialization complete")
            
        except Exception as e:
            logger.error(f"Infrastructure initialization failed: {e}")
            # Cleanup any partially initialized components
            await self.shutdown()
            raise RuntimeError("Failed to initialize infrastructure") from e
    
    async def _initialize_redis(self) -> None:
        """
        Initialize Redis client.
        
        Requirements:
        - 12.2: Redis connection pool (min: 5, max: 50 connections)
        """
        logger.info("Initializing Redis client...")
        
        redis_url = os.getenv("REDIS_URL")
        if not redis_url:
            logger.warning("REDIS_URL not configured, Redis features will be disabled")
            self.redis_client = None
            return
        
        try:
            self.redis_client = RedisClient(
                redis_url=redis_url,
                max_connections=50,
                socket_timeout=5.0,
                socket_connect_timeout=5.0,
                socket_keepalive=True
            )
            
            # Test connection
            await self.redis_client.ping()
            
            logger.info("Redis client initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Redis client: {e}")
            self.redis_client = None
            # Don't raise - Redis is optional, continue without it
    
    async def _initialize_database(self) -> None:
        """
        Initialize database connection pool.
        
        Requirements:
        - 12.1: Database connection pool (min: 5, max: 20 connections)
        - 12.3: Connection timeout (30s), idle timeout (300s)
        """
        logger.info("Initializing database connection pool...")
        
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            raise RuntimeError("DATABASE_URL not configured")
        
        try:
            self.db_pool = DatabaseConnectionPool(
                database_url=database_url,
                min_size=5,
                max_size=20,
                command_timeout=30.0,
                max_inactive_connection_lifetime=300.0
            )
            
            # Initialize the pool
            await self.db_pool.initialize()
            
            # Test connection
            is_healthy = await self.db_pool.health_check()
            if not is_healthy:
                raise RuntimeError("Database health check failed")
            
            logger.info("Database connection pool initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize database connection pool: {e}")
            raise
    
    async def _initialize_service_registry(self) -> None:
        """
        Initialize service registry.
        
        Gets the global service registry instance and initializes all registered services.
        
        Requirements:
        - 2.4: Service lifecycle management
        """
        logger.info("Initializing service registry...")
        
        try:
            self.service_registry = get_service_registry()
            
            # Initialize all registered services
            await self.service_registry.initialize_all()
            
            logger.info("Service registry initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize service registry: {e}")
            raise
    
    def _initialize_sentry(self) -> None:
        """
        Initialize Sentry for error tracking.
        
        Requirements:
        - 14.6: Sentry integration for error tracking and alerting
        """
        logger.info("Initializing Sentry...")
        
        try:
            environment = os.getenv("ENVIRONMENT", "development")
            release = os.getenv("RELEASE_VERSION", "1.0.0")
            
            init_sentry(
                environment=environment,
                release=release,
                traces_sample_rate=0.1,  # 10% of transactions
                profiles_sample_rate=0.1,
                enable_tracing=True
            )
            
            logger.info("Sentry initialized successfully")
            
        except Exception as e:
            logger.warning(f"Failed to initialize Sentry: {e}")
            # Don't raise - Sentry is optional
    
    def _initialize_tracing(self) -> None:
        """
        Initialize OpenTelemetry for distributed tracing.
        
        Requirements:
        - 14.5: OpenTelemetry for distributed tracing
        """
        logger.info("Initializing OpenTelemetry...")
        
        try:
            service_name = os.getenv("SERVICE_NAME", "stem-project-generator")
            service_version = os.getenv("SERVICE_VERSION", "1.0.0")
            
            init_tracing(
                service_name=service_name,
                service_version=service_version,
                enable_console_export=os.getenv("ENVIRONMENT") == "development",
                sample_rate=1.0
            )
            
            logger.info("OpenTelemetry initialized successfully")
            
        except Exception as e:
            logger.warning(f"Failed to initialize OpenTelemetry: {e}")
            # Don't raise - tracing is optional
    
    def _initialize_monitoring(self) -> None:
        """
        Initialize monitoring service.
        
        Requirements:
        - 10.1: Health check endpoint
        - 14.4: Prometheus metrics
        """
        logger.info("Initializing monitoring service...")
        
        try:
            self.monitoring_service = initialize_monitoring_service(
                db_pool=self.db_pool,
                redis_client=self.redis_client,
                service_registry=self.service_registry,
                metrics_collector=metrics
            )
            
            logger.info("Monitoring service initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize monitoring service: {e}")
            raise
    
    async def shutdown(self) -> None:
        """
        Shutdown all infrastructure components.
        
        Order of shutdown (reverse of initialization):
        1. Service registry
        2. Database connection pool
        3. Redis client
        """
        if self._shutdown:
            logger.warning("Infrastructure already shut down")
            return
        
        logger.info("Shutting down infrastructure components...")
        
        # Shutdown service registry
        if self.service_registry:
            try:
                await self.service_registry.shutdown_all()
                logger.info("Service registry shut down successfully")
            except Exception as e:
                logger.error(f"Failed to shutdown service registry: {e}")
        
        # Shutdown database connection pool
        if self.db_pool:
            try:
                await self.db_pool.close()
                logger.info("Database connection pool closed successfully")
            except Exception as e:
                logger.error(f"Failed to close database connection pool: {e}")
        
        # Shutdown Redis client
        if self.redis_client:
            try:
                await self.redis_client.close()
                logger.info("Redis client closed successfully")
            except Exception as e:
                logger.error(f"Failed to close Redis client: {e}")
        
        self._shutdown = True
        logger.info("Infrastructure shutdown complete")
    
    @property
    def is_initialized(self) -> bool:
        """Check if infrastructure is initialized."""
        return self._initialized
    
    @property
    def is_shutdown(self) -> bool:
        """Check if infrastructure is shut down."""
        return self._shutdown
    
    def get_redis_client(self) -> Optional[RedisClient]:
        """Get the Redis client instance."""
        return self.redis_client
    
    def get_db_pool(self) -> Optional[DatabaseConnectionPool]:
        """Get the database connection pool instance."""
        return self.db_pool
    
    def get_service_registry(self) -> Optional[ServiceRegistry]:
        """Get the service registry instance."""
        return self.service_registry
    
    def get_monitoring_service(self) -> Optional[MonitoringService]:
        """Get the monitoring service instance."""
        return self.monitoring_service


# Global infrastructure manager instance
_infrastructure_manager: Optional[InfrastructureManager] = None


def get_infrastructure_manager() -> InfrastructureManager:
    """
    Get the global infrastructure manager instance.
    
    Returns:
        InfrastructureManager instance (singleton)
    """
    global _infrastructure_manager
    
    if _infrastructure_manager is None:
        _infrastructure_manager = InfrastructureManager()
    
    return _infrastructure_manager


async def initialize_infrastructure() -> InfrastructureManager:
    """
    Initialize all infrastructure components.
    
    This function should be called during FastAPI startup.
    
    Returns:
        Initialized InfrastructureManager instance
    
    Raises:
        RuntimeError: If initialization fails
    """
    manager = get_infrastructure_manager()
    await manager.initialize()
    return manager


async def shutdown_infrastructure() -> None:
    """
    Shutdown all infrastructure components.
    
    This function should be called during FastAPI shutdown.
    """
    manager = get_infrastructure_manager()
    await manager.shutdown()
