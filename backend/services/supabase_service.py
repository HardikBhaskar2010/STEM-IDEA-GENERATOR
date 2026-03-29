"""
backend/services/supabase_service.py

Thin async persistence layer wrapping supabase-py.

All public methods are *no-ops* when user_id is None (unauthenticated guest),
so callers never need to branch — they just pass whatever user_id they got from
the request (could be None).

Usage in a router:
    from backend.services.supabase_service import SupabaseService
    from backend.core.dependencies import get_supabase_service

    @router.post("/generate-project")
    async def generate(
        body: ProjectRequest,
        user_id: str | None = Depends(get_authenticated_user_id),
        svc: SupabaseService = Depends(get_supabase_service),
    ):
        result = await orchestrator.generate_project(...)
        await svc.upsert_project(user_id, result)
        return result
"""

from __future__ import annotations

import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy supabase client initialisation
# ---------------------------------------------------------------------------

_supabase_client = None


def _get_client():
    """Return a supabase-py client, initialised lazily on first call."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    url  = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL", "")
    key  = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY", "")

    if not url or not key:
        logger.warning(
            "SUPABASE_URL / SUPABASE_SERVICE_KEY not set — "
            "SupabaseService will run in no-op mode."
        )
        return None

    try:
        from supabase import create_client  # type: ignore
        _supabase_client = create_client(url, key)
        logger.info("SupabaseService: client initialised (url=%s)", url)
    except ImportError:
        logger.warning("supabase-py not installed — SupabaseService in no-op mode.")
        _supabase_client = None

    return _supabase_client


# ---------------------------------------------------------------------------
# Service class
# ---------------------------------------------------------------------------


class SupabaseService:
    """
    Persistence layer for Supabase.

    All writes are gated on `user_id is not None` so guest sessions
    never touch the database.
    """

    # ------------------------------------------------------------------ #
    # Projects
    # ------------------------------------------------------------------ #

    async def upsert_project(
        self,
        user_id: str | None,
        project: dict[str, Any],
    ) -> dict[str, Any] | None:
        """
        Upsert a generated project into public.projects.

        Returns the saved row, or None on failure / unauthenticated.
        """
        if not user_id:
            return None

        client = _get_client()
        if client is None:
            return None

        try:
            # Build the row dict, excluding None id so Postgres generates one
            row: dict[str, Any] = {
                "user_id":               user_id,
                "title":                 project.get("title", "Untitled Project"),
                "description":           project.get("description"),
                "difficulty":            project.get("difficulty"),
                "estimated_time":        project.get("estimatedTime") or project.get("estimated_time"),
                "estimated_cost":        project.get("estimatedCost") or project.get("estimated_cost"),
                "components":            project.get("components", []),
                "skills":                project.get("skills", []),
                "steps":                 project.get("steps", []),
                "status":                project.get("status", "planning"),
                "progress":              project.get("progress", 0),
                "notes":                 project.get("notes", ""),
                "starred":               project.get("starred", False),
                "tags":                  project.get("tags", []),
                "completed_steps":       project.get("completedSteps") or project.get("completed_steps", []),
                "generated_from_params": project.get("generated_from_params") or project.get("generatedFromParams", {}),
            }
            if "project_files" in project:
                row["project_files"] = project["project_files"]
            project_id = project.get("id")
            if project_id:
                row["id"] = project_id

            res = (
                client.table("projects")
                      .upsert(row, on_conflict="id")
                      .execute()
            )
            saved = res.data[0] if res.data else None
            if saved:
                logger.debug("SupabaseService: upserted project %s for user %s", saved.get("id"), user_id)
            return saved
        except Exception as exc:
            logger.error("SupabaseService.upsert_project failed: %s", exc)
            return None

    async def load_project_spec(self, user_id: str | None, project_id: str) -> dict[str, Any] | None:
        """Load a full project row by ID (including project_files)."""
        if not user_id:
            return None
        client = _get_client()
        if client is None:
            return None
        try:
            res = (
                client.table("projects")
                      .select("*")
                      .eq("user_id", user_id)
                      .eq("id", project_id)
                      .execute()
            )
            return res.data[0] if res.data else None
        except Exception as exc:
            logger.error("SupabaseService.load_project_spec failed: %s", exc)
            return None

    async def list_projects(self, user_id: str | None) -> list[dict]:
        """Return all projects owned by the authenticated user."""
        if not user_id:
            return []
        client = _get_client()
        if client is None:
            return []
        try:
            res = (
                client.table("projects")
                      .select("*")
                      .eq("user_id", user_id)
                      .order("created_at", desc=True)
                      .execute()
            )
            return res.data or []
        except Exception as exc:
            logger.error("SupabaseService.list_projects failed: %s", exc)
            return []

    # ------------------------------------------------------------------ #
    # Veronica chat persistence
    # ------------------------------------------------------------------ #

    async def upsert_veronica_chat(
        self,
        user_id: str | None,
        chat: dict[str, Any],
    ) -> dict[str, Any] | None:
        """
        Create or update a veronica_project_chats row.

        `chat` should have at minimum: id (optional), title, mode.
        Returns the saved row or None.
        """
        if not user_id:
            return None
        client = _get_client()
        if client is None:
            return None

        try:
            row = {
                "user_id":   user_id,
                "title":     chat.get("title", "New Chat"),
                "mode":      chat.get("mode", "idea"),
                "project_id": chat.get("project_id"),
                "is_archived": chat.get("is_archived", False),
            }
            if chat.get("id"):
                row["id"] = chat["id"]

            res = (
                client.table("veronica_project_chats")
                      .upsert(row, on_conflict="id")
                      .execute()
            )
            saved = res.data[0] if res.data else None
            logger.debug("SupabaseService: upserted veronica chat %s", saved and saved.get("id"))
            return saved
        except Exception as exc:
            logger.error("SupabaseService.upsert_veronica_chat failed: %s", exc)
            return None

    async def save_veronica_message(
        self,
        chat_id: str,
        role: str,
        content: str,
        *,
        intent: str | None = None,
        confidence: float | None = None,
        actions: list | None = None,
        project_snap: dict | None = None,
    ) -> dict[str, Any] | None:
        """
        Append a message to veronica_chat_messages.
        The sync_veronica_chat_stats trigger auto-updates the parent chat row.
        """
        client = _get_client()
        if client is None:
            return None

        try:
            row = {
                "chat_id":     chat_id,
                "role":        role,
                "content":     content,
                "intent":      intent,
                "confidence":  confidence,
                "actions":     actions or [],
                "project_snap": project_snap,
            }
            res = client.table("veronica_chat_messages").insert(row).execute()
            return res.data[0] if res.data else None
        except Exception as exc:
            logger.error("SupabaseService.save_veronica_message failed: %s", exc)
            return None

    async def list_veronica_chats(self, user_id: str | None) -> list[dict]:
        """Return all non-archived chats for the user."""
        if not user_id:
            return []
        client = _get_client()
        if client is None:
            return []
        try:
            res = (
                client.table("veronica_project_chats")
                      .select("*, veronica_chat_messages(id, role, content, intent, confidence, actions, created_at)")
                      .eq("user_id", user_id)
                      .eq("is_archived", False)
                      .order("last_message_at", desc=True)
                      .execute()
            )
            return res.data or []
        except Exception as exc:
            logger.error("SupabaseService.list_veronica_chats failed: %s", exc)
            return []

    # ------------------------------------------------------------------ #
    # User preferences
    # ------------------------------------------------------------------ #

    async def upsert_preference(
        self,
        user_id: str | None,
        category: str,
        key: str,
        value: Any,
    ) -> bool:
        """
        Set a single preference key for the user.
        Returns True on success, False on failure / unauthenticated.
        """
        if not user_id:
            return False
        client = _get_client()
        if client is None:
            return False

        try:
            row = {
                "user_id":  user_id,
                "category": category,
                "key":      key,
                "value":    value,
            }
            client.table("user_preferences").upsert(
                row, on_conflict="user_id,category,key"
            ).execute()
            return True
        except Exception as exc:
            logger.error("SupabaseService.upsert_preference failed: %s", exc)
            return False

    async def upsert_preferences_bulk(
        self,
        user_id: str | None,
        prefs: dict[str, Any],
        category: str = "general",
    ) -> bool:
        """
        Upsert multiple preference keys at once.

        `prefs` is a flat dict: { "dark_mode": true, "language": "en", ... }
        All keys are stored under the given `category`.
        """
        if not user_id or not prefs:
            return False
        client = _get_client()
        if client is None:
            return False

        try:
            rows = [
                {"user_id": user_id, "category": category, "key": k, "value": v}
                for k, v in prefs.items()
            ]
            client.table("user_preferences").upsert(
                rows, on_conflict="user_id,category,key"
            ).execute()
            logger.debug(
                "SupabaseService: upserted %d preferences for user %s", len(rows), user_id
            )
            return True
        except Exception as exc:
            logger.error("SupabaseService.upsert_preferences_bulk failed: %s", exc)
            return False

    async def load_preferences(
        self,
        user_id: str | None,
        category: str | None = None,
    ) -> dict[str, Any]:
        """
        Load all preferences for the user (optionally filtered by category).
        Returns a flat dict: { "key": value, ... } collapsed across categories,
        or a nested dict { "category": { "key": value } } if category is None.
        """
        if not user_id:
            return {}
        client = _get_client()
        if client is None:
            return {}

        try:
            q = client.table("user_preferences").select("category, key, value").eq("user_id", user_id)
            if category:
                q = q.eq("category", category)
            res = q.execute()

            if category:
                return {row["key"]: row["value"] for row in (res.data or [])}

            # Nested by category
            result: dict = {}
            for row in (res.data or []):
                result.setdefault(row["category"], {})[row["key"]] = row["value"]
            return result
        except Exception as exc:
            logger.error("SupabaseService.load_preferences failed: %s", exc)
            return {}

    # ------------------------------------------------------------------ #
    # Convenience: save a generated idea result (alias of upsert_project)
    # ------------------------------------------------------------------ #

    async def save_generated_idea(
        self,
        user_id: str | None,
        idea: dict[str, Any],
        request_params: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        """
        Save a freshly generated STEM idea into public.projects.
        Merges request_params into generated_from_params for traceability.
        """
        if request_params:
            idea = {**idea, "generated_from_params": request_params}
        return await self.upsert_project(user_id, idea)
