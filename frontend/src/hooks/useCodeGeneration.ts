import { useState, useCallback, useRef, useEffect } from 'react';
import { codeGenerationService } from '@/services/codeGenerationService';
import { streamingService } from '@/services/streamingService';
import { toast } from '@/hooks/use-toast';

export interface GenerationParams {
  platform: 'arduino' | 'raspberry_pi' | 'web' | 'mobile';
  complexityLevel: 'beginner' | 'intermediate' | 'advanced';
  includeComments: boolean;
  includeTests: boolean;
  customRequirements?: string;
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
  id: string;
  project_id: string;
  status: 'generating' | 'completed' | 'failed';
  platform: string;
  created_at: string;
  completed_at?: string;
  error_message?: string;
  files: CodeFile[];
}

export interface GenerationProgress {
  stage: 'initializing' | 'analyzing' | 'generating' | 'finalizing' | 'complete';
  message: string;
  progress: number;
  currentFile?: string;
}

interface UseCodeGenerationReturn {
  // State
  currentGeneration: GeneratedCode | null;
  isGenerating: boolean;
  generationProgress: GenerationProgress;
  error: string | null;
  
  // Actions
  startGeneration: (projectId: string, params: GenerationParams) => Promise<void>;
  cancelGeneration: () => void;
  clearError: () => void;
  
  // Generation management
  getProjectGenerations: (projectId: string) => Promise<GeneratedCode[]>;
  getGenerationById: (generationId: string) => Promise<GeneratedCode | null>;
  deleteGeneration: (generationId: string) => Promise<void>;
}

export const useCodeGeneration = (): UseCodeGenerationReturn => {
  const [currentGeneration, setCurrentGeneration] = useState<GeneratedCode | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress>({
    stage: 'initializing',
    message: 'Preparing to generate code...',
    progress: 0
  });
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const currentGenerationIdRef = useRef<string | null>(null);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Start code generation
  const startGeneration = useCallback(async (projectId: string, params: GenerationParams) => {
    try {
      setIsGenerating(true);
      setError(null);
      setGenerationProgress({
        stage: 'initializing',
        message: 'Starting code generation...',
        progress: 0
      });

      // Start generation via API
      const response = await codeGenerationService.startGeneration(projectId, params);
      const generationId = response.generation_id;
      currentGenerationIdRef.current = generationId;

      // Set up WebSocket for real-time updates
      const wsUrl = streamingService.getStreamingUrl(projectId, generationId);
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected for code generation');
        setGenerationProgress({
          stage: 'analyzing',
          message: 'Analyzing project requirements...',
          progress: 10
        });
      };

      wsRef.current.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'progress':
              setGenerationProgress({
                stage: data.stage || 'generating',
                message: data.message || 'Generating code...',
                progress: data.progress || 0,
                currentFile: data.current_file
              });
              break;
              
            case 'file_generated':
              setGenerationProgress(prev => ({
                ...prev,
                message: `Generated ${data.file_name}`,
                currentFile: data.file_name,
                progress: Math.min(prev.progress + 10, 90)
              }));
              break;
              
            case 'generation_complete':
              setGenerationProgress({
                stage: 'complete',
                message: 'Code generation completed successfully!',
                progress: 100
              });
              
              // Fetch the complete generation data
              const completedGeneration = await codeGenerationService.getGeneration(generationId);
              setCurrentGeneration(completedGeneration);
              setIsGenerating(false);
              
              toast({
                title: "Code Generated Successfully!",
                description: `Generated ${completedGeneration.files.length} files for your project.`,
              });
              break;
              
            case 'generation_error':
              setError(data.error || 'Code generation failed');
              setIsGenerating(false);
              setGenerationProgress({
                stage: 'initializing',
                message: 'Generation failed',
                progress: 0
              });
              
              toast({
                title: "Code Generation Failed",
                description: data.error || 'An error occurred during code generation.',
                variant: "destructive"
              });
              break;
              
            default:
              console.log('Unknown WebSocket message type:', data.type);
          }
        } catch (parseError) {
          console.error('Error parsing WebSocket message:', parseError);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error during code generation');
        setIsGenerating(false);
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        if (isGenerating && !event.wasClean) {
          setError('Connection lost during code generation');
          setIsGenerating(false);
        }
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start code generation';
      setError(errorMessage);
      setIsGenerating(false);
      
      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [isGenerating]);

  // Cancel generation
  const cancelGeneration = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    if (currentGenerationIdRef.current) {
      // Optionally call API to cancel generation
      codeGenerationService.cancelGeneration(currentGenerationIdRef.current)
        .catch(err => console.error('Error canceling generation:', err));
    }
    
    setIsGenerating(false);
    setCurrentGeneration(null);
    setGenerationProgress({
      stage: 'initializing',
      message: 'Generation canceled',
      progress: 0
    });
    currentGenerationIdRef.current = null;
    
    toast({
      title: "Generation Canceled",
      description: "Code generation has been stopped.",
    });
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get all generations for a project
  const getProjectGenerations = useCallback(async (projectId: string): Promise<GeneratedCode[]> => {
    try {
      return await codeGenerationService.getProjectGenerations(projectId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch generations';
      setError(errorMessage);
      return [];
    }
  }, []);

  // Get specific generation by ID
  const getGenerationById = useCallback(async (generationId: string): Promise<GeneratedCode | null> => {
    try {
      return await codeGenerationService.getGeneration(generationId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch generation';
      setError(errorMessage);
      return null;
    }
  }, []);

  // Delete generation
  const deleteGeneration = useCallback(async (generationId: string): Promise<void> => {
    try {
      await codeGenerationService.deleteGeneration(generationId);
      
      // If this was the current generation, clear it
      if (currentGeneration?.id === generationId) {
        setCurrentGeneration(null);
      }
      
      toast({
        title: "Generation Deleted",
        description: "The code generation has been removed.",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete generation';
      setError(errorMessage);
      
      toast({
        title: "Delete Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [currentGeneration]);

  return {
    // State
    currentGeneration,
    isGenerating,
    generationProgress,
    error,
    
    // Actions
    startGeneration,
    cancelGeneration,
    clearError,
    
    // Generation management
    getProjectGenerations,
    getGenerationById,
    deleteGeneration
  };
};