// Chat History Service - LocalStorage Based
// Manages chat messages in browser's localStorage without authentication

import type { ChatMessage } from '@/types/aiGuidance';

interface ChatHistoryData {
  projectId: string;
  messages: ChatMessage[];
  sessionId: string;
  lastUpdated: string;
}

class ChatHistoryService {
  private readonly STORAGE_KEY = 'stem_chat_history';

  /**
   * Get all chat histories from localStorage
   */
  private getAllHistories(): Record<string, ChatHistoryData> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error reading chat histories:', error);
      return {};
    }
  }

  /**
   * Save all chat histories to localStorage
   */
  private saveAllHistories(histories: Record<string, ChatHistoryData>): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(histories));
    } catch (error) {
      console.error('Error saving chat histories:', error);
    }
  }

  /**
   * Get chat history for a specific project
   */
  getProjectHistory(projectId: string): ChatMessage[] {
    try {
      const histories = this.getAllHistories();
      const projectHistory = histories[projectId];
      
      if (!projectHistory) {
        return [];
      }

      // Convert stored timestamps back to Date objects
      return projectHistory.messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
    } catch (error) {
      console.error(`Error getting chat history for project ${projectId}:`, error);
      return [];
    }
  }

  /**
   * Save a message to chat history
   */
  saveMessage(projectId: string, message: ChatMessage, sessionId: string): void {
    try {
      const histories = this.getAllHistories();
      
      if (!histories[projectId]) {
        histories[projectId] = {
          projectId,
          messages: [],
          sessionId,
          lastUpdated: new Date().toISOString()
        };
      }

      // Add new message
      histories[projectId].messages.push(message);
      histories[projectId].lastUpdated = new Date().toISOString();
      histories[projectId].sessionId = sessionId;

      this.saveAllHistories(histories);
      console.log(`💬 Saved message to localStorage for project ${projectId}`);
    } catch (error) {
      console.error('Error saving message:', error);
    }
  }

  /**
   * Save multiple messages (bulk save)
   */
  saveMessages(projectId: string, messages: ChatMessage[], sessionId: string): void {
    try {
      const histories = this.getAllHistories();
      
      histories[projectId] = {
        projectId,
        messages,
        sessionId,
        lastUpdated: new Date().toISOString()
      };

      this.saveAllHistories(histories);
      console.log(`💬 Saved ${messages.length} messages to localStorage for project ${projectId}`);
    } catch (error) {
      console.error('Error saving messages:', error);
    }
  }

  /**
   * Clear chat history for a specific project
   */
  clearProjectHistory(projectId: string): void {
    try {
      const histories = this.getAllHistories();
      delete histories[projectId];
      this.saveAllHistories(histories);
      console.log(`🗑️ Cleared chat history for project ${projectId}`);
    } catch (error) {
      console.error('Error clearing project history:', error);
    }
  }

  /**
   * Clear all chat histories
   */
  clearAllHistories(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('🗑️ Cleared all chat histories');
    } catch (error) {
      console.error('Error clearing all histories:', error);
    }
  }

  /**
   * Get session ID for a project
   */
  getSessionId(projectId: string): string | null {
    try {
      const histories = this.getAllHistories();
      return histories[projectId]?.sessionId || null;
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
   * Get total message count across all projects
   */
  getTotalMessageCount(): number {
    try {
      const histories = this.getAllHistories();
      return Object.values(histories).reduce(
        (total, history) => total + history.messages.length,
        0
      );
    } catch (error) {
      console.error('Error getting total message count:', error);
      return 0;
    }
  }

  /**
   * Get statistics about chat usage
   */
  getStats(): {
    totalProjects: number;
    totalMessages: number;
    lastUpdated: string | null;
  } {
    try {
      const histories = this.getAllHistories();
      const projectIds = Object.keys(histories);
      
      let latestUpdate: string | null = null;
      let totalMessages = 0;

      projectIds.forEach(projectId => {
        const history = histories[projectId];
        totalMessages += history.messages.length;
        
        if (!latestUpdate || history.lastUpdated > latestUpdate) {
          latestUpdate = history.lastUpdated;
        }
      });

      return {
        totalProjects: projectIds.length,
        totalMessages,
        lastUpdated: latestUpdate
      };
    } catch (error) {
      console.error('Error getting chat stats:', error);
      return {
        totalProjects: 0,
        totalMessages: 0,
        lastUpdated: null
      };
    }
  }

  /**
   * Export chat history as JSON (for backup)
   */
  exportHistory(): string {
    try {
      const histories = this.getAllHistories();
      return JSON.stringify(histories, null, 2);
    } catch (error) {
      console.error('Error exporting history:', error);
      return '{}';
    }
  }

  /**
   * Import chat history from JSON (for restore)
   */
  importHistory(jsonData: string): boolean {
    try {
      const histories = JSON.parse(jsonData);
      this.saveAllHistories(histories);
      console.log('✅ Successfully imported chat history');
      return true;
    } catch (error) {
      console.error('Error importing history:', error);
      return false;
    }
  }
}

// Export singleton instance
export const chatHistoryService = new ChatHistoryService();
export default chatHistoryService;
