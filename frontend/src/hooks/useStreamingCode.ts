import { useState, useEffect, useRef, useCallback } from 'react';
import { streamingService } from '@/services/streamingService';

export interface StreamingMessage {
  type: 'progress' | 'file_generated' | 'generation_complete' | 'generation_error' | 'code_chunk';
  stage?: string;
  message?: string;
  progress?: number;
  current_file?: string;
  file_name?: string;
  content?: string;
  error?: string;
}

interface UseStreamingCodeReturn {
  isConnected: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  messages: StreamingMessage[];
  lastMessage: StreamingMessage | null;
  
  connect: (projectId: string, generationId: string) => void;
  disconnect: () => void;
  clearMessages: () => void;
}

export const useStreamingCode = (): UseStreamingCodeReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [messages, setMessages] = useState<StreamingMessage[]>([]);
  const [lastMessage, setLastMessage] = useState<StreamingMessage | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback((projectId: string, generationId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    setConnectionStatus('connecting');
    
    try {
      const wsUrl = streamingService.getStreamingUrl(projectId, generationId);
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
        console.log('Streaming WebSocket connected');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: StreamingMessage = JSON.parse(event.data);
          setMessages(prev => [...prev, message]);
          setLastMessage(message);
        } catch (error) {
          console.error('Error parsing streaming message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        // Attempt reconnection if not a clean close and under retry limit
        if (!event.wasClean && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
            connect(projectId, generationId);
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('Streaming WebSocket error:', error);
        setConnectionStatus('error');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionStatus('disconnected');
    reconnectAttemptsRef.current = 0;
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setLastMessage(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    connectionStatus,
    messages,
    lastMessage,
    connect,
    disconnect,
    clearMessages
  };
};