# Real-time Backend System Logs

The goal is to create a secure, real-time logging dashboard in the frontend where you can watch the Python `uvicorn` backend stdout/stderr outputs entirely inside the browser without having to switch focus to the raw terminal exactly as requested.

## User Review Required

> [!CAUTION]
> The backend log stream could contain technical and internal application data (such as internal stack traces over time). While the environment has strict security sanitizers (using `APIKeySecurityValidator` to strip OpenRouter keys automatically), consider keeping this URL strictly hidden or requiring login if you decide to deploy this live publicly.

## Proposed Changes

---

### Backend Components

#### [MODIFY] [server.py](file:///c:/Users/sesa457837/Videos/STEM-IDEA-GENERATOR/backend/server.py)
- Import and register the new custom logging handler right below where the native `logging` is initialized.
- Register a new `system_router` into the core FastAPI app setup block.

#### [NEW] [backend/core/log_stream.py](file:///c:/Users/sesa457837/Videos/STEM-IDEA-GENERATOR/backend/core/log_stream.py)
- Create `class MemoryLogStreamer(logging.Handler)` that instantly intercepts live Python logs.
- Stores incoming strings to connected `asyncio.Queue` objects.

#### [NEW] [backend/routers/system.py](file:///c:/Users/sesa457837/Videos/STEM-IDEA-GENERATOR/backend/routers/system.py)
- Expose the HTTP endpoint `GET /api/system/logs/stream`.
- Use a `StreamingResponse("text/event-stream")` context that pulls actively from `MemoryLogStreamer` until the web window pauses or closes.

---

### Frontend Components

#### [NEW] [frontend/src/pages/AdminLogs.tsx](file:///c:/Users/sesa457837/Videos/STEM-IDEA-GENERATOR/frontend/src/pages/AdminLogs.tsx)
- Create a brand new UI terminal interface for logs containing:
  - Dark mode glassmorphic styling utilizing `lucide-react` icons (Terminal, Activity).
  - Status indicator (Live / Disconnected).
  - An `EventSource` web-hook hitting your `VITE_API_BASE_URL + "/system/logs/stream"`.
  - Colorized visual formatting matching log output:
    - Automatically highlights `INFO` in blue.
    - Automatically highlights `ERROR` and Tracebacks in red.

#### [MODIFY] [frontend/src/App.tsx](file:///c:/Users/sesa457837/Videos/STEM-IDEA-GENERATOR/frontend/src/App.tsx)
- Map `path="/admin/logs"` to the newly built `<AdminLogs />` component.

## Open Questions

- Do you want this page tightly secured behind the Auth layer, or are you okay with it being an openly accessible URL (`/admin/logs`) during your local testing?
- For the UI layout, do you want the logs page to be a full-screen developer terminal format (like E2B instances), or just a scrollable component nested inside your main App layout grid?

## Verification Plan

### Automated Tests
1. Generate an intentional "fake" log using a mock button or wait for Uvicorn standard outputs to broadcast.
2. Ensure no duplicate log streams emit causing the browser RAM to lag.

### Manual Verification
1. I will boot `npm run dev` and `uvicorn`, navigate to `/admin/logs` via URL, and trigger a chat message action in a different tab and visually confirm that the exact event log is painted onto the web canvas in less than `~100ms`.
