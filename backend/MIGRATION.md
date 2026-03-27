# Backend Migration Guide

## Overview

The original monolithic `backend/server.py` (6,775 lines) has been decomposed into a modular
**Router → Orchestrator → Services** architecture across 6 phases.

## Migration Status

| Phase | Status | Description |
|-------|--------|-------------|
| 1: Core Infrastructure | ✅ Complete | `core/`, `integrations/openrouter/` |
| 2: Orchestration Layer | ✅ Complete | `orchestration/` (3 orchestrators) |
| 3: Services Layer | ✅ Complete | 3 new services + existing services reused |
| 4: Routers | ✅ Complete | 10 domain routers + new `server.py` |
| 5: Testing | ✅ Complete | 100 tests (unit + integration) |
| 6: Documentation | ✅ Complete | README.md + MIGRATION.md |

## What Changed

### New Entry Point

`backend/server.py` is now a minimal wiring file (~130 lines). The original has been preserved as `backend/server_legacy.py`.

The new `server.py`:
- Uses the FastAPI `lifespan` context manager (replaces deprecated `@app.on_event`)
- Initialises all singletons in `app.state` via `backend/core/dependencies.py`
- Includes all 10 domain routers
- Registers global `AppError` and `RateLimitError` exception handlers

### Rate Limiting Pattern Change

**Before** (decorator-based):
```python
# server_legacy.py (informal, non-standard)
@rate_limiter_decorator
async def endpoint(): ...
```

**After** (FastAPI Depends-based):
```python
# routers/veronica.py
@veronica_router.post("/chat", dependencies=[rate_limit("veronica_ai")])
async def veronica_chat(body: ..., orchestrator = Depends(get_veronica_orchestrator)):
    ...
```

### Error Handling Pattern

**Before**: Mixed `try/except` with raw `HTTPException` and inconsistent status codes.

**After**: Consistent domain exception hierarchy:
```
AppError (base, 500)
├── ValidationError (400)
├── NotFoundError   (404)
├── AuthenticationError (401)
├── AuthorizationError  (403)
├── RateLimitError  (429)
└── UpstreamError   (503/502/429 based on upstream_status)
```

Routers catch `AppError` and call `e.to_http_status()` / `e.to_response_dict()`.

### Dependency Injection Pattern

**Before**: Global module-level singletons (hard to test).

**After**: All singletons in `app.state`, retrieved via `get_*` functions:
```python
# In any router or endpoint
async def my_endpoint(
    client: OpenRouterClient = Depends(get_openrouter_client),
    orchestrator: ProjectOrchestrator = Depends(get_project_orchestrator),
):
    ...
```

## Rollback Plan

If the new `server.py` causes issues in production:

1. Rename `server.py` → `server_new.py`
2. Rename `server_legacy.py` → `server.py`
3. Deploy — reverts to original monolith with zero API changes

## Final Cleanup (Post-Validation)

After the new architecture is validated in production for ≥ 1 week:
```bash
# Remove the legacy monolith
del backend\server_legacy.py
```
