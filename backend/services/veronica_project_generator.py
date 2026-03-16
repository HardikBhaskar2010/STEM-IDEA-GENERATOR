from __future__ import annotations

import uuid
from typing import Any, Awaitable, Callable, Dict, Optional

from backend.models.project_spec import ProjectSpec, VeronicaPlatform
from backend.services.project_spec_validator import ProjectSpecValidationError, validate_project_spec_from_text


def infer_platform(message: str) -> VeronicaPlatform:
    msg = (message or "").lower()
    if any(k in msg for k in ["arduino", ".ino", "uno", "nano", "mega", "esp32", "esp8266"]):
        return VeronicaPlatform.ARDUINO
    if any(k in msg for k in ["raspberry pi", "raspi", "pi 4", "pi 5", "gpio"]):
        return VeronicaPlatform.RASPBERRY_PI
    if any(k in msg for k in ["web", "website", "frontend", "react", "vite", "next.js", "node"]):
        return VeronicaPlatform.WEB
    return VeronicaPlatform.ARDUINO


def _projectspec_prompt(*, project_id: str, message: str, platform: VeronicaPlatform) -> str:
    platform_notes = {
        VeronicaPlatform.ARDUINO: (
            "Arduino project requirements:\n"
            "- Include a wiring section with pin mappings.\n"
            "- Include a materials list.\n"
            "- Include at least one .ino file under `arduino/` (e.g. `arduino/main.ino`) and it must compile logically.\n"
        ),
        VeronicaPlatform.RASPBERRY_PI: (
            "Raspberry Pi project requirements:\n"
            "- Include wiring/pin notes if using GPIO.\n"
            "- Include at least one Python entry file under `pi/` (e.g. `pi/main.py`).\n"
        ),
        VeronicaPlatform.WEB: (
            "Web project requirements:\n"
            "- Use React + Vite.\n"
            "- Include `package.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`.\n"
            "- Include a short README with run instructions.\n"
        ),
    }[platform]

    return f"""
You are Veronica, a STEM project generator. Create a complete project spec that is practical, buildable, and consistent.

Return ONLY valid JSON that conforms to this exact schema:
{{
  \"project_id\": \"{project_id}\",
  \"title\": \"string\",
  \"platform\": \"arduino|raspberry-pi|web\",
  \"difficulty\": \"beginner|intermediate|advanced|expert|<short label>\",
  \"summary\": \"string\",
  \"learning_goals\": [\"string\", ...],
  \"steps\": [\"string\", ...],
  \"materials\": [\"string\", ...],
  \"wiring\": {{
    \"overview\": \"string\",
    \"connections\": [\"string\", ...],
    \"notes\": [\"string\", ...]
  }},
  \"files\": [
    {{
      \"path\": \"relative/posix/path.ext\",
      \"content\": \"file contents\",
      \"description\": \"optional\",
      \"is_main\": false
    }}
  ],
  \"readme\": \"string\",
  \"meta\": {{}}
}}

Rules:
- `files[].path` must be relative, use forward slashes, and must NOT contain `..` or start with `/` or a drive letter.
- `readme` should be a complete README.md content with build/run steps and a short safety note.
- Put the main entry file as `is_main: true` (exactly one).
- Keep file contents short but runnable; prefer correctness over length.
- Do not include markdown fences or extra text.

{platform_notes}

User request:
{message}
""".strip()


def _repair_prompt(*, original_message: str, bad_output: str, error_summary: str) -> str:
    return f"""
The previous JSON did not validate against the ProjectSpec schema.
Fix it and return ONLY corrected JSON (no markdown, no commentary).

Validation errors (summary):
{error_summary}

Original user request:
{original_message}

Previous invalid output:
{bad_output}
""".strip()


async def generate_project_spec(
    *,
    message: str,
    llm_complete: Callable[[str], Awaitable[str]],
    platform: Optional[VeronicaPlatform] = None,
) -> ProjectSpec:
    project_id = str(uuid.uuid4())
    picked_platform = platform or infer_platform(message)

    prompt = _projectspec_prompt(project_id=project_id, message=message, platform=picked_platform)
    text = await llm_complete(prompt)
    try:
        spec, _raw = validate_project_spec_from_text(text)
        return spec
    except ProjectSpecValidationError as e:
        # One bounded repair attempt
        error_summary = str(e.details or e)
        repair = _repair_prompt(original_message=message, bad_output=text, error_summary=error_summary)
        text2 = await llm_complete(repair)
        spec2, _raw2 = validate_project_spec_from_text(text2)
        return spec2

