import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { useCodeGeneration, GenerationParams, CodeFile, GeneratedCode, GenerationProgress } from '@/hooks/useCodeGeneration';
import { useFileOperations } from '@/hooks/useFileOperations';

interface CodeGenerationState {
  // Current generation
  currentGeneration: GeneratedCode | null;
  isGenerating: boolean;
  generationProgress: GenerationProgress;
  
  // File management
  files: CodeFile[];
  selectedFile: CodeFile | null;
  
  // UI state
  showModal: boolean;
  showPreview: boolean;
  error: string | null;
}

interface CodeGenerationContextType extends CodeGenerationState {
  // Generation actions
  startGeneration: (projectId: string, params: GenerationParams) => Promise<void>;
  cancelGeneration: () => void;
  
  // File actions
  selectFile: (file: CodeFile | null) => void;
  updateFile: (fileId: string, content: string) => Promise<void>;
  downloadFile: (file: CodeFile) => Promise<void>;
  downloadProject: (generationId: string, projectName?: string) => Promise<void>;
  copyFileContent: (file: CodeFile) => Promise<void>;
  deleteFile: (fileId: string) => Promise<void>;
  
  // UI actions
  openModal: () => void;
  closeModal: () => void;
  togglePreview: () => void;
  clearError: () => void;
  
  // Data fetching
  loadProjectGenerations: (projectId: string) => Promise<GeneratedCode[]>;
  loadGeneration: (generationId: string) => Promise<void>;
}

type CodeGenerationAction =
  | { type: 'SET_CURRENT_GENERATION'; payload: GeneratedCode | null }
  | { type: 'SET_GENERATING'; payload: boolean }
  | { type: 'SET_PROGRESS'; payload: GenerationProgress }
  | { type: 'SET_FILES'; payload: CodeFile[] }
  | { type: 'SET_SELECTED_FILE'; payload: CodeFile | null }
  | { type: 'UPDATE_FILE'; payload: { fileId: string; file: CodeFile } }
  | { type: 'REMOVE_FILE'; payload: string }
  | { type: 'SET_SHOW_MODAL'; payload: boolean }
  | { type: 'SET_SHOW_PREVIEW'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_STATE' };

const initialState: CodeGenerationState = {
  currentGeneration: null,
  isGenerating: false,
  generationProgress: {
    stage: 'initializing',
    message: 'Ready to generate code',
    progress: 0
  },
  files: [],
  selectedFile: null,
  showModal: false,
  showPreview: false,
  error: null
};

function codeGenerationReducer(state: CodeGenerationState, action: CodeGenerationAction): CodeGenerationState {
  switch (action.type) {
    case 'SET_CURRENT_GENERATION':
      return {
        ...state,
        currentGeneration: action.payload,
        files: action.payload?.files || []
      };
      
    case 'SET_GENERATING':
      return {
        ...state,
        isGenerating: action.payload
      };
      
    case 'SET_PROGRESS':
      return {
        ...state,
        generationProgress: action.payload
      };
      
    case 'SET_FILES':
      return {
        ...state,
        files: action.payload
      };
      
    case 'SET_SELECTED_FILE':
      return {
        ...state,
        selectedFile: action.payload
      };
      
    case 'UPDATE_FILE':
      return {
        ...state,
        files: state.files.map(file => 
          file.id === action.payload.fileId ? action.payload.file : file
        ),
        selectedFile: state.selectedFile?.id === action.payload.fileId 
          ? action.payload.file 
          : state.selectedFile
      };
      
    case 'REMOVE_FILE':
      return {
        ...state,
        files: state.files.filter(file => file.id !== action.payload),
        selectedFile: state.selectedFile?.id === action.payload ? null : state.selectedFile
      };
      
    case 'SET_SHOW_MODAL':
      return {
        ...state,
        showModal: action.payload
      };
      
    case 'SET_SHOW_PREVIEW':
      return {
        ...state,
        showPreview: action.payload
      };
      
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload
      };
      
    case 'CLEAR_STATE':
      return initialState;
      
    default:
      return state;
  }
}

const CodeGenerationContext = createContext<CodeGenerationContextType | undefined>(undefined);

interface CodeGenerationProviderProps {
  children: ReactNode;
}

export const CodeGenerationProvider: React.FC<CodeGenerationProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(codeGenerationReducer, initialState);
  
  const codeGeneration = useCodeGeneration();
  const fileOperations = useFileOperations();

  // Sync with useCodeGeneration hook
  React.useEffect(() => {
    dispatch({ type: 'SET_CURRENT_GENERATION', payload: codeGeneration.currentGeneration });
  }, [codeGeneration.currentGeneration]);

  React.useEffect(() => {
    dispatch({ type: 'SET_GENERATING', payload: codeGeneration.isGenerating });
  }, [codeGeneration.isGenerating]);

  React.useEffect(() => {
    dispatch({ type: 'SET_PROGRESS', payload: codeGeneration.generationProgress });
  }, [codeGeneration.generationProgress]);

  React.useEffect(() => {
    if (codeGeneration.error) {
      dispatch({ type: 'SET_ERROR', payload: codeGeneration.error });
    }
  }, [codeGeneration.error]);

  // Sync with useFileOperations hook
  React.useEffect(() => {
    dispatch({ type: 'SET_SELECTED_FILE', payload: fileOperations.selectedFile });
  }, [fileOperations.selectedFile]);

  React.useEffect(() => {
    if (fileOperations.error) {
      dispatch({ type: 'SET_ERROR', payload: fileOperations.error });
    }
  }, [fileOperations.error]);

  // Generation actions
  const startGeneration = useCallback(async (projectId: string, params: GenerationParams) => {
    dispatch({ type: 'SET_ERROR', payload: null });
    await codeGeneration.startGeneration(projectId, params);
  }, [codeGeneration]);

  const cancelGeneration = useCallback(() => {
    codeGeneration.cancelGeneration();
  }, [codeGeneration]);

  // File actions
  const selectFile = useCallback((file: CodeFile | null) => {
    fileOperations.selectFile(file);
  }, [fileOperations]);

  const updateFile = useCallback(async (fileId: string, content: string) => {
    const updatedFile = await fileOperations.updateFileContent(fileId, content);
    if (updatedFile) {
      dispatch({ type: 'UPDATE_FILE', payload: { fileId, file: updatedFile } });
    }
  }, [fileOperations]);

  const downloadFile = useCallback(async (file: CodeFile) => {
    await fileOperations.downloadFile(file);
  }, [fileOperations]);

  const downloadProject = useCallback(async (generationId: string, projectName?: string) => {
    await fileOperations.downloadProjectZip(generationId, projectName);
  }, [fileOperations]);

  const copyFileContent = useCallback(async (file: CodeFile) => {
    await fileOperations.copyFileContent(file);
  }, [fileOperations]);

  const deleteFile = useCallback(async (fileId: string) => {
    await fileOperations.deleteFile(fileId);
    dispatch({ type: 'REMOVE_FILE', payload: fileId });
  }, [fileOperations]);

  // UI actions
  const openModal = useCallback(() => {
    dispatch({ type: 'SET_SHOW_MODAL', payload: true });
  }, []);

  const closeModal = useCallback(() => {
    dispatch({ type: 'SET_SHOW_MODAL', payload: false });
  }, []);

  const togglePreview = useCallback(() => {
    dispatch({ type: 'SET_SHOW_PREVIEW', payload: !state.showPreview });
  }, [state.showPreview]);

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
    codeGeneration.clearError();
    fileOperations.clearError();
  }, [codeGeneration, fileOperations]);

  // Data fetching
  const loadProjectGenerations = useCallback(async (projectId: string) => {
    return await codeGeneration.getProjectGenerations(projectId);
  }, [codeGeneration]);

  const loadGeneration = useCallback(async (generationId: string) => {
    const generation = await codeGeneration.getGenerationById(generationId);
    if (generation) {
      dispatch({ type: 'SET_CURRENT_GENERATION', payload: generation });
    }
  }, [codeGeneration]);

  const contextValue: CodeGenerationContextType = {
    // State
    ...state,
    
    // Generation actions
    startGeneration,
    cancelGeneration,
    
    // File actions
    selectFile,
    updateFile,
    downloadFile,
    downloadProject,
    copyFileContent,
    deleteFile,
    
    // UI actions
    openModal,
    closeModal,
    togglePreview,
    clearError,
    
    // Data fetching
    loadProjectGenerations,
    loadGeneration
  };

  return (
    <CodeGenerationContext.Provider value={contextValue}>
      {children}
    </CodeGenerationContext.Provider>
  );
};

export const useCodeGenerationContext = (): CodeGenerationContextType => {
  const context = useContext(CodeGenerationContext);
  if (context === undefined) {
    throw new Error('useCodeGenerationContext must be used within a CodeGenerationProvider');
  }
  return context;
};