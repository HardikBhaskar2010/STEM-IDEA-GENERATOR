// AI Guidance Service for Frontend
// Requirements: 2.2, 2.3, 3.1, 5.1

import { 
  ChatRequest, 
  ChatResponse, 
  ContextResponse, 
  HistoryResponse,
  ChatMessage,
  ProjectContext,
  AIGuidanceError,
  APIResponse
} from '@/types/aiGuidance';

/**
 * Service for interacting with AI Guidance backend endpoints
 * Handles chat functionality, project context retrieval, and session management
 */
class AIGuidanceService {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    let baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://perfection-v2.onrender.com/api';
    
    // Ensure baseUrl ends with /api for production
    if (baseUrl && !baseUrl.endsWith('/api')) {
      baseUrl = baseUrl.replace(/\/$/, '') + '/api';
    }
    
    this.baseUrl = baseUrl;
    this.timeout = 60000; // Increased to 60 seconds for slower backend responses
    
    // Debug log
    console.log(`🔍 AI Guidance Service initialized with baseUrl: ${this.baseUrl}`);
    console.log(`🔍 Environment VITE_API_BASE_URL: ${process.env.NEXT_PUBLIC_API_BASE_URL}`);
  }

  /**
   * Send a chat message and get AI response
   * Requirements: 2.2, 5.1
   */
  async sendMessage(projectId: string, message: string, sessionId?: string, projectContext?: any, conversationHistory?: any[]): Promise<ChatResponse> {
    const request: ChatRequest = {
      message,
      sessionId,
      projectContext,
      conversationHistory
    };

    // Retry logic for timeout issues
    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🚀 Sending message (attempt ${attempt}/${maxRetries}) with ${conversationHistory?.length || 0} history messages`);
        
        const response = await fetch(`${this.baseUrl}/projects/${projectId}/guidance/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(this.timeout)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data: ChatResponse = await response.json();
        console.log(`✅ Message sent successfully on attempt ${attempt}`);
        return data;
      } catch (error) {
        lastError = error as Error;
        console.warn(`❌ Attempt ${attempt} failed:`, error);
        
        // If it's the last attempt or not a timeout error, don't retry
        if (attempt === maxRetries || !error.message.includes('timed out')) {
          break;
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, attempt * 2000));
      }
    }

    // If all attempts failed, throw the last error
    if (lastError) {
      throw new Error(`Failed to send message after ${maxRetries} attempts: ${lastError.message}`);
    }
    
    throw new Error('Failed to send message: Unknown error');
  }

  /**
   * Get project context for AI guidance
   * Requirements: 3.1, 7.1, 7.2
   */
  async getProjectContext(projectId: string): Promise<ContextResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/projects/${projectId}/guidance/context`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ContextResponse = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get project context: ${error.message}`);
      }
      throw new Error('Failed to get project context: Unknown error');
    }
  }

  /**
   * Get chat history for a project
   * Note: This is now handled by localStorage on frontend
   * Backend endpoint kept for backward compatibility
   * Requirements: 2.3, 7.3
   */
  async getChatHistory(projectId: string, sessionId?: string, limit: number = 100): Promise<HistoryResponse> {
    try {
      const params = new URLSearchParams();
      if (sessionId) params.append('session_id', sessionId);
      if (limit !== 100) params.append('limit', limit.toString());

      const url = `${this.baseUrl}/projects/${projectId}/guidance/history${params.toString() ? '?' + params.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data: HistoryResponse = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get chat history: ${error.message}`);
      }
      throw new Error('Failed to get chat history: Unknown error');
    }
  }

  /**
   * Check if the AI guidance service is available
   * Requirements: Error Handling
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout for health check
      });
      return response.ok;
    } catch (error) {
      // Log the specific error for debugging
      console.warn('AI Guidance health check failed:', error);
      
      // Check if this is a development environment
      if (this.baseUrl.includes('localhost')) {
        console.warn('Backend server may not be running locally. Please start the backend server.');
      } else {
        console.warn('Production backend service may not be deployed or accessible.');
      }
      
      return false;
    }
  }

  /**
   * Sync project from localStorage to backend database
   * Requirements: 2.1, 3.1
   */
  async syncProject(projectData: any): Promise<{ success: boolean; project_id: string; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/projects/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Project synced successfully:', projectData.title);
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to sync project: ${error.message}`);
      }
      throw new Error('Failed to sync project: Unknown error');
    }
  }

  /**
   * Initialize chat session for a project
   * Fetches project context and prepares the AI for conversation
   * Requirements: 2.1, 3.1
   */
  async initializeChatSession(projectId: string): Promise<ContextResponse> {
    try {
      console.log('🚀 Initializing chat session for project:', projectId);
      
      // Get project context from backend
      const contextResponse = await this.getProjectContext(projectId);
      
      console.log('✅ Chat session initialized successfully');
      return contextResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to initialize chat session: ${error.message}`);
      }
      throw new Error('Failed to initialize chat session: Unknown error');
    }
  }

  /**
   * Handle API errors and provide user-friendly messages
   * Requirements: Error Handling
   */
  private handleApiError(error: any): AIGuidanceError {
    if (error.name === 'AbortError') {
      return {
        code: 'timeout',
        message: 'Request timed out. Please try again.',
        retryable: true
      };
    }

    if (error.message?.includes('Failed to fetch')) {
      return {
        code: 'network_error',
        message: 'Network connection error. Please check your internet connection.',
        retryable: true
      };
    }

    if (error.message?.includes('HTTP 401')) {
      return {
        code: 'unauthorized',
        message: 'Authentication required. Please log in again.',
        retryable: false
      };
    }

    if (error.message?.includes('HTTP 403')) {
      return {
        code: 'forbidden',
        message: 'You do not have permission to access this project.',
        retryable: false
      };
    }

    if (error.message?.includes('HTTP 404')) {
      return {
        code: 'not_found',
        message: 'Project not found or has been deleted.',
        retryable: false
      };
    }

    if (error.message?.includes('HTTP 429')) {
      return {
        code: 'rate_limit',
        message: 'Too many requests. Please wait a moment before trying again.',
        retryable: true
      };
    }

    if (error.message?.includes('HTTP 5')) {
      return {
        code: 'server_error',
        message: 'Server error. Please try again in a few moments.',
        retryable: true
      };
    }

    return {
      code: 'unknown_error',
      message: error.message || 'An unexpected error occurred. Please try again.',
      retryable: true
    };
  }
}

// Export singleton instance
export const aiGuidanceService = new AIGuidanceService();
export default aiGuidanceService;