// Chat History Service - Supabase Based
// Manages chat messages in Supabase database

import { supabase, ensureUserExists } from '@/lib/supabase';
import { ChatMessage } from '@/types/aiGuidance';

interface ChatHistoryData {
  projectId: string;
  messages: ChatMessage[];
  sessionId: string;
  lastUpdated: string;
}

class ChatHistoryServiceSupabase {
  /**
   * Get chat history for a specific project
   */
  async getProjectHistory(projectId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error(`Error getting chat history for project ${projectId}:`, error);
        return [];
      }

      return (data || []).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        messageType: msg.message_type,
        metadata: msg.metadata,
      }));
    } catch (error) {
      console.error(`Error getting chat history for project ${projectId}:`, error);
      return [];
    }
  }

  /**
   * Save a message to chat history
   */
  async saveMessage(projectId: string, message: ChatMessage, sessionId: string): Promise<void> {
    try {
      const userId = await ensureUserExists();
      if (!userId) {
        throw new Error('Failed to initialize user');
      }

      const { error } = await supabase
        .from('chat_messages')
        .insert({
          project_id: projectId,
          user_id: userId,
          session_id: sessionId,
          role: message.role,
          content: message.content,
          message_type: message.messageType || 'text',
          metadata: message.metadata || {},
        });

      if (error) {
        console.error('Error saving message:', error);
        throw new Error('Failed to save message');
      }

      console.log(`💬 Saved message to Supabase for project ${projectId}`);
    } catch (error) {
      console.error('Error saving message:', error);
    }
  }

  /**
   * Save multiple messages (bulk save)
   */
  async saveMessages(projectId: string, messages: ChatMessage[], sessionId: string): Promise<void> {
    try {
      const userId = await ensureUserExists();
      if (!userId) {
        throw new Error('Failed to initialize user');
      }

      const messagesToInsert = messages.map(msg => ({
        project_id: projectId,
        user_id: userId,
        session_id: sessionId,
        role: msg.role,
        content: msg.content,
        message_type: msg.messageType || 'text',
        metadata: msg.metadata || {},
      }));

      const { error } = await supabase
        .from('chat_messages')
        .insert(messagesToInsert);

      if (error) {
        console.error('Error saving messages:', error);
        throw new Error('Failed to save messages');
      }

      console.log(`💬 Saved ${messages.length} messages to Supabase for project ${projectId}`);
    } catch (error) {
      console.error('Error saving messages:', error);
    }
  }

  /**
   * Clear chat history for a specific project
   */
  async clearProjectHistory(projectId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('project_id', projectId);

      if (error) {
        console.error('Error clearing project history:', error);
        throw new Error('Failed to clear project history');
      }

      console.log(`🗑️ Cleared chat history for project ${projectId}`);
    } catch (error) {
      console.error('Error clearing project history:', error);
    }
  }

  /**
   * Clear all chat histories for current user
   */
  async clearAllHistories(): Promise<void> {
    try {
      const userId = await ensureUserExists();
      if (!userId) {
        throw new Error('Failed to initialize user');
      }

      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Error clearing all histories:', error);
        throw new Error('Failed to clear all histories');
      }

      console.log('🗑️ Cleared all chat histories');
    } catch (error) {
      console.error('Error clearing all histories:', error);
    }
  }

  /**
   * Get session ID for a project (gets the latest session ID)
   */
  async getSessionId(projectId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('session_id')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error getting session ID:', error);
        return null;
      }

      return data?.session_id || null;
    } catch (error) {
      console.error('Error getting session ID:', error);
      return null;
    }
  }

  /**
   * Generate a new session ID
   */
  generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get total message count across all projects for current user
   */
  async getTotalMessageCount(): Promise<number> {
    try {
      const userId = await ensureUserExists();
      if (!userId) {
        return 0;
      }

      const { count, error } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        console.error('Error getting total message count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting total message count:', error);
      return 0;
    }
  }

  /**
   * Get statistics about chat usage
   */
  async getStats(): Promise<{
    totalProjects: number;
    totalMessages: number;
    lastUpdated: string | null;
  }> {
    try {
      const userId = await ensureUserExists();
      if (!userId) {
        return {
          totalProjects: 0,
          totalMessages: 0,
          lastUpdated: null,
        };
      }

      // Get distinct project count
      const { data: projectData, error: projectError } = await supabase
        .from('chat_messages')
        .select('project_id')
        .eq('user_id', userId);

      if (projectError) {
        throw projectError;
      }

      const uniqueProjects = new Set((projectData || []).map(m => m.project_id));

      // Get total messages and latest timestamp
      const { data: messageData, error: messageError } = await supabase
        .from('chat_messages')
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (messageError) {
        throw messageError;
      }

      const totalMessages = await this.getTotalMessageCount();
      const lastUpdated = messageData && messageData.length > 0 ? messageData[0].created_at : null;

      return {
        totalProjects: uniqueProjects.size,
        totalMessages,
        lastUpdated,
      };
    } catch (error) {
      console.error('Error getting chat stats:', error);
      return {
        totalProjects: 0,
        totalMessages: 0,
        lastUpdated: null,
      };
    }
  }

  /**
   * Export chat history as JSON (for backup)
   */
  async exportHistory(): Promise<string> {
    try {
      const userId = await ensureUserExists();
      if (!userId) {
        return '{}';
      }

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      // Group by project
      const grouped: Record<string, any> = {};
      (data || []).forEach(msg => {
        if (!grouped[msg.project_id]) {
          grouped[msg.project_id] = {
            projectId: msg.project_id,
            messages: [],
            sessionId: msg.session_id,
            lastUpdated: msg.created_at,
          };
        }
        grouped[msg.project_id].messages.push({
          role: msg.role,
          content: msg.content,
          timestamp: msg.created_at,
          messageType: msg.message_type,
          metadata: msg.metadata,
        });
      });

      return JSON.stringify(grouped, null, 2);
    } catch (error) {
      console.error('Error exporting history:', error);
      return '{}';
    }
  }
}

// Export singleton instance
export const chatHistoryServiceSupabase = new ChatHistoryServiceSupabase();
export default chatHistoryServiceSupabase;
