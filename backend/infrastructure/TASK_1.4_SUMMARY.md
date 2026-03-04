# Task 1.4: ServiceRegistry Lifecycle Management - Implementation Summary

## Overview

Enhanced the ServiceRegistry with proper lifecycle management (initialization and shutdown hooks) and created an initialization module that sets up all infrastructure components with clean startup/shutdown procedures integrated with FastAPI.

## Requirements Addressed

- **2.1**: Service registration by name
- **2.2**: Service retrieval by name  
- **2.3**: Service validation (BaseService interface)
- **2.4**: Singleton pattern and service lifecycle management
- **12.1**: Database connection pool management
- **12.2**: Redis connection pool management

## Changes Made

### 1. Enhanced ServiceRegistry (`base_service.py`)

Added lifecycle management capabilities to the ServiceRegistry:

**New Properties:**
- `_initialized`: Tracks if services have been initialized
- `_shutdown`: Tracks if services have been shut down
- `is_initialized`: Property to check initialization status
- `is_shutdown`: Property to check shutdown status

**New Methods:**

#### `async def initialize_all() -> None`
- Initializes all registered services during application startup
- Calls the `initialize()` method on each service if it exists
- Logs initialization progress and errors
- Raises RuntimeError if any service fails to initialize
- Prevents duplicate initialization

#### `async def shutdown_all() -> None`
- Shuts down all registered services during application shutdown
- Calls the `shutdown()` method on each service if it exists
- Shuts down services in reverse order of registration
- Continues shutdown even if individual services fail
- Logs shutdown progress and errors
- Prevents duplicate shutdown

### 2. Infrastructure Manager (`infrastructure/init.py`)

Created a centralized infrastructure manager that coordinates all infrastructure components:

**Class: InfrastructureManager**

Manages the lifecycle of:
- Redis client (optional, continues without it if unavailable)
- Database connection pool (required)
- Service registry (required)

**Key Methods:**

#### `async def initialize() -> None`
Initializes infrastructure in the correct order:
1. Redis client (with connection pooling: min 5, max 50)
2. Database connection pool (min 5, max 20 connections)
3. Service registry (initializes all registered services)

Includes error handling and automatic cleanup on failure.

#### `async def shutdown() -> None`
Shuts down infrastructure in reverse order:
1. Service registry (shutdown all services)
2. Database connection pool
3. Redis client

Continues shutdown even if individual components fail.

**Configuration:**
- Redis: Uses `REDIS_URL` environment variable (optional)
- Database: Uses `DATABASE_URL` environment variable (required)
- Connection pool settings match requirements (12.1, 12.2)

**Helper Functions:**
- `get_infrastructure_manager()`: Get singleton instance
- `initialize_infrastructure()`: Initialize all components
- `shutdown_infrastructure()`: Shutdown all components

### 3. FastAPI Integration (`infrastructure/fastapi_integration.py`)

Created integration helpers for FastAPI lifecycle management:

#### Lifespan Context Manager
```python
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Startup: Initialize infrastructure
    await initialize_infrastructure()
    yield
    # Shutdown: Cleanup infrastructure
    await shutdown_infrastructure()
```

**Usage:**
```python
from backend.infrastructure.fastapi_integration import lifespan

app = FastAPI(lifespan=lifespan)
```

#### Event-Based Setup (Alternative)
```python
def setup_infrastructure_events(app: FastAPI) -> None:
    # Adds @app.on_event("startup") and @app.on_event("shutdown")
```

**Usage:**
```python
from backend.infrastructure.fastapi_integration import setup_infrastructure_events

app = FastAPI()
setup_infrastructure_events(app)
```

#### Helper Functions
- `get_redis_client()`: Get Redis client from infrastructure manager
- `get_db_pool()`: Get database pool from infrastructure manager
- `get_service_registry()`: Get service registry from infrastructure manager

## Integration Example

### Option 1: Using Lifespan (Recommended for FastAPI 0.93+)

```python
from fastapi import FastAPI
from backend.infrastructure.fastapi_integration import lifespan

app = FastAPI(
    title="STEM Idea Generator API",
    lifespan=lifespan
)

# Your routes here...
```

### Option 2: Using Event Handlers (Compatible with older FastAPI)

```python
from fastapi import FastAPI
from backend.infrastructure.fastapi_integration import setup_infrastructure_events

app = FastAPI(title="STEM Idea Generator API")
setup_infrastructure_events(app)

# Your routes here...
```

### Accessing Infrastructure Components

```python
from backend.infrastructure.fastapi_integration import (
    get_redis_client,
    get_db_pool,
    get_service_registry
)

# In your route handlers or services
redis = get_redis_client()
db_pool = get_db_pool()
registry = get_service_registry()
```

## Service Implementation Guidelines

Services that need lifecycle management should implement optional `initialize()` and `shutdown()` methods:

```python
from backend.infrastructure.base_service import BaseService

class MyService(BaseService):
    async def initialize(self):
        """Called during application startup"""
        # Setup connections, load data, etc.
        self.logger.info("MyService initialized")
    
    async def shutdown(self):
        """Called during application shutdown"""
        # Cleanup resources, close connections, etc.
        self.logger.info("MyService shut down")
    
    async def health_check(self):
        """Required by BaseService"""
        return {
            "service": "MyService",
            "healthy": True
        }
```

## Initialization Flow

```
Application Startup
    ↓
InfrastructureManager.initialize()
    ↓
1. Initialize Redis Client
   - Connect to Redis
   - Setup connection pool (5-50 connections)
   - Test connection with ping
   - Continue without Redis if unavailable
    ↓
2. Initialize Database Pool
   - Connect to PostgreSQL
   - Setup connection pool (5-20 connections)
   - Test connection with health check
   - Fail if database unavailable
    ↓
3. Initialize Service Registry
   - Get global registry instance
   - Call initialize_all()
   - Initialize each registered service
   - Fail if any service initialization fails
    ↓
Application Ready
```

## Shutdown Flow

```
Application Shutdown
    ↓
InfrastructureManager.shutdown()
    ↓
1. Shutdown Service Registry
   - Call shutdown_all()
   - Shutdown services in reverse order
   - Continue even if services fail
    ↓
2. Close Database Pool
   - Close all connections
   - Release resources
    ↓
3. Close Redis Client
   - Close all connections
   - Release resources
    ↓
Application Stopped
```

## Error Handling

### Initialization Errors
- **Redis failure**: Logs warning, continues without Redis (optional component)
- **Database failure**: Raises RuntimeError, stops initialization
- **Service failure**: Raises RuntimeError, triggers cleanup, stops initialization

### Shutdown Errors
- All errors are logged but don't stop the shutdown process
- Ensures all components get a chance to cleanup
- Prevents hanging on shutdown

## Testing

The implementation includes proper error handling and logging for:
- Duplicate initialization attempts
- Duplicate shutdown attempts
- Missing environment variables
- Connection failures
- Service initialization failures

## Benefits

1. **Clean Lifecycle Management**: Proper initialization and cleanup of all infrastructure
2. **Error Resilience**: Graceful handling of failures during startup/shutdown
3. **Centralized Configuration**: Single place to manage all infrastructure setup
4. **FastAPI Integration**: Easy integration with FastAPI lifecycle events
5. **Flexible Service Design**: Services can opt-in to lifecycle management
6. **Proper Resource Cleanup**: Ensures connections are closed on shutdown
7. **Logging**: Comprehensive logging of lifecycle events for debugging

## Next Steps

To use this in your application:

1. Update `server.py` to use the lifespan context manager or event handlers
2. Register your services with the service registry before startup
3. Implement `initialize()` and `shutdown()` methods in services that need them
4. Set `REDIS_URL` and `DATABASE_URL` environment variables

Example:
```python
from fastapi import FastAPI
from backend.infrastructure.fastapi_integration import lifespan
from backend.infrastructure.base_service import get_service_registry
from backend.services.my_service import MyService

# Create app with lifecycle management
app = FastAPI(lifespan=lifespan)

# Register services (before startup)
registry = get_service_registry()
registry.register("my_service", MyService())

# Your routes...
```

## Files Modified/Created

- **Modified**: `backend/infrastructure/base_service.py`
  - Added lifecycle management to ServiceRegistry
  - Added `initialize_all()` and `shutdown_all()` methods
  - Added initialization/shutdown tracking properties

- **Created**: `backend/infrastructure/init.py`
  - InfrastructureManager class
  - Centralized infrastructure initialization
  - Helper functions for lifecycle management

- **Created**: `backend/infrastructure/fastapi_integration.py`
  - FastAPI lifespan context manager
  - Event-based setup function
  - Helper functions to access infrastructure components

- **Created**: `backend/infrastructure/TASK_1.4_SUMMARY.md`
  - This documentation file
