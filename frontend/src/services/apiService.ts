/**
 * API Service - Handles all backend API calls
 */

// Get the API base URL from environment variables
const getApiBaseUrl = () => {
  let baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://perfection-v2.onrender.com/api';
  
  // Ensure baseUrl ends with /api for production
  if (baseUrl && !baseUrl.endsWith('/api')) {
    baseUrl = baseUrl.replace(/\/$/, '') + '/api';
  }
  
  return baseUrl;
};

const FINAL_API_BASE_URL = getApiBaseUrl();

/**
 * Generic API fetch wrapper with error handling
 */
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  // Use absolute URL if provided, otherwise relative to current origin (handled by Vite proxy in dev)
  const url = endpoint.startsWith('http') ? endpoint : `${FINAL_API_BASE_URL}${endpoint}`;
  
  // Debug log for troubleshooting
  if (!endpoint.startsWith('http')) {
    console.log(`🔍 API Call: ${endpoint} → ${url}`);
  }
  
  try {
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
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Health check - Test if backend is reachable
 */
export async function healthCheck(): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/health');
}

/**
 * Generate STEM Project based on user parameters
 * 
 * @param params Project generation parameters
 * @returns Generated project details
 */
export interface ProjectParams {
  projectType: string;
  skillLevel: string;
  interests: string;
  budget: string;
  duration: string;
}

export interface GeneratedProject {
  title: string;
  description: string;
  difficulty: string;
  estimatedTime: string;
  estimatedCost: string;
  components: string[];
  skills: string[];
  steps: string[];
}

/**
 * Main project generation entry point.
 * Now strictly calls the backend API which handles the AI logic securely.
 */
export async function generateProject(params: ProjectParams): Promise<GeneratedProject> {
  console.log('🚀 Project Generation Request to Backend:', { 
    type: params.projectType, 
    level: params.skillLevel
  });

  try {
    // Call the real backend API which now handles Gemini AI
    const project = await apiFetch<GeneratedProject>('/generate-project', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    
    console.log('✅ Project generated from backend:', project.title);
    return project;
    
  } catch (error) {
    console.error('❌ Backend API call failed:', error);
    throw new Error('Failed to generate project. Please check your connection and try again.');
  }
}

/**
 * Create status check (existing endpoint on your Render backend)
 */
export interface StatusCheckCreate {
  client_name: string;
}

export interface StatusCheck {
  id: string;
  client_name: string;
  timestamp: string;
}

export async function createStatusCheck(data: StatusCheckCreate): Promise<StatusCheck> {
  return apiFetch<StatusCheck>('/status', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get all status checks
 */
export async function getStatusChecks(): Promise<StatusCheck[]> {
  return apiFetch<StatusCheck[]>('/status');
}

export async function* generateProjectStream(params: ProjectParams) {
  const endpoint = '/generate-project-stream';
  const url = endpoint.startsWith('http') ? endpoint : `${FINAL_API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("Stream not supported");

  const decoder = new TextDecoder("utf-8");
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') return;
          if (dataStr) {
            try {
              yield JSON.parse(dataStr);
            } catch (e) {
              console.error('Error parsing stream chunk:', e, dataStr);
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export default {
  healthCheck,
  generateProject,
  generateProjectStream,
  createStatusCheck,
  getStatusChecks,
};
