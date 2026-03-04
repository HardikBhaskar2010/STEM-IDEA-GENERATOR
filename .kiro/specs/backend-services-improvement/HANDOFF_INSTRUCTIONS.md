"# Backend Services Improvement - Agent Handoff Instructions

## 🎯 Mission Objective
Complete Phase 1 of the backend services improvement project by integrating existing unified services with API endpoints, implementing service registry, and ensuring production readiness.

---

## 📋 Current State Summary

### ✅ What's Already Complete
1. **Infrastructure Layer (100% Done)**
   - Redis client with connection pooling (`/app/backend/infrastructure/redis_client.py`)
   - Database connection pool (`/app/backend/infrastructure/db_pool.py`)
   - Cache manager with TTL support (`/app/backend/infrastructure/cache_manager.py`)
   - Rate limiter (`/app/backend/infrastructure/rate_limiter.py`)
   - Circuit breaker (`/app/backend/infrastructure/circuit_breaker.py`)
   - Request validation middleware (`/app/backend/middleware/request_validation.py`)
   - Error handling middleware (`/app/backend/middleware/error_handler.py`)
   - Base service class (`/app/backend/infrastructure/base_service.py`)

2. **Core Services (100% Done)**
   - **UnifiedChatService** (`/app/backend/services/unified_chat_service.py`)
     - Consolidates all chat functionality
     - Supports PROJECT, UNIVERSAL, CODE_GENERATION contexts
     - 30-minute cache TTL for sessions and history
     - Intent detection and conversation context
   
   - **ProjectService** (`/app/backend/services/project_service.py`)
     - Consolidates project context and planning
     - 2-hour cache TTL for project context
     - 24-hour cache TTL for technology stacks
     - CRUD operations, tasks, milestones
   
   - **AIService** (`/app/backend/services/ai_service.py`)
     - Consolidates AI guidance functionality
     - Circuit breaker protection for OpenRouter API
     - 1-hour cache TTL for AI responses
     - Prompt hash-based caching
   
   - **MonitoringService** (`/app/backend/infrastructure/monitoring_service.py`)
     - Health checks for all components
     - Prometheus metrics support

3. **Models & Validation (100% Done)**
   - All Pydantic models in `/app/backend/models/`
   - Request/response schemas defined

### ❌ What Needs to Be Done
1. **Service Registry** - Not created yet (CRITICAL)
2. **API Endpoint Integration** - Endpoints still use old services (CRITICAL)
3. **Service Initialization** - No proper startup/shutdown (CRITICAL)
4. **Integration Testing** - Not started
5. **Performance Optimization** - Basic tuning needed
6. **Documentation** - Minimal docs only

---

## 📚 Key Reference Documents

**MUST READ THESE FIRST:**
1. `/app/.kiro/specs/backend-services-improvement/mvp-completion-plan.md` - Your execution roadmap
2. `/app/.kiro/specs/backend-services-improvement/endpoint-audit.md` - All endpoints mapped to target services
3. `/app/.kiro/specs/backend-services-improvement/design.md` - Original design specification
4. `/app/.kiro/specs/backend-services-improvement/requirements.md` - Requirements reference

**Key Service Files to Study:**
- `/app/backend/services/unified_chat_service.py` (1333 lines)
- `/app/backend/services/project_service.py` (1622 lines)
- `/app/backend/services/ai_service.py` (1167 lines)
- `/app/backend/infrastructure/monitoring_service.py` (416 lines)

**Current API File:**
- `/app/backend/server.py` (5873 lines) - Contains all endpoints that need updating

---

## 🚀 Step-by-Step Implementation Plan

### Phase 1: Service Registry Setup (Day 1-2)

#### Task 2.1: Create Service Registry Module

**File to Create:** `/app/backend/infrastructure/service_registry.py`

**What It Should Do:**
1. Manage lifecycle of all services (UnifiedChatService, ProjectService, AIService)
2. Provide dependency injection
3. Handle initialization on startup
4. Handle cleanup on shutdown
5. Thread-safe singleton pattern

**Implementation Template:**
```python
\"\"\"
Service Registry for managing service lifecycle and dependencies.

Provides:
- Service registration and retrieval
- Dependency injection
- Lifecycle management (startup/shutdown)
- Singleton access pattern

Requirements: MVP Group 2
\"\"\"

import logging
from typing import Dict, Optional, Any
import asyncio

from backend.infrastructure.redis_client import RedisClient
from backend.infrastructure.db_pool import DatabaseConnectionPool
from backend.services.unified_chat_service import UnifiedChatService
from backend.services.project_service import ProjectService
from backend.services.ai_service import AIService
from backend.infrastructure.monitoring_service import MonitoringService

logger = logging.getLogger(__name__)


class ServiceRegistry:
    \"\"\"
    Central registry for all application services.
    
    Manages service lifecycle, dependencies, and provides
    singleton access to services throughout the application.
    \"\"\"
    
    def __init__(self):
        self._services: Dict[str, Any] = {}
        self._initialized = False
        self._redis_client: Optional[RedisClient] = None
        self._db_pool: Optional[DatabaseConnectionPool] = None
    
    async def initialize(
        self,
        redis_client: Optional[RedisClient] = None,
        db_pool: Optional[DatabaseConnectionPool] = None,
        openrouter_client: Optional[Any] = None,
        openrouter_config: Optional[Any] = None
    ):
        \"\"\"
        Initialize all services with their dependencies.
        
        Args:
            redis_client: Redis client for caching
            db_pool: Database connection pool
            openrouter_client: OpenRouter client for AI service
            openrouter_config: OpenRouter configuration
        \"\"\"
        if self._initialized:
            logger.warning(\"ServiceRegistry already initialized\")
            return
        
        logger.info(\"Initializing ServiceRegistry...\")
        
        # Store infrastructure components
        self._redis_client = redis_client
        self._db_pool = db_pool
        
        try:
            # Initialize UnifiedChatService
            logger.info(\"Initializing UnifiedChatService...\")
            unified_chat_service = UnifiedChatService(
                cache=redis_client,
                logger_instance=logging.getLogger(\"UnifiedChatService\"),
                db_client=db_pool
            )
            self._services[\"unified_chat\"] = unified_chat_service
            logger.info(\"✓ UnifiedChatService initialized\")
            
            # Initialize ProjectService
            logger.info(\"Initializing ProjectService...\")
            project_service = ProjectService(
                cache=redis_client,
                logger_instance=logging.getLogger(\"ProjectService\"),
                db_client=db_pool
            )
            self._services[\"project\"] = project_service
            logger.info(\"✓ ProjectService initialized\")
            
            # Initialize AIService
            logger.info(\"Initializing AIService...\")
            ai_service = AIService(
                cache=redis_client,
                logger_instance=logging.getLogger(\"AIService\"),
                db_client=db_pool
            )
            
            # Set OpenRouter client if provided
            if openrouter_client:
                ai_service.openrouter_client = openrouter_client
                ai_service.openrouter_config = openrouter_config
                logger.info(\"✓ AIService configured with OpenRouter client\")
            
            self._services[\"ai\"] = ai_service
            logger.info(\"✓ AIService initialized\")
            
            # Initialize MonitoringService
            logger.info(\"Initializing MonitoringService...\")
            monitoring_service = MonitoringService(
                db_pool=db_pool,
                redis_client=redis_client,
                service_registry=self
            )
            self._services[\"monitoring\"] = monitoring_service
            logger.info(\"✓ MonitoringService initialized\")
            
            self._initialized = True
            logger.info(f\"✓ ServiceRegistry initialized with {len(self._services)} services\")
            
        except Exception as e:
            logger.error(f\"Failed to initialize ServiceRegistry: {e}\")
            raise
    
    def get_service(self, service_name: str) -> Optional[Any]:
        \"\"\"
        Get a service by name.
        
        Args:
            service_name: Name of the service (unified_chat, project, ai, monitoring)
        
        Returns:
            Service instance or None if not found
        \"\"\"
        if not self._initialized:
            logger.error(\"ServiceRegistry not initialized\")
            return None
        
        return self._services.get(service_name)
    
    def get_unified_chat_service(self) -> Optional[UnifiedChatService]:
        \"\"\"Get UnifiedChatService instance.\"\"\"
        return self.get_service(\"unified_chat\")
    
    def get_project_service(self) -> Optional[ProjectService]:
        \"\"\"Get ProjectService instance.\"\"\"
        return self.get_service(\"project\")
    
    def get_ai_service(self) -> Optional[AIService]:
        \"\"\"Get AIService instance.\"\"\"
        return self.get_service(\"ai\")
    
    def get_monitoring_service(self) -> Optional[MonitoringService]:
        \"\"\"Get MonitoringService instance.\"\"\"
        return self.get_service(\"monitoring\")
    
    def get_all_services(self) -> Dict[str, Any]:
        \"\"\"Get all registered services.\"\"\"
        return self._services.copy()
    
    async def shutdown(self):
        \"\"\"
        Shutdown all services and cleanup resources.
        \"\"\"
        if not self._initialized:
            return
        
        logger.info(\"Shutting down ServiceRegistry...\")
        
        try:
            # Close Redis connections
            if self._redis_client:
                await self._redis_client.close()
                logger.info(\"✓ Redis connections closed\")
            
            # Close database pool
            if self._db_pool:
                await self._db_pool.close()
                logger.info(\"✓ Database pool closed\")
            
            # Clear services
            self._services.clear()
            self._initialized = False
            
            logger.info(\"✓ ServiceRegistry shutdown complete\")
            
        except Exception as e:
            logger.error(f\"Error during ServiceRegistry shutdown: {e}\")
            raise


# Global registry instance
_registry: Optional[ServiceRegistry] = None


def get_service_registry() -> ServiceRegistry:
    \"\"\"
    Get the global service registry instance.
    
    Returns:
        ServiceRegistry instance
    \"\"\"
    global _registry
    if _registry is None:
        _registry = ServiceRegistry()
    return _registry


async def initialize_service_registry(**kwargs) -> ServiceRegistry:
    \"\"\"
    Initialize the global service registry.
    
    Args:
        **kwargs: Arguments to pass to ServiceRegistry.initialize()
    
    Returns:
        Initialized ServiceRegistry
    \"\"\"
    registry = get_service_registry()
    await registry.initialize(**kwargs)
    return registry
```

**After Creating This File:**
1. Test import: `python -c \"from backend.infrastructure.service_registry import get_service_registry; print('✓ Import successful')\"`
2. Verify no syntax errors
3. Move to Task 2.2

---

#### Task 2.2: Update server.py Startup

**File to Modify:** `/app/backend/server.py`

**What to Do:**
1. Add service registry initialization in startup event
2. Store registry in app.state for access in endpoints
3. Initialize with Redis, DB pool, and OpenRouter client

**Find This Section in server.py (around line 554):**
```python
app = FastAPI(title=\"STEM Idea Generator API\")
api = APIRouter(prefix=\"/api\")
```

**Add AFTER the app declaration:**
```python
# Service Registry (will be initialized on startup)
from backend.infrastructure.service_registry import get_service_registry

@app.on_event(\"startup\")
async def startup_event():
    \"\"\"Initialize services on application startup.\"\"\"
    logger.info(\"=== Application Startup ===\")
    
    try:
        # Initialize Redis (if using)
        redis_client = None
        if os.getenv(\"REDIS_URL\"):
            from backend.infrastructure.redis_client import RedisClient
            redis_client = RedisClient(redis_url=os.getenv(\"REDIS_URL\"))
            await redis_client.connect()
            logger.info(\"✓ Redis client connected\")
        
        # Initialize Database Pool (if using)
        db_pool = None
        # Note: Add your DB pool initialization here if needed
        # db_pool = DatabaseConnectionPool(...)
        
        # Get OpenRouter client (already exists in server.py)
        openrouter_client = None
        openrouter_config = None
        if os.getenv(\"OPENROUTER_API_KEY\"):
            openrouter_config = OpenRouterConfig()
            openrouter_client = OpenRouterClient(openrouter_config)
            logger.info(\"✓ OpenRouter client configured\")
        
        # Initialize Service Registry
        registry = get_service_registry()
        await registry.initialize(
            redis_client=redis_client,
            db_pool=db_pool,
            openrouter_client=openrouter_client,
            openrouter_config=openrouter_config
        )
        
        # Store registry in app state for endpoint access
        app.state.registry = registry
        
        logger.info(\"✓ All services initialized successfully\")
        
    except Exception as e:
        logger.error(f\"Failed to initialize services: {e}\")
        raise


@app.on_event(\"shutdown\")
async def shutdown_event():
    \"\"\"Cleanup on application shutdown.\"\"\"
    logger.info(\"=== Application Shutdown ===\")
    
    try:
        if hasattr(app.state, 'registry'):
            await app.state.registry.shutdown()
            logger.info(\"✓ Services shutdown complete\")
    except Exception as e:
        logger.error(f\"Error during shutdown: {e}\")
```

**After Modifying:**
1. Check syntax: `python -m py_compile /app/backend/server.py`
2. Test server starts: `cd /app/backend && python -c \"from server import app; print('✓ Server module loads')\"`

---

### Phase 2: API Endpoint Integration (Day 3-5)

#### Task 1.2: Update Chat Endpoints

**Endpoints to Update in server.py:**
- `/api/projects/{project_id}/guidance/chat` (line ~3392)
- `/api/projects/{project_id}/guidance/context` (line ~3460)
- `/api/projects/{project_id}/guidance/history` (line ~3555)
- `/api/universal-chat/save-message` (line ~3998)
- `/api/universal-chat/sessions/{user_id}` (line ~4034)
- `/api/universal-chat/messages/{user_id}/{session_id}` (line ~4061)
- `/api/universal-chat/create-session` (line ~4089)
- `/api/universal-chat/session/{user_id}/{session_id}` (line ~4116)

**Pattern for Each Endpoint:**

**BEFORE (old code):**
```python
@api.post(\"/projects/{project_id}/guidance/chat\")
async def chat_endpoint(project_id: str, request: ChatRequest):
    # Old direct implementation
    ...
```

**AFTER (using UnifiedChatService):**
```python
@api.post(\"/projects/{project_id}/guidance/chat\")
async def chat_endpoint(project_id: str, request: ChatRequest, app_state=Depends(lambda: app.state)):
    \"\"\"
    Chat endpoint using UnifiedChatService.
    
    Rate limit: 60 requests/minute
    \"\"\"
    try:
        # Get service from registry
        registry = app_state.registry
        chat_service = registry.get_unified_chat_service()
        
        if not chat_service:
            raise HTTPException(status_code=503, detail=\"Chat service not available\")
        
        # Get or create session
        session = await chat_service.get_session(request.session_id)
        if not session:
            # Create new session
            session = await chat_service.create_session(
                user_id=request.user_id,  # Get from auth
                context=ChatContext.PROJECT,
                context_id=project_id
            )
        
        # Send user message
        user_message = await chat_service.send_message(
            session_id=session.session_id,
            content=request.message,
            sender=MessageSender.USER
        )
        
        # Get AI response (integrate with AIService)
        ai_service = registry.get_ai_service()
        if ai_service:
            ai_response = await ai_service.process_chat_request(project_id, request)
            
            # Store AI response
            await chat_service.send_message(
                session_id=session.session_id,
                content=ai_response.response,
                sender=MessageSender.AI,
                metadata={
                    \"suggestions\": ai_response.suggestions,
                    \"next_steps\": ai_response.next_steps
                }
            )
            
            return ChatResponse(
                response=ai_response.response,
                session_id=session.session_id,
                suggestions=ai_response.suggestions,
                next_steps=ai_response.next_steps
            )
        
        # Fallback response
        return ChatResponse(
            response=\"I'm here to help with your project.\",
            session_id=session.session_id,
            suggestions=[],
            next_steps=[]
        )
        
    except Exception as e:
        logger.error(f\"Error in chat endpoint: {e}\")
        raise HTTPException(status_code=500, detail=str(e))
```

**DO THIS FOR EACH CHAT ENDPOINT:**
1. Replace old implementation with UnifiedChatService calls
2. Get service from registry via `app.state.registry`
3. Use appropriate ChatContext (PROJECT, UNIVERSAL, CODE_GENERATION)
4. Add proper error handling
5. Test endpoint with curl after each update

---

#### Task 1.3: Update Project Endpoints

**Endpoints to Update:**
- `/api/generate-project` (line ~2969)
- `/api/projects/sync` (line ~3281)
- `/api/software-planning/analyze` (line ~4938)
- `/api/software-projects/{project_id}` (line ~5459)

**Pattern:**
```python
@api.post(\"/generate-project\")
async def generate_project(params: ProjectParams, app_state=Depends(lambda: app.state)):
    \"\"\"
    Generate project using ProjectService.
    
    Rate limit: 20 requests/minute
    \"\"\"
    try:
        registry = app_state.registry
        project_service = registry.get_project_service()
        
        if not project_service:
            raise HTTPException(status_code=503, detail=\"Project service not available\")
        
        # Create project
        project = await project_service.create_project(
            user_id=params.user_id,
            title=params.title,
            description=params.description,
            project_type=params.project_type,
            difficulty=params.difficulty
        )
        
        return project
        
    except Exception as e:
        logger.error(f\"Error generating project: {e}\")
        raise HTTPException(status_code=500, detail=str(e))
```

---

#### Task 1.5: Add Health Check Endpoints

**Add New Endpoints:**

```python
@api.get(\"/health\")
async def health_check(app_state=Depends(lambda: app.state)):
    \"\"\"
    Basic health check endpoint.
    
    Returns HTTP 200 if healthy, 503 if unhealthy.
    \"\"\"
    try:
        registry = app_state.registry
        monitoring_service = registry.get_monitoring_service()
        
        if not monitoring_service:
            return JSONResponse(
                status_code=503,
                content={\"status\": \"unhealthy\", \"error\": \"Monitoring service not available\"}
            )
        
        health_status = await monitoring_service.get_health_status()
        
        # Return 503 if unhealthy
        if health_status[\"status\"] != \"healthy\":
            return JSONResponse(
                status_code=503,
                content=health_status
            )
        
        return health_status
        
    except Exception as e:
        logger.error(f\"Health check failed: {e}\")
        return JSONResponse(
            status_code=503,
            content={\"status\": \"unhealthy\", \"error\": str(e)}
        )


@api.get(\"/health/ready\")
async def readiness_check(app_state=Depends(lambda: app.state)):
    \"\"\"
    Kubernetes readiness probe endpoint.
    \"\"\"
    return await health_check(app_state)


@api.get(\"/health/live\")
async def liveness_check():
    \"\"\"
    Kubernetes liveness probe endpoint.
    \"\"\"
    return {\"status\": \"alive\", \"timestamp\": datetime.utcnow().isoformat()}
```

---

### Phase 3: Testing (Day 6-7)

#### Manual Testing Checklist

**Test Each Endpoint After Integration:**

```bash
# 1. Health Checks
curl http://localhost:8001/api/health
curl http://localhost:8001/api/health/ready
curl http://localhost:8001/api/health/live

# 2. Chat Endpoints
curl -X POST http://localhost:8001/api/universal-chat/create-session \
  -H \"Content-Type: application/json\" \
  -d '{\"user_id\": \"test-user\", \"context\": \"universal\"}'

curl -X POST http://localhost:8001/api/universal-chat/save-message \
  -H \"Content-Type: application/json\" \
  -d '{\"session_id\": \"<session-id>\", \"user_id\": \"test-user\", \"message\": \"Hello\"}'

# 3. Project Endpoints
curl -X POST http://localhost:8001/api/generate-project \
  -H \"Content-Type: application/json\" \
  -d '{\"title\": \"Test Project\", \"description\": \"Test\", \"project_type\": \"iot\", \"difficulty\": \"beginner\"}'

# 4. Check logs for service usage
tail -f /var/log/supervisor/backend.*.log | grep \"UnifiedChatService\|ProjectService\|AIService\"
```

---

## ⚠️ Critical Rules & Constraints

### DO:
1. ✅ **Use search_replace** for ALL changes to existing files
2. ✅ **Test after EVERY change** - use curl or python to verify
3. ✅ **Check logs** - Always verify services are being called: `tail -f /var/log/supervisor/backend.*.log`
4. ✅ **Use app.state.registry** to access services in endpoints
5. ✅ **Add proper error handling** - Services can be None
6. ✅ **Preserve existing functionality** - Don't break working endpoints
7. ✅ **Restart backend after changes**: `sudo supervisorctl restart backend`
8. ✅ **Read service files** before using them - understand the API

### DON'T:
1. ❌ **Don't use create_file with overwrite=True** on existing files
2. ❌ **Don't modify environment variables** (MONGO_URL, REACT_APP_BACKEND_URL, etc.)
3. ❌ **Don't start your own servers** - supervisor handles this
4. ❌ **Don't assume services work** - always test
5. ❌ **Don't skip health checks** - verify /api/health works
6. ❌ **Don't mock data** if real services are available
7. ❌ **Don't modify .env files** unless absolutely necessary

---

## 🧪 Testing Strategy

### After Each Endpoint Update:
1. **Syntax Check**: `python -m py_compile /app/backend/server.py`
2. **Import Check**: `python -c \"from backend.server import app\"`
3. **Restart**: `sudo supervisorctl restart backend`
4. **Log Check**: `tail -n 50 /var/log/supervisor/backend.*.log`
5. **Endpoint Test**: Use curl to test the specific endpoint
6. **Service Verification**: Check logs for service method calls

### Integration Testing:
1. Test full user flow: Create session → Send message → Get response
2. Test caching: Send same request twice, verify cache hit
3. Test error handling: Send invalid data, verify proper error response
4. Test health checks: Verify all components report healthy

---

## 📊 Success Criteria

### You Know You're Done When:
1. ✅ All chat endpoints use UnifiedChatService
2. ✅ All project endpoints use ProjectService  
3. ✅ All AI endpoints use AIService
4. ✅ Health endpoints return accurate status
5. ✅ `curl http://localhost:8001/api/health` returns `{\"status\": \"healthy\"}`
6. ✅ Logs show service method calls (e.g., \"UnifiedChatService.send_message called\")
7. ✅ No errors in backend logs during normal operation
8. ✅ Services are properly initialized on startup
9. ✅ Services are properly shutdown on stop
10. ✅ All tests pass with no regressions

---

## 🐛 Common Issues & Solutions

### Issue: \"Service not available\" error
**Solution:** 
- Check if service registry initialized: `grep \"ServiceRegistry initialized\" /var/log/supervisor/backend.*.log`
- Verify app.state.registry exists
- Check startup logs for errors

### Issue: Services are None
**Solution:**
- Ensure startup_event completed successfully
- Check Redis/DB connection status
- Verify service initialization didn't throw exceptions

### Issue: Cache not working
**Solution:**
- Check Redis connection: `redis-cli ping` (if Redis is configured)
- Verify cache TTL settings in services
- Check logs for cache hits/misses

### Issue: OpenRouter API errors
**Solution:**
- Check OPENROUTER_API_KEY is set
- Verify circuit breaker status
- Check API rate limits
- Look for fallback responses being used

---

## 📁 File Structure Reference

```
/app/backend/
├── infrastructure/
│   ├── service_registry.py          [CREATE THIS - Task 2.1]
│   ├── base_service.py               [EXISTS - Study this]
│   ├── redis_client.py               [EXISTS]
│   ├── db_pool.py                    [EXISTS]
│   ├── circuit_breaker.py            [EXISTS]
│   ├── rate_limiter.py               [EXISTS]
│   └── monitoring_service.py         [EXISTS]
├── services/
│   ├── unified_chat_service.py       [EXISTS - Use this]
│   ├── project_service.py            [EXISTS - Use this]
│   └── ai_service.py                 [EXISTS - Use this]
├── models/
│   ├── unified_chat.py               [EXISTS]
│   └── ai_guidance.py                [EXISTS]
├── middleware/
│   ├── request_validation.py         [EXISTS]
│   └── error_handler.py              [EXISTS]
└── server.py                         [MODIFY THIS - Tasks 1.2-1.5, 2.2]
```

---

## 🎯 Quick Start Commands

```bash
# 1. Navigate to backend
cd /app/backend

# 2. Check current server status
sudo supervisorctl status backend

# 3. View logs
tail -f /var/log/supervisor/backend.*.log

# 4. After making changes
sudo supervisorctl restart backend

# 5. Test health endpoint
curl http://localhost:8001/api/health

# 6. Test specific endpoint
curl -X POST http://localhost:8001/api/<endpoint> \
  -H \"Content-Type: application/json\" \
  -d '{...}'
```

---

## 📞 Key Contacts (Service Methods)

### UnifiedChatService (`unified_chat_service.py`)
```python
# Create session
session = await chat_service.create_session(
    user_id=\"user-id\",
    context=ChatContext.PROJECT,  # or UNIVERSAL, CODE_GENERATION
    context_id=\"project-id\"
)

# Send message
message = await chat_service.send_message(
    session_id=\"session-id\",
    content=\"message text\",
    sender=MessageSender.USER  # or AI, SYSTEM
)

# Get history
history = await chat_service.get_history(
    session_id=\"session-id\",
    limit=50,
    offset=0
)

# Archive session
success = await chat_service.archive_session(
    session_id=\"session-id\",
    user_id=\"user-id\"
)
```

### ProjectService (`project_service.py`)
```python
# Create project
project = await project_service.create_project(
    user_id=\"user-id\",
    title=\"Project Title\",
    description=\"Description\",
    project_type=\"iot\",
    difficulty=\"beginner\"
)

# Get project context (2-hour cache)
context = await project_service.get_project_context(
    project_id=\"project-id\",
    include_ai_suggestions=False
)

# Get technology recommendations (24-hour cache)
tech_stack = await project_service.get_technology_recommendations(
    project_type=\"web_app\",
    platforms=[\"web\"],
    complexity=\"moderate\",
    team_expertise=\"intermediate\"
)
```

### AIService (`ai_service.py`)
```python
# Process chat request (stateless)
response = await ai_service.process_chat_request(
    project_id=\"project-id\",
    request=ChatRequest(message=\"help me\", session_id=\"...\")
)

# Generate AI response with caching (1-hour cache)
response = await ai_service.generate_ai_response(
    user_message=\"How do I...\",
    project_context=project_context,
    conversation_history=[]
)

# Get project context
context = await ai_service.get_project_context(project_id=\"project-id\")
```

### MonitoringService (`monitoring_service.py`)
```python
# Get health status
health = await monitoring_service.get_health_status()
# Returns: {\"status\": \"healthy|degraded|unhealthy\", \"components\": {...}}

# Check specific components
db_health = await monitoring_service.check_database_health()
redis_health = await monitoring_service.check_redis_health()
services_health = await monitoring_service.check_services_health()
```

---

## 💡 Pro Tips

1. **Incremental Approach**: Update one endpoint at a time, test, commit progress
2. **Log Everything**: Use logger.info() liberally to track service calls
3. **Cache Debugging**: Check cache hit rates in logs to verify caching works
4. **Error Handling**: Always handle None services gracefully
5. **Rollback Plan**: Keep old endpoint code commented out initially
6. **Documentation**: Update endpoint-audit.md as you complete endpoints
7. **Performance**: Monitor response times - should improve with caching

---

## 🎬 Final Notes

**This is a service consolidation project, not a feature build:**
- All services already exist and work
- Your job is to wire them into the API layer
- Don't reimplement service logic
- Focus on integration, not innovation

**Completion Signal:**
When you can run these commands successfully:
```bash
curl http://localhost:8001/api/health
# Returns: {\"status\": \"healthy\", ...}

curl http://localhost:8001/api/universal-chat/create-session -X POST ...
# Creates session using UnifiedChatService

grep \"UnifiedChatService\|ProjectService\|AIService\" /var/log/supervisor/backend.*.log
# Shows service method calls in logs
```

**You're ready! Start with Phase 1, Task 2.1. Good luck! 🚀**
"
