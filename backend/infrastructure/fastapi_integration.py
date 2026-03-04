"""
FastAPI Integration Module

Provides helper functions to integrate infrastructure lifecycle management
with FastAPI application startup and shutdown events.

Requirements: 2.4
"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI

from backend.infrastructure.init import (
    initialize_infrastructure,
    shutdown_infrastructure,
    get_infrastructure_manager
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """
    FastAPI lifespan context manager for infrastructure lifecycle.
    
    This context manager handles:
    - Infrastructure initialization on startup
    - Infrastructure cleanup on shutdown
    
    Usage:
        from backend.infrastructure.fastapi_integration import lifespan
        
        app = FastAPI(lifespan=lifespan)
    
    Requirements:
    - 2.4: Service lifecycle management
    """
    # Startup
    logger.info("Application startup: Initializing infrastructure...")
    try:
        await initialize_infrastructure()
        logger.info("Application startup complete")
    except Exception as e:
        logger.error(f"Failed to initialize infrastructure: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Application shutdown: Cleaning up infrastructure...")
    try:
        await shutdown_infrastructure()
        logger.info("Application shutdown complete")
    except Exception as e:
        logger.error(f"Error during infrastructure shutdown: {e}")


def setup_infrastructure_events(app: FastAPI) -> None:
    """
    Setup infrastructure lifecycle events for FastAPI application.
    
    This is an alternative to using the lifespan context manager.
    Use this if you need to add startup/shutdown events separately.
    
    Usage:
        from backend.infrastructure.fastapi_integration import setup_infrastructure_events
        
        app = FastAPI()
        setup_infrastructure_events(app)
    
    Requirements:
    - 2.4: Service lifecycle management
    """
    
    @app.on_event("startup")
    async def startup_event():
        """Initialize infrastructure on application startup."""
        logger.info("Application startup: Initializing infrastructure...")
        try:
            await initialize_infrastructure()
            logger.info("Application startup complete")
        except Exception as e:
            logger.error(f"Failed to initialize infrastructure: {e}")
            raise
    
    @app.on_event("shutdown")
    async def shutdown_event():
        """Cleanup infrastructure on application shutdown."""
        logger.info("Application shutdown: Cleaning up infrastructure...")
        try:
            await shutdown_infrastructure()
            logger.info("Application shutdown complete")
        except Exception as e:
            logger.error(f"Error during infrastructure shutdown: {e}")


def get_redis_client():
    """
    Get the Redis client from infrastructure manager.
    
    Returns:
        RedisClient instance or None if not initialized
    """
    manager = get_infrastructure_manager()
    return manager.get_redis_client()


def get_db_pool():
    """
    Get the database connection pool from infrastructure manager.
    
    Returns:
        DatabaseConnectionPool instance or None if not initialized
    """
    manager = get_infrastructure_manager()
    return manager.get_db_pool()


def get_service_registry():
    """
    Get the service registry from infrastructure manager.
    
    Returns:
        ServiceRegistry instance or None if not initialized
    """
    manager = get_infrastructure_manager()
    return manager.get_service_registry()
