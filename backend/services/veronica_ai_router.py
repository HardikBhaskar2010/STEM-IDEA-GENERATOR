from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Awaitable, Callable, Dict, List, Optional, Tuple

from backend.services.veronica_intent_classifier import IntentClassification, VeronicaIntent


Action = Dict[str, Any]


@dataclass(frozen=True)
class VeronicaAIResult:
    assistant_text: str
    intent: VeronicaIntent
    confidence: float
    actions: Tuple[Action, ...]
    project: Optional[Dict[str, Any]] = None


def infer_project_type(message: str) -> str:
    msg = (message or "").lower()
    if any(k in msg for k in ["robot", "robotics", "ultrasonic", "line follower", "obstacle"]):
        return "robotics"
    if any(k in msg for k in ["iot", "smart home", "monitoring", "sensor network"]):
        return "iot"
    if any(k in msg for k in ["web", "website", "frontend", "react", "vite"]):
        return "web-development"
    if any(k in msg for k in ["mobile", "android", "ios", "flutter", "react native"]):
        return "mobile-apps"
    if any(k in msg for k in ["game", "unity", "godot"]):
        return "game-development"
    if any(k in msg for k in ["ml", "machine learning", "ai model", "neural"]):
        return "ai-ml"
    if any(k in msg for k in ["circuit", "pcb", "analog", "digital electronics"]):
        return "electronics"
    return "electronics"


def infer_skill_level(message: str) -> str:
    msg = (message or "").lower()
    if "beginner" in msg:
        return "beginner"
    if "intermediate" in msg:
        return "intermediate"
    if "advanced" in msg:
        return "advanced"
    if "expert" in msg:
        return "expert"
    return "intermediate"


def build_actions(*, has_project: bool) -> Tuple[Action, ...]:
    """
    Actions are *system actions* the UI can render dynamically.
    Many are initially disabled until the user saves a project or enables codegen later.
    """
    actions: List[Action] = []

    if has_project:
        actions.append({"type": "save_project", "enabled": True})
        actions.append({"type": "open_project", "enabled": False})
    else:
        actions.append({"type": "save_project", "enabled": False})
        actions.append({"type": "open_project", "enabled": False})

    # Deferred features (kept in backend, surfaced but disabled)
    actions.append({"type": "generate_code", "enabled": False})
    actions.append({"type": "edit_code", "enabled": False})
    actions.append({"type": "download_project", "enabled": False})
    actions.append({"type": "preview_project", "enabled": False})

    return tuple(actions)


def _assistant_preface(intent: VeronicaIntent) -> str:
    if intent == VeronicaIntent.DEBUG_HELP:
        return "Let’s debug this. Share the error text/log, what platform you’re using (Arduino/web/etc.), and what you expected to happen."
    if intent == VeronicaIntent.CODE_GENERATION:
        return "I can help generate code for this. For now, I’ll capture what you want and we can generate code later."
    if intent == VeronicaIntent.IDEA_PLUS_CODE:
        return "Got it — I’ll start with a strong project idea and outline, then you can choose when to move into code generation."
    return "Here’s a project idea you can build."


async def route_message(
    message: str,
    classification: IntentClassification,
    *,
    generate_project_fn: Callable[[Dict[str, Any]], Awaitable[Dict[str, Any]]],
) -> VeronicaAIResult:
    """
    Routes a user message based on intent.

    Notes:
    - Keeps existing backend modules intact by calling `generate_project_fn` for idea generation.
    - Code generation is intentionally deferred (actions remain disabled).
    """
    intent = classification.intent
    confidence = classification.confidence

    if intent in (VeronicaIntent.IDEA_ONLY, VeronicaIntent.IDEA_PLUS_CODE):
        params = {
            "projectType": infer_project_type(message),
            "skillLevel": infer_skill_level(message),
            "interests": message,
            "budget": "",
            "duration": "",
        }

        project = await generate_project_fn(params)
        assistant_text = (
            f"{_assistant_preface(intent)}\n\n"
            f"**{project.get('title', 'Project')}**\n\n"
            f"{project.get('description', '')}".strip()
        )
        return VeronicaAIResult(
            assistant_text=assistant_text,
            intent=intent,
            confidence=confidence,
            actions=build_actions(has_project=True),
            project=project,
        )

    # CODE_GENERATION or DEBUG_HELP: no project generation call by default (deferred)
    assistant_text = _assistant_preface(intent)
    return VeronicaAIResult(
        assistant_text=assistant_text,
        intent=intent,
        confidence=confidence,
        actions=build_actions(has_project=False),
        project=None,
    )

