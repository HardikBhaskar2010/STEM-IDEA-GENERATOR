import json
import math
import re
from dataclasses import dataclass
from enum import Enum
from typing import Awaitable, Callable, Dict, List, Optional, Tuple


class VeronicaIntent(str, Enum):
    IDEA_ONLY = "IDEA_ONLY"
    IDEA_PLUS_CODE = "IDEA_PLUS_CODE"
    CODE_GENERATION = "CODE_GENERATION"
    DEBUG_HELP = "DEBUG_HELP"


@dataclass(frozen=True)
class IntentClassification:
    intent: VeronicaIntent
    confidence: float
    reasons: Tuple[str, ...] = ()
    used_llm: bool = False


def _clamp01(x: float) -> float:
    if x < 0.0:
        return 0.0
    if x > 1.0:
        return 1.0
    return x


def _softmax(scores: Dict[VeronicaIntent, float]) -> Dict[VeronicaIntent, float]:
    # Numerically-stable softmax
    m = max(scores.values()) if scores else 0.0
    exps = {k: math.exp(v - m) for k, v in scores.items()}
    denom = sum(exps.values()) or 1.0
    return {k: (v / denom) for k, v in exps.items()}


def _heuristic_scores(message: str) -> Tuple[Dict[VeronicaIntent, float], List[str]]:
    msg = (message or "").strip().lower()
    reasons: List[str] = []

    # Base bias: most messages are idea-seeking in this app.
    scores: Dict[VeronicaIntent, float] = {
        VeronicaIntent.IDEA_ONLY: 0.6,
        VeronicaIntent.IDEA_PLUS_CODE: 0.2,
        VeronicaIntent.CODE_GENERATION: 0.2,
        VeronicaIntent.DEBUG_HELP: 0.2,
    }

    def add(intent: VeronicaIntent, weight: float, why: str):
        scores[intent] = scores.get(intent, 0.0) + weight
        reasons.append(why)

    # Debug / troubleshooting
    if any(k in msg for k in ["error", "bug", "debug", "not working", "fails", "stack trace", "exception", "traceback"]):
        add(VeronicaIntent.DEBUG_HELP, 2.0, "debug_keywords")

    # Code generation
    if any(k in msg for k in ["generate code", "write code", "code for", "arduino code", "sketch", ".ino", "function", "class", "typescript", "python code", "implement"]):
        add(VeronicaIntent.CODE_GENERATION, 2.2, "code_generation_keywords")

    # Idea generation
    if any(k in msg for k in ["project idea", "idea", "suggest", "brainstorm", "give me a", "come up with"]):
        add(VeronicaIntent.IDEA_ONLY, 1.8, "idea_keywords")

    # “Build X system” often means idea + implementation (but user said defer codegen UX)
    if any(k in msg for k in ["i want to build", "i want to make", "help me build", "build a", "create a system", "monitoring system", "prototype"]):
        add(VeronicaIntent.IDEA_PLUS_CODE, 1.6, "build_system_phrase")

    # If both idea and code terms present, steer to IDEA_PLUS_CODE (still yields idea first)
    if ("idea" in msg or "project" in msg) and ("code" in msg or "arduino" in msg or "generate" in msg):
        add(VeronicaIntent.IDEA_PLUS_CODE, 1.2, "idea_and_code_overlap")

    # If the message contains an obvious error log pattern, boost DEBUG_HELP
    if re.search(r"\b(line\s+\d+|at\s+\w+\(|syntaxerror|typeerror|referenceerror)\b", msg):
        add(VeronicaIntent.DEBUG_HELP, 1.4, "stacktrace_pattern")

    return scores, reasons


def _pick_intent_from_probs(probs: Dict[VeronicaIntent, float]) -> Tuple[VeronicaIntent, float]:
    best_intent = max(probs.items(), key=lambda kv: kv[1])[0]
    return best_intent, probs.get(best_intent, 0.0)


async def classify_intent(
    message: str,
    *,
    llm_complete: Optional[Callable[[str], Awaitable[str]]] = None,
    llm_threshold: float = 0.6,
) -> IntentClassification:
    """
    Hybrid classifier:
    - Heuristic first, returns (intent, confidence)
    - If confidence < llm_threshold and llm_complete provided, uses LLM to classify.
    """
    scores, reasons = _heuristic_scores(message)
    probs = _softmax(scores)
    intent, confidence = _pick_intent_from_probs(probs)

    confidence = _clamp01(float(confidence))
    if confidence >= llm_threshold or llm_complete is None:
        return IntentClassification(intent=intent, confidence=confidence, reasons=tuple(reasons), used_llm=False)

    # LLM fallback (strict JSON)
    prompt = f"""
Classify the user's message into exactly one intent from:
- IDEA_ONLY
- IDEA_PLUS_CODE
- CODE_GENERATION
- DEBUG_HELP

Return ONLY JSON in this exact shape:
{{
  "intent": "IDEA_ONLY|IDEA_PLUS_CODE|CODE_GENERATION|DEBUG_HELP",
  "confidence": 0.0
}}

Rules:
- confidence must be a number between 0 and 1.
- If the user asks for debugging help, pick DEBUG_HELP.
- If the user asks to generate code, pick CODE_GENERATION.
- If the user asks for a project idea only, pick IDEA_ONLY.
- If the user describes something they want to build (system) and likely needs steps + implementation, pick IDEA_PLUS_CODE.

User message:
{message}
""".strip()

    try:
        llm_text = await llm_complete(prompt)
        start = llm_text.find("{")
        end = llm_text.rfind("}")
        json_text = llm_text[start : end + 1] if start != -1 and end != -1 else llm_text
        data = json.loads(json_text)
        llm_intent_raw = str(data.get("intent", "")).strip()
        llm_conf = _clamp01(float(data.get("confidence", 0.0)))
        llm_intent = VeronicaIntent(llm_intent_raw)

        return IntentClassification(
            intent=llm_intent,
            confidence=llm_conf,
            reasons=tuple(reasons) + ("llm_fallback",),
            used_llm=True,
        )
    except Exception:
        # If LLM parsing/validation fails, fall back to heuristic result.
        return IntentClassification(intent=intent, confidence=confidence, reasons=tuple(reasons) + ("llm_failed_fallback",), used_llm=False)

