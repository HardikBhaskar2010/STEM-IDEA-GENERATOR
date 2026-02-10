'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  File, 
  Folder, 
  FolderOpen,
  Code,
  FileText,
  Image,
  Settings,
  Download,
  Copy,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  Move
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface CodeFile {
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

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  file?: CodeFile;
  children?: FileNode[];
  isExpanded?: boolean;
}

interface FileTreeViewProps {
  files: CodeFile[];
  selectedFile: CodeFile | null;
  onFileSelect: (file: CodeFile) => void;
  onFileOperation: (operation: 'view' | 'edit' | 'download' | 'copy' | 'delete' | 'move', file: CodeFile, targetPath?: string) => void;
  className?: string;
  enableDragDrop?: boolean;
}

const FileTreeView: React.FC<FileTreeViewProps> = ({
  files,
  selectedFile,
  onFileSelect,
  onFileOperation,
  className,
  enableDragDrop = false
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set([''])); // Root is expanded by default
  const [draggedFile, setDraggedFile] = useState<CodeFile | null>(null);
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);

  // Build file tree structure from flat file list
  const fileTree = useMemo(() => {
    const root: FileNode = {
      name: 'root',
      path: '',
      type: 'folder',
      children: [],
      isExpanded: true
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
            children: [],
            isExpanded: expandedFolders.has(folderPath)
          };
          currentNode.children?.push(folderNode);
        }

        currentNode = folderNode;
      }

      // Add file to current folder
      const fileName = pathParts[pathParts.length - 1] || file.file_name;
      const fileNode: FileNode = {
        name: fileName,
        path: file.file_path,
        type: 'file',
        file: file
      };

      currentNode.children?.push(fileNode);
    });

    // Sort children: folders first, then files, both alphabetically
    const sortChildren = (node: FileNode) => {
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
  }, [files, expandedFolders]);

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath);
      } else {
        newSet.add(folderPath);
      }
      return newSet;
    });
  };

  const getFileIcon = (fileType: string, isMainFile: boolean = false) => {
    if (isMainFile) {
      return <Code className="w-4 h-4 text-purple-400" />;
    }

    switch (fileType.toLowerCase()) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return <Code className="w-4 h-4 text-yellow-400" />;
      case 'py':
        return <Code className="w-4 h-4 text-blue-400" />;
      case 'cpp':
      case 'c':
      case 'h':
      case 'ino':
        return <Code className="w-4 h-4 text-green-400" />;
      case 'html':
        return <Code className="w-4 h-4 text-orange-400" />;
      case 'css':
        return <Code className="w-4 h-4 text-blue-300" />;
      case 'json':
      case 'yaml':
      case 'yml':
        return <Settings className="w-4 h-4 text-gray-400" />;
      case 'md':
      case 'txt':
        return <FileText className="w-4 h-4 text-gray-300" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return <Image className="w-4 h-4 text-pink-400" />;
      default:
        return <File className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, file: CodeFile) => {
    if (!enableDragDrop) return;
    setDraggedFile(file);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', file.id);
  }, [enableDragDrop]);

  const handleDragOver = useCallback((e: React.DragEvent, targetPath: string) => {
    if (!enableDragDrop || !draggedFile) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverPath(targetPath);
  }, [enableDragDrop, draggedFile]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!enableDragDrop) return;
    // Only clear drag over if we're leaving the entire component
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverPath(null);
    }
  }, [enableDragDrop]);

  const handleDrop = useCallback((e: React.DragEvent, targetPath: string) => {
    if (!enableDragDrop || !draggedFile) return;
    e.preventDefault();
    
    // Don't allow dropping on the same path
    if (draggedFile.file_path === targetPath) {
      setDraggedFile(null);
      setDragOverPath(null);
      return;
    }

    onFileOperation('move', draggedFile, targetPath);
    setDraggedFile(null);
    setDragOverPath(null);
  }, [enableDragDrop, draggedFile, onFileOperation]);

  const handleDragEnd = useCallback(() => {
    setDraggedFile(null);
    setDragOverPath(null);
  }, []);

  const renderNode = (node: FileNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = node.file && selectedFile?.id === node.file.id;
    const isDraggedOver = dragOverPath === node.path;
    const isDragging = draggedFile?.id === node.file?.id;

    if (node.type === 'folder') {
      return (
        <div key={node.path}>
          <div
            className={cn(
              "flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer hover:bg-white/5 transition-colors",
              "text-white/80 hover:text-white",
              isDraggedOver && enableDragDrop && "bg-purple-500/20 border border-purple-500/50"
            )}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            onClick={() => toggleFolder(node.path)}
            onDragOver={(e) => handleDragOver(e, node.path)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, node.path)}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-white/60" />
            ) : (
              <ChevronRight className="w-4 h-4 text-white/60" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-blue-400" />
            ) : (
              <Folder className="w-4 h-4 text-blue-400" />
            )}
            <span className="text-sm font-medium">{node.name}</span>
            {node.children && (
              <Badge variant="secondary" className="ml-auto text-xs bg-white/10 text-white/60">
                {node.children.filter(child => child.type === 'file').length}
              </Badge>
            )}
            {isDraggedOver && enableDragDrop && (
              <Move className="w-4 h-4 text-purple-400 ml-2" />
            )}
          </div>
          {isExpanded && node.children && (
            <div>
              {node.children.map(child => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // File node
    if (!node.file) return null;

    return (
      <div
        key={node.file.id}
        className={cn(
          "flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer transition-colors group",
          isSelected 
            ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30" 
            : "hover:bg-white/5",
          "text-white/80 hover:text-white",
          isDragging && "opacity-50",
          isDraggedOver && enableDragDrop && "bg-purple-500/10 border border-purple-500/30"
        )}
        style={{ paddingLeft: `${depth * 16 + 24}px` }}
        onClick={() => onFileSelect(node.file!)}
        draggable={enableDragDrop}
        onDragStart={(e) => handleDragStart(e, node.file!)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOver(e, node.path)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, node.path)}
      >
        {getFileIcon(node.file.file_type, node.file.is_main_file)}
        <span className="text-sm flex-1 truncate">{node.name}</span>
        
        {/* File badges */}
        <div className="flex items-center gap-1">
          {node.file.is_main_file && (
            <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-300 border-purple-500/30">
              Main
            </Badge>
          )}
          {node.file.is_modified && (
            <Badge variant="secondary" className="text-xs bg-orange-500/20 text-orange-300 border-orange-500/30">
              Modified
            </Badge>
          )}
          <span className="text-xs text-white/40">
            {formatFileSize(node.file.size_bytes)}
          </span>
        </div>

        {/* File operations dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto w-auto hover:bg-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="bg-black/90 backdrop-blur-xl border-white/10"
          >
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                onFileOperation('view', node.file!);
              }}
              className="text-white hover:bg-white/10"
            >
              <Eye className="w-4 h-4 mr-2" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                onFileOperation('edit', node.file!);
              }}
              className="text-white hover:bg-white/10"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                onFileOperation('copy', node.file!);
              }}
              className="text-white hover:bg-white/10"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Content
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                onFileOperation('download', node.file!);
              }}
              className="text-white hover:bg-white/10"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                onFileOperation('delete', node.file!);
              }}
              className="text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  if (files.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)}>
        <Folder className="w-12 h-12 text-white/20 mb-4" />
        <h3 className="text-lg font-medium text-white/60 mb-2">No Files Generated</h3>
        <p className="text-sm text-white/40">
          Generated files will appear here once code generation is complete.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-white">Project Files</span>
          <Badge variant="secondary" className="text-xs bg-white/10 text-white/60">
            {files.length}
          </Badge>
        </div>
        <div className="text-xs text-white/40">
          {formatFileSize(files.reduce((total, file) => total + file.size_bytes, 0))}
        </div>
      </div>

      {/* File tree */}
      <div className="space-y-0.5">
        {fileTree.map(node => renderNode(node))}
      </div>

      {/* Selected file info */}
      {selectedFile && (
        <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            {getFileIcon(selectedFile.file_type, selectedFile.is_main_file)}
            <span className="text-sm font-medium text-white">{selectedFile.file_name}</span>
          </div>
          {selectedFile.description && (
            <p className="text-xs text-white/60 mb-2">{selectedFile.description}</p>
          )}
          <div className="flex items-center gap-4 text-xs text-white/40">
            <span>Type: {selectedFile.file_type.toUpperCase()}</span>
            <span>Size: {formatFileSize(selectedFile.size_bytes)}</span>
            <span>Lines: {selectedFile.content.split('\n').length}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileTreeView;