from __future__ import annotations

import uuid
from typing import Any, Awaitable, Callable, Dict, Optional

from backend.models.project_spec import ProjectSpec, VeronicaPlatform, ProjectFile
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
            "- Include at least one .ino file under `arduino/` (e.g. `arduino/main.ino`) and it MUST compile logically. NEVER use .ini extensions for Arduino code, only .ino, .h, and .cpp.\n"
            "- Write correct, high-quality C++ code for Arduino.\n"
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
- `readme` should be a COMPLETE, DETAILED README.md. It MUST include a comprehensive project idea description explaining what it is and how it works in detail, followed by detailed build/run steps, and a safety note. Do not be brief!
- Put the main entry file as `is_main: true` (exactly one).
- Do NOT use generic placeholders like "// Control code here". Write complete, functional, and highly detailed code for all files. Provide a fully fleshed out implementation.
- Do not include markdown fences or extra text.
- You MUST also generate a file named `prompt.txt` at the root. The content of `prompt.txt` should be a highly detailed prompt that the user can copy and paste into \"Full build\" mode to instruct the AI to generate the complete, production-ready version of this project.

{platform_notes}

User request:
{message}
""".strip()


def _repair_prompt(*, original_message: str, bad_output: str, error_summary: str) -> str:
    truncated_bad = bad_output[:2000] + ("..." if len(bad_output) > 2000 else "")
    return f"""
The previous JSON did not validate against the ProjectSpec schema.
Fix it and return ONLY corrected JSON (no markdown, no commentary).

Validation errors (summary):
{error_summary}

Original user request:
{original_message}

Previous invalid output:
{truncated_bad}
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
    except ProjectSpecValidationError as e:
        # One bounded repair attempt
        error_summary = str(e.details or e)
        repair = _repair_prompt(original_message=message, bad_output=text, error_summary=error_summary)
        text2 = await llm_complete(repair)
        try:
            spec, _raw2 = validate_project_spec_from_text(text2)
        except ProjectSpecValidationError as e2:
            # Second (final) attempt: force strict JSON-only output.
            error_summary2 = str(e2.details or e2)
            strict_repair = (
                "Return ONLY a single JSON object that starts with '{' and ends with '}'.\n"
                "No markdown. No commentary. No code fences.\n\n"
                f"Previous validation error:\n{error_summary2}\n\n"
                f"Original user request:\n{message}\n\n"
                f"Your last (invalid) output:\n{text2[:2000]}{'...' if len(text2) > 2000 else ''}\n"
            )
            text3 = await llm_complete(strict_repair)
            try:
                spec, _raw3 = validate_project_spec_from_text(text3)
            except ProjectSpecValidationError as e3:
                # All 3 LLM attempts failed — raise a clean error the FastAPI
                # route can catch and convert to a structured 422 response.
                raise ValueError(
                    f"Veronica could not generate a valid project spec after 3 attempts. "
                    f"Last validation error: {e3.details or str(e3)}"
                ) from e3

    # Force the explicitly generated UUID (Nemotron sometimes hallucinates its own slug here)
    spec.project_id = project_id

    # Post-process spec to enforce platform-specific expectations.
    files: list[ProjectFile] = list(spec.files or [])

    if picked_platform == VeronicaPlatform.WEB:
        # Ensure a minimal React+Vite template is present.
        template_files: dict[str, str] = {
            "package.json": f'''{{
  "name": "{spec.title.lower().replace(' ', '-')}",
  "version": "0.0.0",
  "private": true,
  "scripts": {{
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }},
  "dependencies": {{
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }},
  "devDependencies": {{
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }}
}}''',
            "index.html": """<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Veronica Project</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
""",
            "src/main.tsx": """import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
""",
            "src/App.tsx": f"""import React from 'react';

function App() {{
  return (
    <main style={{{{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}}}>
      <h1>{spec.title}</h1>
      <p>{spec.summary}</p>
    </main>
  );
}}

export default App;
""",
        }

        existing_paths = {f.path for f in files}
        for path, content in template_files.items():
            if path not in existing_paths:
                files.append(ProjectFile(path=path, content=content, is_main=path == "src/App.tsx"))

    if picked_platform == VeronicaPlatform.ARDUINO:
        # Ensure at least one .ino sketch exists.
        has_ino = any(f.path.endswith(".ino") for f in files)
        if not has_ino:
            sketch = f"""// {spec.title}
// {spec.summary}
// Auto-generated starter sketch by Veronica.

void setup() {{
  // TODO: initialize pins, sensors, and communication here.
}}

void loop() {{
  // TODO: implement main project logic here.
}}
"""
            files.append(ProjectFile(path="arduino/main.ino", content=sketch, is_main=True))

    # If no main file was marked, pick a reasonable default.
    if not any(f.is_main for f in files):
        for candidate in ("src/App.tsx", "src/main.tsx", "arduino/main.ino"):
            for f in files:
                if f.path == candidate:
                    f.is_main = True
                    break

    spec = spec.model_copy(update={"files": files})
    return spec


class VeronicaProjectGenerator:
    """
    Thin class wrapper around generate_project_spec so the orchestrator
    can call  generator.generate(request_data)  and  generator.generate_stream(request_data).
    """

    def __init__(self, llm_complete=None):
        self._llm_complete = llm_complete  # injected by orchestrator; falls back lazily

    def _get_llm(self):
        if self._llm_complete is not None:
            return self._llm_complete
        # Lazy default: use OpenRouter via env vars
        from backend.integrations.openrouter.client import OpenRouterClient  # noqa: PLC0415
        client = OpenRouterClient()
        return client.chat_completion_text

    async def generate(self, request_data: dict) -> dict:
        message = (
            request_data.get("message")
            or request_data.get("prompt")
            or request_data.get("description")
            or ""
        )
        if not message:
            return {"error": "No message provided", "project": None}

        llm = self._get_llm()
        spec = await generate_project_spec(message=message, llm_complete=llm)
        return {"project": spec.model_dump(), "project_id": spec.project_id}

    async def generate_stream(self, request_data: dict):
        """Yield JSON chunks — delegates to generate() for simplicity."""
        import json  # noqa: PLC0415
        result = await self.generate(request_data)
        yield json.dumps(result)
