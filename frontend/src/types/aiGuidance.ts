// AI Project Guidance TypeScript Interfaces and Data Models
// Requirements: 7.1, 7.2

/**
 * Represents a chat session between a user and the AI guidance system
 */
export interface ChatSession {
  sessionId: string;
  projectId: string;
  userId: string;
  startTime: Date;
  lastActivity: Date;
  messages?: ChatMessage[];
}

/**
 * Represents an individual message in a chat session
 */
export interface ChatMessage {
  messageId: string;
  sessionId: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Represents the context information for a project used by the AI
 */
export interface ProjectContext {
  projectId: string;
  title: string;
  description: string;
  goals: string[];
  currentPhase: string;
  tasks: Task[];
  milestones: Milestone[];
  progress: number;
  deadlines: Date[];
}

/**
 * Represents a task within a project
 */
export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
}

/**
 * Represents a milestone within a project
 */
export interface Milestone {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  completed: boolean;
}

/**
 * Request payload for sending a chat message
 */
export interface ChatRequest {
  message: string;
  sessionId?: string;
  projectContext?: any; // Project data from localStorage
  conversationHistory?: any[]; // Recent conversation messages for context
}

/**
 * Response from the AI guidance system
 */
export interface ChatResponse {
  response: string;
  sessionId: string;
  suggestions: string[];
  nextSteps: string[];
}

/**
 * Response containing project context information
 */
export interface ContextResponse {
  project: ProjectContext;
  recommendations: string[];
}

/**
 * Response containing chat history
 */
export interface HistoryResponse {
  messages: ChatMessage[];
  sessionId: string;
}

/**
 * AI guidance request with full context
 */
export interface GuidanceRequest {
  projectId: string;
  userMessage: string;
  conversationHistory: ChatMessage[];
}

/**
 * AI guidance response with detailed information
 */
export interface GuidanceResponse {
  response: string;
  suggestions: string[];
  nextSteps: string[];
  confidence: number;
}

/**
 * Cached AI context data
 */
export interface AIContextCache {
  cacheId: string;
  projectId: string;
  contextData: ProjectContext;
  generatedAt: Date;
  expiresAt: Date;
}

/**
 * Chat session creation parameters
 */
export interface CreateSessionParams {
  projectId: string;
  userId: string;
}

/**
 * Chat session update parameters
 */
export interface UpdateSessionParams {
  sessionId: string;
  lastActivity?: Date;
}

/**
 * Message creation parameters
 */
export interface CreateMessageParams {
  sessionId: string;
  content: string;
  sender: 'user' | 'ai';
  metadata?: Record<string, any>;
}

/**
 * Project context update parameters
 */
export interface UpdateContextParams {
  projectId: string;
  contextData: Partial<ProjectContext>;
  expirationHours?: number;
}

/**
 * Chat interface state
 */
export interface ChatInterfaceState {
  isOpen: boolean;
  isLoading: boolean;
  currentSession?: ChatSession;
  messages: ChatMessage[];
  error?: string;
}

/**
 * AI guidance service configuration
 */
export interface AIGuidanceConfig {
  apiBaseUrl: string;
  timeout: number;
  retryAttempts: number;
  cacheExpirationHours: number;
}

/**
 * Error response from AI guidance API
 */
export interface AIGuidanceError {
  code: string;
  message: string;
  details?: Record<string, any>;
  retryable: boolean;
}

/**
 * Chat session statistics
 */
export interface SessionStats {
  messageCount: number;
  duration: number; // in minutes
  lastMessageTime: Date;
  userMessageCount: number;
  aiMessageCount: number;
}

/**
 * Project analysis result from AI
 */
export interface ProjectAnalysis {
  blockers: string[];
  recommendations: string[];
  nextSteps: string[];
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
  };
  progressInsights: {
    completionPercentage: number;
    estimatedTimeRemaining: string;
    suggestedPriorities: string[];
  };
}

/**
 * AI model response metadata
 */
export interface AIResponseMetadata {
  model: string;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  responseTime: number;
  confidence: number;
}

/**
 * Utility type for API responses
 */
export interface APIResponse<T> {
  data: T;
  success: boolean;
  error?: AIGuidanceError;
  metadata?: AIResponseMetadata;
}

/**
 * Chat message with rich content support
 */
export interface RichChatMessage extends ChatMessage {
  contentType: 'text' | 'markdown' | 'code' | 'list';
  formatting?: {
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
    language?: string; // for code blocks
  };
  actions?: MessageAction[];
}

/**
 * Interactive actions that can be attached to messages
 */
export interface MessageAction {
  id: string;
  label: string;
  type: 'button' | 'link' | 'copy';
  action: string;
  data?: Record<string, any>;
}

/**
 * Chat interface props for React components
 */
export interface ChatInterfaceProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string;
}

/**
 * Guidance button props for React components
 */
export interface GuidanceButtonProps {
  projectId: string;
  onGuidanceOpen: (projectId: string) => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
}