"""
Veronica AI orchestrator.

Coordinates the Veronica AI assistant workflows: chat, project generation,
file management, memory, and mentor suggestions.  Delegates to existing
service implementations — it does not re-implement business logic.

Requirements: 16, 16.11, 16.12, 16.13, 40
"""

import logging
from typing import Any, AsyncIterator, Dict, Optional

from backend.core.exceptions import UpstreamError
from backend.integrations.openrouter.client import OpenRouterClient

logger = logging.getLogger(__name__)


class VeronicaOrchestrator:
    """
    Orchestrates Veronica AI workflows.

    Coordinates calls to the existing ``veronica_ai_router``,
    ``veronica_project_generator``, chat service, and sandbox service without
    duplicating their logic.

    Requirements: 16, 16.11–16.13
    """

    def __init__(self, openrouter_client: OpenRouterClient) -> None:
        self.openrouter_client = openrouter_client
        # Existing service singletons are imported lazily to avoid circular imports
        self._veronica_router = None
        self._project_generator = None

    # ------------------------------------------------------------------
    # Lazy service accessors
    # ------------------------------------------------------------------

    def _get_veronica_router(self):
        if self._veronica_router is None:
            from backend.services.veronica_ai_router import VeronicaAIRouter  # noqa: PLC0415
            self._veronica_router = VeronicaAIRouter()
        return self._veronica_router

    def _get_project_generator(self):
        if self._project_generator is None:
            from backend.services.veronica_project_generator import VeronicaProjectGenerator  # noqa: PLC0415
            self._project_generator = VeronicaProjectGenerator()
        return self._project_generator

    # ------------------------------------------------------------------
    # Chat workflow
    # ------------------------------------------------------------------

    async def chat(
        self, message: str, session_id: Optional[str], context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Handle a Veronica AI chat interaction.

        1. Route the message through ``veronica_ai_router`` to classify intent.
        2. Generate an AI response via ``openrouter_client``.
        3. Return structured response with intent, confidence, and actions.

        Args:
            message: User's chat message.
            session_id: Optional conversation session identifier.
            context: Optional extra context dict.

        Returns:
            Dict with ``intent``, ``confidence``, ``assistant_text``, and ``actions``.

        Raises:
            UpstreamError: When OpenRouter is unavailable.

        Requirements: 16.11
        """
        try:
            router = self._get_veronica_router()
            route_result = await router.route(message, context or {})

            messages = [
                {
                    "role": "system",
                    "content": (
                        "You are Veronica, an expert AI programming assistant. "
                        "Help the user with their coding and project questions."
                    ),
                },
                {"role": "user", "content": message},
            ]
            assistant_text = await self.openrouter_client.chat_completion(messages)

            return {
                "intent": route_result.get("intent", "general"),
                "confidence": route_result.get("confidence", 0.8),
                "assistant_text": assistant_text,
                "actions": route_result.get("actions", []),
                "project": route_result.get("project"),
            }
        except Exception as exc:
            logger.error("Veronica chat failed: %s", exc)
            raise UpstreamError(
                "Veronica AI is temporarily unavailable. Please try again later.",
                service="OpenRouter",
                upstream_status=503,
            ) from exc

    # ------------------------------------------------------------------
    # Project generation workflow
    # ------------------------------------------------------------------

    async def generate_project(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a Veronica project synchronously.

        Requirements: 16.12
        """
        try:
            generator = self._get_project_generator()
            return await generator.generate(request_data)
        except Exception as exc:
            logger.error("Veronica project generation failed: %s", exc)
            raise UpstreamError(
                "Project generation is temporarily unavailable.",
                service="VeronicaProjectGenerator",
                upstream_status=503,
            ) from exc

    async def generate_project_stream(
        self, request_data: Dict[str, Any]
    ) -> AsyncIterator[str]:
        """Stream Veronica project generation.

        Requirements: 16.12
        """
        try:
            generator = self._get_project_generator()
            async for chunk in generator.generate_stream(request_data):
                yield chunk
        except Exception as exc:
            logger.error("Veronica streaming generation failed: %s", exc)
            raise UpstreamError(
                "Project generation streaming is temporarily unavailable.",
                service="VeronicaProjectGenerator",
                upstream_status=503,
            ) from exc

    # ------------------------------------------------------------------
    # File management
    # ------------------------------------------------------------------

    async def download_project_zip(self, project_id: str) -> bytes:
        """Build and return a ZIP archive of a Veronica project.

        Requirements: 16, 40
        """
        from backend.services.veronica_project_store import VeronicaProjectStore  # noqa: PLC0415
        import os, zipfile, io  # noqa: E401

        base_dir = os.getenv("VERONICA_PROJECT_DIR", "/tmp/veronica_projects")
        store = VeronicaProjectStore(base_dir=base_dir)
        paths = store.get_paths(project_id)

        buf = io.BytesIO()
        with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
            for fp in paths.root_dir.rglob("*"):
                if fp.is_file():
                    zf.write(fp, fp.relative_to(paths.root_dir))
        buf.seek(0)
        return buf.read()

    async def update_project_file(
        self, project_id: str, file_path: str, content: str
    ) -> Dict[str, Any]:
        """Update a single file in a Veronica project.

        Requirements: 16, 40
        """
        from backend.services.veronica_project_store import VeronicaProjectStore  # noqa: PLC0415
        import os  # noqa: E401

        base_dir = os.getenv("VERONICA_PROJECT_DIR", "/tmp/veronica_projects")
        store = VeronicaProjectStore(base_dir=base_dir)
        paths = store.get_paths(project_id)
        target = (paths.root_dir / file_path).resolve()
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
        return {"status": "updated", "path": file_path}

    # ------------------------------------------------------------------
    # Mentor & memory
    # ------------------------------------------------------------------

    async def get_mentor_suggestions(
        self, project_id: str
    ) -> Dict[str, Any]:
        """Return AI mentor suggestions for a project.

        Requirements: 16.13
        """
        messages = [
            {
                "role": "system",
                "content": "You are a helpful programming mentor.",
            },
            {
                "role": "user",
                "content": f"Give me 3 improvement suggestions for project {project_id}.",
            },
        ]
        try:
            text = await self.openrouter_client.chat_completion(messages, max_tokens=512)
            return {"project_id": project_id, "suggestions": text}
        except Exception as exc:
            raise UpstreamError(
                "Mentor service temporarily unavailable.",
                service="OpenRouter",
                upstream_status=503,
            ) from exc

    async def get_user_memory(self, user_id: str) -> Dict[str, Any]:
        """Retrieve Veronica's persistent memory for a user.

        Requirements: 16
        """
        from backend.services.veronica_memory import VeronicaMemory  # noqa: PLC0415

        mem = VeronicaMemory()
        return mem.get(user_id) or {}

    async def update_user_memory(
        self, user_id: str, memory_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Persist Veronica's memory for a user.

        Requirements: 16
        """
        from backend.services.veronica_memory import VeronicaMemory  # noqa: PLC0415

        mem = VeronicaMemory()
        mem.update(user_id, memory_data)
        return {"status": "updated", "user_id": user_id}
