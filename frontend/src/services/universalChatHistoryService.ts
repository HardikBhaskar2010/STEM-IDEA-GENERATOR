/**
 * Universal Chat History Service
 * Handles saving and retrieving universal voice chat conversations from Supabase
 */

import { UserIdManager } from '@/utils/userIdManager';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api';

export interface UniversalChatMessage {
  id?: string;
  user_id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  message_type?: 'text' | 'voice' | 'action' | 'navigation' | 'project_created';
  voice_transcript?: string;
  voice_duration?: number;
  voice_confidence?: number;
  action_type?: string;
  action_parameters?: Record<string, any>;
  response_metadata?: Record<string, any>;
  conversation_context?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface ChatSession {
  id: string;
  session_id: string;
  user_id: string;
  title: string;
  message_count: number;
  last_message_at?: string;
  session_metadata?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConversationContext {
  session_id: string;
  recent_messages: Array<{
    role: string;
    content: string;
    timestamp: string;
  }>;
  last_action?: string;
  conversation_state: Record<string, any>;
}

class UniversalChatHistoryService {
  private userId: string;
  private fallbackStorage: boolean = false;

  constructor() {
    this.userId = UserIdManager.getUserId();
    console.log('🔍 UniversalChatHistoryService initialized for user:', this.userId);
  }

  /**
   * Save a chat message to the backend
   */
  async saveMessage(message: Omit<UniversalChatMessage, 'user_id'>): Promise<UniversalChatMessage> {
    try {
      const messageData: UniversalChatMessage = {
        ...message,
        user_id: this.userId,
      };

      console.log('💾 Saving universal chat message:', messageData);

      const response = await fetch(`${API_BASE_URL}/universal-chat/save-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
      });

      if (!response.ok) {
        throw new Error(`Failed to save message: ${response.status}`);
      }

      const savedMessage = await response.json();
      console.log('✅ Message saved successfully:', savedMessage);
      return savedMessage;

    } catch (error) {
      console.warn('⚠️ Failed to save message to backend, using localStorage fallback:', error);
      return this.saveMessageToLocalStorage(message);
    }
  }

  /**
   * Get messages for a specific session
   */
  async getSessionMessages(sessionId: string, limit: number = 50, offset: number = 0): Promise<UniversalChatMessage[]> {
    try {
      console.log('📥 Getting session messages:', { sessionId, limit, offset });

      const response = await fetch(`${API_BASE_URL}/universal-chat/messages/${this.userId}/${sessionId}?limit=${limit}&offset=${offset}`);

      if (!response.ok) {
        throw new Error(`Failed to get messages: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Retrieved messages from backend:', data.messages.length);
      return data.messages;

    } catch (error) {
      console.warn('⚠️ Failed to get messages from backend, using localStorage fallback:', error);
      return this.getSessionMessagesFromLocalStorage(sessionId);
    }
  }

  /**
   * Get user's chat sessions
   */
  async getUserSessions(limit: number = 20, offset: number = 0): Promise<ChatSession[]> {
    try {
      console.log('📥 Getting user sessions:', { limit, offset });

      const response = await fetch(`${API_BASE_URL}/universal-chat/sessions/${this.userId}?limit=${limit}&offset=${offset}`);

      if (!response.ok) {
        throw new Error(`Failed to get sessions: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Retrieved sessions from backend:', data.sessions.length);
      return data.sessions;

    } catch (error) {
      console.warn('⚠️ Failed to get sessions from backend, using localStorage fallback:', error);
      return this.getSessionsFromLocalStorage();
    }
  }

  /**
   * Create a new chat session
   */
  async createSession(sessionId?: string, title?: string): Promise<ChatSession> {
    try {
      const sessionData = {
        user_id: this.userId,
        session_id: sessionId,
        title: title || 'New Chat Session',
      };

      console.log('🆕 Creating new session:', sessionData);

      const response = await fetch(`${API_BASE_URL}/universal-chat/create-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.status}`);
      }

      const session = await response.json();
      console.log('✅ Session created successfully:', session);
      return session;

    } catch (error) {
      console.warn('⚠️ Failed to create session on backend, using localStorage fallback:', error);
      return this.createSessionInLocalStorage(sessionId, title);
    }
  }

  /**
   * Delete a chat session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      console.log('🗑️ Deleting session:', sessionId);

      const response = await fetch(`${API_BASE_URL}/universal-chat/session/${this.userId}/${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete session: ${response.status}`);
      }

      console.log('✅ Session deleted successfully');
      return true;

    } catch (error) {
      console.warn('⚠️ Failed to delete session from backend, using localStorage fallback:', error);
      return this.deleteSessionFromLocalStorage(sessionId);
    }
  }

  /**
   * Get conversation context for AI continuity
   */
  async getConversationContext(sessionId: string, limit: number = 5): Promise<ConversationContext> {
    try {
      console.log('🔍 Getting conversation context:', { sessionId, limit });

      const response = await fetch(`${API_BASE_URL}/universal-chat/context/${this.userId}/${sessionId}?limit=${limit}`);

      if (!response.ok) {
        throw new Error(`Failed to get context: ${response.status}`);
      }

      const context = await response.json();
      console.log('✅ Retrieved conversation context:', context);
      return context;

    } catch (error) {
      console.warn('⚠️ Failed to get context from backend, using localStorage fallback:', error);
      return this.getContextFromLocalStorage(sessionId, limit);
    }
  }

  /**
   * Generate a unique session ID
   */
  generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================================================
  // LOCALSTORAGE FALLBACK METHODS
  // ============================================================================

  private saveMessageToLocalStorage(message: Omit<UniversalChatMessage, 'user_id'>): UniversalChatMessage {
    const messageWithId: UniversalChatMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: this.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const storageKey = `universal_chat_${this.userId}_${message.session_id}`;
    const existingMessages = JSON.parse(localStorage.getItem(storageKey) || '[]');
    existingMessages.push(messageWithId);
    localStorage.setItem(storageKey, JSON.stringify(existingMessages));

    // Update session info
    this.updateSessionInLocalStorage(message.session_id, messageWithId);

    return messageWithId;
  }

  private getSessionMessagesFromLocalStorage(sessionId: string): UniversalChatMessage[] {
    const storageKey = `universal_chat_${this.userId}_${sessionId}`;
    return JSON.parse(localStorage.getItem(storageKey) || '[]');
  }

  private getSessionsFromLocalStorage(): ChatSession[] {
    const sessionsKey = `universal_chat_sessions_${this.userId}`;
    return JSON.parse(localStorage.getItem(sessionsKey) || '[]');
  }

  private createSessionInLocalStorage(sessionId?: string, title?: string): ChatSession {
    const session: ChatSession = {
      id: `session_${Date.now()}`,
      session_id: sessionId || this.generateSessionId(),
      user_id: this.userId,
      title: title || 'New Chat Session',
      message_count: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const sessionsKey = `universal_chat_sessions_${this.userId}`;
    const sessions = this.getSessionsFromLocalStorage();
    sessions.unshift(session);
    localStorage.setItem(sessionsKey, JSON.stringify(sessions));

    return session;
  }

  private updateSessionInLocalStorage(sessionId: string, lastMessage: UniversalChatMessage): void {
    const sessionsKey = `universal_chat_sessions_${this.userId}`;
    const sessions = this.getSessionsFromLocalStorage();
    
    let session = sessions.find(s => s.session_id === sessionId);
    if (!session) {
      // Create session if it doesn't exist
      session = this.createSessionInLocalStorage(sessionId, 
        lastMessage.role === 'user' ? 
          (lastMessage.content.length > 50 ? lastMessage.content.substring(0, 47) + '...' : lastMessage.content) :
          'New Chat Session'
      );
      return;
    }

    // Update existing session
    session.message_count += 1;
    session.last_message_at = lastMessage.created_at;
    session.updated_at = new Date().toISOString();

    // Update title if it's still default and this is a user message
    if (session.title === 'New Chat Session' && lastMessage.role === 'user') {
      session.title = lastMessage.content.length > 50 ? 
        lastMessage.content.substring(0, 47) + '...' : 
        lastMessage.content;
    }

    localStorage.setItem(sessionsKey, JSON.stringify(sessions));
  }

  private deleteSessionFromLocalStorage(sessionId: string): boolean {
    try {
      // Delete messages
      const messagesKey = `universal_chat_${this.userId}_${sessionId}`;
      localStorage.removeItem(messagesKey);

      // Delete session from sessions list
      const sessionsKey = `universal_chat_sessions_${this.userId}`;
      const sessions = this.getSessionsFromLocalStorage();
      const filteredSessions = sessions.filter(s => s.session_id !== sessionId);
      localStorage.setItem(sessionsKey, JSON.stringify(filteredSessions));

      return true;
    } catch (error) {
      console.error('Error deleting session from localStorage:', error);
      return false;
    }
  }

  private getContextFromLocalStorage(sessionId: string, limit: number): ConversationContext {
    const messages = this.getSessionMessagesFromLocalStorage(sessionId);
    const recentMessages = messages.slice(-limit);

    const context: ConversationContext = {
      session_id: sessionId,
      recent_messages: recentMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.created_at || new Date().toISOString(),
      })),
      conversation_state: {},
    };

    // Get last action
    for (let i = recentMessages.length - 1; i >= 0; i--) {
      if (recentMessages[i].action_type) {
        context.last_action = recentMessages[i].action_type;
        break;
      }
    }

    // Merge conversation context from latest message
    const latestMessage = recentMessages[recentMessages.length - 1];
    if (latestMessage?.conversation_context) {
      context.conversation_state = latestMessage.conversation_context;
    }

    return context;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): { connected: boolean; fallback: boolean } {
    return {
      connected: !this.fallbackStorage,
      fallback: this.fallbackStorage,
    };
  }
}

// Export singleton instance
export const universalChatHistoryService = new UniversalChatHistoryService();
export default universalChatHistoryService;