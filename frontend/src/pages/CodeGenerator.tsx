import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Code, 
  Zap, 
  FileText, 
  Download, 
  Play, 
  Pause, 
  RefreshCw,
  Settings,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  FolderOpen,
  Sparkles,
  ArrowLeft,
  Plus,
  Search,
  Terminal as TerminalIcon,
  Layout as LayoutIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useCodeGenerationContext } from '@/contexts/CodeGenerationContext';
import { projectService, type SavedProject } from '@/services/projectService';
import { toast } from '@/hooks/use-toast';
import CodeGenerationModal from '@/components/CodeGenerationModal';
import FileTreeView from '@/components/FileTreeView';
import EnhancedCodeEditor from '@/components/EnhancedCodeEditor';
import EnhancedLivePreview from '@/components/EnhancedLivePreview';
import Terminal from '@/components/Terminal';
import StreamingCodeView from '@/components/StreamingCodeView';
import ResizablePanels from '@/components/ResizablePanels';
import { BackgroundCanvas3D } from '@/components/three/BackgroundCanvas3D';

const CodeGenerator: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const {
    currentGeneration,
    isGenerating,
    generationProgress,
    files,
    selectedFile,
    showModal,
    error,
    startGeneration,
    cancelGeneration,
    selectFile,
    updateFile,
    downloadFile,
    downloadProject,
    copyFileContent,
    openModal,
    closeModal,
    clearError
  } = useCodeGenerationContext();

  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<SavedProject | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [activeTab, setActiveTab] = useState<'projects' | 'files' | 'editor' | 'preview'>('projects');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTerminal, setShowTerminal] = useState(true);
  const [workspaceLayout, setWorkspaceLayout] = useState<'standard' | 'editor-focus' | 'preview-focus'>('standard');

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  // Check for project ID in URL params
  useEffect(() => {
    const projectId = searchParams.get('project');
    if (projectId && projects.length > 0) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        setSelectedProject(project);
        setActiveTab('files');
      }
    }
  }, [searchParams, projects]);

  const loadProjects = async () => {
    try {
      setIsLoadingProjects(true);
      const userProjects = await projectService.getProjects();
      setProjects(userProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive"
      });
    } finally {
      setIsLoadingProjects(false);
    }
  };

  // Filter projects
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handle project selection
  const handleSelectProject = (project: SavedProject) => {
    setSelectedProject(project);
    setActiveTab('files');
    // Update URL
    navigate(`/code-generator?project=${project.id}`, { replace: true });
  };

  // Handle code generation
  const handleGenerateCode = (project: SavedProject) => {
    setSelectedProject(project);
    openModal();
  };

  // Handle file operations
  const handleFileOperation = async (operation: string, file: any, targetPath?: string) => {
    switch (operation) {
      case 'view':
      case 'edit':
        selectFile(file);
        setActiveTab('editor');
        break;
      case 'copy':
        await copyFileContent(file);
        break;
      case 'download':
        await downloadFile(file);
        break;
      case 'delete':
        // Handle delete
        break;
      case 'move':
        // Handle move
        break;
    }
  };

  // Render project selection
  const renderProjectSelection = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Veronica AI
        </h1>
        <p className="text-xl text-white/60 max-w-2xl mx-auto">
          Your intelligent coding companion - Transform ideas into full-stack applications
        </p>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="Search your projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-black/40 border-white/10 text-white placeholder:text-white/40"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-black/40 border-white/10 text-white">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="bg-black/90 backdrop-blur-xl border-white/10">
            <SelectItem value="all">All Projects</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Projects grid */}
      <div className="max-w-6xl mx-auto">
        {isLoadingProjects ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-48 bg-white/5 rounded-2xl animate-pulse border border-white/5" />
            ))}
          </div>
        ) : filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Card 
                key={project.id} 
                className="glass-effect border-white/5 hover:border-purple-500/30 transition-all group cursor-pointer overflow-hidden"
                onClick={() => handleSelectProject(project)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                        {project.title}
                      </CardTitle>
                      <p className="text-sm text-white/60 mt-1 line-clamp-2">
                        {project.description}
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`ml-2 text-xs ${getStatusColor(project.status)}`}
                    >
                      {project.status}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* Progress bar */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-white/60">Progress</span>
                        <span className="text-xs text-white/80">{project.progress}%</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300" 
                          style={{ width: `${project.progress}%` }} 
                        />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateCode(project);
                        }}
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Generate with Veronica
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white/60 hover:text-white hover:bg-white/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/project/${project.id}`);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FolderOpen className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white/60 mb-2">No Projects Found</h3>
            <p className="text-white/40 mb-6">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Create your first STEM project to get started with code generation'
              }
            </p>
            <Button
              onClick={() => navigate('/generator')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Project
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  // Render code generation workspace
  const renderWorkspace = () => (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10 bg-black/50">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedProject(null);
              setActiveTab('projects');
              navigate('/code-generator', { replace: true });
            }}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
          <div className="h-6 w-px bg-white/20" />
          <div>
            <h2 className="text-xl font-semibold text-white">{selectedProject?.title}</h2>
            <p className="text-sm text-white/60">Veronica AI Workspace</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Layout selector */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Select value={workspaceLayout} onValueChange={(value: any) => setWorkspaceLayout(value)}>
                    <SelectTrigger className="w-40 bg-black/40 border-white/10 text-white text-sm">
                      <LayoutIcon className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 backdrop-blur-xl border-white/10">
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="editor-focus">Editor Focus</SelectItem>
                      <SelectItem value="preview-focus">Preview Focus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Change workspace layout</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Terminal toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTerminal(!showTerminal)}
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  <TerminalIcon className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{showTerminal ? 'Hide' : 'Show'} Terminal</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {currentGeneration && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadProject(currentGeneration.id, selectedProject?.title)}
                    className="text-white/60 hover:text-white hover:bg-white/10"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download ZIP
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Download entire project as ZIP file</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isFullscreen ? 'Exit' : 'Enter'} Fullscreen</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Main workspace with resizable panels */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanels
          direction="vertical"
          minSize={250}
          defaultSize={
            workspaceLayout === 'editor-focus' ? '20%' : 
            workspaceLayout === 'preview-focus' ? '40%' : 
            '30%'
          }
        >
          {/* Left Sidebar - File Tree */}
          <div className="h-full border-r border-white/10 bg-black/30 overflow-hidden">
            {isGenerating ? (
              <StreamingCodeView
                generationId={currentGeneration?.id || ''}
                onComplete={() => {}}
                onError={() => {}}
              />
            ) : files.length > 0 ? (
              <FileTreeView
                files={files}
                selectedFile={selectedFile}
                onFileSelect={selectFile}
                onFileOperation={handleFileOperation}
                enableDragDrop={true}
                className="h-full overflow-auto"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <Code className="w-12 h-12 text-white/20 mb-4" />
                <h3 className="text-lg font-medium text-white/60 mb-2">No Code Generated</h3>
                <p className="text-sm text-white/40 mb-4">
                  Let Veronica generate code for this project
                </p>
                <Button
                  onClick={() => openModal()}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Start with Veronica
                </Button>
              </div>
            )}
          </div>

          {/* Right Content Area - Editor & Preview */}
          <div className="h-full">
            <ResizablePanels
              direction={showTerminal ? "horizontal" : "vertical"}
              minSize={showTerminal ? 300 : 400}
              defaultSize={
                showTerminal ? '65%' : 
                workspaceLayout === 'editor-focus' ? '60%' : 
                workspaceLayout === 'preview-focus' ? '40%' : 
                '50%'
              }
            >
              {/* Top/Left - Editor & Preview Split */}
              <div className="h-full">
                <ResizablePanels
                  direction="vertical"
                  minSize={400}
                  defaultSize={
                    workspaceLayout === 'editor-focus' ? '70%' : 
                    workspaceLayout === 'preview-focus' ? '30%' : 
                    '50%'
                  }
                >
                  {/* Editor */}
                  <div className="h-full border-r border-white/10">
                    {selectedFile ? (
                      <EnhancedCodeEditor
                        file={selectedFile}
                        onSave={(content) => updateFile(selectedFile.id, content)}
                        onContentChange={(content) => {}}
                        className="h-full"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center bg-black/30">
                        <div className="text-center">
                          <FileText className="w-16 h-16 text-white/20 mx-auto mb-4" />
                          <h3 className="text-xl font-semibold text-white/60 mb-2">Select a File</h3>
                          <p className="text-white/40">
                            Choose a file from the sidebar to view and edit
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Preview */}
                  <div className="h-full">
                    {currentGeneration ? (
                      <EnhancedLivePreview
                        files={files}
                        platform={currentGeneration.platform as any}
                        autoRefresh={true}
                        refreshInterval={1000}
                        className="h-full"
                      />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center bg-black/30 p-6 text-center">
                        <Eye className="w-16 h-16 text-white/20 mb-4" />
                        <h3 className="text-xl font-semibold text-white/60 mb-2">No Preview Available</h3>
                        <p className="text-white/40 mb-4">
                          Generate code to see a live preview with dev server simulation
                        </p>
                        <div className="flex flex-wrap gap-2 text-sm text-white/50">
                          <Badge variant="secondary" className="bg-white/10">JSX/TSX Transpilation</Badge>
                          <Badge variant="secondary" className="bg-white/10">Hot Reload</Badge>
                          <Badge variant="secondary" className="bg-white/10">Console Capture</Badge>
                          <Badge variant="secondary" className="bg-white/10">Network Monitor</Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </ResizablePanels>
              </div>

              {/* Bottom - Terminal */}
              {showTerminal && (
                <div className="h-full border-t border-white/10">
                  <Terminal
                    className="h-full"
                    onCommandExecute={async (command) => {
                      // Handle custom commands here
                      return `Executed: ${command}`;
                    }}
                  />
                </div>
              )}
            </ResizablePanels>
          </div>
        </ResizablePanels>
      </div>
    </div>
  );

  // Helper function for status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
      case 'in_progress': return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
      case 'planning': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'abandoned': return 'text-red-400 bg-red-400/10 border-red-400/30';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };

  return (
    <Layout>
      <div className={`min-h-screen relative ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : ''}`}>
        <BackgroundCanvas3D />
        
        <div className="relative z-10 h-full">
          {selectedProject ? renderWorkspace() : (
            <div className="container mx-auto px-6 py-12">
              {renderProjectSelection()}
            </div>
          )}
        </div>

        {/* Code Generation Modal */}
        {selectedProject && (
          <CodeGenerationModal
            project={selectedProject}
            isOpen={showModal}
            onClose={closeModal}
            onGenerationStart={(params) => startGeneration(selectedProject.id, params)}
            isGenerating={isGenerating}
          />
        )}

        {/* Error display */}
        {error && (
          <div className="fixed bottom-4 right-4 z-50">
            <Card className="bg-red-500/10 border-red-500/30 backdrop-blur-xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="text-red-400 text-sm">{error}</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearError}
                    className="text-red-400 hover:bg-red-500/20"
                  >
                    ×
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CodeGenerator;