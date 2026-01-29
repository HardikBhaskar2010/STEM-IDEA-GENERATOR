// Streaming service for real-time AI responses

export interface StreamChunk {
  content: string;
  isComplete: boolean;
  metadata?: {
    tokensUsed?: number;
    model?: string;
  };
}

export interface StreamOptions {
  onChunk?: (chunk: StreamChunk) => void;
  onComplete?: (fullContent: string) => void;
  onError?: (error: Error) => void;
}

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'https://perfection-v2.onrender.com/api';

export class StreamingService {
  private abortController: AbortController | null = null;

  async streamProjectGeneration(
    params: {
      projectType: string;
      skillLevel: string;
      interests?: string;
      budget?: string;
      duration?: string;
    },
    options: StreamOptions
  ): Promise<void> {
    this.abortController = new AbortController();
    let fullContent = '';

    try {
      // Ensure proper URL construction - VITE_API_BASE_URL already includes /api
      const url = BACKEND_URL.endsWith('/api') 
        ? `${BACKEND_URL}/generate-project-stream`
        : `${BACKEND_URL}/api/generate-project-stream`;
      
      console.log('🌐 Streaming from:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // Final chunk
          if (options.onChunk) {
            options.onChunk({
              content: fullContent,
              isComplete: true
            });
          }
          if (options.onComplete) {
            options.onComplete(fullContent);
          }
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            if (data === '[DONE]') {
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.content) {
                fullContent += parsed.content;
                
                if (options.onChunk) {
                  options.onChunk({
                    content: fullContent,
                    isComplete: false,
                    metadata: parsed.metadata
                  });
                }
              }

              if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', data, parseError);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log('Stream aborted by user');
          return;
        }
        if (options.onError) {
          options.onError(error);
        }
      }
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}

export const streamingService = new StreamingService();