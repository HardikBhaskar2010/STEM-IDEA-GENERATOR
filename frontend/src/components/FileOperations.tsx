import React, { useState } from 'react';
import { 
  Copy, 
  Download, 
  Share2, 
  Archive, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  Trash2,
  Edit,
  Eye,
  MoreHorizontal,
  FolderDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
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

interface FileOperationsProps {
  files: CodeFile[];
  selectedFiles?: CodeFile[];
  onFileOperation: (operation: string, file: CodeFile | CodeFile[], options?: any) => Promise<void>;
  generationId?: string;
  projectName?: string;
  className?: string;
}

type OperationStatus = 'idle' | 'loading' | 'success' | 'error';

const FileOperations: React.FC<FileOperationsProps> = ({
  files,
  selectedFiles = [],
  onFileOperation,
  generationId,
  projectName = 'Generated Project',
  className
}) => {
  const [operationStatus, setOperationStatus] = useState<Record<string, OperationStatus>>({});
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    includeReadme: true,
    zipName: `${projectName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`,
    description: ''
  });

  const { toast } = useToast();

  // Set operation status
  const setStatus = (operation: string, status: OperationStatus) => {
    setOperationStatus(prev => ({ ...prev, [operation]: status }));
  };

  // Handle single file copy
  const handleCopyFile = async (file: CodeFile) => {
    setStatus(`copy_${file.id}`, 'loading');
    
    try {
      await navigator.clipboard.writeText(file.content);
      setStatus(`copy_${file.id}`, 'success');
      
      toast({
        title: "Copied to clipboard",
        description: `${file.file_name} content copied successfully`,
        duration: 3000,
      });
      
      setTimeout(() => setStatus(`copy_${file.id}`, 'idle'), 2000);
    } catch (error) {
      setStatus(`copy_${file.id}`, 'error');
      toast({
        title: "Copy failed",
        description: "Failed to copy file content to clipboard",
        variant: "destructive",
        duration: 3000,
      });
      setTimeout(() => setStatus(`copy_${file.id}`, 'idle'), 2000);
    }
  };

  // Handle single file download
  const handleDownloadFile = async (file: CodeFile) => {
    setStatus(`download_${file.id}`, 'loading');
    
    try {
      await onFileOperation('download', file);
      
      // Create and trigger download
      const blob = new Blob([file.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setStatus(`download_${file.id}`, 'success');
      
      toast({
        title: "Download started",
        description: `${file.file_name} download initiated`,
        duration: 3000,
      });
      
      setTimeout(() => setStatus(`download_${file.id}`, 'idle'), 2000);
    } catch (error) {
      setStatus(`download_${file.id}`, 'error');
      toast({
        title: "Download failed",
        description: `Failed to download ${file.file_name}`,
        variant: "destructive",
        duration: 3000,
      });
      setTimeout(() => setStatus(`download_${file.id}`, 'idle'), 2000);
    }
  };

  // Handle ZIP download
  const handleDownloadZip = async () => {
    setStatus('download_zip', 'loading');
    
    try {
      await onFileOperation('download_zip', files, exportOptions);
      setStatus('download_zip', 'success');
      
      toast({
        title: "ZIP download started",
        description: `${exportOptions.zipName}.zip download initiated`,
        duration: 3000,
      });
      
      setExportDialogOpen(false);
      setTimeout(() => setStatus('download_zip', 'idle'), 2000);
    } catch (error) {
      setStatus('download_zip', 'error');
      toast({
        title: "ZIP download failed",
        description: "Failed to create and download ZIP archive",
        variant: "destructive",
        duration: 3000,
      });
      setTimeout(() => setStatus('download_zip', 'idle'), 2000);
    }
  };

  // Handle copy all files
  const handleCopyAllFiles = async () => {
    setStatus('copy_all', 'loading');
    
    try {
      const allContent = files.map(file => 
        `// ${file.file_name}\n${file.content}\n\n`
      ).join('');
      
      await navigator.clipboard.writeText(allContent);
      setStatus('copy_all', 'success');
      
      toast({
        title: "All files copied",
        description: `${files.length} files copied to clipboard`,
        duration: 3000,
      });
      
      setTimeout(() => setStatus('copy_all', 'idle'), 2000);
    } catch (error) {
      setStatus('copy_all', 'error');
      toast({
        title: "Copy failed",
        description: "Failed to copy all files to clipboard",
        variant: "destructive",
        duration: 3000,
      });
      setTimeout(() => setStatus('copy_all', 'idle'), 2000);
    }
  };

  // Handle share functionality
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: projectName,
          text: `Check out this generated code project: ${projectName}`,
          url: window.location.href
        });
      } catch (error) {
        // User cancelled or error occurred
        console.log('Share cancelled or failed:', error);
      }
    } else {
      // Fallback: copy URL to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link copied",
          description: "Project link copied to clipboard",
          duration: 3000,
        });
      } catch (error) {
        toast({
          title: "Share failed",
          description: "Unable to share or copy link",
          variant: "destructive",
          duration: 3000,
        });
      }
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Get total size of all files
  const totalSize = files.reduce((sum, file) => sum + file.size_bytes, 0);

  // Get operation button props
  const getOperationButtonProps = (operation: string) => {
    const status = operationStatus[operation] || 'idle';
    return {
      disabled: status === 'loading',
      className: cn(
        status === 'success' && "text-green-400 border-green-400",
        status === 'error' && "text-red-400 border-red-400"
      )
    };
  };

  // Render operation icon
  const renderOperationIcon = (operation: string, defaultIcon: React.ReactNode) => {
    const status = operationStatus[operation] || 'idle';
    
    switch (status) {
      case 'loading':
        return <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return defaultIcon;
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Quick Actions */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm font-medium flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Quick Actions
            <Badge variant="secondary" className="ml-auto text-xs bg-white/10 text-white/60">
              {files.length} files
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Primary actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleCopyAllFiles}
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10"
              {...getOperationButtonProps('copy_all')}
            >
              {renderOperationIcon('copy_all', <Copy className="w-4 h-4 mr-2" />)}
              Copy All
            </Button>

            <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Export ZIP
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-black/90 backdrop-blur-xl border-white/10">
                <DialogHeader>
                  <DialogTitle className="text-white">Export Project as ZIP</DialogTitle>
                  <DialogDescription className="text-white/60">
                    Configure your project export settings
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="zip-name" className="text-white">ZIP Filename</Label>
                    <Input
                      id="zip-name"
                      value={exportOptions.zipName}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, zipName: e.target.value }))}
                      className="bg-white/5 border-white/10 text-white"
                      placeholder="project-name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description" className="text-white">Description (optional)</Label>
                    <Textarea
                      id="description"
                      value={exportOptions.description}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, description: e.target.value }))}
                      className="bg-white/5 border-white/10 text-white"
                      placeholder="Add a description for this export..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="include-readme"
                      checked={exportOptions.includeReadme}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, includeReadme: e.target.checked }))}
                      className="rounded border-white/20"
                    />
                    <Label htmlFor="include-readme" className="text-white text-sm">
                      Include README.md with setup instructions
                    </Label>
                  </div>
                  
                  <div className="text-sm text-white/60 space-y-1">
                    <div>Files to include: {files.length}</div>
                    <div>Total size: {formatFileSize(totalSize)}</div>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setExportDialogOpen(false)}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDownloadZip}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    {...getOperationButtonProps('download_zip')}
                  >
                    {renderOperationIcon('download_zip', <FolderDown className="w-4 h-4 mr-2" />)}
                    Export ZIP
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              onClick={handleShare}
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>

          {/* File statistics */}
          <div className="flex items-center justify-between text-xs text-white/60 pt-2 border-t border-white/10">
            <span>Total: {formatFileSize(totalSize)}</span>
            <span>{files.filter(f => f.is_main_file).length} main files</span>
            <span>{files.filter(f => f.is_modified).length} modified</span>
          </div>
        </CardContent>
      </Card>

      {/* Individual File Operations */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm font-medium">Individual File Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {files.map(file => (
              <div
                key={file.id}
                className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileText className="w-4 h-4 text-white/60 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm truncate">{file.file_name}</span>
                      {file.is_main_file && (
                        <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-300">
                          Main
                        </Badge>
                      )}
                      {file.is_modified && (
                        <Badge variant="secondary" className="text-xs bg-orange-500/20 text-orange-300">
                          Modified
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-white/40">
                      {file.file_type.toUpperCase()} • {formatFileSize(file.size_bytes)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    onClick={() => handleCopyFile(file)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10"
                    {...getOperationButtonProps(`copy_${file.id}`)}
                  >
                    {renderOperationIcon(`copy_${file.id}`, <Copy className="w-3 h-3" />)}
                  </Button>

                  <Button
                    onClick={() => handleDownloadFile(file)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10"
                    {...getOperationButtonProps(`download_${file.id}`)}
                  >
                    {renderOperationIcon(`download_${file.id}`, <Download className="w-3 h-3" />)}
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10"
                      >
                        <MoreHorizontal className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-black/90 backdrop-blur-xl border-white/10">
                      <DropdownMenuItem
                        onClick={() => onFileOperation('view', file)}
                        className="text-white hover:bg-white/10"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onFileOperation('edit', file)}
                        className="text-white hover:bg-white/10"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem
                        onClick={() => onFileOperation('open_external', file)}
                        className="text-white hover:bg-white/10"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open External
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem
                        onClick={() => onFileOperation('delete', file)}
                        className="text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Batch Operations for Selected Files */}
      {selectedFiles.length > 0 && (
        <Card className="bg-white/5 border-white/10 border-purple-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-purple-400" />
              Batch Operations
              <Badge variant="secondary" className="ml-auto text-xs bg-purple-500/20 text-purple-300">
                {selectedFiles.length} selected
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => onFileOperation('copy_selected', selectedFiles)}
                variant="outline"
                size="sm"
                className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Selected
              </Button>

              <Button
                onClick={() => onFileOperation('download_selected', selectedFiles)}
                variant="outline"
                size="sm"
                className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Selected
              </Button>

              <Button
                onClick={() => onFileOperation('delete_selected', selectedFiles)}
                variant="outline"
                size="sm"
                className="border-red-500/30 text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FileOperations;