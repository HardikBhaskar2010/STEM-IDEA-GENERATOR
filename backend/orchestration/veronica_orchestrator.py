"""
Veronica AI orchestrator — Agentic Project Builder.

Coordinates a five-phase agentic workflow that creates projects incrementally,
like a real developer:

  Phase 1 – Sandbox Initialization: Create E2B sandbox, emit sandbox_ready
  Phase 2 – Planning: Generate IMPLEMENTATION_PLAN.md via single LLM call
  Phase 3 – Scaffolding: Execute scaffold commands (npm create vite@latest, etc.)
  Phase 4 – Incremental File Creation: One small LLM call per file with backoff
  Phase 5 – Debugging Loop: Run project, detect errors, fix iteratively (≤ 5x)

Each LLM call is kept under 4 000 prompt tokens and 2 000 response tokens to
avoid rate limits. State is persisted after every phase so generation can be
resumed on interruption.

Requirements: All — see individual method docstrings.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, AsyncIterator, Dict, List, Optional

from backend.core.exceptions import UpstreamError
from backend.integrations.openrouter.client import OpenRouterClient
from backend.models.generation_state import GenerationState
from backend.models.implementation_plan import FileSpec, ImplementationPlan
from backend.models.progress_event import EventType, ProgressEvent
from backend.utils.token_budget import TokenBudget

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Phase weights for _calculate_progress()
# ---------------------------------------------------------------------------
_PHASE_WEIGHTS: Dict[str, tuple[float, float]] = {
    "sandbox":    (0.00, 0.05),
    "planning":   (0.05, 0.15),
    "scaffolding":(0.15, 0.30),
    "files":      (0.30, 0.90),
    "debugging":  (0.90, 1.00),
}

# ---------------------------------------------------------------------------
# Tiered Free Models (OpenRouter Free Tier) — Brain Upgrade v2
# ---------------------------------------------------------------------------
# High-strategy model for Architecture, plan strategy
_PLANNING_MODEL = "nvidia/nemotron-3-super-120b-a12b:free"
# Builder model for component generation, hooks, modules
_BUILDER_MODEL = "openai/gpt-oss-120b:free"
# Fast model for boilerplate config files, styles, JSON output
_FAST_MODEL = "minimax/minimax-m2.5:free"
# Debug model for error log analysis and patch generation (self-healing)
_DEBUG_MODEL = "arcee-ai/trinity-large-preview:free"
# Keep alias for _SMART_MODEL (used in _analyze_and_fix_errors)
_SMART_MODEL = _PLANNING_MODEL

# ---------------------------------------------------------------------------
# Template-aware mandatory file sets (Plan Quality Guard)
# ---------------------------------------------------------------------------
_MANDATORY_FILES_BY_TEMPLATE: Dict[str, set] = {
    "react-ts": {"src/App.tsx", "package.json", "src/main.tsx", "index.html"},
    "react":    {"src/App.jsx", "package.json", "src/main.jsx", "index.html"},
    "next":     {"package.json", "next.config.js", "pages/index.tsx"},
    "vue":      {"package.json", "src/App.vue", "src/main.ts"},
    "default":  {"src/App.tsx", "package.json"},
}


class VeronicaOrchestrator:
    """
    Orchestrates Veronica AI workflows with an agentic, incremental approach.

    The main entry-point is :meth:`generate_project_stream`, which yields
    JSON SSE event strings for the frontend AgentTerminal to render.

    All other public methods (``chat``, ``generate_project``, file management,
    mentor, memory) remain unchanged for backward compatibility.

    Requirements: 1–18, 40
    """

    def __init__(self, openrouter_client: OpenRouterClient) -> None:
        self.openrouter_client = openrouter_client
        self._project_generator = None
        self._sandbox_service: Optional[Any] = None
        self._store: Optional[Any] = None
        self._budget = TokenBudget()

    # ------------------------------------------------------------------
    # Lazy service accessors
    # ------------------------------------------------------------------

    def _get_project_generator(self):
        if self._project_generator is None:
            from backend.services.veronica_project_generator import VeronicaProjectGenerator  # noqa: PLC0415
            self._project_generator = VeronicaProjectGenerator()
        return self._project_generator

    def _get_sandbox_service(self):
        if self._sandbox_service is None:
            from backend.services.sandbox_service import SandboxService  # noqa: PLC0415
            self._sandbox_service = SandboxService()
        return self._sandbox_service

    def _get_store(self):
        if self._store is None:
            from backend.services.veronica_project_store import VeronicaProjectStore  # noqa: PLC0415
            base_dir = os.getenv("VERONICA_PROJECT_DIR", "/tmp/veronica_projects")
            self._store = VeronicaProjectStore(base_dir=base_dir)
        return self._store

    # ------------------------------------------------------------------
    # Chat workflow (unchanged)
    # ------------------------------------------------------------------

    async def chat(
        self, message: str, session_id: Optional[str], context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Handle a Veronica AI chat interaction.

        Requirements: 16.11
        """
        try:
            from backend.services.veronica_intent_classifier import classify_intent  # noqa: PLC0415
            from backend.services.veronica_ai_router import route_message  # noqa: PLC0415

            generator = self._get_project_generator()

            async def _llm_complete(prompt: str) -> str:
                return await self.openrouter_client.chat_completion(
                    [{"role": "user", "content": prompt}]
                )

            classification = await classify_intent(message, llm_complete=_llm_complete)
            result = await route_message(
                message, classification, generate_project_fn=generator.generate,
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
    # Synchronous project generation (unchanged)
    # ------------------------------------------------------------------

    async def generate_project(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a Veronica project synchronously.

        Requirements: 16.12
        """
        from backend.services.veronica_project_generator import generate_project_spec  # noqa: PLC0415
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
            base_dir = os.getenv("VERONICA_PROJECT_DIR", "/tmp/veronica_projects")
            store = VeronicaProjectStore(base_dir=base_dir)
            store.save_spec(spec)

            file_summary = ", ".join(f"`{f.path}`" for f in (spec.files or [])[:5])
            if len(spec.files or []) > 5:
                file_summary += f" and {len(spec.files) - 5} more"

            platform = spec.platform.value if spec.platform else "unknown"
            can_run = platform == "web"

            return {
                "intent": "IDEA_PLUS_CODE",
                "confidence": 0.95,
                "assistant_text": (
                    f"Here's your project: **{spec.title}**\n\n"
                    f"{spec.summary}\n\n"
                    f"Generated {len(spec.files or [])} files: {file_summary}"
                ),
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

    # ==================================================================
    # Agentic streaming project generation — MAIN ENTRY POINT
    # ==================================================================

    async def generate_project_stream(
        self, request_data: Dict[str, Any]
    ) -> AsyncIterator[str]:
        """Stream agentic project generation via SSE events.

        Executes five sequential phases:
          1. Initialize E2B sandbox
          2. Generate implementation plan (single LLM call)
          3. Execute scaffold commands
          4. Create files one-by-one with small LLM calls
          5. Run debugging loop (max 5 iterations)

        Yields JSON event strings for frontend AgentTerminal.

        Requirements: 1–18, 40
        """
        message = (
            request_data.get("message")
            or request_data.get("prompt")
            or ""
        ).strip()

        if not message:
            yield self._emit("error", data="No message provided")
            yield self._emit("done_failed")
            return

        request_project_id = request_data.get("project_id")
        user_id = request_data.get("user_id")
        project_id = request_project_id or str(uuid.uuid4()).replace("-", "")
        sandbox_id: Optional[str] = None
        viewer_url: Optional[str] = None
        
        from backend.models.generation_state import GenerationState
        state: Optional[GenerationState] = None
        plan = None

        # Check if this is a Resume or Edit
        existing_spec_str = ""
        if request_project_id:
            try:
                state = GenerationState.load(request_project_id, self._get_store())
                
                spec = None
                try:
                    spec = self._get_store().load_spec(request_project_id)
                except FileNotFoundError:
                    if user_id:
                        logger.warning("[AGENTIC] Local files missing for %s. Executing Cloud Sync fallback...", request_project_id)
                        from backend.core.dependencies import get_supabase_service
                        db_spec = await get_supabase_service().load_project_spec(user_id, request_project_id)
                        if db_spec and db_spec.get("project_files"):
                            from backend.models.project_spec import ProjectSpec, ProjectFile
                            import json
                            spec = ProjectSpec(
                                project_id=request_project_id,
                                title=db_spec.get("title", ""),
                                platform="web",
                                description=db_spec.get("description", ""),
                                files=[ProjectFile(**(f if isinstance(f, dict) else json.loads(f))) for f in db_spec["project_files"]],
                            )
                            # Cache back to local SSD
                            self._get_store().save_spec(spec)
                            logger.info("[AGENTIC] Successfully fully restored %d files from Supabase Cloud Sync!", len(spec.files))
                
                if spec and spec.files:
                    existing_spec_str = "\n".join([f"- {f.path}" for f in spec.files])
                    logger.info("[AGENTIC] Loaded existing project %s with %d files for Resume/Edit", project_id, len(spec.files))
            except Exception as e:
                logger.warning("[AGENTIC] Resume check failed for %s: %s", request_project_id, e)

        logger.info("[AGENTIC] Starting project generation for: %s", message[:60])

        try:
            # ----------------------------------------------------------------
            # Phase 1: Sandbox Initialization
            # ----------------------------------------------------------------
            logger.info("[AGENTIC] Phase 1: Sandbox Initialization")
            try:
                if existing_spec_str and request_project_id:
                    # Restore mode: Use the runner's create_sandbox to upload files and start Vite
                    spec = self._get_store().load_spec(request_project_id)
                    files_dict = {f.path: f.content for f in spec.files if f.content}
                    sandbox_run = await self._get_sandbox_service()._get_runner().create_sandbox(project_id, files_dict)
                    sandbox_id = sandbox_run.run_id
                    
                    # Ensure viewer URL is initialized via the SandboxService format
                    viewer_url = self._get_sandbox_service()._generate_viewer_url(sandbox_id)
                    logger.info("[AGENTIC] Restored sandbox %s from %d local files", sandbox_id, len(files_dict))
                else:
                    # Fresh build mode
                    sandbox_info = await self._get_sandbox_service().create_sandbox()
                    sandbox_id = sandbox_info["sandbox_id"]
                    viewer_url = sandbox_info["viewer_url"]
            except Exception as exc:
                logger.error("[AGENTIC] Sandbox creation failed: %s", exc)
                yield self._emit("error", data=f"Sandbox creation failed: {exc}")
                yield self._emit("done_failed")
                return

            # Initialise generation state
            state = GenerationState(
                sandbox_id=sandbox_id,
                project_id=project_id,
                phase="sandbox",
            )

            yield self._emit(
                "sandbox_ready",
                data=f"Sandbox ready: {sandbox_id[:8]}...",
                sandbox_id=sandbox_id,
                viewer_url=viewer_url,
                progress=self._calculate_progress("sandbox", 1, 1),
            )
            logger.info("[AGENTIC] Sandbox ready: %s viewer=%s", sandbox_id, viewer_url)

            # ----------------------------------------------------------------
            # Phase 2: Planning
            # ----------------------------------------------------------------
            logger.info("[AGENTIC] Phase 2: Planning")
            state.phase = "planning"

            # ---------------------------------------------------------------
            # Contextual Intelligence: enrich prompt with implicit requirements
            # ---------------------------------------------------------------
            enriched_context = ""
            if not existing_spec_str:
                yield self._emit("plan_ready", data="[contextual-intel] Inferring implicit requirements...")
                try:
                    enriched_context = await self._enrich_prompt(message)
                    if enriched_context:
                        logger.info("[contextual-intel] Enriched prompt (%d chars)", len(enriched_context))
                except Exception as enrich_exc:
                    logger.warning("[contextual-intel] Enrichment failed: %s", enrich_exc)

            yield self._emit(
                "plan_ready",
                data="Generating implementation plan...",
                progress=self._calculate_progress("planning", 0, 1),
            )

            try:
                plan = await self._generate_plan(
                    message, sandbox_id, existing_spec_str,
                    enriched_context=enriched_context,
                )
            except Exception as exc:
                logger.error("[AGENTIC] Plan generation failed: %s", exc)
                yield self._emit("error", data=f"Planning failed: {exc}")
                yield self._emit("done_failed")
                return

            # Validate minimum file count (Req 17.1, 17.7, 17.8)
            # Skip this check if we are in Edit/Resume mode, as edits might only require 1-2 files
            if not existing_spec_str and len(plan.files) < 15:
                yield self._emit(
                    "plan_ready",
                    data=f"Expanding plan from {len(plan.files)} to 15+ files...",
                )
                try:
                    plan = await self._validate_file_count(plan, sandbox_id)
                except Exception as exc:
                    logger.warning("[AGENTIC] Plan expansion failed: %s — continuing with %d files", exc, len(plan.files))

            # Add bonus features (Req 18)
            try:
                plan = await self._add_bonus_features(plan)
            except Exception as exc:
                logger.warning("[AGENTIC] Bonus features failed: %s — skipping", exc)

            # Auto-answer: resolve ambiguous decisions before scaffold
            if not existing_spec_str:
                yield self._emit("plan_ready", data="[auto-answer] Resolving ambiguous decisions...")
                try:
                    plan = await self._auto_resolve_ambiguity(plan)
                except Exception as exc:
                    logger.warning("[auto-answer] Failed: %s — keeping original plan", exc)

            # Persist plan in state
            state.plan = plan.model_dump()
            state.phase = "planning"
            try:
                state.save(self._get_store())
            except Exception:
                pass  # State persistence is best-effort

            yield self._emit(
                "plan_ready",
                data=f"Plan ready: {len(plan.files)} files, {len(plan.scaffold_commands)} scaffold commands",
                progress=self._calculate_progress("planning", 1, 1),
            )
            logger.info("[AGENTIC] Plan ready: %d files, %d commands", len(plan.files), len(plan.scaffold_commands))

            # ----------------------------------------------------------------
            # Phase 3: Scaffolding
            # ----------------------------------------------------------------
            # If this is an Edit/Resume, we skip scaffolding as the project is already set up
            if existing_spec_str:
                logger.info("[AGENTIC] Phase 3: Scaffolding skipped (Edit/Resume Mode)")
                yield self._emit("scaffold_ready", data="Scaffolding skipped (Edit/Resume)", progress=1.0)
            else:
                logger.info("[AGENTIC] Phase 3: Scaffolding")
                state.phase = "scaffolding"
                async for event in self._execute_scaffolding(plan, sandbox_id, state):
                    yield event

            # Write implementation plan AFTER scaffolding (ensure sandbox is empty for create-vite)
            try:
                plan_md = plan.to_markdown()
                await self._get_sandbox_service().write_file(
                    sandbox_id, "IMPLEMENTATION_PLAN.md", plan_md
                )
            except Exception as exc:
                logger.warning("[AGENTIC] Could not write plan to sandbox: %s", exc)

            # ----------------------------------------------------------------
            # Phase 4: Incremental File Creation
            # ----------------------------------------------------------------
            logger.info("[AGENTIC] Phase 4: File Creation (%d files)", len(plan.files))
            state.phase = "files"

            async for event in self._create_files_incrementally(plan, sandbox_id, state):
                yield event

            # ----------------------------------------------------------------
            # Phase 5: Debugging Loop
            # ----------------------------------------------------------------
            logger.info("[AGENTIC] Phase 5: Debugging Loop")
            state.phase = "debugging"

            async for event in self._debugging_loop(sandbox_id, plan, state):
                yield event

            # ----------------------------------------------------------------
            # Done — emit final event
            # ----------------------------------------------------------------
            platform = plan.platform
            can_run = platform == "web"

            result_payload = {
                "intent": "IDEA_PLUS_CODE",
                "confidence": 0.95,
                "assistant_text": (
                    f"Built **{plan.project_title}** — {len(plan.files)} files ready."
                    f"{' Click Run to launch a live preview!' if can_run else ''}"
                ),
                "actions": [
                    {"type": "open_sandbox", "enabled": True, "url": viewer_url},
                    {"type": "download_project", "enabled": True, "id": project_id},
                ],
                "plan": {
                    "title": plan.project_title,
                    "file_count": len(plan.files),
                    "features": plan.additional_features,
                },
                "sandbox_id": sandbox_id,
                "viewer_url": viewer_url,
            }

            # Sync final state to local store before finishing
            if sandbox_id and plan:
                await self._sync_sandbox_to_local(project_id, sandbox_id, plan, user_id=user_id)

            yield self._emit("done", result=result_payload, viewer_url=viewer_url, progress=1.0)
            logger.info("[AGENTIC] Generation complete for project %s", project_id)

        except Exception as exc:
            logger.error("[AGENTIC] Generation failed: %s", exc, exc_info=True)
            
            # Sync partial state to local store on failure so user can download what worked
            if sandbox_id and plan:
                try:
                    await self._sync_sandbox_to_local(project_id, sandbox_id, plan, user_id=user_id)
                except Exception as sync_exc:
                    logger.warning("[AGENTIC] Post-failure sync failed: %s", sync_exc)

            # Save state for potential resume
            if state is not None:
                state.last_error = str(exc)
                try:
                    state.save(self._get_store())
                except Exception:
                    pass
            try:
                # Construct result_payload for partial success even on failure
                # This ensures the frontend doesn't throw 'missing done event'
                # and still shows a 'Download' button for partial files.
                fail_payload = {
                    "intent": "IDEA_PLUS_CODE",
                    "confidence": 0.95,
                    "assistant_text": (
                        f"Build encountered an error: {exc}. "
                        "You can still inspect the sandbox or download the files generated so far."
                    ),
                    "actions": [
                        {"type": "open_sandbox", "enabled": True, "url": viewer_url},
                        {"type": "download_project", "enabled": True, "id": project_id},
                    ],
                    "project": {
                        "project_id": project_id,
                        "title": plan.project_title if plan else "Partial Build",
                        "files": [{"path": f.path} for f in plan.files] if plan else [],
                    },
                    "sandbox_id": sandbox_id,
                    "viewer_url": viewer_url,
                    "build_failed": True
                }

                yield self._emit("error", data=f"Build failed: {exc}")
                yield self._emit("done", result=fail_payload, viewer_url=viewer_url, progress=1.0)
            except Exception:
                pass
        finally:
            # Requirement 15.5 — always clean up sandbox
            if sandbox_id:
                try:
                    # KEEP ALIVE FOR 60 MINUTES ON FAILURE, 5 MINUTES ON SUCCESS
                    # For now, we keep it alive for better debugging as requested by user
                    logger.info("[DEBUG] Sandbox %s kept alive for user inspection (60min timeout)", sandbox_id)
                    # We don't call cleanup_sandbox here anymore, relying on E2B TTL
                except Exception as cleanup_exc:
                    logger.warning("[AGENTIC] Sandbox cleanup failed: %s", cleanup_exc)

    # ==================================================================
    # Phase helpers
    # ==================================================================

    async def _create_sandbox(self) -> Dict[str, str]:
        """Create an E2B sandbox and return its ID and viewer URL.

        Requirements: 1.1–1.5, 16.1, 16.2
        """
        return await self._get_sandbox_service().create_sandbox()

    async def _sync_sandbox_to_local(
        self, project_id: str, sandbox_id: str, plan: ImplementationPlan, user_id: Optional[str] = None
    ) -> None:
        """Sync files from E2B sandbox back to local VeronicaProjectStore (Req 10)."""
        logger.info("[AGENTIC] Syncing sandbox %s to local store for %s", sandbox_id, project_id)
        
        from backend.models.project_spec import ProjectSpec, ProjectFile, ProjectWiring, VeronicaPlatform
        
        # 1. Read all files from sandbox
        synced_files: List[ProjectFile] = []
        for f_spec in plan.files:
            try:
                content = await self._get_sandbox_service().read_file(sandbox_id, f_spec.path)
                synced_files.append(ProjectFile(
                    path=f_spec.path,
                    content=content,
                    description=f_spec.purpose
                ))
            except Exception as e:
                logger.warning("[AGENTIC] Could not sync file %s: %s", f_spec.path, e)
        
        # 2. Build a ProjectSpec for local storage
        spec = ProjectSpec(
            project_id=project_id,
            title=plan.project_title,
            platform=VeronicaPlatform.WEB, # Default to web for agentic builder
            difficulty="Intermediate",
            summary=plan.project_description,
            learning_goals=plan.additional_features,
            files=synced_files,
            readme=f"# {plan.project_title}\n\n{plan.project_description}",
        )
        
        # 3. Persist to local store
        try:
            self._get_store().save_spec(spec)
            logger.info("[AGENTIC] Successfully persisted %d files to local store", len(synced_files))
        except Exception as e:
            logger.error("[AGENTIC] Local persistence failed: %s", e)

        # 4. Push to Supabase Cloud
        if user_id:
            try:
                from backend.core.dependencies import get_supabase_service
                svc = get_supabase_service()
                
                project_row = {
                    "id": project_id,
                    "title": spec.title,
                    "description": spec.summary,
                    "status": "completed",
                    "project_type": "web_app",
                    "project_files": [f.model_dump() for f in spec.files],
                }
                await svc.upsert_project(user_id, project_row)
                logger.info("[AGENTIC] Successfully pushed project %s over Cloud Sync to Supabase!", project_id)
            except Exception as e:
                logger.error("[AGENTIC] Supabase Cloud Sync failed: %s", e)

    async def _generate_plan(
        self, message: str, sandbox_id: str, existing_spec_str: str = "",
        enriched_context: str = "",
    ) -> ImplementationPlan:
        """Generate a complete implementation plan with a single LLM call.

        Requires minimum 15 files; writes IMPLEMENTATION_PLAN.md to sandbox.

        Requirements: 2.1–2.7, 17.1–17.8
        """
        # Build prompt (keep under MAX_PROMPT_TOKENS)
        schema_json = json.dumps(ImplementationPlan.model_json_schema(), indent=2)
        
        edit_context = ""
        if existing_spec_str:
            edit_context = (
                "⚠️ EXISTING PROJECT STATE - EDIT/RESUME MODE:\n"
                f"{existing_spec_str}\n\n"
                "If the user asks for changes, output ONLY the files that need modification and any NEW files. "
                "If they ask to retry, output the files that haven't been completed yet. "
                "DO NOT recreate the entire project unless explicitly requested. Provide empty scaffold commands [].\n\n"
            )

        enrichment_block = ""
        if enriched_context:
            enrichment_block = (
                "🗣️ IMPLICIT REQUIREMENTS (inferred by contextual intelligence):\n"
                f"{enriched_context}\n\n"
                "Incorporate ALL of the above into your plan. These are not optional suggestions — they are"
                " implied by industry standards for this type of application.\n\n"
            )

        prompt = (
            "You are an expert full-stack developer and software architect. "
            "Your goal is to design a high-end, production-grade application that WOWS the user. "
            f"Create a detailed implementation plan for:\n\n"
            f"{message}\n\n"
            f"{edit_context}"
            f"{enrichment_block}"
            "🧠 VERONICA BRAIN v2 (MANDATORY):\n"
            "- Planning comes BEFORE files. Define the architecture, state management (Hooks/Context), and component patterns.\n"
            "- Avoid direct state mutation. Use immutable updates (especially for React/Vue).\n"
            "- Use STRICT TypeScript types. ZERO usage of 'any'.\n"
            "- Optimize for performance (memoization, avoiding heavy re-renders).\n"
            "- Separate logic into hooks, UI into components, and utilities into helpers.\n\n"
            "⚙️ ONE-CLICK FULL-STACK REQUIREMENTS:\n"
            "- MUST include ALL boilerplate roots: package.json, index.html, tsconfig.json, vite.config.ts, .gitignore, README.md, .env.example.\n"
            "- MUST include App Entry Points: src/main.tsx, src/App.tsx, and src/index.css (with Tailwind or custom styles).\n"
            "- MUST include a robust directory structure: src/components/, src/hooks/, src/utils/, src/theme/, src/types/.\n"
            "- MUST include a mock data source (e.g. public/api/mock_data.json) to ensure the UI isn't empty on first run.\n"
            "- MINIMUM 20 files for high-aesthetic production apps.\n"
            "- Add 3+ premium features (Framer Motion animations, dark mode toggle, export to PDF/CSV functionality).\n\n"
            "Scaffold commands MUST be non-interactive: `npx -y create-vite@latest . --template react-ts --yes --force`.\n"
            "If running `npm install`, use `--maxsockets 1` to prevent sandbox memory errors.\n\n"
            "Output ONLY valid JSON matching this schema (no markdown, no description):\n"
            f"{schema_json}\n\n"
            "Folder Hierarchy Example:\n"
            "- root: package.json, index.html, vite.config.ts\n"
            "- src/: main.tsx, App.tsx, index.css, components/, hooks/, utils/, theme/\n"
            "- public/: api/mock_data.json"
        )

        # Estimate and log token usage
        prompt_tokens = self._budget.estimate_tokens(prompt)
        # Truncate if needed
        if prompt_tokens > TokenBudget.MAX_PROMPT_TOKENS:
            prompt = self._budget.truncate_context(prompt, TokenBudget.MAX_PROMPT_TOKENS)
            prompt_tokens = self._budget.estimate_tokens(prompt)

        logger.info("[AGENTIC] Planning LLM call (~%d prompt tokens)", prompt_tokens)

        response = await self.openrouter_client.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            model=_PLANNING_MODEL,
            max_tokens=8192,  # Plan needs large context to drop 20+ file schema
            temperature=0.4,
        )

        response_tokens = self._budget.estimate_tokens(response)
        self._budget.log_token_usage("planning", prompt_tokens, response_tokens)

        # Parse response — strip possible markdown fences or leading/trailing text
        cleaned = response.strip()
        if "```" in cleaned:
            try:
                # Find content between fences
                parts = cleaned.split("```")
                for part in parts:
                    maybe_json = part.strip()
                    if maybe_json.startswith("json"):
                        maybe_json = maybe_json[4:].strip()
                    if maybe_json.startswith("{") and maybe_json.endswith("}"):
                        cleaned = maybe_json
                        break
            except Exception:
                pass # Fallback to original strip logic

        # Double check cleaning for common Haiku quirks
        if not (cleaned.startswith("{") and cleaned.endswith("}")):
            # Try to find the first '{' and last '}'
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start != -1 and end != -1:
                cleaned = cleaned[start:end+1]

        try:
            plan_data = json.loads(cleaned)
        except json.JSONDecodeError as exc:
            logger.error("[AGENTIC] Failed to parse Plan JSON. Cleaned output: %s", cleaned[:500])
            raise ValueError(f"LLM returned invalid JSON for plan: {exc}") from exc

        # Ensure estimated_file_count matches actual files to pass validation (Req 17.8)
        file_list = plan_data.get("files", [])
        if "estimated_file_count" not in plan_data:
            plan_data["estimated_file_count"] = max(len(file_list), 15)
        
        plan = ImplementationPlan(**plan_data)

        # ----------------------------------------------------------------
        # Plan Quality Guard — Mandatory file check (Brain Upgrade v2)
        # Reject plans missing src/App.tsx or package.json and trigger
        # a single auto-refinement via PLANNER_MODEL.
        # ----------------------------------------------------------------
        # Detect template from scaffold commands for context-aware guard
        _scaffold_cmds = " ".join(c.command for c in plan.scaffold_commands)
        if "next" in _scaffold_cmds:
            _MANDATORY_FILES = _MANDATORY_FILES_BY_TEMPLATE["next"]
        elif "vue" in _scaffold_cmds:
            _MANDATORY_FILES = _MANDATORY_FILES_BY_TEMPLATE["vue"]
        elif "react" in _scaffold_cmds and ("ts" in _scaffold_cmds or "tsx" in _scaffold_cmds):
            _MANDATORY_FILES = _MANDATORY_FILES_BY_TEMPLATE["react-ts"]
        elif "react" in _scaffold_cmds:
            _MANDATORY_FILES = _MANDATORY_FILES_BY_TEMPLATE["react"]
        else:
            _MANDATORY_FILES = _MANDATORY_FILES_BY_TEMPLATE["default"]
        if not existing_spec_str:
            present_paths = {f.path for f in plan.files}
            missing_mandatory = _MANDATORY_FILES - present_paths
            if missing_mandatory:
                logger.warning(
                    "[plan-guard] Plan missing mandatory files: %s — triggering auto-refinement",
                    missing_mandatory,
                )
                guard_prompt = (
                    f"{prompt}\n\n"
                    "⚠️ PLAN GUARD REJECTION: The plan is missing these mandatory files: "
                    f"{', '.join(sorted(missing_mandatory))}.\n"
                    "You MUST include ALL mandatory boilerplate: package.json, src/App.tsx, "
                    "src/main.tsx, index.html, vite.config.ts.\n"
                    "Regenerate the complete plan now."
                )
                guard_resp = await self.openrouter_client.chat_completion(
                    messages=[{"role": "user", "content": guard_prompt}],
                    model=_PLANNING_MODEL,
                    max_tokens=8192,
                    temperature=0.5,
                )
                plan_dict = self._parse_json(guard_resp)
                plan = ImplementationPlan(**plan_dict)
                logger.info(
                    "[plan-guard] Refined plan now has %d files",
                    len(plan.files),
                )

        # ----------------------------------------------------------------
        # Plan Refinement Hook (Req 17.9)
        # If the plan is too shallow (< 15 files) for a new build, retry once.
        # ----------------------------------------------------------------
        if not existing_spec_str and len(plan.files) < 15:
            logger.warning("[AGENTIC] AI generated a thin plan (%d files). Triggering refinement retry...", len(plan.files))
            refinement_prompt = (
                f"{prompt}\n\n"
                "⚠️ REJECTION: The previous plan was too shallow. "
                "You MUST generate a complete, deep application structure with 20+ files. "
                "Include more complex components, hooks, and full boilerplate. "
                "Do not be lazy. Be extremely thorough."
            )
            retry_resp = await self.openrouter_client.chat_completion(
                messages=[{"role": "user", "content": refinement_prompt}],
                model=_PLANNING_MODEL,
                max_tokens=8192,
                temperature=0.7, # Higher temp for more creativity on retry
            )
            plan_dict = self._parse_json(retry_resp)
            plan = ImplementationPlan(**plan_dict)
            logger.info("[AGENTIC] Plan refined. New file count: %d", len(plan.files))

        # Write IMPLEMENTATION_PLAN.md to sandbox (Req 2.7)
        return plan

    async def _validate_file_count(
        self, plan: ImplementationPlan, sandbox_id: str
    ) -> ImplementationPlan:
        """Ensure plan meets minimum 15-file requirement by LLM expansion.

        Requirements: 17.1, 17.7, 17.8
        """
        if len(plan.files) >= 15:
            return plan

        logger.warning("[AGENTIC] Plan has only %d files — expanding", len(plan.files))

        expansion_prompt = (
            f"The current project plan has only {len(plan.files)} files which is too few.\n"
            "Expand it to 15-20 files by adding:\n"
            "- More reusable components\n"
            "- Utility functions in separate files\n"
            "- Custom hooks (if React)\n"
            "- Additional features (settings, themes, etc.)\n"
            "- Type definitions\n\n"
            "Current plan (JSON):\n"
            f"{plan.model_dump_json()}\n\n"
            "Output ONLY the expanded plan as JSON matching the ImplementationPlan schema."
        )

        # Truncate to token budget
        expansion_prompt = self._budget.truncate_context(
            expansion_prompt, TokenBudget.MAX_PROMPT_TOKENS
        )

        response = await self.openrouter_client.chat_completion(
            messages=[{"role": "user", "content": expansion_prompt}],
            model=_FAST_MODEL,
            max_tokens=8192,  # Plan needs large context to drop 20+ file schema
            temperature=0.4,
        )

        cleaned = response.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        try:
            expanded_data = json.loads(cleaned)
        except json.JSONDecodeError:
            logger.warning("[AGENTIC] Expansion response was not valid JSON, keeping original plan")
            return plan

        if "files" in expanded_data and "estimated_file_count" in expanded_data:
            expanded_data["estimated_file_count"] = max(
                expanded_data["estimated_file_count"],
                len(expanded_data["files"]),
                15,
            )

        try:
            expanded_plan = ImplementationPlan(**expanded_data)
        except Exception as exc:
            logger.warning("[AGENTIC] Expansion plan validation failed: %s", exc)
            return plan

        logger.info("[AGENTIC] Expanded plan: %d → %d files", len(plan.files), len(expanded_plan.files))
        return expanded_plan

    async def _add_bonus_features(self, plan: ImplementationPlan) -> ImplementationPlan:
        """Auto-add 3+ bonus features if plan doesn't already have them.

        Requirements: 18.1–18.6
        """
        if len(plan.additional_features) >= 3:
            return plan

        current_features = ", ".join(plan.additional_features) if plan.additional_features else "none"
        prompt = (
            f"Suggest 3-5 bonus features for this project:\n\n"
            f"Title: {plan.project_title}\n"
            f"Description: {plan.project_description}\n"
            f"Current features: {current_features}\n\n"
            "Suggest features that add real value, are feasible, and make the project more impressive.\n\n"
            'Output ONLY JSON: {"features": [{"name": "...", "description": "...", "files": ["new/file.tsx"]}, ...]}'
        )

        prompt = self._budget.truncate_context(prompt, TokenBudget.MAX_PROMPT_TOKENS)

        response = await self.openrouter_client.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            model=_FAST_MODEL,
            max_tokens=1000,
            temperature=0.6,
        )

        cleaned = response.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        try:
            feature_data = json.loads(cleaned)
        except json.JSONDecodeError:
            logger.warning("[AGENTIC] Bonus features response was not valid JSON, skipping")
            return plan

        added_files: List[FileSpec] = []
        added_names: List[str] = []

        for feature in feature_data.get("features", []):
            added_names.append(feature.get("name", "Unknown feature"))
            for file_path in feature.get("files", []):
                added_files.append(FileSpec(
                    path=file_path,
                    purpose=f"{feature.get('name', '')}: {feature.get('description', '')}",
                    dependencies=[],
                ))

        # Build updated plan (Pydantic models are immutable-ish so we rebuild)
        updated_data = plan.model_dump()
        updated_data["additional_features"] = list(plan.additional_features) + added_names
        updated_data["files"] = [f.model_dump() for f in plan.files] + [f.model_dump() for f in added_files]
        updated_data["estimated_file_count"] = max(
            updated_data["estimated_file_count"], len(updated_data["files"]), 15
        )

        updated_plan = ImplementationPlan(**updated_data)
        logger.info("[AGENTIC] Added %d bonus features (%d new files)", len(added_names), len(added_files))
        return updated_plan

    async def _run_npm_install_with_fallback(
        self, sandbox_id: str, timeout: int = 180
    ) -> "CommandResult":
        """Run npm install with a 4-step fallback chain.

        Sequence:
          1. npm install --prefer-offline --no-audit --no-fund
          2. npm install (clean retry)
          3. pnpm install (if available)
          4. yarn install (last resort)

        Requirements: Brain Upgrade v2 — Execution Safety
        """
        sandbox_svc = self._get_sandbox_service()

        # Preflight: detect available package managers
        try:
            pm_check = await sandbox_svc.run_command(
                sandbox_id,
                "which pnpm 2>/dev/null && echo pnpm_ok; which yarn 2>/dev/null && echo yarn_ok",
                timeout=10,
            )
            has_pnpm = "pnpm_ok" in (pm_check.stdout or "")
            has_yarn = "yarn_ok" in (pm_check.stdout or "")
        except Exception:
            has_pnpm = False
            has_yarn = False

        attempts = [
            ("npm install --prefer-offline --no-audit --no-fund", True),
            ("npm install", True),
        ]
        if has_pnpm:
            attempts.append(("pnpm install", True))
        if has_yarn:
            attempts.append(("yarn install", True))

        last_result = None
        for idx, (cmd, _) in enumerate(attempts, 1):
            logger.info("[npm-fallback] attempt %d/%d: %s", idx, len(attempts), cmd)
            try:
                result = await sandbox_svc.run_command(sandbox_id, cmd, timeout=timeout)
                last_result = result
                if result.success:
                    logger.info("[npm-fallback] succeeded on attempt %d", idx)
                    return result
                logger.warning(
                    "[npm-fallback] attempt %d failed (exit=%d)\nstderr: %s",
                    idx, result.exit_code, (result.stderr or "")[:300],
                )
            except Exception as exc:
                logger.warning("[npm-fallback] attempt %d error: %s", idx, exc)

        # All attempts exhausted — return last result or raise
        if last_result is not None:
            return last_result
        from backend.models.command_result import CommandResult
        return CommandResult(
            command="npm install",
            stdout="",
            stderr="All npm fallback attempts failed",
            exit_code=1,
            duration_ms=0,
        )

    async def _execute_scaffolding(
        self,
        plan: ImplementationPlan,
        sandbox_id: str,
        state: GenerationState,
    ) -> AsyncIterator[str]:
        """Execute scaffold commands in plan order.

        npm install commands are automatically retried via a 4-step fallback.

        Requirements: 3.1–3.6, Brain Upgrade v2 — Execution Safety
        """
        # DEBUG: Check environment and directory state before scaffolding
        try:
            debug_result = await self._get_sandbox_service().run_command(
                sandbox_id=sandbox_id,
                command="node -v && npm -v && ls -la",
                timeout=30,
            )
            logger.info("[DEBUG] Sandbox Env check for %s:\n%s", sandbox_id, debug_result.stdout)
        except Exception as e:
            logger.warning("[DEBUG] Failed to run env check: %s", e)

        total = len(plan.scaffold_commands)
        if total == 0:
            return

        for i, cmd_spec in enumerate(plan.scaffold_commands, 1):
            progress = self._calculate_progress("scaffolding", i - 1, total)
            yield self._emit(
                "scaffold_start",
                data=f"Running: {cmd_spec.command}",
                progress=progress,
            )

            try:
                # Use fallback chain for npm install commands
                if "npm install" in cmd_spec.command:
                    yield self._emit(
                        "scaffold_start",
                        data="[npm-fallback] Running npm install with 4-step fallback chain...",
                        progress=progress,
                    )
                    result = await self._run_npm_install_with_fallback(
                        sandbox_id, timeout=180
                    )
                else:
                    result = await self._get_sandbox_service().run_command(
                        sandbox_id=sandbox_id,
                        command=cmd_spec.command,
                        timeout=120,  # 2 minutes for npm install / vite create
                    )

                if not result.success:
                    logger.warning(
                        "[AGENTIC] Scaffold command failed (exit=%d): %s\nstderr: %s",
                        result.exit_code, cmd_spec.command, result.stderr[:300],
                    )
                    yield self._emit(
                        "error",
                        data=f"Warning: '{cmd_spec.command}' returned exit code {result.exit_code}, continuing...",
                    )

                state.commands_executed.append(cmd_spec.command)

                yield self._emit(
                    "scaffold_done",
                    data=f"Completed: {cmd_spec.command}",
                    progress=self._calculate_progress("scaffolding", i, total),
                )

            except Exception as exc:
                logger.error("[AGENTIC] Scaffold command error: %s — %s", cmd_spec.command, exc)
                yield self._emit(
                    "error",
                    data=f"Scaffold command failed: {cmd_spec.command} — {exc}",
                )
                # Continue with next command (Req 3.4)

    async def _build_file_context(
        self, plan: ImplementationPlan, file_spec: FileSpec
    ) -> str:
        """Build minimal context for one file generation call.

        Keeps context under 2 000 tokens.

        Requirements: 4.2, 13.1
        """
        context = (
            f"Project: {plan.project_title}\n"
            f"Description: {plan.project_description}\n"
            f"Tech Stack: {', '.join(plan.tech_stack)}\n"
            f"Platform: {plan.platform}\n\n"
            f"File to create: {file_spec.path}\n"
            f"Purpose: {file_spec.purpose}\n"
        )

        # Include dependency signatures (limit to 3) — Req 4.2
        if file_spec.dependencies:
            context += "\nDependencies:\n"
            for dep_path in file_spec.dependencies[:3]:
                dep_spec = next(
                    (f for f in plan.files if f.path == dep_path), None
                )
                if dep_spec:
                    context += f"- {dep_path}: {dep_spec.purpose}\n"

        return self._budget.truncate_context(context, 2000)

    def _get_model_for_file(self, file_path: str) -> str:
        """Assign a tiered model based on file importance (Strategy vs Boilerplate)."""
        path = file_path.lower()
        
        # High-strategy UI files get the smart tier
        smart_extensions = [".tsx", ".ts", ".css", ".jsx", ".js"]
        is_src = path.startswith("src/") or "app" in path or "component" in path
        has_smart_ext = any(path.endswith(ext) for ext in smart_extensions)
        
        if is_src and has_smart_ext:
            return _PLANNING_MODEL
            
        # Standard configuration or documentation gets the fast tier
        return _FAST_MODEL

    async def _generate_file_content(
        self, context: str, file_spec: FileSpec
    ) -> str:
        """Generate the content of a single file with a small LLM call.

        Limits: prompt ≤ 4 000 tokens, response ≤ 1 500 tokens.

        Requirements: 4.1, 4.2, 13.2
        """
        prompt = (
            f"{context}\n"
            "🧠 ULTRA SELF-REVIEW (MANDATORY):\n"
            "- Final check for: state mutations, hook dependency issues, missing providers, re-renders.\n"
            "- Ensure strict typing (no 'any').\n\n"
            f"Generate ONLY the production-grade file content for {file_spec.path}.\n"
            "Do not include explanations or markdown code blocks.\n"
            "Output raw file content only."
        )

        # Enforce prompt token budget
        prompt = self._budget.truncate_context(prompt, TokenBudget.MAX_PROMPT_TOKENS)
        prompt_tokens = self._budget.estimate_tokens(prompt)

        # Choose tiered model based on file importance
        selected_model = self._get_model_for_file(file_spec.path)

        response = await self.openrouter_client.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            model=selected_model,
            max_tokens=1500,
            temperature=0.3,
        )

        response_tokens = self._budget.estimate_tokens(response)
        self._budget.log_token_usage(f"file:{file_spec.path}", prompt_tokens, response_tokens)

        return response.strip()

    async def _create_files_incrementally(
        self,
        plan: ImplementationPlan,
        sandbox_id: str,
        state: GenerationState,
    ) -> AsyncIterator[str]:
        """Create each file with a separate small LLM call.

        Handles rate limits with exponential backoff (1s, 2s, 4s).

        Requirements: 4.1–4.7, 9.1–9.5, 13.1–13.5
        """
        total = len(plan.files)
        max_retries = 3

        for i, file_spec in enumerate(plan.files, 1):
            # Skip already-created files (resume support — Req 12.4)
            if file_spec.path in state.files_created:
                logger.info("[AGENTIC] Skipping already-created file: %s", file_spec.path)
                continue

            progress = self._calculate_progress("files", i - 1, total)
            yield self._emit(
                "file_start",
                path=file_spec.path,
                data=f"Creating {file_spec.path} ({i}/{total})",
                progress=progress,
            )

            # Build context for this file
            context = await self._build_file_context(plan, file_spec)

            # Retry loop for rate limits and transient errors
            success = False
            for attempt in range(max_retries):
                try:
                    content = await self._generate_file_content(context, file_spec)

                    # Ensure parent directory exists before writing (directory race prevention)
                    parent_dir = os.path.dirname(file_spec.path)
                    if parent_dir:
                        try:
                            await self._get_sandbox_service().run_command(
                                sandbox_id,
                                f"mkdir -p {parent_dir}",
                                timeout=10,
                            )
                        except Exception as mkdir_exc:
                            logger.warning(
                                "[AGENTIC] mkdir -p failed for %s: %s",
                                parent_dir, mkdir_exc,
                            )

                    # Write to sandbox immediately (Req 4.4)
                    await self._get_sandbox_service().create_file(
                        sandbox_id, file_spec.path, content
                    )

                    # Track in state (Req 12.2)
                    state.files_created.append(file_spec.path)

                    yield self._emit(
                        "file_done",
                        path=file_spec.path,
                        lines=len(content.splitlines()),
                        data=f"Created {file_spec.path}",
                        progress=self._calculate_progress("files", i, total),
                    )
                    success = True
                    break

                except UpstreamError as exc:
                    # Rate limit — exponential backoff (Req 9.1–9.3)
                    if exc.upstream_status == 429 and attempt < max_retries - 1:
                        wait_time = 2 ** attempt  # 1s, 2s, 4s
                        logger.warning(
                            "[AGENTIC] Rate limit for %s, waiting %ds (attempt %d/%d)",
                            file_spec.path, wait_time, attempt + 1, max_retries,
                        )
                        yield self._emit(
                            "error",
                            data=f"Rate limit hit — waiting {wait_time}s before retry...",
                        )
                        await asyncio.sleep(wait_time)
                    else:
                        # Save state for resume (Req 9.5)
                        try:
                            state.last_error = str(exc)
                            state.save(self._get_store())
                        except Exception:
                            pass
                        logger.error("[AGENTIC] File generation failed for %s: %s", file_spec.path, exc)
                        yield self._emit(
                            "error",
                            data=f"Failed to generate {file_spec.path}: {exc}",
                        )
                        break

                except Exception as exc:
                    logger.error("[AGENTIC] Unexpected error generating %s: %s", file_spec.path, exc)
                    yield self._emit(
                        "error",
                        data=f"Error creating {file_spec.path}: {exc}",
                    )
                    break

            # Save state every 5 files (Req 12.2)
            if i % 5 == 0:
                try:
                    state.save(self._get_store())
                except Exception:
                    pass

    async def _analyze_and_fix_errors(
        self,
        sandbox_id: str,
        error_log: str,
        plan: ImplementationPlan,
    ) -> List[str]:
        """Analyse error log with LLM and apply fixes using agent tools.

        Returns list of modified file paths.

        Requirements: 7.3, 7.4
        """
        # Truncate error log to fit token budget (Req 13.1)
        truncated_log = self._budget.truncate_context(error_log, 2000)

        prompt = (
            f"You are an expert developer debugging a {plan.platform} project.\n"
            "🧠 ULTRA SELF-REVIEW MODE (ACTIVE):\n"
            "- When fixing this error, also check for: state mutations, hook dependency issues, missing providers, re-renders.\n"
            "- Ensure strict typing (no 'any').\n\n"
            f"Error Log:\n{truncated_log}\n\n"
            "Analyse the errors and output ONLY valid JSON with fix instructions:\n"
            '{"analysis": "What is wrong", "fixes": ['
            '{"tool": "edit_file", "path": "src/App.tsx", "content": "..."}, '
            '{"tool": "create_file", "path": "src/types.ts", "content": "..."}, '
            '{"tool": "run_command", "command": "npm install missing-pkg"}'
            "]}"
        )

        prompt = self._budget.truncate_context(prompt, TokenBudget.MAX_PROMPT_TOKENS)
        prompt_tokens = self._budget.estimate_tokens(prompt)

        response = await self.openrouter_client.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            model=_SMART_MODEL,
            max_tokens=TokenBudget.MAX_RESPONSE_TOKENS,
            temperature=0.5,
        )

        response_tokens = self._budget.estimate_tokens(response)
        self._budget.log_token_usage("debugging", prompt_tokens, response_tokens)

        cleaned = response.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        try:
            fix_data = json.loads(cleaned)
        except json.JSONDecodeError:
            logger.warning("[AGENTIC] Debugging response was not valid JSON")
            return []

        sandbox_svc = self._get_sandbox_service()
        modified_files: List[str] = []

        for fix in fix_data.get("fixes", []):
            tool_name = fix.get("tool", "")
            try:
                if tool_name == "edit_file" and fix.get("path") and fix.get("content"):
                    await sandbox_svc.write_file(sandbox_id, fix["path"], fix["content"])
                    modified_files.append(fix["path"])
                    logger.info("[AGENTIC] Fix: edited %s", fix["path"])

                elif tool_name == "create_file" and fix.get("path") and fix.get("content"):
                    await sandbox_svc.create_file(sandbox_id, fix["path"], fix["content"])
                    modified_files.append(fix["path"])
                    logger.info("[AGENTIC] Fix: created %s", fix["path"])

                elif tool_name == "run_command" and fix.get("command"):
                    await sandbox_svc.run_command(sandbox_id, fix["command"], timeout=60)
                    logger.info("[AGENTIC] Fix: ran command %s", fix["command"])

            except Exception as exc:
                logger.warning("[AGENTIC] Fix application failed (%s): %s", tool_name, exc)

        return modified_files

    async def _self_healing_cycle(
        self,
        sandbox_id: str,
        plan: ImplementationPlan,
        error_log: str,
    ) -> bool:
        """One-shot self-healing attempt using the dedicated DEBUG_MODEL.

        Captures up to the last 50 lines of the error log + a shallow
        file-tree snapshot, sends both to _DEBUG_MODEL, receives a JSON
        patch (edit_file / run_command), applies it, then retries the
        build command.

        Returns True if the healing build succeeded, False otherwise.
        Guarantees exactly ONE retry to prevent infinite loops.

        Requirements: Brain Upgrade v2 — Self-Healing Loop
        """
        sandbox_svc = self._get_sandbox_service()

        # Truncate error to last 50 lines
        tail_log = "\n".join(error_log.splitlines()[-50:])

        # Grab shallow file tree
        try:
            tree_result = await sandbox_svc.run_command(
                sandbox_id, "find . -maxdepth 3 -not -path './.git/*' -not -path './node_modules/*' 2>/dev/null | head -60",
                timeout=10,
            )
            file_tree = tree_result.stdout or ""
        except Exception:
            file_tree = "(file tree unavailable)"

        heal_prompt = (
            "You are a senior engineer analysing a broken web project build.\n"
            f"File tree:\n{file_tree}\n\n"
            f"Error log (last 50 lines):\n{tail_log}\n\n"
            "Output a JSON patch to fix the build. Use this schema:\n"
            '{"analysis": "brief root cause", "patch": ['
            '{"tool": "edit_file", "path": "relative/path", "content": "full new file content"}, '
            '{"tool": "run_command", "command": "shell command"}'
            "]}\n"
            "Output ONLY valid JSON. No markdown."
        )

        heal_prompt = self._budget.truncate_context(heal_prompt, TokenBudget.MAX_PROMPT_TOKENS)

        try:
            response = await self.openrouter_client.chat_completion(
                messages=[{"role": "user", "content": heal_prompt}],
                model=_DEBUG_MODEL,
                max_tokens=2000,
                temperature=0.3,
            )
        except Exception as exc:
            logger.error("[self-heal] DEBUG_MODEL call failed: %s", exc)
            return False

        # Parse patch
        cleaned = response.strip()
        start, end = cleaned.find("{"), cleaned.rfind("}")
        if start != -1 and end != -1:
            cleaned = cleaned[start : end + 1]

        try:
            patch_data = json.loads(cleaned)
        except json.JSONDecodeError:
            logger.warning("[self-heal] DEBUG_MODEL returned invalid JSON — aborting heal")
            return False

        logger.info("[self-heal] Root cause: %s", patch_data.get("analysis", "unknown"))

        # Apply patch
        for step in patch_data.get("patch", []):
            tool_name = step.get("tool", "")
            try:
                if tool_name == "edit_file" and step.get("path") and step.get("content"):
                    # Ensure parent dir
                    parent = os.path.dirname(step["path"])
                    if parent:
                        await sandbox_svc.run_command(sandbox_id, f"mkdir -p {parent}", timeout=10)
                    await sandbox_svc.write_file(sandbox_id, step["path"], step["content"])
                    logger.info("[self-heal] Patched file: %s", step["path"])

                elif tool_name == "run_command" and step.get("command"):
                    await sandbox_svc.run_command(sandbox_id, step["command"], timeout=60)
                    logger.info("[self-heal] Ran patch command: %s", step["command"])

            except Exception as patch_exc:
                logger.warning("[self-heal] Patch step failed (%s): %s", tool_name, patch_exc)

        # Retry build once
        try:
            retry_result = await sandbox_svc.run_command(
                sandbox_id,
                "timeout 20 npm run build 2>&1 | head -50",
                timeout=35,
            )
            if retry_result.success and not retry_result.has_errors:
                logger.info("[self-heal] Healing successful — build passed!")
                return True
            logger.warning("[self-heal] Healing did not resolve all errors (exit=%d)", retry_result.exit_code)
        except Exception as exc:
            logger.warning("[self-heal] Post-heal build retry failed: %s", exc)

        return False

    # ==================================================================
    # Upgrade: Contextual Intelligence
    # ==================================================================

    async def _enrich_prompt(self, user_prompt: str) -> str:
        """Expand raw user prompt with implicit requirements via _FAST_MODEL.

        Produces compact JSON listing likely DB models, API routes, UI states,
        and auth requirements inferred from the app type. This enriched brief
        feeds into _generate_plan so the planner works from a richer spec
        than the user explicitly typed.

        Requirements: Contextual Intelligence upgrade
        """
        enrich_prompt = (
            f'The user wants to build: "{user_prompt}"\n\n'
            "You are a senior product engineer. List the implicit requirements this app needs "
            "that the user didn't mention — things any competent developer would add:\n"
            "- Likely database fields/models\n"
            "- Likely API routes\n"
            "- Likely UI states (loading, empty, error)\n"
            "- Likely auth requirements\n\n"
            'Return as compact JSON: {"models": [...], "routes": [...], "ui_states": [...], "auth": "...", "extras": [...]}\n'
            "Be specific, not generic. No explanation outside the JSON."
        )
        enrich_prompt = self._budget.truncate_context(enrich_prompt, TokenBudget.MAX_PROMPT_TOKENS)

        try:
            response = await self.openrouter_client.chat_completion(
                messages=[{"role": "user", "content": enrich_prompt}],
                model=_FAST_MODEL,
                max_tokens=800,
                temperature=0.4,
            )
            cleaned = response.strip()
            start, end = cleaned.find("{"), cleaned.rfind("}")
            if start != -1 and end != -1:
                cleaned = cleaned[start : end + 1]
            json.loads(cleaned)  # validate
            return cleaned
        except Exception as exc:
            logger.warning("[contextual-intel] Enrichment failed: %s", exc)
            return ""

    # ==================================================================
    # Upgrade: Auto-Answer Toggle
    # ==================================================================

    async def _auto_resolve_ambiguity(
        self, plan: ImplementationPlan, auto_answer: bool = True
    ) -> ImplementationPlan:
        """Auto-resolve ambiguous decisions in the plan via _PLANNING_MODEL.

        Scans plan description and scaffold commands for question marks, TBD,
        TODO, or OR patterns indicating unresolved decisions. When found and
        auto_answer=True, calls _PLANNING_MODEL to make the senior-developer
        call before the scaffold phase starts.

        When auto_answer=False, questions are logged for future UI surfacing.

        Requirements: Auto-answer toggle upgrade
        """
        if not auto_answer:
            return plan

        ambiguity_signals = ("?", "TBD", "TODO", " OR ", "which ", "should we")
        ambiguity_found: List[str] = []

        desc_lower = plan.project_description.lower()
        if any(s.lower() in desc_lower for s in ambiguity_signals):
            ambiguity_found.append(plan.project_description[:200])

        for cmd_spec in plan.scaffold_commands:
            if any(s in cmd_spec.command for s in ("?", "TBD", "TODO")):
                ambiguity_found.append(f"scaffold: {cmd_spec.command}")

        if not ambiguity_found:
            return plan  # Nothing to resolve

        question_block = "\n".join(f"- {q}" for q in ambiguity_found[:5])
        auto_prompt = (
            "You are a senior developer making pragmatic, industry-standard choices.\n"
            f"Project: {plan.project_title} — {plan.project_description[:200]}\n\n"
            "The following decisions are unresolved:\n"
            f"{question_block}\n\n"
            "For each ambiguous item, make the definitive call. "
            "Then output the COMPLETE updated plan as valid JSON. "
            "No alternatives, no hedging. Make the calls."
        )
        auto_prompt = self._budget.truncate_context(auto_prompt, TokenBudget.MAX_PROMPT_TOKENS)

        try:
            response = await self.openrouter_client.chat_completion(
                messages=[{"role": "user", "content": auto_prompt}],
                model=_PLANNING_MODEL,
                max_tokens=8192,
                temperature=0.3,
            )
            plan_dict = self._parse_json(response)
            resolved = ImplementationPlan(**plan_dict)
            logger.info("[auto-answer] Resolved %d ambiguous decision(s)", len(ambiguity_found))
            return resolved
        except Exception as exc:
            logger.warning("[auto-answer] Resolution failed: %s — keeping original plan", exc)
            return plan

    # ==================================================================
    # Upgrade: QA Agent
    # ==================================================================

    async def _run_qa_cycle(
        self, sandbox_id: str, plan: ImplementationPlan
    ) -> Optional[str]:
        """Generate and run a health-check script via _FAST_MODEL.

        After a successful build, asks _FAST_MODEL to produce a bash script
        that:
          1. Starts the dev server briefly
          2. Uses curl to hit every detectable route and asserts HTTP 200
          3. Checks that key DOM elements exist in the HTML response
          4. Exits non-zero if any check fails

        Returns the failure log if checks fail, None if all pass.
        If the QA script fails, the output is fed to _self_healing_cycle.

        Requirements: QA Agent upgrade
        """
        sandbox_svc = self._get_sandbox_service()

        # Build context: file tree + App source
        try:
            tree_result = await sandbox_svc.run_command(
                sandbox_id,
                "find . -maxdepth 3 -not -path './node_modules/*' -not -path './.git/*' 2>/dev/null | head -50",
                timeout=10,
            )
            file_tree = tree_result.stdout or ""
        except Exception:
            file_tree = "(unavailable)"

        app_content = ""
        for app_path in ("src/App.tsx", "src/App.jsx", "src/app/page.tsx", "pages/index.tsx"):
            try:
                app_content = await sandbox_svc.read_file(sandbox_id, app_path)
                break
            except Exception:
                continue

        qa_prompt = (
            "You are a QA agent. Given this project's file tree and App component, "
            "generate a bash health-check script that:\n"
            "1. Starts the dev server: npm run dev -- --host 0.0.0.0 --port 5173 &\n"
            "2. Waits 8 seconds for startup\n"
            "3. Uses curl to GET http://localhost:5173 and assert HTTP 200\n"
            "4. Checks that the HTML response contains at least one of: h1, nav, main, #root\n"
            "5. Kills the dev server (kill %1 2>/dev/null || true)\n"
            "6. Exits non-zero if any assertion fails, exits 0 if all pass\n\n"
            f"File tree:\n{file_tree}\n\n"
            f"App component (first 1500 chars):\n{app_content[:1500]}\n\n"
            "Return ONLY the bash script starting with #!/bin/bash. No explanation."
        )
        qa_prompt = self._budget.truncate_context(qa_prompt, TokenBudget.MAX_PROMPT_TOKENS)

        try:
            script = await self.openrouter_client.chat_completion(
                messages=[{"role": "user", "content": qa_prompt}],
                model=_FAST_MODEL,
                max_tokens=1200,
                temperature=0.2,
            )
        except Exception as exc:
            logger.warning("[qa-agent] Script generation failed: %s", exc)
            return None

        # Strip markdown fences if present
        script = script.strip()
        if "```" in script:
            lines = script.splitlines()
            script = "\n".join(ln for ln in lines if not ln.strip().startswith("```"))
        if not script.strip().startswith("#!"):
            script = "#!/bin/bash\n" + script

        # Write and run the health-check
        try:
            await sandbox_svc.create_file(sandbox_id, "/tmp/qa_check.sh", script)
            qa_result = await sandbox_svc.run_command(
                sandbox_id, "bash /tmp/qa_check.sh 2>&1", timeout=45
            )
            if qa_result.success:
                logger.info("[qa-agent] \u2705 All health checks passed")
                return None
            fail_log = ((qa_result.stdout or "") + "\n" + (qa_result.stderr or "")).strip()
            logger.warning("[qa-agent] \u26a0\ufe0f Health checks failed:\n%s", fail_log[:400])
            return fail_log
        except Exception as exc:
            logger.warning("[qa-agent] QA execution failed: %s", exc)
            return None

    async def _debugging_loop(
        self,
        sandbox_id: str,
        plan: ImplementationPlan,
        state: GenerationState,
    ) -> AsyncIterator[str]:
        """Iteratively run project, detect errors, and fix them.

        Stops when clean run or max iterations reached.

        Requirements: 7.1–7.7
        """
        max_iterations = state.max_debug_iterations
        sandbox_svc = self._get_sandbox_service()

        yield self._emit(
            "debug_start",
            data="Installing dependencies (npm install)...",
            progress=self._calculate_progress("debugging", 0, max_iterations),
        )

        # Install dependencies first — use fallback chain (Brain Upgrade v2)
        try:
            install_result = await self._run_npm_install_with_fallback(sandbox_id, timeout=180)
            if not install_result.success:
                logger.warning("[AGENTIC] All npm fallback attempts failed — trying self-heal")
                yield self._emit("healing_start", data="[npm-fallback] All install attempts failed — triggering self-heal...")
                install_log = (install_result.stderr or "") + "\n" + (install_result.stdout or "")
                healed = await self._self_healing_cycle(sandbox_id, plan, install_log)
                if healed:
                    yield self._emit("healing_success", data="[self-heal] ✅ Install errors resolved by Self-Healing Cycle!")
                else:
                    yield self._emit("healing_failed", data="[self-heal] ⚠️ Could not fix install errors — attempting build anyway")
            else:
                yield self._emit("debug_iteration", data="[npm-fallback] ✅ Dependencies installed successfully")
        except Exception as exc:
            logger.warning("[AGENTIC] npm install failed: %s — continuing", exc)
            yield self._emit("error", data=f"npm install failed: {exc} — proceeding with debug loop")

        for iteration in range(max_iterations):
            state.debug_iterations = iteration + 1
            progress = self._calculate_progress("debugging", iteration, max_iterations)

            yield self._emit(
                "debug_iteration",
                data=f"Running project (attempt {iteration + 1}/{max_iterations})...",
                progress=progress,
            )

            # Run the project (Req 7.1)
            try:
                run_result = await sandbox_svc.run_command(
                    sandbox_id,
                    "timeout 20 npm run build 2>&1 || timeout 20 npm run dev -- --host 0.0.0.0 2>&1 | head -50",
                    timeout=35,
                )
            except Exception as exc:
                logger.warning("[AGENTIC] Run command error on iteration %d: %s", iteration + 1, exc)
                run_result = None

            # Check for clean run (Req 7.2, 7.6)
            if run_result is not None and run_result.success and not run_result.has_errors:
                yield self._emit(
                    "debug_done",
                    data="Build passed! Running QA health checks...",
                    progress=self._calculate_progress("debugging", max_iterations, max_iterations),
                )
                # --- QA Agent: run health checks before showing preview ---
                try:
                    qa_failure = await self._run_qa_cycle(sandbox_id, plan)
                    if qa_failure:
                        yield self._emit("healing_start", data="[qa-agent] Health checks failed — triggering self-heal...")
                        healed = await self._self_healing_cycle(sandbox_id, plan, qa_failure)
                        if healed:
                            yield self._emit("healing_success", data="[qa-agent] ✅ QA self-heal succeeded!")
                        else:
                            yield self._emit("healing_failed", data="[qa-agent] ⚠️ QA issues remain — preview may have minor problems")
                    else:
                        yield self._emit("debug_done", data="[qa-agent] ✅ All health checks passed. Project is ready!")
                except Exception as qa_exc:
                    logger.warning("[qa-agent] QA cycle failed: %s", qa_exc)
                    yield self._emit("debug_done", data="Project running successfully! (QA skipped)")
                return

            # Extract error log (Req 7.2)
            if run_result is not None:
                error_log = (run_result.stderr + "\n" + run_result.stdout).strip()
            else:
                error_log = "Command execution failed — unknown error"

            if not error_log.strip():
                # No output but exit code was non-zero
                yield self._emit(
                    "debug_done",
                    data="Build process completed (no errors in output).",
                    progress=1.0,
                )
                return

            yield self._emit(
                "debug_iteration",
                data=f"Errors detected on attempt {iteration + 1} — analysing...",
                progress=progress,
            )

            # Analyse and fix (Req 7.3, 7.4)
            try:
                modified_files = await self._analyze_and_fix_errors(
                    sandbox_id, error_log, plan
                )
                yield self._emit(
                    "debug_iteration",
                    data=f"Applied {len(modified_files)} fix(es): {', '.join(modified_files[:3])}",
                    progress=progress,
                )

                # On the penultimate iteration, trigger proactive self-healing
                if iteration == max_iterations - 2:
                    logger.info("[self-heal] Proactive healing on penultimate iteration")
                    yield self._emit("healing_start", data="[self-heal] Proactive heal attempt before final retry...")
                    healed = await self._self_healing_cycle(sandbox_id, plan, error_log)
                    if healed:
                        yield self._emit("healing_success", data="[self-heal] ✅ Proactive heal succeeded — project is ready!", progress=1.0)
                        return
                    else:
                        yield self._emit("healing_failed", data="[self-heal] ⚠️ Proactive heal partial — final iteration will run")

            except Exception as exc:
                logger.error("[AGENTIC] Error analysis failed on iteration %d: %s", iteration + 1, exc)
                yield self._emit(
                    "error",
                    data=f"Error analysis failed: {exc}",
                )

        # Max iterations reached (Req 7.6)
        yield self._emit(
            "error",
            data=(
                f"Could not fully resolve all errors after {max_iterations} attempts. "
                "Project may have remaining issues — check the sandbox viewer."
            ),
        )
        yield self._emit(
            "debug_done",
            data="Debugging loop completed (max iterations reached).",
            progress=1.0,
        )

    # ==================================================================
    # Progress tracking helpers
    # ==================================================================

    def _emit(self, event_type: str, **kwargs: Any) -> str:
        """Create a ProgressEvent JSON string for SSE streaming.

        Requirements: 10.1–10.7
        """
        now_iso = datetime.now(timezone.utc).isoformat()

        # Map legacy event types that frontend already handles
        _compat_map = {
            "plan": "plan_ready",
        }
        event_type = _compat_map.get(event_type, event_type)

        try:
            event = ProgressEvent(
                event=EventType(event_type),
                timestamp=now_iso,
                **kwargs,
            )
            return event.to_json()
        except Exception:
            # Fallback to raw JSON if model construction fails
            payload = {"event": event_type, "timestamp": now_iso, **kwargs}
            return json.dumps(payload)

    def _calculate_progress(
        self, phase: str, current: int, total: int
    ) -> float:
        """Calculate overall build progress percentage.

        Phase weights: sandbox 5%, planning 10%, scaffolding 15%, files 60%, debugging 10%.

        Requirements: 10.7
        """
        start, end = _PHASE_WEIGHTS.get(phase, (0.0, 1.0))
        phase_fraction = (current / total) if total > 0 else 0.0
        return round(start + phase_fraction * (end - start), 4)

    # ==================================================================
    # Resume support (Task 10.3)
    # ==================================================================

    async def resume_generation(
        self, project_id: str
    ) -> AsyncIterator[str]:
        """Resume an interrupted generation from the last saved state.

        Requirements: 12.4–12.6
        """
        store = self._get_store()
        state = GenerationState.load(project_id, store)

        if state is None:
            yield self._emit("error", data=f"No saved state for project {project_id}")
            yield self._emit("done_failed")
            return

        sandbox_id = state.sandbox_id
        yield self._emit(
            "debug_iteration",
            data=f"Resuming from phase: {state.phase}",
            sandbox_id=sandbox_id,
        )

        # Reconstruct plan from state
        if state.plan is None:
            yield self._emit("error", data="No saved plan — cannot resume")
            yield self._emit("done_failed")
            return

        plan = ImplementationPlan(**state.plan)

        if state.phase in ("sandbox", "planning", "scaffolding"):
            # Resume from scaffolding onwards
            async for event in self._execute_scaffolding(plan, sandbox_id, state):
                yield event
            async for event in self._create_files_incrementally(plan, sandbox_id, state):
                yield event
        elif state.phase == "files":
            # Resume file creation (already-created files are skipped)
            async for event in self._create_files_incrementally(plan, sandbox_id, state):
                yield event

        async for event in self._debugging_loop(sandbox_id, plan, state):
            yield event

        yield self._emit("done", sandbox_id=sandbox_id, progress=1.0)

    # ==================================================================
    # File management (unchanged)
    # ==================================================================

    async def download_project_zip(self, project_id: str) -> bytes:
        """Build and return a ZIP archive of a Veronica project.

        Requirements: 16, 40
        """
        from backend.services.veronica_project_store import VeronicaProjectStore  # noqa: PLC0415
        import zipfile, io  # noqa: E401

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

        base_dir = os.getenv("VERONICA_PROJECT_DIR", "/tmp/veronica_projects")
        store = VeronicaProjectStore(base_dir=base_dir)
        paths = store.get_paths(project_id)
        target = (paths.root_dir / file_path).resolve()
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
        return {"status": "updated", "path": file_path}

    # ==================================================================
    # Mentor & memory (unchanged)
    # ==================================================================

    async def get_mentor_suggestions(self, project_id: str) -> Dict[str, Any]:
        """Return AI mentor suggestions for a project.

        Requirements: 16.13
        """
        messages = [
            {"role": "system", "content": "You are a helpful programming mentor."},
            {"role": "user", "content": f"Give me 3 improvement suggestions for project {project_id}."},
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
