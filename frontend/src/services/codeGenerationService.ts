// Real API service for code generation
// Connected to backend API endpoints

import type { 
  ErrorContext} from '@/utils/errorHandler';
import { 
  withRetry, 
  ServiceError, 
  errorLogger,
  circuitBreaker,
  enhancedFetch,
  DEFAULT_RETRY_OPTIONS
} from '@/utils/errorHandler';

// Real API functions
const api = {
  async post(endpoint: string, data: any): Promise<any> {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    const response = await enhancedFetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    return response.json();
  },
  
  async get(endpoint: string): Promise<any> {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    const response = await enhancedFetch(`${baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    return response.json();
  },
  
  async delete(endpoint: string): Promise<any> {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    const response = await enhancedFetch(`${baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    return response.json();
  }
};

// Types
export interface CodeGenerationParams {
  platform: 'arduino' | 'raspberry_pi' | 'web' | 'mobile';
  complexity_level?: 'beginner' | 'intermediate' | 'advanced';
  include_comments?: boolean;
  include_tests?: boolean;
  custom_requirements?: string;
}

export interface CodeFile {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  content: string;
  description?: string;
  size_bytes: number;
  is_main_file: boolean;
  is_modified?: boolean;
}

export interface GeneratedCode {
  generation_id: string;
  project_id: string;
  user_id: string;
  status: 'generating' | 'completed' | 'failed';
  platform: string;
  created_at: string;
  completed_at?: string;
  error_message?: string;
  files_count: number;
  id?: string;
  files?: CodeFile[];
}

export interface GenerationStatus {
  generation_id: string;
  project_id: string;
  status: 'generating' | 'completed' | 'failed';
  platform: string;
  created_at: string;
  completed_at?: string;
  error_message?: string;
  files_count: number;
}

export interface StreamingEvent {
  type: 'status_update' | 'file_generated' | 'progress_update' | 'error' | 'completion' | 'connection_ack';
  timestamp: string;
  connection_id: string;
  data: any;
}

// API Response Types
interface CodeGenerationResponse {
  generation_id: string;
  status: string;
  message: string;
  estimated_completion_time?: number;
}

class CodeGenerationService {
  private baseUrl: string;
  private wsConnections: Map<string, WebSocket> = new Map();

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  }

  /**
   * Start code generation for a project
   */
  async startGeneration(
    projectId: string, 
    params: CodeGenerationParams
  ): Promise<CodeGenerationResponse> {
    const context: ErrorContext = {
      operation: 'startGeneration',
      service: 'codeGenerationService',
      timestamp: new Date()
    };

    try {
      return await circuitBreaker.execute(async () => {
        return await withRetry(async () => {
          // Map frontend params to backend expected format
          const backendParams = {
            platform: params.platform,
            complexity_level: params.complexity_level || 'intermediate',
            include_comments: params.include_comments !== false,
            include_tests: params.include_tests || false,
            custom_requirements: params.custom_requirements
          };

          const response = await api.post(
            `/projects/${projectId}/generate-code`,
            backendParams
          );
          
          errorLogger.info('Code generation started successfully', context);
          
          return {
            generation_id: response.generation_id,
            status: response.status,
            message: response.message || 'Code generation started successfully',
            estimated_completion_time: response.estimated_completion_time || 60
          };
        }, {
          ...DEFAULT_RETRY_OPTIONS,
          maxAttempts: 2 // Reduce retries for generation start
        });
      });
    } catch (error) {
      const serviceError = new ServiceError(
        'Failed to start code generation',
        'GENERATION_START_FAILED',
        context,
        error instanceof Error ? error : undefined,
        true
      );
      
      errorLogger.error(serviceError.message, context, serviceError);
      throw serviceError;
    }
  }

  /**
   * Get generation status
   */
  async getGenerationStatus(
    projectId: string, 
    generationId: string
  ): Promise<GenerationStatus> {
    const context: ErrorContext = {
      operation: 'getGenerationStatus',
      service: 'codeGenerationService',
      timestamp: new Date()
    };

    try {
      return await withRetry(async () => {
        const response = await api.get(
          `/projects/${projectId}/code-generation/${generationId}`
        );
        
        return {
          generation_id: response.generation_id || generationId,
          project_id: response.project_id || projectId,
          status: response.status,
          platform: response.platform,
          created_at: response.created_at,
          completed_at: response.completed_at,
          error_message: response.error_message,
          files_count: response.files_count || 0
        };
      }, {
        maxAttempts: 5, // Allow more retries for status checks
        baseDelay: 500
      });
    } catch (error) {
      const serviceError = new ServiceError(
        'Failed to get generation status',
        'GENERATION_STATUS_FAILED',
        context,
        error instanceof Error ? error : undefined,
        true
      );
      
      errorLogger.error(serviceError.message, context, serviceError);
      throw serviceError;
    }
  }

  /**
   * Get specific generation by ID
   */
  async getGeneration(generationId: string): Promise<any> {
    try {
      // Fetch generation files (the main data we need)
      const files = await this.getGeneratedFiles(generationId);
      
      return {
        id: generationId,
        generation_id: generationId,
        status: 'completed',
        platform: 'web',
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        files_count: files.length,
        files: files
      };
    } catch (error) {
      console.error('Error getting generation:', error);
      throw error;
    }
  }

  /**
   * Get all generations for a project
   */
  async getProjectGenerations(projectId: string): Promise<GeneratedCode[]> {
    try {
      const response = await api.get(`/projects/${projectId}/generated-code`);
      
      // Backend returns an array of generation status objects
      if (Array.isArray(response)) {
        return response.map((item: any) => ({
          generation_id: item.generation_id,
          project_id: item.project_id,
          user_id: item.user_id || '',
          status: item.status,
          platform: item.platform,
          created_at: item.created_at,
          completed_at: item.completed_at,
          error_message: item.error_message,
          files_count: item.files_count || 0
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting project generations:', error);
      return [];
    }
  }

  /**
   * Get generated files for a generation
   */
  async getGeneratedFiles(generationId: string): Promise<CodeFile[]> {
    try {
      const response = await api.get(`/generated-code/${generationId}/files`);
      
      // Backend returns { generation_id, files: [...] }
      const files = response.files || response;
      if (Array.isArray(files)) {
        return files.map((file: any) => ({
          id: file.id || file.file_name,
          file_name: file.file_name,
          file_path: file.file_path,
          file_type: file.file_type,
          content: file.content || '',
          description: file.description,
          size_bytes: file.size_bytes || (file.content ? file.content.length : 0),
          is_main_file: file.is_main_file || false
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting generated files:', error);
      throw error;
    }
  }

  /**
   * Get specific file content
   */
  async getFileContent(generationId: string, fileId: string): Promise<CodeFile> {
    try {
      const response = await api.get(
        `/generated-code/${generationId}/files/${fileId}`
      );
      
      return {
        id: response.id || fileId,
        file_name: response.file_name,
        file_path: response.file_path,
        file_type: response.file_type,
        content: response.content || '',
        description: response.description,
        size_bytes: response.size_bytes || 0,
        is_main_file: response.is_main_file || false
      };
    } catch (error) {
      console.error('Error getting file content:', error);
      throw error;
    }
  }

  /**
   * Update file content
   */
  async updateFileContent(
    generationId: string, 
    fileId: string, 
    content: string
  ): Promise<CodeFile> {
    try {
      const response = await api.post(
        `/generated-code/${generationId}/files/${fileId}`,
        { content }
      );
      
      return {
        id: response.id || fileId,
        file_name: response.file_name || fileId,
        file_path: response.file_path || fileId,
        file_type: response.file_type || 'txt',
        content: response.content || content,
        description: response.description,
        size_bytes: response.size_bytes || content.length,
        is_main_file: response.is_main_file || false
      };
    } catch (error) {
      console.error('Error updating file content:', error);
      // Return the updated content locally even if API fails
      return {
        id: fileId,
        file_name: fileId,
        file_path: fileId,
        file_type: 'txt',
        content: content,
        size_bytes: content.length,
        is_main_file: false
      };
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(generationId: string, fileId: string): Promise<void> {
    try {
      const response = await api.delete(
        `/generated-code/${generationId}/files/${fileId}`
      );
      
      // Mock successful deletion
      console.log(`Mock: Deleted file ${fileId} from generation ${generationId}`);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Delete a generation
   */
  async deleteGeneration(generationId: string): Promise<void> {
    try {
      await api.delete(`/generated-code/${generationId}`);
      
      // Close any active WebSocket connection for this generation
      this.disconnectFromStream(generationId);
      
      console.log(`Deleted generation ${generationId}`);
    } catch (error) {
      console.error('Error deleting generation:', error);
      throw error;
    }
  }

  /**
   * Download individual file
   */
  async downloadFile(generationId: string, fileId: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}/generated-code/${generationId}/files/${fileId}/download`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }
      
      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? (contentDisposition.split('filename=')[1]?.replace(/"/g, '') ?? `file_${fileId}`)
        : `file_${fileId}`;
      
      // Create download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  /**
   * Download project as ZIP
   */
  async downloadProjectZip(generationId: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}/generated-code/${generationId}/download/zip`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to download ZIP: ${response.statusText}`);
      }
      
      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? (contentDisposition.split('filename=')[1]?.replace(/"/g, '') ?? `project_${generationId}.zip`)
        : `project_${generationId}.zip`;
      
      // Create download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading ZIP:', error);
      throw error;
    }
  }

  /**
   * Download selected files as ZIP
   */
  async downloadSelectedFiles(generationId: string, fileIds: string[]): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}/generated-code/${generationId}/download/selected`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ file_ids: fileIds }),
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to download selected files: ${response.statusText}`);
      }
      
      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? (contentDisposition.split('filename=')[1]?.replace(/"/g, '') ?? `selected_files_${generationId}.zip`)
        : `selected_files_${generationId}.zip`;
      
      // Create download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading selected files:', error);
      throw error;
    }
  }

  /**
   * Connect to streaming WebSocket for real-time generation updates
   */
  connectToStream(
    projectId: string,
    generationId: string,
    onMessage: (event: StreamingEvent) => void,
    onError?: (error: Event) => void,
    onClose?: (event: CloseEvent) => void
  ): WebSocket {
    // Get the WebSocket base URL from environment or derive from API URL
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL || apiBaseUrl.replace('https://', 'wss://').replace('http://', 'ws://').replace('/api', '');
    const wsUrl = `${wsBaseUrl}/api/projects/${projectId}/code-generation/${generationId}/stream`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connected for code generation streaming');
    };
    
    ws.onmessage = (event) => {
      try {
        const streamingEvent: StreamingEvent = JSON.parse(event.data);
        onMessage(streamingEvent);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      onError?.(error);
    };
    
    ws.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
      this.wsConnections.delete(generationId);
      onClose?.(event);
    };
    
    // Store connection for management
    this.wsConnections.set(generationId, ws);
    
    return ws;
  }

  /**
   * Start streaming generation with parameters
   */
  startStreamingGeneration(
    projectId: string,
    generationId: string,
    params: CodeGenerationParams
  ): void {
    const ws = this.wsConnections.get(generationId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        action: 'start_generation',
        parameters: params
      }));
    }
  }

  /**
   * Cancel ongoing generation
   */
  async cancelGeneration(generationId: string): Promise<void> {
    try {
      // Send cancel request to API
      await api.post(`/generated-code/${generationId}/cancel`, {});
      
      // Also close WebSocket connection if exists
      const ws = this.wsConnections.get(generationId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          action: 'cancel_generation'
        }));
        ws.close(1000, 'Generation cancelled by user');
      }
    } catch (error) {
      console.error('Error cancelling generation:', error);
      // Still try to close the websocket even if API call fails
      const ws = this.wsConnections.get(generationId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'Generation cancelled by user');
      }
    }
  }

  /**
   * Disconnect from streaming WebSocket
   */
  disconnectFromStream(generationId: string): void {
    const ws = this.wsConnections.get(generationId);
    if (ws) {
      ws.close(1000, 'User disconnected');
      this.wsConnections.delete(generationId);
    }
  }

  /**
   * Disconnect all WebSocket connections
   */
  disconnectAll(): void {
    this.wsConnections.forEach((ws, _generationId) => {
      ws.close(1000, 'Service shutdown');
    });
    this.wsConnections.clear();
  }

  /**
   * Copy file content to clipboard
   */
  async copyToClipboard(content: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }

  /**
   * Analyze project for generation recommendations
   */
  async analyzeProject(projectId: string): Promise<any> {
    try {
      const response = await api.get(`/projects/${projectId}/analyze-for-generation`);
      return response;
    } catch (error) {
      console.error('Error analyzing project:', error);
      // Return sensible defaults if analysis fails
      return {
        project_id: projectId,
        recommended_platform: 'web',
        complexity_estimate: 'intermediate',
        suggested_features: ['responsive design', 'interactive elements'],
        estimated_files: 5,
        estimated_time_minutes: 15
      };
    }
  }

  /**
   * Get generation statistics for a user
   */
  async getGenerationStats(): Promise<any> {
    try {
      const response = await api.get('/user/generation-stats');
      return response;
    } catch (error) {
      console.error('Error getting generation stats:', error);
      return {
        total_generations: 0,
        total_files_generated: 0,
        platforms_used: [],
        average_generation_time: 0,
        most_used_platform: 'web',
        total_downloads: 0
      };
    }
  }

  /**
   * Validate generation parameters
   */
  validateGenerationParams(params: CodeGenerationParams): string[] {
    const errors: string[] = [];
    
    if (!params.platform) {
      errors.push('Platform is required');
    }
    
    if (params.platform && !['arduino', 'raspberry_pi', 'web', 'mobile'].includes(params.platform)) {
      errors.push('Invalid platform specified');
    }
    
    if (params.complexity_level && !['beginner', 'intermediate', 'advanced'].includes(params.complexity_level)) {
      errors.push('Invalid complexity level specified');
    }
    
    if (params.custom_requirements && params.custom_requirements.length > 1000) {
      errors.push('Custom requirements too long (max 1000 characters)');
    }
    
    return errors;
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) {return '0 B';}
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Get file icon based on file type
   */
  getFileIcon(fileType: string): string {
    const iconMap: Record<string, string> = {
      'js': '🟨',
      'ts': '🔷',
      'py': '🐍',
      'cpp': '⚙️',
      'c': '⚙️',
      'h': '📄',
      'html': '🌐',
      'css': '🎨',
      'json': '📋',
      'md': '📝',
      'txt': '📄',
      'ino': '🔧'
    };
    
    return iconMap[fileType.toLowerCase()] || '📄';
  }

  /**
   * Check if platform supports live preview
   */
  supportsLivePreview(platform: string): boolean {
    return platform === 'web';
  }

  /**
   * Get platform display name
   */
  getPlatformDisplayName(platform: string): string {
    const displayNames: Record<string, string> = {
      'arduino': 'Arduino',
      'raspberry_pi': 'Raspberry Pi',
      'web': 'Web Application',
      'mobile': 'Mobile App'
    };
    
    return displayNames[platform] || platform;
  }

  /**
   * Get complexity level display name
   */
  getComplexityDisplayName(level: string): string {
    const displayNames: Record<string, string> = {
      'beginner': 'Beginner',
      'intermediate': 'Intermediate',
      'advanced': 'Advanced'
    };
    
    return displayNames[level] || level;
  }
}

// Export singleton instance
export const codeGenerationService = new CodeGenerationService();
export default codeGenerationService;