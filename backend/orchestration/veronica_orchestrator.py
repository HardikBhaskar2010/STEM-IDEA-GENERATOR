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
        self._project_generator = None

    # ------------------------------------------------------------------
    # Lazy service accessors
    # ------------------------------------------------------------------

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
            from backend.services.veronica_intent_classifier import classify_intent  # noqa: PLC0415
            from backend.services.veronica_ai_router import route_message  # noqa: PLC0415

            generator = self._get_project_generator()

            # Wrap chat_completion (which takes a messages list) into a simple
            # string-in / string-out callable that classify_intent expects.
            async def _llm_complete(prompt: str) -> str:
                return await self.openrouter_client.chat_completion(
                    [{"role": "user", "content": prompt}]
                )

            classification = await classify_intent(
                message,
                llm_complete=_llm_complete,
            )

            result = await route_message(
                message,
                classification,
                generate_project_fn=generator.generate,
            )

            return {
                "intent": result.intent.value,
                "confidence": result.confidence,
                "assistant_text": result.assistant_text,
                "actions": list(result.actions),
                "project": result.project,
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

        Calls the LLM to produce a full ProjectSpec, saves to disk, and
        returns a VeronicaAIChatResponse-shaped dict.

        Requirements: 16.12
        """
        import os  # noqa: PLC0415
        import json  # noqa: PLC0415
        from backend.services.veronica_project_generator import generate_project_spec, infer_platform  # noqa: PLC0415
        from backend.services.veronica_project_store import VeronicaProjectStore  # noqa: PLC0415

        message = (
            request_data.get("message")
            or request_data.get("prompt")
            or request_data.get("description")
            or ""
        ).strip()

        if not message:
            return {
                "intent": "IDEA_ONLY",
                "confidence": 0.0,
                "assistant_text": "Please describe what you want to build.",
                "actions": [],
                "project": None,
            }

        try:
            async def _llm(prompt: str) -> str:
                return await self.openrouter_client.chat_completion(
                    [{"role": "user", "content": prompt}],
                    max_tokens=8192,
                    temperature=0.4,
                )

            spec = await generate_project_spec(message=message, llm_complete=_llm)

            # Save spec to disk
            base_dir = os.getenv("VERONICA_PROJECT_DIR", "/tmp/veronica_projects")
            store = VeronicaProjectStore(base_dir=base_dir)
            store.save_spec(spec)

            file_summary = ", ".join(
                f"`{f.path}`" for f in (spec.files or [])[:5]
            )
            if len(spec.files or []) > 5:
                file_summary += f" and {len(spec.files) - 5} more"

            assistant_text = (
                f"Here's your project: **{spec.title}**\n\n"
                f"{spec.summary}\n\n"
                f"Generated {len(spec.files or [])} files: {file_summary}"
            )

            platform = spec.platform.value if spec.platform else "unknown"
            can_run = platform == "web"

            return {
                "intent": "IDEA_PLUS_CODE",
                "confidence": 0.95,
                "assistant_text": assistant_text,
                "actions": [
                    {"type": "save_project", "enabled": True, "id": spec.project_id},
                    {"type": "open_project", "enabled": True, "id": spec.project_id},
                    {"type": "run_project", "enabled": can_run, "id": spec.project_id},
                    {"type": "download_project", "enabled": True, "id": spec.project_id},
                    {"type": "edit_code", "enabled": True, "id": spec.project_id},
                ],
                "project": spec.model_dump(),
            }

        except Exception as exc:
            logger.error("Veronica project generation failed: %s", exc, exc_info=True)
            raise UpstreamError(
                f"Project generation failed: {exc}",
                service="VeronicaProjectGenerator",
                upstream_status=503,
            ) from exc

    async def generate_project_stream(
        self, request_data: Dict[str, Any]
    ) -> AsyncIterator[str]:
        """Stream Veronica project generation via SSE events.

        Yields JSON event strings the frontend AgentTerminal can render.
        Requirements: 16.12
        """
        import json  # noqa: PLC0415
        import os  # noqa: PLC0415
        from backend.services.veronica_project_generator import generate_project_spec  # noqa: PLC0415
        from backend.services.veronica_project_store import VeronicaProjectStore  # noqa: PLC0415

        message = (
            request_data.get("message")
            or request_data.get("prompt")
            or ""
        ).strip()

        if not message:
            yield json.dumps({"event": "error", "data": "No message provided"})
            yield json.dumps({"event": "done_failed"})
            return

        def emit(event_type: str, **kwargs) -> str:
            return json.dumps({"event": event_type, **kwargs})

        try:
            yield emit("plan", data="Analyzing your idea and planning architecture...")

            call_count = [0]

            async def _llm(prompt: str) -> str:
                call_count[0] += 1
                if call_count[0] > 1:
                    # This is a repair attempt — tell the UI
                    pass  # caller will emit fix events
                return await self.openrouter_client.chat_completion(
                    [{"role": "user", "content": prompt}],
                    max_tokens=8192,
                    temperature=0.4,
                )

            yield emit("plan", data="Generating project files with AI...")

            spec = await generate_project_spec(message=message, llm_complete=_llm)

            # Emit a file_start/file_done pair for each generated file
            for pf in (spec.files or []):
                yield emit("file_start", path=pf.path)
                yield emit("file_done", path=pf.path, lines=len((pf.content or "").splitlines()))

            yield emit("plan", data="Saving project to Veronica memory...")

            base_dir = os.getenv("VERONICA_PROJECT_DIR", "/tmp/veronica_projects")
            store = VeronicaProjectStore(base_dir=base_dir)
            store.save_spec(spec)

            platform = spec.platform.value if spec.platform else "unknown"
            can_run = platform == "web"

            result_payload = {
                "intent": "IDEA_PLUS_CODE",
                "confidence": 0.95,
                "assistant_text": f"Built **{spec.title}** — {len(spec.files or [])} files ready. {('Click Run to launch a live preview!' if can_run else '')}",
                "actions": [
                    {"type": "save_project", "enabled": True, "id": spec.project_id},
                    {"type": "open_project", "enabled": True, "id": spec.project_id},
                    {"type": "run_project", "enabled": can_run, "id": spec.project_id},
                    {"type": "download_project", "enabled": True, "id": spec.project_id},
                    {"type": "edit_code", "enabled": True, "id": spec.project_id},
                ],
                "project": spec.model_dump(),
            }
            yield emit("done", result=result_payload)

        except Exception as exc:
            logger.error("Veronica streaming generation failed: %s", exc, exc_info=True)
            yield emit("error", data=f"Build failed: {exc}")
            yield emit("done_failed")

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
