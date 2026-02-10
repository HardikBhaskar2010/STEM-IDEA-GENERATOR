'use client';

import { useState, useCallback } from 'react';
import { fileManagementService } from '@/services/fileManagementService';
import { toast } from '@/hooks/use-toast';

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

export interface FileOperation {
  type: 'view' | 'edit' | 'download' | 'copy' | 'delete' | 'move';
  file: CodeFile;
  targetPath?: string;
}

interface UseFileOperationsReturn {
  // State
  selectedFile: CodeFile | null;
  isLoading: boolean;
  error: string | null;
  
  // File selection
  selectFile: (file: CodeFile | null) => void;
  
  // File operations
  copyFileContent: (file: CodeFile) => Promise<void>;
  downloadFile: (file: CodeFile) => Promise<void>;
  downloadProjectZip: (generationId: string, projectName?: string) => Promise<void>;
  updateFileContent: (fileId: string, content: string) => Promise<CodeFile | null>;
  deleteFile: (fileId: string) => Promise<void>;
  moveFile: (fileId: string, targetPath: string) => Promise<void>;
  
  // Batch operations
  downloadMultipleFiles: (files: CodeFile[]) => Promise<void>;
  
  // Utility
  clearError: () => void;
  getFileIcon: (fileType: string, isMainFile?: boolean) => string;
  formatFileSize: (bytes: number) => string;
}

export const useFileOperations = (): UseFileOperationsReturn => {
  const [selectedFile, setSelectedFile] = useState<CodeFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Select file
  const selectFile = useCallback((file: CodeFile | null) => {
    setSelectedFile(file);
  }, []);

  // Copy file content to clipboard
  const copyFileContent = useCallback(async (file: CodeFile) => {
    try {
      await navigator.clipboard.writeText(file.content);
      
      toast({
        title: "Content Copied",
        description: `${file.file_name} content copied to clipboard.`,
      });
    } catch (err) {
      const errorMessage = 'Failed to copy content to clipboard';
      setError(errorMessage);
      
      toast({
        title: "Copy Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, []);

  // Download individual file
  const downloadFile = useCallback(async (file: CodeFile) => {
    try {
      setIsLoading(true);
      
      const blob = new Blob([file.content], { 
        type: getContentType(file.file_type) 
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      // Track download
      await fileManagementService.trackFileDownload(file.id);
      
      toast({
        title: "File Downloaded",
        description: `${file.file_name} has been downloaded.`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download file';
      setError(errorMessage);
      
      toast({
        title: "Download Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Download project as ZIP
  const downloadProjectZip = useCallback(async (generationId: string, projectName = 'project') => {
    try {
      setIsLoading(true);
      
      const zipBlob = await fileManagementService.downloadProjectZip(generationId);
      
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectName}-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Project Downloaded",
        description: `${projectName} project has been downloaded as ZIP.`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download project';
      setError(errorMessage);
      
      toast({
        title: "Download Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update file content
  const updateFileContent = useCallback(async (fileId: string, content: string): Promise<CodeFile | null> => {
    try {
      setIsLoading(true);
      
      const updatedFile = await fileManagementService.updateFileContent(fileId, content);
      
      // Update selected file if it's the same one
      if (selectedFile?.id === fileId) {
        setSelectedFile(updatedFile);
      }
      
      toast({
        title: "File Updated",
        description: "File content has been saved successfully.",
      });
      
      return updatedFile;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update file';
      setError(errorMessage);
      
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile]);

  // Delete file
  const deleteFile = useCallback(async (fileId: string) => {
    try {
      setIsLoading(true);
      
      await fileManagementService.deleteFile(fileId);
      
      // Clear selected file if it was deleted
      if (selectedFile?.id === fileId) {
        setSelectedFile(null);
      }
      
      toast({
        title: "File Deleted",
        description: "File has been removed from the project.",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete file';
      setError(errorMessage);
      
      toast({
        title: "Delete Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile]);

  // Move file to different path
  const moveFile = useCallback(async (fileId: string, targetPath: string) => {
    try {
      setIsLoading(true);
      
      const updatedFile = await fileManagementService.moveFile(fileId, targetPath);
      
      // Update selected file if it's the same one
      if (selectedFile?.id === fileId) {
        setSelectedFile(updatedFile);
      }
      
      toast({
        title: "File Moved",
        description: `File moved to ${targetPath}`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to move file';
      setError(errorMessage);
      
      toast({
        title: "Move Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile]);

  // Download multiple files as ZIP
  const downloadMultipleFiles = useCallback(async (files: CodeFile[]) => {
    try {
      setIsLoading(true);
      
      // Create a simple ZIP-like structure
      const fileContents = files.map(file => ({
        name: file.file_name,
        content: file.content,
        path: file.file_path
      }));
      
      // For now, download as individual files
      // In a real implementation, you'd create a proper ZIP
      for (const file of files) {
        await downloadFile(file);
      }
      
      toast({
        title: "Files Downloaded",
        description: `${files.length} files have been downloaded.`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download files';
      setError(errorMessage);
      
      toast({
        title: "Download Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [downloadFile]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get file icon based on type
  const getFileIcon = useCallback((fileType: string, isMainFile = false): string => {
    if (isMainFile) return '⭐';
    
    switch (fileType.toLowerCase()) {
      case 'js':
      case 'jsx': return '🟨';
      case 'ts':
      case 'tsx': return '🔷';
      case 'py': return '🐍';
      case 'cpp':
      case 'c':
      case 'h':
      case 'ino': return '⚙️';
      case 'html': return '🌐';
      case 'css': return '🎨';
      case 'json': return '📋';
      case 'md': return '📝';
      case 'txt': return '📄';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg': return '🖼️';
      default: return '📁';
    }
  }, []);

  // Format file size
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, []);

  return {
    // State
    selectedFile,
    isLoading,
    error,
    
    // File selection
    selectFile,
    
    // File operations
    copyFileContent,
    downloadFile,
    downloadProjectZip,
    updateFileContent,
    deleteFile,
    moveFile,
    
    // Batch operations
    downloadMultipleFiles,
    
    // Utility
    clearError,
    getFileIcon,
    formatFileSize
  };
};

// Helper function to get content type for file download
function getContentType(fileType: string): string {
  switch (fileType.toLowerCase()) {
    case 'js':
    case 'jsx': return 'application/javascript';
    case 'ts':
    case 'tsx': return 'application/typescript';
    case 'py': return 'text/x-python';
    case 'cpp':
    case 'c': return 'text/x-c++src';
    case 'h': return 'text/x-chdr';
    case 'ino': return 'text/x-arduino';
    case 'html': return 'text/html';
    case 'css': return 'text/css';
    case 'json': return 'application/json';
    case 'md': return 'text/markdown';
    case 'txt': return 'text/plain';
    default: return 'text/plain';
  }
}