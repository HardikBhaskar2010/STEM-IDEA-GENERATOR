const getApiBaseUrl = () => {
  let baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://perfection-v2.onrender.com/api';
  if (baseUrl && !baseUrl.endsWith('/api')) {
    baseUrl = baseUrl.replace(/\/$/, '') + '/api';
  }
  return baseUrl;
};

const API_BASE_URL = getApiBaseUrl();

export type VeronicaIntent = 'IDEA_ONLY' | 'IDEA_PLUS_CODE' | 'CODE_GENERATION' | 'DEBUG_HELP';

export interface VeronicaAIAction {
  type: string;
  enabled: boolean;
  id?: string | null;
  label?: string | null;
  meta?: Record<string, any> | null;
}

export interface VeronicaAIChatRequest {
  message: string;
  session_id?: string;
  context?: Record<string, any>;
}

export interface VeronicaAIChatResponse {
  intent: VeronicaIntent;
  confidence: number;
  assistant_text: string;
  actions: VeronicaAIAction[];
  project?: Record<string, any> | null;
}

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

export async function sendVeronicaMessage(payload: VeronicaAIChatRequest): Promise<VeronicaAIChatResponse> {
  return apiFetch<VeronicaAIChatResponse>('/veronica-projects/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type AgentEvent = {
  event: 'plan' | 'file_start' | 'file_done' | 'fix' | 'error' | 'done';
  data?: string;
  path?: string;
  timestamp: string;
};

export async function sendVeronicaMessageStream(
  payload: VeronicaAIChatRequest,
  onEvent: (event: AgentEvent) => void
): Promise<VeronicaAIChatResponse> {
  const url = `${API_BASE_URL}/veronica-projects/generate/agent-stream`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.status} ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('ReadableStream not supported');

  const decoder = new TextDecoder();
  let result: VeronicaAIChatResponse | null = null;
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim().startsWith('data: ')) {
        const dataStr = line.trim().slice(6);
        if (dataStr === '[DONE]') continue;
        try {
          const data = JSON.parse(dataStr);
          if (data.event === 'done') {
             result = data.result;
          } else {
             onEvent(data as AgentEvent);
          }
        } catch (e) {
          console.error('Failed to parse SSE line', line, e);
        }
      }
    }
  }

  if (!result) throw new Error("Stream finished without a valid 'done' event.");
  return result;
}

export async function getVeronicaProject(projectId: string): Promise<Record<string, any>> {
  return apiFetch<Record<string, any>>(`/veronica-projects/${encodeURIComponent(projectId)}`);
}

export async function updateVeronicaProjectFile(projectId: string, path: string, content: string): Promise<Record<string, any>> {
  return apiFetch<Record<string, any>>(`/veronica-projects/${encodeURIComponent(projectId)}/files`, {
    method: 'PUT',
    body: JSON.stringify({ path, content }),
  });
}

export async function downloadVeronicaProjectZip(projectId: string): Promise<Blob> {
  const url = `${API_BASE_URL}/veronica-projects/${encodeURIComponent(projectId)}/download/zip`;
  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.status} ${response.statusText}`);
  }
  return await response.blob();
}

export interface VeronicaRunResponse {
  project_id: string;
  run_id: string;
  status: string;
  preview_url?: string | null;
  startup_logs?: string[];
}

export interface VeronicaLogsResponse {
  run_id: string;
  logs: string;
}

export async function startVeronicaRun(projectId: string): Promise<VeronicaRunResponse> {
  return apiFetch<VeronicaRunResponse>(`/veronica-projects/${encodeURIComponent(projectId)}/run`, {
    method: 'POST',
  });
}

/** Triggers a browser download of the project ZIP */
export function downloadProjectZip(projectId: string): void {
  const a = document.createElement('a');
  a.href = `${API_BASE_URL}/veronica-projects/${encodeURIComponent(projectId)}/download/zip`;
  a.download = `veronica-project-${projectId.slice(0, 8)}.zip`;
  a.click();
}

export async function stopVeronicaRun(projectId: string, runId: string): Promise<VeronicaRunResponse> {
  const params = new URLSearchParams({ run_id: runId });
  return apiFetch<VeronicaRunResponse>(`/veronica-projects/${encodeURIComponent(projectId)}/stop?${params.toString()}`, {
    method: 'POST',
  });
}

export async function getVeronicaRunLogs(projectId: string, runId: string): Promise<VeronicaLogsResponse> {
  return apiFetch<VeronicaLogsResponse>(
    `/veronica-projects/${encodeURIComponent(projectId)}/runs/${encodeURIComponent(runId)}/logs`
  );
}

export interface VeronicaSelfFixResponse {
  run_id: string;
  attempts: Array<{
    attempt: number;
    command: string[];
    exit_code: number;
    error_kind?: string | null;
    applied_fix?: any | null;
    stdout: string;
    stderr: string;
  }>;
}

export async function runVeronicaSelfFix(projectId: string, runId: string): Promise<VeronicaSelfFixResponse> {
  return apiFetch<VeronicaSelfFixResponse>(
    `/veronica-projects/${encodeURIComponent(projectId)}/runs/${encodeURIComponent(runId)}/self-fix`,
    { method: 'POST' }
  );
}

export interface VeronicaAgentJobResponse {
  job_id: string;
  project_id: string;
  status: string;
  plan?: any[];
  result?: Record<string, any>;
  error?: string | null;
}

export async function startVeronicaAgentJob(projectId: string, runId: string): Promise<VeronicaAgentJobResponse> {
  const params = new URLSearchParams({ run_id: runId });
  return apiFetch<VeronicaAgentJobResponse>(`/veronica-projects/${encodeURIComponent(projectId)}/agent-jobs?${params.toString()}`, {
    method: 'POST',
  });
}

