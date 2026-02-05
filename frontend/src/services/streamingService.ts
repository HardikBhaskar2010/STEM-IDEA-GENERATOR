import { CodeGenerationParams, StreamingEvent } from './codeGenerationService';

// Types
export interface StreamingConnection {
  id: string;
  projectId: string;
  generationId?: string;
  websocket: WebSocket;
  status: ConnectionStatus;
  connectedAt: Date;
  lastActivity: Date;
  retryCount: number;
  maxRetries: number;
}

export enum ConnectionStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  ERROR = 'error',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting'
}

export interface StreamingEventHandler {
  onStatusUpdate?: (data: any) => void;
  onFileGenerated?: (data: any) => void;
  onProgressUpdate?: (data: any) => void;
  onError?: (data: any) => void;
  onCompletion?: (data: any) => void;
  onConnectionAck?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: (event: CloseEvent) => void;
  onReconnect?: () => void;
}

export interface StreamingOptions {
  autoReconnect?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  heartbeatInterval?: number;
  connectionTimeout?: number;
}

class StreamingService {
  private connections: Map<string, StreamingConnection> = new Map();
  private eventHandlers: Map<string, StreamingEventHandler> = new Map();
  private baseWsUrl: string;
  private defaultOptions: StreamingOptions = {
    autoReconnect: true,
    maxRetries: 3,
    retryDelay: 2000,
    heartbeatInterval: 30000,
    connectionTimeout: 10000
  };

  constructor() {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    this.baseWsUrl = baseUrl.replace('http', 'ws');
    
    // Clean up connections when page unloads
    window.addEventListener('beforeunload', () => {
      this.disconnectAll();
    });
  }

  /**
   * Connect to streaming WebSocket for code generation
   */
  async connect(
    projectId: string,
    generationId: string,
    eventHandler: StreamingEventHandler,
    options: StreamingOptions = {}
  ): Promise<StreamingConnection> {
    const connectionId = `${projectId}_${generationId}`;
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    // Close existing connection if any
    if (this.connections.has(connectionId)) {
      await this.disconnect(connectionId);
    }

    const wsUrl = `${this.baseWsUrl}/projects/${projectId}/code-generation/${generationId}/stream`;
    
    return new Promise((resolve, reject) => {
      const websocket = new WebSocket(wsUrl);
      const connection: StreamingConnection = {
        id: connectionId,
        projectId,
        generationId,
        websocket,
        status: ConnectionStatus.CONNECTING,
        connectedAt: new Date(),
        lastActivity: new Date(),
        retryCount: 0,
        maxRetries: mergedOptions.maxRetries || 3
      };

      // Store connection and handler
      this.connections.set(connectionId, connection);
      this.eventHandlers.set(connectionId, eventHandler);

      // Connection timeout
      const connectionTimeout = setTimeout(() => {
        if (connection.status === ConnectionStatus.CONNECTING) {
          websocket.close();
          reject(new Error('Connection timeout'));
        }
      }, mergedOptions.connectionTimeout);

      websocket.onopen = () => {
        clearTimeout(connectionTimeout);
        connection.status = ConnectionStatus.CONNECTED;
        connection.lastActivity = new Date();
        
        console.log(`WebSocket connected: ${connectionId}`);
        eventHandler.onConnect?.();
        resolve(connection);
      };

      websocket.onmessage = (event) => {
        connection.lastActivity = new Date();
        this.handleMessage(connectionId, event);
      };

      websocket.onerror = (error) => {
        console.error(`WebSocket error for ${connectionId}:`, error);
        connection.status = ConnectionStatus.ERROR;
        
        if (connection.status === ConnectionStatus.CONNECTING) {
          clearTimeout(connectionTimeout);
          reject(error);
        }
      };

      websocket.onclose = (event) => {
        clearTimeout(connectionTimeout);
        console.log(`WebSocket closed for ${connectionId}:`, event.code, event.reason);
        
        const wasConnected = connection.status === ConnectionStatus.CONNECTED || 
                           connection.status === ConnectionStatus.GENERATING;
        
        connection.status = ConnectionStatus.DISCONNECTED;
        eventHandler.onDisconnect?.(event);

        // Auto-reconnect if enabled and connection was previously established
        if (mergedOptions.autoReconnect && wasConnected && 
            connection.retryCount < connection.maxRetries &&
            event.code !== 1000) { // Don't reconnect on normal closure
          this.scheduleReconnect(connectionId, mergedOptions.retryDelay || 2000);
        } else {
          this.cleanup(connectionId);
        }
      };
    });
  }

  /**
   * Start code generation with streaming
   */
  async startGeneration(
    connectionId: string,
    params: CodeGenerationParams
  ): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.websocket.readyState !== WebSocket.OPEN) {
      throw new Error('No active connection found');
    }

    connection.status = ConnectionStatus.GENERATING;
    
    const message = {
      action: 'start_generation',
      parameters: params
    };

    connection.websocket.send(JSON.stringify(message));
  }

  /**
   * Cancel ongoing generation
   */
  async cancelGeneration(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.websocket.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      action: 'cancel_generation'
    };

    connection.websocket.send(JSON.stringify(message));
  }

  /**
   * Send heartbeat to keep connection alive
   */
  sendHeartbeat(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.websocket.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      action: 'heartbeat',
      timestamp: new Date().toISOString()
    };

    connection.websocket.send(JSON.stringify(message));
  }

  /**
   * Disconnect from streaming WebSocket
   */
  async disconnect(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    if (connection.websocket.readyState === WebSocket.OPEN) {
      connection.websocket.close(1000, 'User disconnected');
    }

    this.cleanup(connectionId);
  }

  /**
   * Disconnect all active connections
   */
  disconnectAll(): void {
    const connectionIds = Array.from(this.connections.keys());
    connectionIds.forEach(id => {
      this.disconnect(id);
    });
  }

  /**
   * Get connection status
   */
  getConnectionStatus(connectionId: string): ConnectionStatus | null {
    const connection = this.connections.get(connectionId);
    return connection?.status || null;
  }

  /**
   * Get all active connections
   */
  getActiveConnections(): StreamingConnection[] {
    return Array.from(this.connections.values()).filter(
      conn => conn.status !== ConnectionStatus.DISCONNECTED
    );
  }

  /**
   * Check if connection is active
   */
  isConnected(connectionId: string): boolean {
    const connection = this.connections.get(connectionId);
    return connection?.status === ConnectionStatus.CONNECTED ||
           connection?.status === ConnectionStatus.GENERATING;
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(connectionId: string, event: MessageEvent): void {
    try {
      const streamingEvent: StreamingEvent = JSON.parse(event.data);
      const eventHandler = this.eventHandlers.get(connectionId);
      
      if (!eventHandler) {
        console.warn(`No event handler found for connection ${connectionId}`);
        return;
      }

      // Update connection status based on event type
      const connection = this.connections.get(connectionId);
      if (connection) {
        switch (streamingEvent.type) {
          case 'connection_ack':
            connection.status = ConnectionStatus.CONNECTED;
            break;
          case 'status_update':
            if (streamingEvent.data.status === 'generating') {
              connection.status = ConnectionStatus.GENERATING;
            }
            break;
          case 'completion':
            connection.status = ConnectionStatus.COMPLETED;
            break;
          case 'error':
            connection.status = ConnectionStatus.ERROR;
            break;
        }
      }

      // Route event to appropriate handler
      switch (streamingEvent.type) {
        case 'connection_ack':
          eventHandler.onConnectionAck?.(streamingEvent.data);
          break;
        case 'status_update':
          eventHandler.onStatusUpdate?.(streamingEvent.data);
          break;
        case 'file_generated':
          eventHandler.onFileGenerated?.(streamingEvent.data);
          break;
        case 'progress_update':
          eventHandler.onProgressUpdate?.(streamingEvent.data);
          break;
        case 'error':
          eventHandler.onError?.(streamingEvent.data);
          break;
        case 'completion':
          eventHandler.onCompletion?.(streamingEvent.data);
          break;
        default:
          console.warn(`Unknown streaming event type: ${streamingEvent.type}`);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      const eventHandler = this.eventHandlers.get(connectionId);
      eventHandler?.onError?.({
        message: 'Failed to parse WebSocket message',
        error: error
      });
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(connectionId: string, delay: number): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    connection.status = ConnectionStatus.RECONNECTING;
    connection.retryCount++;

    console.log(`Scheduling reconnect for ${connectionId} in ${delay}ms (attempt ${connection.retryCount})`);

    setTimeout(async () => {
      try {
        const eventHandler = this.eventHandlers.get(connectionId);
        if (!eventHandler || !connection.generationId) {
          return;
        }

        // Attempt reconnection
        await this.connect(
          connection.projectId,
          connection.generationId,
          eventHandler,
          { autoReconnect: true, maxRetries: connection.maxRetries }
        );

        eventHandler.onReconnect?.();
        console.log(`Successfully reconnected: ${connectionId}`);
      } catch (error) {
        console.error(`Reconnection failed for ${connectionId}:`, error);
        
        if (connection.retryCount >= connection.maxRetries) {
          console.log(`Max retries reached for ${connectionId}, giving up`);
          this.cleanup(connectionId);
        } else {
          // Schedule next retry with exponential backoff
          const nextDelay = delay * Math.pow(2, connection.retryCount - 1);
          this.scheduleReconnect(connectionId, Math.min(nextDelay, 30000));
        }
      }
    }, delay);
  }

  /**
   * Clean up connection resources
   */
  private cleanup(connectionId: string): void {
    this.connections.delete(connectionId);
    this.eventHandlers.delete(connectionId);
  }

  /**
   * Start heartbeat for connection
   */
  startHeartbeat(connectionId: string, interval: number = 30000): void {
    const heartbeatId = setInterval(() => {
      if (this.isConnected(connectionId)) {
        this.sendHeartbeat(connectionId);
      } else {
        clearInterval(heartbeatId);
      }
    }, interval);
  }

  /**
   * Get streaming URL for a project generation
   */
  getStreamingUrl(projectId: string, generationId: string): string {
    return `${this.baseWsUrl}/projects/${projectId}/code-generation/${generationId}/stream`;
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    total: number;
    connected: number;
    generating: number;
    error: number;
    disconnected: number;
  } {
    const connections = Array.from(this.connections.values());
    
    return {
      total: connections.length,
      connected: connections.filter(c => c.status === ConnectionStatus.CONNECTED).length,
      generating: connections.filter(c => c.status === ConnectionStatus.GENERATING).length,
      error: connections.filter(c => c.status === ConnectionStatus.ERROR).length,
      disconnected: connections.filter(c => c.status === ConnectionStatus.DISCONNECTED).length
    };
  }

  /**
   * Monitor connection health
   */
  monitorConnections(): void {
    setInterval(() => {
      const now = new Date();
      const staleConnections: string[] = [];

      this.connections.forEach((connection, id) => {
        const timeSinceActivity = now.getTime() - connection.lastActivity.getTime();
        
        // Mark connections as stale if no activity for 5 minutes
        if (timeSinceActivity > 5 * 60 * 1000) {
          staleConnections.push(id);
        }
      });

      // Clean up stale connections
      staleConnections.forEach(id => {
        console.log(`Cleaning up stale connection: ${id}`);
        this.disconnect(id);
      });
    }, 60000); // Check every minute
  }

  /**
   * Create event handler with common patterns
   */
  createEventHandler(callbacks: {
    onProgress?: (progress: number, message: string) => void;
    onFileGenerated?: (fileName: string, fileData: any) => void;
    onComplete?: (files: any[]) => void;
    onError?: (error: string) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
  }): StreamingEventHandler {
    return {
      onConnect: callbacks.onConnect,
      onDisconnect: callbacks.onDisconnect,
      
      onConnectionAck: (data) => {
        console.log('Connection acknowledged:', data);
      },
      
      onStatusUpdate: (data) => {
        if (data.progress !== undefined) {
          callbacks.onProgress?.(data.progress, data.message || '');
        }
      },
      
      onFileGenerated: (data) => {
        callbacks.onFileGenerated?.(data.file_name, data);
      },
      
      onProgressUpdate: (data) => {
        const progress = data.progress_percentage || 0;
        const message = `Generated ${data.files_generated || 0} files`;
        callbacks.onProgress?.(progress, message);
      },
      
      onCompletion: (data) => {
        callbacks.onComplete?.(data.files || []);
      },
      
      onError: (data) => {
        callbacks.onError?.(data.message || 'Unknown error occurred');
      }
    };
  }

  /**
   * Validate WebSocket URL
   */
  private validateWebSocketUrl(url: string): boolean {
    try {
      const wsUrl = new URL(url);
      return wsUrl.protocol === 'ws:' || wsUrl.protocol === 'wss:';
    } catch {
      return false;
    }
  }

  /**
   * Get WebSocket ready state as string
   */
  getReadyState(connectionId: string): string {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return 'NOT_FOUND';
    }

    switch (connection.websocket.readyState) {
      case WebSocket.CONNECTING:
        return 'CONNECTING';
      case WebSocket.OPEN:
        return 'OPEN';
      case WebSocket.CLOSING:
        return 'CLOSING';
      case WebSocket.CLOSED:
        return 'CLOSED';
      default:
        return 'UNKNOWN';
    }
  }
}

// Export singleton instance
export const streamingService = new StreamingService();
export default streamingService;