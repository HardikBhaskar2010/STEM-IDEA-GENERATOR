'use client';

// ChatInterface Component
// Requirements: 2.1, 2.2, 2.5, 8.3

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, AlertCircle, Bot, User, Lightbulb, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { ChatInterfaceProps, ChatMessage, ProjectContext } from '@/types/aiGuidance';
import { aiGuidanceService } from '@/services/aiGuidanceService';
import { chatHistoryService } from '@/services/chatHistoryService';
import ChatMessageComponent from './ChatMessage';

/**
 * ChatInterface component for AI Project Guidance
 * Provides chat UI with message display, input field, and send functionality
 * 
 * Requirements: 2.1, 2.2, 2.5, 8.3
 */
const ChatInterface: React.FC<ChatInterfaceProps> = ({
  projectId,
  isOpen,
  onClose,
  initialMessage
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [projectContext, setProjectContext] = useState<ProjectContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [nextSteps, setNextSteps] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Scroll to bottom of messages
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  /**
   * Initialize chat session when component opens
   * Load history from localStorage
   * Requirements: 2.1, 3.1
   */
  useEffect(() => {
    if (isOpen && projectId) {
      initializeChat();
    }
  }, [isOpen, projectId]);

  /**
   * Scroll to bottom when messages change
   */
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /**
   * Focus input when chat opens
   */
  useEffect(() => {
    if (isOpen && !isInitializing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isInitializing]);

  /**
   * Initialize chat session with project context
   * Load existing chat history from localStorage
   */
  const initializeChat = async () => {
    setIsInitializing(true);
    setError(null);
    setMessages([]);
    setSuggestions([]);
    setNextSteps([]);

    try {
      // Get or create session ID from localStorage
      let existingSessionId = chatHistoryService.getSessionId(projectId);
      if (!existingSessionId) {
        existingSessionId = chatHistoryService.generateSessionId();
      }
      setSessionId(existingSessionId);

      // Load existing chat history from localStorage
      const existingMessages = chatHistoryService.getProjectHistory(projectId);
      
      // Get project context for display
      try {
        const contextData = await aiGuidanceService.getProjectContext(projectId);
        setProjectContext(contextData.project);
      } catch (error) {
        console.warn('Could not load project context:', error);
        // Continue without context - not critical
      }

      // If there's existing history, load it
      if (existingMessages.length > 0) {
        console.log(`📜 Loaded ${existingMessages.length} messages from localStorage`);
        setMessages(existingMessages);
      } else {
        // No existing history - get project data and send comprehensive initial message
        console.log('🚀 New chat session - preparing comprehensive project guidance');
        
        // Add welcome message
        const welcomeMessage: ChatMessage = {
          messageId: `welcome-${Date.now()}`,
          sessionId: existingSessionId,
          content: `Hello! I'm your AI project assistant. Let me analyze your project and provide step-by-step guidance.`,
          sender: 'ai',
          timestamp: new Date(),
          metadata: {}
        };

        setMessages([welcomeMessage]);
        chatHistoryService.saveMessage(projectId, welcomeMessage, existingSessionId);

        // Send the initial message after a delay, but ensure it's the first message sent
        const sendInitialMessage = async () => {
          // Wait a bit longer to ensure the chat is fully initialized
          await new Promise(resolve => setTimeout(resolve, 500));
          
          try {
            console.log('🔍 Starting automatic project summary process...');
            const { projectService } = await import('@/services/projectService');
            const projectData = await projectService.getProjectById(projectId);
            
            if (projectData) {
              console.log('✅ Project data found:', projectData.title);
              
              // Create comprehensive project summary message with clear AI instruction
              const projectSummary = `AUTOMATIC PROJECT ANALYSIS REQUEST:

I am providing you with complete details about my project. Please analyze this information and provide comprehensive step-by-step guidance without asking for additional details.

**PROJECT DETAILS:**

**Project Title:** ${projectData.title}

**Description:** ${projectData.description}

**Current Status:** ${projectData.status} (${projectData.progress}% complete)

**Difficulty Level:** ${projectData.difficulty}

**Estimated Time:** ${projectData.estimatedTime}

**Estimated Cost:** ${projectData.estimatedCost}

**Components/Materials Needed:**
${projectData.components?.map((comp, i) => `${i + 1}. ${comp}`).join('\n') || 'None specified'}

**Skills Required:**
${projectData.skills?.map((skill, i) => `${i + 1}. ${skill}`).join('\n') || 'None specified'}

**Project Steps:**
${projectData.steps?.map((step, i) => `${i + 1}. ${step}`).join('\n') || 'None specified'}

**Completed Steps:** ${projectData.completed_steps?.length || 0} out of ${projectData.steps?.length || 0}

**Notes:** ${projectData.notes || 'No additional notes'}

**Tags:** ${projectData.tags?.join(', ') || 'None'}

**INSTRUCTION:** Based on this complete project information, please provide detailed step-by-step guidance for what I should do next. Focus on actionable next steps based on my current progress (${projectData.progress}% complete, ${projectData.status} phase). Do not ask for additional project details as I have provided everything above.`;

              console.log('🚀 Sending automatic project summary to AI');
              await sendMessage(projectSummary);
              console.log('✅ Automatic project summary sent successfully');
            } else {
              console.warn('❌ No project data found, sending fallback message');
              await sendMessage("I'm on a project detail page but couldn't load the project data. Please tell me about your project: What are you building? What's your current progress? What do you need help with?");
            }
          } catch (error) {
            console.error('❌ Error loading project data for initial message:', error);
            await sendMessage("I'm ready to help with your project! Please tell me about what you're working on and I'll provide step-by-step guidance.");
          }
        };
        
        // Send the initial message after a longer delay to ensure proper sequencing
        setTimeout(sendInitialMessage, 2000);
      }

      // Send initial message if provided (for backward compatibility)
      if (initialMessage && existingMessages.length === 0) {
        setCurrentMessage(initialMessage);
        setTimeout(() => sendMessage(initialMessage), 2000);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize chat';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsInitializing(false);
    }
  };

  /**
   * Send a message to the AI
   * Save to localStorage instead of backend database
   * Requirements: 2.2, 5.1
   */
  const sendMessage = async (messageText?: string) => {
    const text = messageText || currentMessage.trim();
    if (!text || isLoading || !sessionId) return;

    setIsLoading(true);
    setError(null);

    // Add user message to chat
    const userMessage: ChatMessage = {
      messageId: `user-${Date.now()}`,
      sessionId: sessionId,
      content: text,
      sender: 'user',
      timestamp: new Date(),
      metadata: {}
    };

    // Update state and save to localStorage
    setMessages(prev => {
      const newMessages = [...prev, userMessage];
      chatHistoryService.saveMessage(projectId, userMessage, sessionId);
      return newMessages;
    });
    setCurrentMessage('');

    try {
      // Get project data for context (optional - the comprehensive message above provides the details)
      let projectData = null;
      try {
        const { projectService } = await import('@/services/projectService');
        projectData = await projectService.getProjectById(projectId);
      } catch (error) {
        console.warn('Could not load project data for context:', error);
      }

      // Prepare conversation history (last 10 messages) for context
      // Convert ChatMessage objects to plain objects for API transmission
      const conversationHistory = messages.slice(-10).map(msg => ({
        messageId: msg.messageId,
        sessionId: msg.sessionId,
        content: msg.content,
        sender: msg.sender,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp,
        metadata: msg.metadata || {}
      }));

      console.log(`📜 Sending ${conversationHistory.length} previous messages for context`);

      // Send message to AI service with project context AND conversation history
      const response = await aiGuidanceService.sendMessage(
        projectId, 
        text, 
        sessionId, 
        projectData, 
        conversationHistory
      );

      // Add AI response to chat
      const aiMessage: ChatMessage = {
        messageId: `ai-${Date.now()}`,
        sessionId: response.sessionId || sessionId,
        content: response.response,
        sender: 'ai',
        timestamp: new Date(),
        metadata: {
          suggestions: response.suggestions,
          nextSteps: response.nextSteps
        }
      };

      // Update state and save to localStorage
      setMessages(prev => {
        const newMessages = [...prev, aiMessage];
        chatHistoryService.saveMessage(projectId, aiMessage, sessionId);
        return newMessages;
      });
      
      setSuggestions(response.suggestions || []);
      setNextSteps(response.nextSteps || []);

      console.log('💾 Messages saved to localStorage');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      setError(errorMessage);
      
      // Add error message to chat
      const errorChatMessage: ChatMessage = {
        messageId: `error-${Date.now()}`,
        sessionId: sessionId,
        content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
        sender: 'ai',
        timestamp: new Date(),
        metadata: { isError: true }
      };

      setMessages(prev => {
        const newMessages = [...prev, errorChatMessage];
        chatHistoryService.saveMessage(projectId, errorChatMessage, sessionId);
        return newMessages;
      });

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  /**
   * Handle suggestion click
   */
  const handleSuggestionClick = (suggestion: string) => {
    setCurrentMessage(suggestion);
    sendMessage(suggestion);
  };

  /**
   * Handle next step click
   */
  const handleNextStepClick = (step: string) => {
    const message = `Can you help me with this next step: ${step}`;
    setCurrentMessage(message);
    sendMessage(message);
  };

  /**
   * Handle key press for accessibility
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    // Allow Escape to close chat
    if (e.key === 'Escape') {
      onClose();
    }
  };

  /**
   * Handle global key events for accessibility
   */
  useEffect(() => {
    const handleGlobalKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleGlobalKeyPress);
      // Trap focus within the modal
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyPress);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-title"
      aria-describedby="chat-description"
    >
      <Card className="w-full max-w-4xl h-[90vh] sm:h-[85vh] flex flex-col mx-2 sm:mx-0 overflow-hidden">
        <CardHeader className="flex-shrink-0 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bot className="w-6 h-6 text-primary" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <CardTitle id="chat-title" className="text-lg truncate">
                  AI Project Guidance
                </CardTitle>
                {projectContext && (
                  <p id="chat-description" className="text-sm text-muted-foreground truncate">
                    {projectContext.title} • {projectContext.currentPhase} • {projectContext.progress.toFixed(0)}% complete
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 flex-shrink-0"
              aria-label="Close AI guidance chat"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          {/* Messages Area - Scrollable */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full px-6 pt-4" role="log" aria-live="polite" aria-label="Chat conversation">
              <div className="space-y-4 pb-4">
                {isInitializing ? (
                  <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      <span>Initializing AI guidance...</span>
                    </div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <ChatMessageComponent
                      key={message.messageId}
                      message={message}
                    />
                  ))
                )}

                {isLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground" role="status" aria-live="polite">
                    <Bot className="w-4 h-4" aria-hidden="true" />
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>AI is thinking...</span>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-lg" role="alert">
                    <AlertCircle className="w-4 h-4" aria-hidden="true" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </div>

          {/* Suggestions and Next Steps - Fixed at bottom */}
          {(suggestions.length > 0 || nextSteps.length > 0) && (
            <div className="flex-shrink-0 border-t bg-muted/30 px-6 py-4 max-h-32 overflow-y-auto" role="complementary" aria-label="AI suggestions and next steps">
              {suggestions.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-yellow-500" aria-hidden="true" />
                    <span className="text-sm font-medium">Suggestions</span>
                  </div>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="AI suggestions">
                    {suggestions.map((suggestion, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="cursor-pointer hover:bg-secondary/80 transition-colors text-xs sm:text-sm break-words max-w-full"
                        onClick={() => handleSuggestionClick(suggestion)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSuggestionClick(suggestion);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`Use suggestion: ${suggestion}`}
                      >
                        {suggestion}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {nextSteps.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowRight className="w-4 h-4 text-blue-500" aria-hidden="true" />
                    <span className="text-sm font-medium">Next Steps</span>
                  </div>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Suggested next steps">
                    {nextSteps.map((step, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="cursor-pointer hover:bg-accent transition-colors text-xs sm:text-sm break-words max-w-full"
                        onClick={() => handleNextStepClick(step)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleNextStepClick(step);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`Ask about next step: ${step}`}
                      >
                        {step}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Input Area - Fixed at bottom */}
          <div className="flex-shrink-0 border-t px-6 py-4 bg-background">
            <form onSubmit={handleSubmit} className="flex gap-2" role="search" aria-label="Send message to AI">
              <Input
                ref={inputRef}
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about your project..."
                disabled={isLoading || isInitializing}
                className="flex-1 min-h-[44px] sm:min-h-[40px] text-base sm:text-sm"
                aria-label="Type your message to the AI assistant"
                aria-describedby="send-button"
              />
              <Button
                id="send-button"
                type="submit"
                disabled={!currentMessage.trim() || isLoading || isInitializing}
                size="sm"
                className="px-3 min-h-[44px] sm:min-h-[40px] min-w-[44px] sm:min-w-[40px]"
                aria-label="Send message"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="w-4 h-4" aria-hidden="true" />
                )}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatInterface;