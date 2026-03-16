Final Veronica Upgrade Plan (Phase-wise)
Phase 0 — Foundations (do once, enables all phases)
Unify the “Veronica Chat” contract: one ProjectSpec JSON schema for idea + plan + files + materials/wiring + README.
Prompt + parsing layer: model-agnostic prompts that always return valid structured JSON (with strict validation + repair).
Core backend primitives: project_id, project storage (even if file-based first), streaming events/logs format for UI (“steps”).
Safety baseline: input sanitization, rate limits, audit log of actions (even before agents).
Phase 1 (V1) — Smart Generator MVP (Chat-first, no sandbox)
Goal: Merge idea + project generation into a single Veronica chat experience that reliably outputs usable STEM projects.

User experience

One Veronica chat tab: Idea → Plan → Project card → Download ZIP.
Project card shows: platform, difficulty, materials, files list, next steps.
Deliverables

Intent classifier + router (idea request vs “generate Arduino code” vs “web app project”, etc.).
Project templates library (Arduino, Raspberry Pi, basic Web/React+Vite starters).
Structured generation: ProjectSpec → {files[], wiring/materials, readme}.
Frontend: chat UI + project card + file viewer/editor + Download ZIP.
Backend: FastAPI endpoint(s) for generate + retrieve project files.
Exit criteria

Users can generate a project and download/edit it reliably.
Arduino outputs include wiring/materials + README + .ino consistently.
Phase 2 (V2) — Project Builder (Run + Preview via Docker sandbox)
Goal: Let projects actually run and preview (starting with web projects).

User experience

Project card adds Run / Stop.
Preview iframe for web projects + logs viewer.
Deliverables

Sandbox manager: create_container() / run_project() / get_logs() / stop() / destroy().
Reverse proxy (Nginx/Traefik) to route per-project preview URLs safely.
Realtime step UI (Option B vibe): Analyzing → Generating → Installing → Running → Ready (streamed).
Container hardening (minimum): non-root, cap-drop, resource/time limits, no host mounts.
Exit criteria

“Run-to-ready” works end-to-end for at least one web template with stable preview + logs.
Phase 3 (V3) — Self-Fixing Builder (bounded run → observe → fix → retry)
Goal: Veronica can handle common build/runtime failures automatically (first-line debugging).

Deliverables

Execution tools: write_file, read_file, run_command, tail_logs, install_deps.
Error parser: classify common failures (missing deps, import errors, config issues).
Auto-fix rules (small, high-confidence) + bounded retry loop with attempt limits.
UX: “Apply suggested fix” + “Run again”, plus a “safe mode” requiring confirmations.
Persistence: store project snapshots + run logs + applied fixes in DB.
Security upgrades: stronger sandboxing + egress controls/allowlist where possible.
Exit criteria

Meaningful % of failed runs recover automatically with transparent, reversible changes.
Phase 4 (V4) — Agentic Veronica (Planner + specialized agents)
Goal: Move from scripted retries to agent workflow: plan tasks, execute tools, verify results.

Deliverables

Planner Agent produces an ordered task graph (create → install → run → test → document).
Specialized agents: Coder, Debugger, QA (optionally UX/Docs).
Orchestration runtime (LangGraph / AutoGen-style) with state, retries, and determinism controls.
Audit trail: every agent decision + tool call logged and replayable.
Test automation: lint/test harness where applicable; QA checklist scoring after builds.
Exit criteria

Multi-step projects complete with fewer manual interventions and better consistency than V3.
Phase 5 (V5) — Veronica DevLab (full workspace + deploy/export)
Goal: A real STEM dev environment: long-running jobs, iteration loops, exports/deploys.

Deliverables

Job system + scheduling (queue, cancellations, timeouts).
Project versioning/rollback (snapshot or git-in-sandbox).
Export/deploy integrations: GitHub repo export; optional Vercel/Netlify for web templates; Docker artifact export.
Plugin ecosystem hooks: linters, simulators, external tools.
Metrics/observability: time-to-first-preview, fix rate, run success %, user satisfaction.
Phase 6 (V6) — Full Ecosystem (personalized mentor + multi-project learning)
Goal: Veronica becomes an AI STEM mentor with memory, multi-project workspaces, and learning loops.

Deliverables

Long-term personalization memory (preferences, prior projects, learning goals).
Multi-project workspace and cross-project knowledge reuse.
Mentorship layer: teaches concepts, suggests improvements, creates guided challenges.
Collaboration: collaborative agents and shared workspaces (optional).
Infrastructure Evolution (matches phases)
V1: Single server (FastAPI + React) + LLM API
V2: Docker sandboxes + reverse proxy
V3: Container pools + task queue
V4+: Multi-server orchestration (optional cluster/Kubernetes later)
KPIs to track from Phase 1 onward
Run-to-ready %, time to first preview, auto-fix count per run, retry success rate, security incidents (target 0), thumbs-up/user satisfaction