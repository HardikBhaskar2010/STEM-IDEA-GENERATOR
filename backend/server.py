"""
backend/server.py — Minimal application entry point (Phase 5/6 new server).

This file:
  1. Creates the FastAPI application with the lifespan context manager.
  2. Registers CORS middleware and monitoring.
  3. Includes all domain routers.
  4. Provides the `app` object for uvicorn / Render.

All business logic has moved to:
  - backend/orchestration/   (workflow coordination)
  - backend/services/        (domain logic)
  - backend/integrations/    (external API clients)
  - backend/routers/         (HTTP handlers)

The legacy 6,775-line monolith is preserved as server_legacy.py until the
migration is fully validated in production.

Requirements: 34, 34.5, 34.6, 34.7
"""

import logging
import os
import sys

# ----------------------------------------------------------------
# Ensure project root is on sys.path so `from backend.xyz import ...`
# works regardless of where uvicorn is started from.
# ----------------------------------------------------------------
_project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from dotenv import load_dotenv

load_dotenv()

# ----------------------------------------------------------------
# Logging
# ----------------------------------------------------------------
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

from backend.core.log_stream import global_log_streamer

logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s %(levelname)s  %(name)s — %(message)s",
    handlers=[logging.StreamHandler(), global_log_streamer]
)
logger = logging.getLogger("stem-backend")

# Also ensure uvicorn loggers broadcast to the streamer
logging.getLogger("uvicorn.access").addHandler(global_log_streamer)
logging.getLogger("uvicorn.error").addHandler(global_log_streamer)

# ----------------------------------------------------------------
# FastAPI application
# ----------------------------------------------------------------
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.core.dependencies import lifespan
from backend.core.exceptions import AppError, RateLimitError

# Routers
from backend.routers.health import health_router
from backend.routers.projects import projects_router
from backend.routers.veronica import veronica_router
from backend.routers.sandbox import sandbox_router
from backend.routers.agents import agents_router
from backend.routers.snapshots import snapshots_router
from backend.routers.guidance import guidance_router
from backend.routers.chat import chat_router
from backend.routers.codegen import codegen_router
from backend.routers.performance import performance_router

from backend.routers.system import system_router

# Legacy feature routers (from root-level route files)
try:
    from backend.achievement_routes import achievement_router  # noqa: PLC0415
    _achievement_available = True
except Exception as _e:
    logger.warning("Achievement router unavailable: %s", _e)
    _achievement_available = False

try:
    from backend.competition_routes import competition_router  # noqa: PLC0415
    _competition_available = True
except Exception as _e:
    logger.warning("Competition router unavailable: %s", _e)
    _competition_available = False

# ----------------------------------------------------------------
# App creation
# ----------------------------------------------------------------
app = FastAPI(
    title="STEM Idea Generator API",
    version="2.0.0",
    description="Modular STEM project generation and AI tutoring platform",
    lifespan=lifespan,
)

# ----------------------------------------------------------------
# CORS
# ----------------------------------------------------------------
_DEFAULT_ORIGINS = ",".join([
    "http://localhost:3000",
    "http://localhost:5173",
    # Vercel deployments — add any preview URLs as needed
    "https://stemidea.vercel.app",
    "https://stem-idea-generator.vercel.app",
])

ALLOWED_ORIGINS = os.getenv("CORS_ORIGINS", _DEFAULT_ORIGINS).split(",")
# Strip whitespace from each origin (safe guard against env-var formatting)
ALLOWED_ORIGINS = [o.strip() for o in ALLOWED_ORIGINS if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",   # all Vercel preview URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------------------
# Monitoring middleware (existing infrastructure — optional)
# ----------------------------------------------------------------
try:
    from backend.infrastructure.middleware import add_monitoring_middleware  # noqa: PLC0415
    add_monitoring_middleware(app)
    logger.info("Monitoring middleware registered")
except ImportError:
    logger.debug("Optional monitoring middleware not found — skipping")

# ----------------------------------------------------------------
# Global exception handlers
# ----------------------------------------------------------------


@app.exception_handler(AppError)
async def app_error_handler(request, exc: AppError):
    """Convert domain exceptions to consistent JSON HTTP responses."""
    return JSONResponse(
        status_code=exc.to_http_status(),
        content=exc.to_response_dict(),
    )


@app.exception_handler(RateLimitError)
async def rate_limit_error_handler(request, exc: RateLimitError):
    """Return 429 with Retry-After header for rate limit violations."""
    return JSONResponse(
        status_code=429,
        content=exc.to_response_dict(),
        headers={"Retry-After": "60"},
    )


# ----------------------------------------------------------------
# Router registration
# ----------------------------------------------------------------
app.include_router(health_router)
app.include_router(projects_router)
app.include_router(veronica_router)
app.include_router(sandbox_router)
app.include_router(agents_router)
app.include_router(snapshots_router)
app.include_router(guidance_router)
app.include_router(chat_router)
app.include_router(codegen_router)
app.include_router(performance_router)
app.include_router(system_router)

if _achievement_available:
    app.include_router(achievement_router)
    logger.info("Achievement router mounted")

if _competition_available:
    app.include_router(competition_router)
    logger.info("Competition router mounted")

# ── Inline health aliases expected by frontend debug panel ──────────────────
from fastapi import Request as _Request  # noqa: E402

@app.get("/", tags=["health"])
@app.get("/health", tags=["health"])
async def root_health():
    """Root and /health keepalive endpoint."""
    return {"status": "ok", "service": "stem-backend"}


@app.get("/api/veronica-ai/health", tags=["veronica"])
async def veronica_ai_health(_req: _Request):
    """Health check shim for Veronica AI."""
    return {"status": "ok", "service": "veronica-ai"}



logger.info(
    "STEM Idea Generator API v2 started — core routers + optional feature routers mounted",
)

# ----------------------------------------------------------------
# Entrypoint for `python -m backend.server` / uvicorn
# ----------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.server:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        log_level=LOG_LEVEL.lower(),
        reload=os.getenv("ENV", "production") == "development",
    )
