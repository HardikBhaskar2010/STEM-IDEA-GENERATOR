"""
FastAPI Dependency Injection setup.

Provides the lifespan context manager (replaces deprecated @app.on_event)
and all ``get_*`` dependency functions used by routers and orchestrators.

All singletons are stored in ``app.state`` during the startup phase and
retrieved via request-scoped dependency functions.

Requirements: 34, 34.5, 34.6, 34.7, 39
"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import Depends, Request
from fastapi import FastAPI

from backend.core.config import OpenRouterConfig
from backend.core.logging import StructuredLogger
from backend.integrations.openrouter.client import OpenRouterClient
from backend.integrations.openrouter.health import OpenRouterHealthCheck

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan context manager (startup + shutdown)
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan manager — replaces deprecated @app.on_event.

    Startup phase:
      - Initialise ``OpenRouterConfig``
      - Initialise ``StructuredLogger``
      - Initialise ``OpenRouterClient``
      - Initialise ``OpenRouterHealthCheck``

    Shutdown phase:
      - Close the OpenRouter HTTP session

    Requirements: 34.5, 39
    """
    # ----------------------------------------------------------------
    # STARTUP
    # ----------------------------------------------------------------
    logger.info("Application startup — initialising singletons…")

    try:
        config = OpenRouterConfig()
        app.state.openrouter_config = config
        logger.info("OpenRouterConfig initialised")
    except ValueError as exc:
        logger.error("Failed to initialise OpenRouterConfig: %s", exc)
        app.state.openrouter_config = None

    try:
        structured_logger = StructuredLogger(
            "openrouter-operations",
            app.state.openrouter_config.api_key if app.state.openrouter_config else "",
        )
        app.state.structured_logger = structured_logger
        logger.info("StructuredLogger initialised")
    except Exception as exc:
        logger.error("Failed to initialise StructuredLogger: %s", exc)
        app.state.structured_logger = None

    try:
        openrouter_client = OpenRouterClient(
            config=app.state.openrouter_config,
            structured_logger=app.state.structured_logger,
        )
        app.state.openrouter_client = openrouter_client
        logger.info("OpenRouterClient initialised")
    except Exception as exc:
        logger.error("Failed to initialise OpenRouterClient: %s", exc)
        app.state.openrouter_client = None

    try:
        health_check = OpenRouterHealthCheck(client=app.state.openrouter_client)
        app.state.openrouter_health = health_check
        # Non-blocking connectivity probe at startup
        is_up = await health_check.check_connectivity()
        if not is_up:
            logger.warning("OpenRouter connectivity check failed at startup — degraded mode")
        else:
            logger.info("OpenRouter connectivity verified")
    except Exception as exc:
        logger.warning("OpenRouter health check failed at startup: %s — degraded mode", exc)
        app.state.openrouter_health = None

    logger.info("Application startup complete")

    # ----------------------------------------------------------------
    # YIELD — application runs here
    # ----------------------------------------------------------------
    yield

    # ----------------------------------------------------------------
    # SHUTDOWN
    # ----------------------------------------------------------------
    logger.info("Application shutdown — releasing resources…")
    try:
        if app.state.openrouter_client:
            await app.state.openrouter_client.close()
            logger.info("OpenRouterClient closed")
    except Exception as exc:
        logger.error("Error closing OpenRouterClient: %s", exc)

    logger.info("Application shutdown complete")


# ---------------------------------------------------------------------------
# Dependency provider functions
# ---------------------------------------------------------------------------

def get_openrouter_config(request: Request) -> OpenRouterConfig:
    """Provide the singleton :class:`~backend.core.config.OpenRouterConfig`.

    Requirements: 34.6
    """
    return request.app.state.openrouter_config


def get_structured_logger(request: Request) -> StructuredLogger:
    """Provide the singleton :class:`~backend.core.logging.StructuredLogger`.

    Requirements: 34.6
    """
    return request.app.state.structured_logger


def get_openrouter_client(request: Request) -> OpenRouterClient:
    """Provide the singleton :class:`~backend.integrations.openrouter.client.OpenRouterClient`.

    Requirements: 34.6
    """
    return request.app.state.openrouter_client


def get_openrouter_health(request: Request) -> OpenRouterHealthCheck:
    """Provide the singleton :class:`~backend.integrations.openrouter.health.OpenRouterHealthCheck`.

    Requirements: 34.6
    """
    return request.app.state.openrouter_health


# ---------------------------------------------------------------------------
# Orchestrator dependency providers
# (imported lazily to avoid circular imports at module-load time)
# ---------------------------------------------------------------------------

def get_project_orchestrator(
    openrouter_client: OpenRouterClient = Depends(get_openrouter_client),
):
    """Provide a :class:`~backend.orchestration.project_orchestrator.ProjectOrchestrator`.

    Requirements: 34.7
    """
    from backend.orchestration.project_orchestrator import ProjectOrchestrator  # noqa: PLC0415
    return ProjectOrchestrator(openrouter_client=openrouter_client)


def get_veronica_orchestrator(
    openrouter_client: OpenRouterClient = Depends(get_openrouter_client),
):
    """Provide a :class:`~backend.orchestration.veronica_orchestrator.VeronicaOrchestrator`.

    Requirements: 34.7
    """
    from backend.orchestration.veronica_orchestrator import VeronicaOrchestrator  # noqa: PLC0415
    return VeronicaOrchestrator(openrouter_client=openrouter_client)


def get_agent_orchestrator(
    openrouter_client: OpenRouterClient = Depends(get_openrouter_client),
):
    """Provide a :class:`~backend.orchestration.agent_orchestrator.AgentWorkflowOrchestrator`.

    Requirements: 34.7
    """
    from backend.services.agent_orchestrator import AgentWorkflowOrchestrator  # noqa: PLC0415
    return AgentWorkflowOrchestrator(openrouter_client=openrouter_client)


# ---------------------------------------------------------------------------
# Supabase persistence dependencies
# ---------------------------------------------------------------------------

def get_supabase_service():
    """
    Provide a singleton :class:`~backend.services.supabase_service.SupabaseService`.

    The service lazily initialises the supabase-py client on first use.
    If SUPABASE_URL / SUPABASE_SERVICE_KEY are not set the service silently
    operates in no-op mode — guest usage is unaffected.
    """
    from backend.services.supabase_service import SupabaseService  # noqa: PLC0415
    return SupabaseService()


async def get_authenticated_user_id(request: Request) -> str | None:
    """
    Optional dependency: extract a Supabase user ID from the Bearer JWT.

    Returns the ``sub`` claim (user UUID) if the token is present and valid,
    or ``None`` for unauthenticated / guest requests.

    Usage in a router::

        @router.post("/my-endpoint")
        async def my_endpoint(
            user_id: str | None = Depends(get_authenticated_user_id),
        ):
            ...
    """
    import os  # noqa: PLC0415
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split(" ", 1)[1].strip()
    if not token:
        return None

    # Validate the JWT against Supabase by calling the /auth/v1/user endpoint.
    # We use httpx so we don't need supabase-py for this lightweight check.
    try:
        import httpx  # noqa: PLC0415
        url  = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL", "")
        key  = os.getenv("SUPABASE_ANON_KEY", "")
        if not url:
            return None
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(
                f"{url}/auth/v1/user",
                headers={"Authorization": f"Bearer {token}", "apikey": key},
            )
        if resp.status_code == 200:
            data = resp.json()
            return data.get("id")
    except Exception as exc:
        logger.debug("get_authenticated_user_id: token validation failed: %s", exc)
    return None

async def require_admin(request: Request) -> str:
    """Enforce admin access by checking if the authenticated user's email matches the hardcoded owner."""
    import os
    from fastapi import HTTPException
    
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authentication token")

    token = auth_header.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Empty authentication token")

    try:
        import httpx
        url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL", "")
        key = os.getenv("SUPABASE_ANON_KEY", "")
        if not url:
            raise HTTPException(status_code=500, detail="Supabase URL not configured")
        
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(
                f"{url}/auth/v1/user",
                headers={"Authorization": f"Bearer {token}", "apikey": key},
            )
            
        if resp.status_code == 200:
            data = resp.json()
            email = data.get("email")
            
            # Hardcoded admin check
            if email != "hardik.bhaskar2010@gmail.com":
                raise HTTPException(status_code=403, detail="Admin privileges required")
                
            return data.get("id")
        else:
            raise HTTPException(status_code=401, detail="Invalid token")
            
    except HTTPException:
        raise
    except Exception as exc:
        logger.debug("require_admin: validation failed: %s", exc)
        raise HTTPException(status_code=401, detail="Authentication failed")

