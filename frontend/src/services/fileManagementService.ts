// Real API service for file management
// Connected to backend API endpoints

import { CodeFile } from './codeGenerationService';
import { 
  withRetry, 
  withTimeout, 
  ServiceError, 
  ErrorContext, 
  errorLogger,
  withFallback,
  DEFAULT_RETRY_OPTIONS
} from '@/utils/errorHandler';

// Real API functions
const api = {
  async get(endpoint: string): Promise<any> {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  },
  
  async post(endpoint: string, data?: any): Promise<any> {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
};

// Types
export interface FileMetadata {
  id: string;
  code_file_id: string;
  download_count: number;
  last_downloaded_at?: string;
  is_modified: boolean;
  original_content?: string;
  modification_history: FileModification[];
}

export interface FileModification {
  user_id: string;
  timestamp: string;
  change_description?: string;
  content_hash: string;
  content_length: number;
}

export interface FileOperation {
  operation_type: string;
  file_id: string;
  user_id: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface FileStats {
  total_generations: number;
  total_files: number;
  total_downloads: number;
  platforms_used: string[];
  file_types: Record<string, number>;
  total_size_bytes: number;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  file?: CodeFile;
  children?: FileTreeNode[];
  isExpanded?: boolean;
}

class FileManagementService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  }

  /**
   * Get file metadata including download count and modification history
   */
  async getFileMetadata(fileId: string): Promise<FileMetadata | null> {
    try {
      const response = await api.get(`/files/${fileId}/metadata`);
      return response;
    } catch (error) {
      console.error('Error getting file metadata:', error);
      return null;
    }
  }

  /**
   * Get modification history for a file
   */
  async getModificationHistory(fileId: string): Promise<FileModification[]> {
    try {
      const metadata = await this.getFileMetadata(fileId);
      return metadata?.modification_history || [];
    } catch (error) {
      console.error('Error getting modification history:', error);
      return [];
    }
  }

  /**
   * Track file download for analytics
   */
  async trackFileDownload(fileId: string): Promise<void> {
    try {
      const response = await api.post(`/files/${fileId}/track-download`);
      console.log(`Tracked download for file ${fileId}`);
    } catch (error) {
      console.warn('Error tracking file download:', error);
    }
  }

  /**
   * Copy file content to clipboard
   */
  async copyFileToClipboard(file: CodeFile): Promise<void> {
    try {
      await navigator.clipboard.writeText(file.content);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = file.content;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }

  /**
   * Copy multiple files to clipboard with separators
   */
  async copyMultipleFilesToClipboard(files: CodeFile[]): Promise<void> {
    const content = files.map(file => 
      `// ===== ${file.file_name} =====\n${file.content}\n\n`
    ).join('');
    
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = content;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }

  /**
   * Download individual file
   */
  async downloadFile(file: CodeFile): Promise<void> {
    const context: ErrorContext = {
      operation: 'downloadFile',
      service: 'fileManagementService',
      timestamp: new Date()
    };

    try {
      await withRetry(async () => {
        // Track download with fallback
        await withFallback(
          () => this.trackFileDownload(file.id),
          () => Promise.resolve(), // Fallback: don't track if service fails
          context
        );
        
        // Create and trigger download
        const blob = new Blob([file.content], { 
          type: this.getContentType(file.file_type) 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.file_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        errorLogger.info(`File downloaded: ${file.file_name}`, context);
      }, {
        maxAttempts: 2, // Don't retry downloads too much
        retryCondition: (error) => {
          // Only retry on specific errors, not user cancellation
          return !error.message.includes('user') && !error.message.includes('cancel');
        }
      });
    } catch (error) {
      const serviceError = new ServiceError(
        `Failed to download file: ${file.file_name}`,
        'FILE_DOWNLOAD_FAILED',
        context,
        error instanceof Error ? error : undefined,
        false // Downloads are usually not retryable
      );
      
      errorLogger.error(serviceError.message, context, serviceError);
      throw serviceError;
    }
  }

  /**
   * Download multiple files as individual downloads
   */
  async downloadMultipleFiles(files: CodeFile[]): Promise<void> {
    for (const file of files) {
      await this.downloadFile(file);
      // Small delay between downloads to avoid browser blocking
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Create and download ZIP archive from files
   */
  async createAndDownloadZip(
    files: CodeFile[], 
    zipName: string = 'files.zip',
    includeReadme: boolean = true
  ): Promise<void> {
    try {
      // Dynamic import for JSZip to reduce bundle size
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      // Add files to ZIP
      files.forEach(file => {
        zip.file(file.file_path, file.content);
      });
      
      // Add README if requested
      if (includeReadme) {
        const readme = this.generateReadmeContent(files);
        zip.file('README.md', readme);
      }
      
      // Generate ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Download ZIP
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = zipName.endsWith('.zip') ? zipName : `${zipName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error creating ZIP:', error);
      throw error;
    }
  }

  /**
   * Validate file content
   */
  validateFileContent(file: CodeFile): FileValidationResult {
    const result: FileValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check file size
    if (file.size_bytes > 10 * 1024 * 1024) { // 10MB limit
      result.errors.push('File size exceeds 10MB limit');
      result.isValid = false;
    }

    // Check for empty content
    if (!file.content.trim()) {
      result.warnings.push('File appears to be empty');
    }

    // Basic syntax validation based on file type
    switch (file.file_type.toLowerCase()) {
      case 'json':
        try {
          JSON.parse(file.content);
        } catch (error) {
          result.errors.push('Invalid JSON syntax');
          result.isValid = false;
        }
        break;
        
      case 'js':
      case 'jsx':
        // Basic JavaScript validation
        if (file.content.includes('eval(') || file.content.includes('Function(')) {
          result.warnings.push('File contains potentially unsafe JavaScript functions');
        }
        break;
        
      case 'html':
        // Basic HTML validation
        if (!file.content.includes('<') || !file.content.includes('>')) {
          result.warnings.push('File does not appear to contain valid HTML');
        }
        break;
    }

    // Check for suspicious content
    const suspiciousPatterns = [
      /password\s*=\s*["'][^"']+["']/i,
      /api[_-]?key\s*=\s*["'][^"']+["']/i,
      /secret\s*=\s*["'][^"']+["']/i
    ];

    suspiciousPatterns.forEach(pattern => {
      if (pattern.test(file.content)) {
        result.warnings.push('File may contain sensitive information (passwords, API keys, etc.)');
      }
    });

    return result;
  }

  /**
   * Build file tree structure from flat file list
   */
  buildFileTree(files: CodeFile[]): FileTreeNode[] {
    const root: FileTreeNode = {
      name: 'root',
      path: '',
      type: 'folder',
      children: []
    };

    files.forEach(file => {
      const pathParts = file.file_path.split('/').filter(part => part.length > 0);
      let currentNode = root;

      // Navigate/create folder structure
      for (let i = 0; i < pathParts.length - 1; i++) {
        const folderName = pathParts[i];
        const folderPath = pathParts.slice(0, i + 1).join('/');
        
        let folderNode = currentNode.children?.find(
          child => child.name === folderName && child.type === 'folder'
        );

        if (!folderNode) {
          folderNode = {
            name: folderName,
            path: folderPath,
            type: 'folder',
            children: []
          };
          currentNode.children?.push(folderNode);
        }

        currentNode = folderNode;
      }

      // Add file to current folder
      const fileName = pathParts[pathParts.length - 1] || file.file_name;
      const fileNode: FileTreeNode = {
        name: fileName,
        path: file.file_path,
        type: 'file',
        file: file
      };

      currentNode.children?.push(fileNode);
    });

    // Sort children: folders first, then files, both alphabetically
    const sortChildren = (node: FileTreeNode) => {
      if (node.children) {
        node.children.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'folder' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
        node.children.forEach(sortChildren);
      }
    };

    sortChildren(root);
    return root.children || [];
  }

  /**
   * Search files by name or content
   */
  searchFiles(files: CodeFile[], query: string): CodeFile[] {
    const lowerQuery = query.toLowerCase();
    
    return files.filter(file => {
      // Search in filename
      if (file.file_name.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      
      // Search in file path
      if (file.file_path.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      
      // Search in content
      if (file.content.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      
      return false;
    });
  }

  /**
   * Filter files by type
   */
  filterFilesByType(files: CodeFile[], fileTypes: string[]): CodeFile[] {
    const lowerTypes = fileTypes.map(type => type.toLowerCase());
    return files.filter(file => lowerTypes.includes(file.file_type.toLowerCase()));
  }

  /**
   * Get file statistics
   */
  getFileStatistics(files: CodeFile[]): FileStats {
    const stats: FileStats = {
      total_generations: 1, // Assuming single generation context
      total_files: files.length,
      total_downloads: 0, // Would need to fetch from metadata
      platforms_used: [],
      file_types: {},
      total_size_bytes: 0
    };

    files.forEach(file => {
      // Count file types
      const fileType = file.file_type.toLowerCase();
      stats.file_types[fileType] = (stats.file_types[fileType] || 0) + 1;
      
      // Sum file sizes
      stats.total_size_bytes += file.size_bytes;
    });

    return stats;
  }

  /**
   * Generate README content for files
   */
  private generateReadmeContent(files: CodeFile[]): string {
    const stats = this.getFileStatistics(files);
    const mainFiles = files.filter(f => f.is_main_file);
    
    const readme = [
      '# Generated Code Project',
      '',
      `Generated on: ${new Date().toISOString().split('T')[0]}`,
      `Total files: ${files.length}`,
      `Total size: ${this.formatFileSize(stats.total_size_bytes)}`,
      '',
      '## Files',
      ''
    ];

    // List main files first
    if (mainFiles.length > 0) {
      readme.push('### Main Files');
      mainFiles.forEach(file => {
        readme.push(`- **${file.file_name}** - ${file.description || 'Main project file'}`);
      });
      readme.push('');
    }

    // List other files
    const otherFiles = files.filter(f => !f.is_main_file);
    if (otherFiles.length > 0) {
      readme.push('### Other Files');
      otherFiles.forEach(file => {
        readme.push(`- \`${file.file_name}\` - ${file.description || 'Generated file'}`);
      });
      readme.push('');
    }

    // File type breakdown
    readme.push('### File Types');
    Object.entries(stats.file_types).forEach(([type, count]) => {
      readme.push(`- ${type.toUpperCase()}: ${count} file${count > 1 ? 's' : ''}`);
    });

    readme.push('');
    readme.push('## Notes');
    readme.push('This project was generated using AI assistance.');
    readme.push('Please review and test the code before using in production.');

    return readme.join('\n');
  }

  /**
   * Get content type for file download
   */
  private getContentType(fileType: string): string {
    const contentTypes: Record<string, string> = {
      'js': 'application/javascript',
      'ts': 'application/typescript',
      'jsx': 'application/javascript',
      'tsx': 'application/typescript',
      'py': 'text/x-python',
      'cpp': 'text/x-c++src',
      'c': 'text/x-csrc',
      'h': 'text/x-chdr',
      'html': 'text/html',
      'css': 'text/css',
      'json': 'application/json',
      'md': 'text/markdown',
      'txt': 'text/plain',
      'ino': 'text/x-arduino',
      'yaml': 'application/x-yaml',
      'yml': 'application/x-yaml'
    };

    return contentTypes[fileType.toLowerCase()] || 'text/plain';
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
   * Get file icon emoji based on file type
   */
  getFileIcon(fileType: string): string {
    const iconMap: Record<string, string> = {
      'js': '🟨',
      'jsx': '🟨',
      'ts': '🔷',
      'tsx': '🔷',
      'py': '🐍',
      'cpp': '⚙️',
      'c': '⚙️',
      'h': '📄',
      'html': '🌐',
      'css': '🎨',
      'json': '📋',
      'md': '📝',
      'txt': '📄',
      'ino': '🔧',
      'yaml': '⚙️',
      'yml': '⚙️'
    };

    return iconMap[fileType.toLowerCase()] || '📄';
  }

  /**
   * Check if file type supports syntax highlighting
   */
  supportsSyntaxHighlighting(fileType: string): boolean {
    const supportedTypes = [
      'js', 'jsx', 'ts', 'tsx', 'py', 'cpp', 'c', 'h', 
      'html', 'css', 'json', 'md', 'ino', 'yaml', 'yml'
    ];
    
    return supportedTypes.includes(fileType.toLowerCase());
  }

  /**
   * Get language identifier for syntax highlighting
   */
  getSyntaxLanguage(fileType: string): string {
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'cpp': 'cpp',
      'c': 'c',
      'h': 'c',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'ino': 'cpp', // Arduino uses C++ syntax
      'yaml': 'yaml',
      'yml': 'yaml'
    };

    return languageMap[fileType.toLowerCase()] || 'text';
  }

  /**
   * Estimate reading time for file content
   */
  estimateReadingTime(content: string): number {
    const wordsPerMinute = 200;
    const words = content.split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  }

  /**
   * Get file complexity score (simple heuristic)
   */
  getComplexityScore(file: CodeFile): number {
    const lines = file.content.split('\n').length;
    const functions = (file.content.match(/function|def |class /g) || []).length;
    const comments = (file.content.match(/\/\/|\/\*|#/g) || []).length;
    
    // Simple complexity score based on lines, functions, and comment ratio
    const baseScore = Math.min(lines / 10, 10);
    const functionBonus = Math.min(functions * 2, 5);
    const commentPenalty = Math.max(0, 2 - (comments / lines) * 10);
    
    return Math.round(baseScore + functionBonus + commentPenalty);
  }

  /**
   * Check if file has been modified
   */
  async isFileModified(fileId: string): Promise<boolean> {
    try {
      const metadata = await this.getFileMetadata(fileId);
      return metadata?.is_modified || false;
    } catch (error) {
      console.error('Error checking file modification status:', error);
      return false;
    }
  }

  /**
   * Revert file to original content
   */
  async revertFileToOriginal(fileId: string): Promise<string | null> {
    try {
      const metadata = await this.getFileMetadata(fileId);
      return metadata?.original_content || null;
    } catch (error) {
      console.error('Error getting original file content:', error);
      return null;
    }
  }
}

// Export singleton instance
export const fileManagementService = new FileManagementService();
export default fileManagementService;