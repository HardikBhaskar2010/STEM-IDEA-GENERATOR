# STEM Idea Generator — Backend

## Architecture

The backend uses a **Router → Orchestrator → Services** layered architecture.

```
HTTP Request
    ↓
backend/routers/          ← 10 thin HTTP handlers (FastAPI routers)
    ↓
backend/orchestration/    ← 3 workflow coordinators (coordinate services)
    ↓
backend/services/         ← focused business logic + existing services
    ↓
backend/integrations/     ← OpenRouter client (retry, streaming, health)
    ↓
backend/core/             ← config, logging, security, DI, rate limiting
```

## Directory Structure

```
backend/
├── core/
│   ├── config.py           # OpenRouterConfig — env var loading + validation
│   ├── security.py         # APIKeySecurityValidator — credential sanitization
│   ├── logging.py          # StructuredLogger + OpenRouterMetrics
│   ├── rate_limit.py       # Sliding-window rate limiting (rate_limit("category"))
│   ├── exceptions.py       # Domain exception hierarchy (AppError subclasses)
│   └── dependencies.py     # FastAPI lifespan + get_* dependency providers
│
├── integrations/openrouter/
│   ├── client.py           # OpenRouterClient — async HTTP, retry (4s/8s/10s), streaming
│   ├── health.py           # OpenRouterHealthCheck — live + cached connectivity
│   ├── adapter.py          # ResponseAdapter — normalize API responses
│   └── errors.py           # OpenRouterErrorMapper — error code → HTTP status
│
├── orchestration/
│   ├── project_orchestrator.py   # STEM project generation workflow
│   ├── veronica_orchestrator.py  # Veronica AI chat, project gen, file mgmt
│   └── agent_orchestrator.py     # Agent jobs + DevLab jobs
│
├── services/               # New focused services
│   ├── sandbox_service.py  # Wraps SandboxManager with domain exceptions
│   ├── snapshot_service.py # Wraps ProjectVersioning module
│   └── performance_service.py  # Wraps monitoring infrastructure
│
├── routers/                # 10 domain HTTP handlers
│   ├── health.py           # /api/health, /api/health/detailed, /api/test-status
│   ├── projects.py         # /api/generate-project, /api/projects/sync
│   ├── veronica.py         # /api/veronica-ai/chat, /api/veronica-projects/*
│   ├── sandbox.py          # /api/veronica-projects/{id}/run, stop, logs
│   ├── agents.py           # /api/agents/*, /api/devlab/jobs/*
│   ├── snapshots.py        # /api/veronica-projects/{id}/snapshots/*
│   ├── guidance.py         # /api/guidance/*
│   ├── chat.py             # /api/chat
│   ├── codegen.py          # /api/generate_code, /api/explain_code
│   └── performance.py      # /api/performance/database
│
├── utils/
│   └── fallback.py         # Local STEM project template generator (AI fallback)
│
├── tests/
│   ├── unit/               # Unit tests (100% mocked)
│   └── integration/        # Integration tests (FastAPI TestClient)
│
├── server.py               # NEW: Minimal entry point (wires all routers)
└── server_legacy.py        # OLD: Original 6,775-line monolith (preserved)
```

## Running the Server

```bash
# Development
uvicorn backend.server:app --reload --port 8000

# Production
uvicorn backend.server:app --host 0.0.0.0 --port 8000
```

## Running Tests

```bash
# All tests
python -m pytest backend/tests/ -v

# Unit tests only
python -m pytest backend/tests/unit/ -v

# Integration tests only
python -m pytest backend/tests/integration/ -v

# With coverage
python -m pytest backend/tests/ --cov=backend --cov-report=term-missing
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENROUTER_API_KEY` | ✅ | — | Must start with `sk-or-v1-` |
| `OPENROUTER_BASE_URL` | ❌ | `https://openrouter.ai/api/v1` | API base URL |
| `OPENROUTER_MODEL` | ❌ | `stepfun/step-3.5-flash:free` | Model identifier |
| `OPENROUTER_TIMEOUT` | ❌ | `60` | Request timeout in seconds |
| `CORS_ORIGINS` | ❌ | `http://localhost:3000,...` | Comma-separated allowed origins |
| `LOG_LEVEL` | ❌ | `INFO` | Logging level |
| `PORT` | ❌ | `8000` | Uvicorn port |

## Rate Limits

| Category | Limit | Endpoints |
|----------|-------|-----------|
| `veronica_ai` | 10 req/min | `/api/veronica-ai/chat`, guidance, codegen |
| `sandbox_execution` | 5 req/min | `/api/veronica-projects/*/run` |
| `agent_jobs` | 3 req/min | `/api/agents/start`, `/api/devlab/jobs` |
| `default` | 60 req/min | All other endpoints |

## Design Principles

1. **Layered Architecture**: Routers call orchestrators, orchestrators call services. Routers never call services directly.
2. **Dependency Injection**: All singletons injected via `Depends()` and stored in `app.state`.
3. **Graceful Degradation**: AI generation failures fall back to local templates silently.
4. **Security**: API keys sanitized from all logs and error messages via `APIKeySecurityValidator`.
5. **Zero Breaking Changes**: Legacy API contracts preserved; `server_legacy.py` kept for rollback.
