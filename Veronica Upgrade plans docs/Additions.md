🧠 VERONICA AI ROADMAP CANVAS
🎯 Core Vision

Veronica becomes the AI STEM mentor + project builder.

Flow for students:

Idea → Plan → Build → Run → Learn → Improve

Everything happens through one chat interface.

🟢 V1 — Veronica Smart Generator (MVP)
Goal

Merge Idea Generator + Code Generator into Veronica AI chat tab.

UX
User → Chat → Veronica

Example prompts:

"Give me a robotics project idea"
"I want to build a plant monitoring system"
"Generate Arduino code for a line following robot"
System Flow
User Prompt
↓
Intent Classifier
↓
Router
↓
Idea / Project Generator
↓
Chat Response
Features

✔ Veronica AI chat page
✔ Intent detection
✔ Idea generation
✔ Project plan generation
✔ Structured project spec
✔ Project card in chat
✔ Download project ZIP

Project Output Example
Project: Obstacle Avoiding Robot

Platform: Arduino
Difficulty: Beginner

Files:
robot.ino
wiring.md
README.md
Tech
React
FastAPI
OpenRouter / LLM
JSON project spec
Infrastructure
Single server
No Docker yet
🟡 V2 — Veronica Project Builder
Goal

Allow projects to run and preview.

New UX
Chat
↓
Project card
↓
Run Project
↓
Preview
System Flow
Generate Project
↓
Create sandbox container
↓
Run dev server
↓
Preview iframe
Features

✔ Docker sandbox
✔ Web project preview
✔ Logs viewer
✔ Run button
✔ Stop container

Infrastructure
FastAPI
Docker
Nginx / Traefik proxy
Sandbox manager
Sandbox Manager
create_container()
run_project()
get_logs()
stop_container()
destroy_container()
🟠 V3 — Veronica Self-Fixing Builder
Goal

Veronica can debug and fix generated code.

System Loop
Generate code
↓
Run project
↓
Observe logs
↓
Fix errors
↓
Run again
New Modules

✔ Execution tools
✔ Error parser
✔ Auto-fix system
✔ Retry loop

Example

Error:

Module not found: framer-motion

Veronica:

Installing dependency...
Restarting server...
🔵 V4 — Agentic Veronica

Now Veronica becomes true AI agents.

Agent System
Planner Agent
Coder Agent
Debugger Agent
QA Agent
Workflow
User goal
↓
Planner
↓
Agents collaborate
↓
Project built

Example:

Goal: Build IoT weather station

Agents:

Planner → define tasks
Coder → generate code
Debugger → fix errors
QA → verify project
Architecture
Chat
↓
Intent
↓
Planner Agent
↓
Agent Execution
↓
Tools
🟣 V5 — Veronica DevLab

Full AI development environment for STEM.

Capabilities

✔ Build full apps
✔ Run experiments
✔ Simulate hardware
✔ Deploy projects
✔ Improve projects

UX
Chat
↓
Live project workspace
↓
Preview
↓
Iteration

Example:

User: Build a physics simulation

Veronica:
✓ Creates project
✓ Runs simulation
✓ Shows preview
✓ Explains physics
⚫ V6 — Full Veronica Ecosystem

Veronica becomes a learning + development AI system.

Capabilities

✔ Personalized learning memory
✔ Multi-project workspace
✔ AI mentorship
✔ STEM simulations
✔ Collaborative agents

Future Experience
Student
↓
Ask Veronica
↓
AI generates project
↓
Runs simulation
↓
Teaches concept
↓
Suggests improvements
🧠 Core Architecture (Final)
Frontend (React)
↓
Veronica Chat
↓
Intent Classifier
↓
Router
↓
Planner Agent
↓
Agent System
↓
Tools Layer
↓
Sandbox Environment
↓
Preview Runtime
🧰 Veronica Tool System

Agents use tools like:

generate_project()
write_file()
read_file()
run_container()
install_dependencies()
analyze_logs()
🏗 Infrastructure Evolution
V1
Single server
FastAPI
LLM API
V2
Docker containers
Sandbox manager
Reverse proxy
V3
Container pools
Task queue
V4+
Multi-server
Cluster
(Optional Kubernetes)
🧠 Key Design Principles
Chat-first UX
User → Veronica

No feature switching.

Backend-driven logic

UI stays simple:

display messages
display project cards
render actions
Structured project specs

Everything uses:

ProjectSpec
{
  title
  platform
  difficulty
  materials
  files[]
}
🚀 What makes Veronica special

Most AI builders:

generate code

Veronica:

generate idea
↓
teach concept
↓
build project
↓
run project
↓
improve project

It becomes AI STEM mentor.