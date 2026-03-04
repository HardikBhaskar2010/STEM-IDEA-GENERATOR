"""
Example: How to integrate infrastructure lifecycle management with FastAPI

This file demonstrates how to update server.py to use the new infrastructure
lifecycle management system.

Requirements: 2.4
"""

# ============================================================================
# OPTION 1: Using Lifespan Context Manager (Recommended for FastAPI 0.93+)
# ============================================================================

from fastapi import FastAPI
from backend.infrastructure.fastapi_integration import lifespan

# Create FastAPI app with lifespan
app = FastAPI(
    title="STEM Idea Generator API",
    lifespan=lifespan  # This handles startup and shutdown automatically
)

# Your routes and middleware here...


# ============================================================================
# OPTION 2: Using Event Handlers (Compatible with older FastAPI versions)
# ============================================================================

from fastapi import FastAPI
from backend.infrastructure.fastapi_integration import setup_infrastructure_events

# Create FastAPI app
app = FastAPI(title="STEM Idea Generator API")

# Setup infrastructure lifecycle events
setup_infrastructure_events(app)

# Your routes and middleware here...


# ============================================================================
# OPTION 3: Manual Event Handlers (Most Control)
# ============================================================================

from fastapi import FastAPI
from backend.infrastructure.init import initialize_infrastructure, shutdown_infrastructure

app = FastAPI(title="STEM Idea Generator API")

@app.on_event("startup")
async def startup():
    """Initialize infrastructure on startup."""
    await initialize_infrastructure()
    # Add any additional startup logic here

@app.on_event("shutdown")
async def shutdown():
    """Cleanup infrastructure on shutdown."""
    # Add any additional shutdown logic here
    await shutdown_infrastructure()


# ============================================================================
# ACCESSING INFRASTRUCTURE COMPONENTS IN ROUTES
# ============================================================================

from fastapi import APIRouter
from backend.infrastructure.fastapi_integration import (
    get_redis_client,
    get_db_pool,
    get_service_registry
)

api = APIRouter(prefix="/api")

@api.get("/health")
async def health_check():
    """Health check endpoint that uses infrastructure components."""
    # Get infrastructure components
    redis = get_redis_client()
    db_pool = get_db_pool()
    registry = get_service_registry()
    
    # Check health
    health_status = {
        "status": "healthy",
        "redis": "connected" if redis and redis.is_connected else "disconnected",
        "database": "connected" if db_pool else "disconnected",
        "services": {}
    }
    
    # Check all registered services
    if registry:
        service_health = await registry.health_check_all()
        health_status["services"] = service_health
    
    return health_status


# ============================================================================
# REGISTERING SERVICES
# ============================================================================

from backend.infrastructure.base_service import get_service_registry
from backend.services.my_service import MyService

# Get the global service registry
registry = get_service_registry()

# Register your services (do this before app startup)
# These will be automatically initialized during startup
registry.register("my_service", MyService(
    cache=get_redis_client(),
    db_client=get_db_pool()
))


# ============================================================================
# CREATING A SERVICE WITH LIFECYCLE METHODS
# ============================================================================

from backend.infrastructure.base_service import BaseService
from typing import Dict, Any

class MyService(BaseService):
    """Example service with lifecycle management."""
    
    async def initialize(self):
        """
        Called during application startup.
        Use this to setup connections, load data, etc.
        """
        self.logger.info("Initializing MyService...")
        
        # Example: Load configuration from database
        if self.db:
            async with self.db.acquire() as conn:
                # Load config...
                pass
        
        # Example: Warm up cache
        if self.cache:
            await self.set_cache("service:ready", True)
        
        self.logger.info("MyService initialized successfully")
    
    async def shutdown(self):
        """
        Called during application shutdown.
        Use this to cleanup resources, close connections, etc.
        """
        self.logger.info("Shutting down MyService...")
        
        # Example: Flush pending operations
        # Example: Close connections
        # Example: Save state
        
        self.logger.info("MyService shut down successfully")
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Required health check method.
        """
        # Check service-specific health
        is_healthy = True
        
        # Example: Check if service is ready
        if self.cache:
            ready = await self.get_cache("service:ready")
            is_healthy = ready is not None
        
        return {
            "service": "MyService",
            "healthy": is_healthy,
            "details": {
                "initialized": True
            }
        }
    
    # Your service methods here...
    async def do_something(self):
        """Example service method."""
        # Use cache
        cached_data = await self.get_cached_or_fetch(
            cache_key="some:data",
            fetch_func=self._fetch_data_from_db
        )
        return cached_data
    
    async def _fetch_data_from_db(self):
        """Example database fetch."""
        if self.db:
            async with self.db.acquire() as conn:
                # Fetch data...
                return {"data": "example"}
        return None


# ============================================================================
# COMPLETE EXAMPLE: Updated server.py
# ============================================================================

"""
# server.py — with infrastructure lifecycle management

import os
import logging
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware

# Import infrastructure lifecycle
from backend.infrastructure.fastapi_integration import lifespan
from backend.infrastructure.base_service import get_service_registry

# Import your services
from backend.services.my_service import MyService

# ───────────────── ENV + LOGGING ─────────────────
load_dotenv()

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=LOG_LEVEL)
logger = logging.getLogger("stem-backend")

# ───────────────── APP INIT ─────────────────
app = FastAPI(
    title="STEM Idea Generator API",
    lifespan=lifespan  # Infrastructure lifecycle management
)

# ───────────────── MIDDLEWARE ─────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ───────────────── SERVICE REGISTRATION ─────────────────
# Register services before startup
registry = get_service_registry()

# Services will be initialized automatically during startup
# and shut down automatically during shutdown
registry.register("my_service", MyService())

# ───────────────── ROUTES ─────────────────
api = APIRouter(prefix="/api")

@api.get("/health")
async def health_check():
    '''Health check endpoint.'''
    registry = get_service_registry()
    if registry:
        health = await registry.health_check_all()
        return health
    return {"status": "no registry"}

# Include your other routes...
# from backend.routes import chat_routes, project_routes
# api.include_router(chat_routes.router)
# api.include_router(project_routes.router)

app.include_router(api)

# ───────────────── ROOT ─────────────────
@app.get("/")
def root():
    return {"message": "STEM Idea Generator API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
"""
