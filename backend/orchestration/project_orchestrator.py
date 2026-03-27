"""
Project generation orchestrator.

Coordinates AI-powered STEM project generation, database persistence, and
fallback logic.  Routers call this orchestrator — they never call services
directly.

Requirements: 15, 15.8, 15.9, 15.11, 27
"""

import json
import logging
from typing import Any, AsyncIterator, Dict, Optional

from backend.core.exceptions import UpstreamError, ValidationError
from backend.integrations.openrouter.client import OpenRouterClient

logger = logging.getLogger(__name__)

# Prompt template for STEM project generation
_PROJECT_PROMPT_TEMPLATE = """You are a STEM education expert. Generate a detailed, practical STEM project based on the following parameters:

Project Type: {projectType}
Skill Level: {skillLevel}
Interests: {interests}
Budget: {budget}
Duration: {duration}

Please provide a complete project plan in the following JSON format:
{{
  "title": "Project Title",
  "description": "Detailed project description",
  "difficulty": "Beginner/Intermediate/Advanced",
  "estimatedTime": "X hours/days/weeks",
  "estimatedCost": "$X - $Y",
  "components": ["Component 1", "Component 2", "Component 3"],
  "skills": ["Skill 1", "Skill 2", "Skill 3"],
  "steps": [
    "Step 1: Description",
    "Step 2: Description",
    "Step 3: Description"
  ]
}}

Ensure the project is:
1. Appropriate for the skill level
2. Within the budget range
3. Completable within the duration
4. Engaging and educational
5. Safe for students

Return ONLY valid JSON, no additional text."""


class ProjectOrchestrator:
    """
    Orchestrates STEM project generation workflows.

    Coordinates AI generation via :class:`OpenRouterClient` with local fallback
    generation when the AI service is unavailable.

    Requirements: 15, 15.8, 15.9, 15.11
    """

    def __init__(self, openrouter_client: OpenRouterClient) -> None:
        self.openrouter_client = openrouter_client

    # ------------------------------------------------------------------
    # Public workflow methods (called by routers)
    # ------------------------------------------------------------------

    async def generate_project(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a STEM project plan.

        Tries AI generation first; falls back to the local template generator
        if OpenRouter is unavailable.

        Args:
            params: Dict with keys ``projectType``, ``skillLevel``,
                ``interests``, ``budget``, ``duration``.

        Returns:
            Dict conforming to the ``GeneratedProject`` schema.

        Raises:
            ValidationError: When ``projectType`` or ``skillLevel`` is missing.

        Requirements: 15.8, 15.9, 27
        """
        self._validate_params(params)

        try:
            return await self._generate_with_ai(params)
        except (UpstreamError, Exception) as exc:
            logger.warning(
                "AI generation failed (%s) — falling back to local generator", exc
            )
            return self._local_fallback(params)

    async def generate_project_stream(
        self, params: Dict[str, Any]
    ) -> AsyncIterator[str]:
        """Stream STEM project generation token-by-token.

        Args:
            params: Same as :meth:`generate_project`.

        Yields:
            Text chunks from the AI response.

        Requirements: 15.8
        """
        self._validate_params(params)
        prompt = self._build_prompt(params)
        messages = [{"role": "user", "content": prompt}]

        try:
            async for chunk in self.openrouter_client.chat_completion_stream(messages):
                yield chunk
        except Exception as exc:
            logger.warning("Streaming generation failed: %s — yielding fallback", exc)
            fallback = self._local_fallback(params)
            yield json.dumps(fallback)

    async def sync_project(self, project_data: Dict[str, Any]) -> Dict[str, Any]:
        """Sync / upsert a project record.

        Args:
            project_data: Project payload to sync.

        Returns:
            Confirmed sync result dict.

        Requirements: 15.9
        """
        # Delegate to project_service when available; minimal implementation here.
        return {
            "status": "synced",
            "project_id": project_data.get("id") or project_data.get("project_id"),
        }

    async def get_component_details(self, component_id: str) -> Dict[str, Any]:
        """Retrieve details for a specific project component.

        Args:
            component_id: Unique identifier of the component.

        Returns:
            Component detail dict.

        Requirements: 15.11
        """
        if not component_id or not component_id.strip():
            raise ValidationError(
                "component_id is required",
                details={"field": "component_id"},
            )
        # Stub — extend with real database lookup when database layer is wired.
        return {
            "component_id": component_id,
            "details": f"Details for component {component_id}",
        }

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _validate_params(self, params: Dict[str, Any]) -> None:
        """Raise ValidationError for missing required fields."""
        if not params.get("projectType"):
            raise ValidationError(
                "projectType is required",
                details={"field": "projectType"},
            )
        if not params.get("skillLevel"):
            raise ValidationError(
                "skillLevel is required",
                details={"field": "skillLevel"},
            )

    def _build_prompt(self, params: Dict[str, Any]) -> str:
        """Build the AI generation prompt from parameters."""
        return _PROJECT_PROMPT_TEMPLATE.format(
            projectType=params.get("projectType", ""),
            skillLevel=params.get("skillLevel", ""),
            interests=params.get("interests", "general STEM"),
            budget=params.get("budget", "flexible"),
            duration=params.get("duration", "flexible"),
        )

    async def _generate_with_ai(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Attempt AI-powered project generation."""
        prompt = self._build_prompt(params)
        messages = [{"role": "user", "content": prompt}]
        raw_text = await self.openrouter_client.chat_completion(messages)

        # Try to parse as JSON; raise so fallback can take over
        cleaned = self._extract_json(raw_text)
        parsed = json.loads(cleaned)
        return self._normalise_project(parsed, params)

    @staticmethod
    def _extract_json(text: str) -> str:
        """Extract JSON object from an AI response string."""
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            return text[start:end]
        return text.strip()

    @staticmethod
    def _normalise_project(
        parsed: Dict[str, Any], params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Ensure the project dict has all required keys."""
        project_type = params.get("projectType", "STEM")
        skill_level = params.get("skillLevel", "intermediate")

        return {
            "title": parsed.get("title", f"{project_type} Project"),
            "description": parsed.get("description", f"A {skill_level} {project_type} project"),
            "difficulty": parsed.get("difficulty", skill_level.capitalize()),
            "estimatedTime": parsed.get("estimatedTime", "2-4 hours"),
            "estimatedCost": parsed.get("estimatedCost", "$10 - $30"),
            "components": parsed.get("components", []),
            "skills": parsed.get("skills", []),
            "steps": parsed.get("steps", []),
        }

    def _local_fallback(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Template-based fallback when AI is unavailable.

        Requirements: 27
        """
        from backend.utils.fallback import local_generator  # lazy import
        return local_generator(params)
