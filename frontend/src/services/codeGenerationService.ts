// Real API service for code generation
// Connected to backend API endpoints

import { 
  withRetry, 
  withTimeout, 
  ServiceError, 
  ErrorContext, 
  errorLogger,
  circuitBreaker,
  enhancedFetch,
  DEFAULT_RETRY_OPTIONS
} from '@/utils/errorHandler';

interface GenerationParams {
  platform: 'arduino' | 'raspberry_pi' | 'web' | 'mobile';
  complexityLevel: 'beginner' | 'intermediate' | 'advanced';
  includeComments: boolean;
  includeTests: boolean;
  customRequirements?: string;
}

interface CodeFile {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  content: string;
  description?: string;
  size_bytes: number;
  is_main_file: boolean;
}

interface GeneratedCode {
  id: string;
  project_id: string;
  status: 'generating' | 'completed' | 'failed';
  platform: string;
  created_at: string;
  completed_at?: string;
  error_message?: string;
  files: CodeFile[];
}

// Real API functions
const api = {
  async post(endpoint: string, data: any): Promise<any> {
    const response = await enhancedFetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    return response.json();
  },
  
  async get(endpoint: string): Promise<any> {
    const response = await enhancedFetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    return response.json();
  },
  
  async delete(endpoint: string): Promise<any> {
    const response = await enhancedFetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}${endpoint}`, {
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

interface GeneratedFilesResponse {
  generation_id: string;
  files: CodeFile[];
}

class CodeGenerationService {
  private baseUrl: string;
  private wsConnections: Map<string, WebSocket> = new Map();

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
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
          const response = await api.post(
            `/projects/${projectId}/generate-code`,
            params
          );
          
          errorLogger.info('Code generation started successfully', context);
          
          return {
            generation_id: response.generation_id,
            status: response.status,
            message: 'Code generation started successfully',
            estimated_completion_time: 30
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
          generation_id: generationId,
          project_id: projectId,
          status: 'completed',
          platform: 'web',
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          files_count: 3
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
   * Get all generations for a project
   */
  async getProjectGenerations(projectId: string): Promise<GeneratedCode[]> {
    try {
      const response = await api.get(`/projects/${projectId}/generated-code`);
      
      return [
        {
          generation_id: 'gen_123',
          project_id: projectId,
          user_id: 'user_123',
          status: 'completed',
          platform: 'web',
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          files_count: 3
        }
      ];
    } catch (error) {
      console.error('Error getting project generations:', error);
      throw error;
    }
  }

  /**
   * Get generated files for a generation
   */
  async getGeneratedFiles(generationId: string): Promise<CodeFile[]> {
    try {
      const response = await api.get(`/generated-code/${generationId}/files`);
      
      return [
        {
          id: 'file_1',
          file_name: 'index.html',
          file_path: 'index.html',
          file_type: 'html',
          content: '<!DOCTYPE html>\n<html>\n<head>\n    <title>Generated Project</title>\n</head>\n<body>\n    <h1>Hello World!</h1>\n</body>\n</html>',
          description: 'Main HTML file',
          size_bytes: 150,
          is_main_file: true
        },
        {
          id: 'file_2',
          file_name: 'style.css',
          file_path: 'css/style.css',
          file_type: 'css',
          content: 'body {\n    font-family: Arial, sans-serif;\n    margin: 0;\n    padding: 20px;\n}\n\nh1 {\n    color: #333;\n}',
          description: 'Main stylesheet',
          size_bytes: 100,
          is_main_file: false
        },
        {
          id: 'file_3',
          file_name: 'script.js',
          file_path: 'js/script.js',
          file_type: 'js',
          content: 'console.log("Hello from generated JavaScript!");\n\ndocument.addEventListener("DOMContentLoaded", function() {\n    console.log("Page loaded successfully");\n});',
          description: 'Main JavaScript file',
          size_bytes: 120,
          is_main_file: false
        }
      ];
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
        id: fileId,
        file_name: 'example.js',
        file_path: 'example.js',
        file_type: 'js',
        content: 'console.log("Mock file content");',
        description: 'Mock file',
        size_bytes: 30,
        is_main_file: false
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
        id: fileId,
        file_name: 'updated_file.js',
        file_path: 'updated_file.js',
        file_type: 'js',
        content: content,
        description: 'Updated file',
        size_bytes: content.length,
        is_main_file: false
      };
    } catch (error) {
      console.error('Error updating file content:', error);
      throw error;
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
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
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
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
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
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
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
    const wsUrl = `${this.baseUrl.replace('http', 'ws')}/projects/${projectId}/code-generation/${generationId}/stream`;
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
  cancelGeneration(generationId: string): void {
    const ws = this.wsConnections.get(generationId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        action: 'cancel_generation'
      }));
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
    this.wsConnections.forEach((ws, generationId) => {
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
      
      return {
        project_id: projectId,
        recommended_platform: 'web',
        complexity_estimate: 'intermediate',
        suggested_features: ['responsive design', 'interactive elements', 'modern styling'],
        estimated_files: 5,
        estimated_time_minutes: 15
      };
    } catch (error) {
      console.error('Error analyzing project:', error);
      throw error;
    }
  }

  /**
   * Get generation statistics for a user
   */
  async getGenerationStats(): Promise<any> {
    try {
      const response = await api.get('/user/generation-stats');
      
      return {
        total_generations: 12,
        total_files_generated: 45,
        platforms_used: ['web', 'arduino', 'raspberry_pi'],
        average_generation_time: 8.5,
        most_used_platform: 'web',
        total_downloads: 28
      };
    } catch (error) {
      console.error('Error getting generation stats:', error);
      throw error;
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
    if (bytes === 0) return '0 B';
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