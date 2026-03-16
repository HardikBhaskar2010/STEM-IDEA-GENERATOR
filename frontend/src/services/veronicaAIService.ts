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
  return apiFetch<VeronicaAIChatResponse>('/veronica-ai/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

