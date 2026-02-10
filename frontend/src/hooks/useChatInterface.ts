'use client';

// Custom hook for managing chat interface state
// Requirements: 2.1, 2.2, 2.3
// Updated to use localStorage instead of backend database

import { useState, useCallback } from 'react';
import { ChatMessage, ChatInterfaceState } from '@/types/aiGuidance';
import { aiGuidanceService } from '@/services/aiGuidanceService';
import { chatHistoryService } from '@/services/chatHistoryService';

/**
 * Custom hook for managing chat interface state and operations
 * Provides state management for chat messages, loading states, and error handling
 * 
 * Requirements: 2.1, 2.2, 2.3
 */
export const useChatInterface = (projectId: string) => {
  const [state, setState] = useState<ChatInterfaceState>({
    isOpen: false,
    isLoading: false,
    messages: [],
    error: undefined,
  });

  /**
   * Open the chat interface
   */
  const openChat = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: true,
      error: undefined,
    }));
  }, []);

  /**
   * Close the chat interface
   */
  const closeChat = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  /**
   * Set loading state
   */
  const setLoading = useCallback((isLoading: boolean) => {
    setState(prev => ({
      ...prev,
      isLoading,
    }));
  }, []);

  /**
   * Set error state
   */
  const setError = useCallback((error: string | undefined) => {
    setState(prev => ({
      ...prev,
      error,
    }));
  }, []);

  /**
   * Add a message to the chat
   */
  const addMessage = useCallback((message: ChatMessage) => {
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, message],
    }));
  }, []);

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: [],
    }));
  }, []);

  /**
   * Initialize chat session
   * Load history from localStorage
   */
  const initializeChat = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    clearMessages();

    try {
      // Get or create session ID from localStorage
      let existingSessionId = chatHistoryService.getSessionId(projectId);
      if (!existingSessionId) {
        existingSessionId = chatHistoryService.generateSessionId();
      }

      // Load existing chat history from localStorage
      const existingMessages = chatHistoryService.getProjectHistory(projectId);
      
      if (existingMessages.length > 0) {
        // Load existing messages
        existingMessages.forEach(msg => addMessage(msg));
      } else {
        // Add welcome message for new chat
        const welcomeMessage: ChatMessage = {
          messageId: `welcome-${Date.now()}`,
          sessionId: existingSessionId,
          content: `Hello! I'm your AI project assistant. I can help you with guidance, troubleshooting, and next steps for your project. What would you like to know?`,
          sender: 'ai',
          timestamp: new Date(),
          metadata: {}
        };

        addMessage(welcomeMessage);
        chatHistoryService.saveMessage(projectId, welcomeMessage, existingSessionId);
      }

      setState(prev => ({
        ...prev,
        currentSession: {
          sessionId: existingSessionId,
          projectId: projectId,
          userId: 'local-user', // No authentication - local storage only
          startTime: new Date(),
          lastActivity: new Date(),
        }
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize chat';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [projectId, setLoading, setError, clearMessages, addMessage]);

  /**
   * Send a message
   * Save to localStorage instead of backend database
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!state.currentSession) {
      setError('No active chat session');
      return;
    }

    setLoading(true);
    setError(undefined);

    // Add user message
    const userMessage: ChatMessage = {
      messageId: `user-${Date.now()}`,
      sessionId: state.currentSession.sessionId,
      content,
      sender: 'user',
      timestamp: new Date(),
      metadata: {}
    };

    addMessage(userMessage);
    chatHistoryService.saveMessage(projectId, userMessage, state.currentSession.sessionId);

    try {
      const response = await aiGuidanceService.sendMessage(
        projectId,
        content,
        state.currentSession.sessionId
      );

      // Add AI response
      const aiMessage: ChatMessage = {
        messageId: `ai-${Date.now()}`,
        sessionId: response.sessionId || state.currentSession.sessionId,
        content: response.response,
        sender: 'ai',
        timestamp: new Date(),
        metadata: {
          suggestions: response.suggestions,
          nextSteps: response.nextSteps
        }
      };

      addMessage(aiMessage);
      chatHistoryService.saveMessage(projectId, aiMessage, state.currentSession.sessionId);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      setError(errorMessage);
      
      // Add error message
      const errorChatMessage: ChatMessage = {
        messageId: `error-${Date.now()}`,
        sessionId: state.currentSession.sessionId,
        content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
        sender: 'ai',
        timestamp: new Date(),
        metadata: { isError: true }
      };

      addMessage(errorChatMessage);
      chatHistoryService.saveMessage(projectId, errorChatMessage, state.currentSession.sessionId);
    } finally {
      setLoading(false);
    }
  }, [projectId, state.currentSession, setLoading, setError, addMessage]);

  return {
    ...state,
    openChat,
    closeChat,
    setLoading,
    setError,
    addMessage,
    clearMessages,
    initializeChat,
    sendMessage,
  };
};

export default useChatInterface;