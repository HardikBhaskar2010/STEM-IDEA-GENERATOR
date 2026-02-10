'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Code, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Download, 
  Copy, 
  Eye, 
  X,
  Pause,
  Play,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface CodeFile {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  content: string;
  description?: string;
  size_bytes: number;
  is_main_file: boolean;
}

interface StreamingEvent {
  type: 'status_update' | 'file_generated' | 'progress_update' | 'error' | 'completion' | 'connection_ack' | 'info' | 'success' | 'progress';
  timestamp: Date;
  message: string;
  details?: string;
  data?: any;
}

interface StreamingCodeViewProps {
  generationId: string;
  projectId: string;
  isVisible: boolean;
  onClose: () => void;
  onComplete?: (files: CodeFile[]) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

const StreamingCodeView: React.FC<StreamingCodeViewProps> = ({
  generationId,
  projectId,
  isVisible,
  onClose,
  onComplete,
  onError,
  onCancel
}) => {
  const [status, setStatus] = useState<'connecting' | 'generating' | 'completed' | 'error' | 'cancelled'>('connecting');
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('Initializing...');
  const [generatedFiles, setGeneratedFiles] = useState<CodeFile[]>([]);
  const [events, setEvents] = useState<StreamingEvent[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filesGenerated, setFilesGenerated] = useState(0);
  const [estimatedTotal, setEstimatedTotal] = useState(3);
  
  const wsRef = useRef<WebSocket | null>(null);
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 3;

  // Real WebSocket connection for streaming
  useEffect(() => {
    if (!isVisible || !generationId) return;

    // Connect to real WebSocket endpoint
    const connectWebSocket = () => {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001/api';
      const wsBaseUrl = process.env.NEXT_PUBLIC_WS_BASE_URL || apiBaseUrl.replace('https://', 'wss://').replace('http://', 'ws://').replace('/api', '');
      const wsUrl = `${wsBaseUrl}/api/projects/${generationId}/stream`;
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connected for code generation streaming');
        setStatus('generating');
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'event') {
            setEvents(prev => [...prev, { ...data.event, timestamp: new Date() }]);
            setCurrentMessage(data.event.message);
          }
          
          if (data.type === 'progress') {
            setProgress(data.progress);
          }
          
          if (data.type === 'file_generated') {
            setFilesGenerated(prev => prev + 1);
          }
          
          if (data.type === 'completed') {
            setStatus('completed');
            setGeneratedFiles(data.files || []);
            onComplete?.(data.files || []);
          }
          
          if (data.type === 'error') {
            setStatus('error');
            onError?.(data.message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('error');
        onError?.('Connection error occurred');
      };
      
      ws.onclose = () => {
        console.log('WebSocket connection closed');
      };
      
      return ws;
    };

    const ws = connectWebSocket();
    
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [isVisible, generationId, onComplete, onError]);

  // Scroll to bottom of events
  const scrollToBottom = () => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [events]);

  if (!isVisible) return null;

  return (
    <div className="h-full flex flex-col bg-black/40 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            status === 'generating' && "bg-green-400 animate-pulse",
            status === 'completed' && "bg-blue-400",
            status === 'error' && "bg-red-400",
            status === 'connecting' && "bg-yellow-400 animate-pulse"
          )} />
          <span className="text-sm font-medium text-white">
            {status === 'connecting' && 'Connecting...'}
            {status === 'generating' && 'Generating Code...'}
            {status === 'completed' && 'Generation Complete'}
            {status === 'error' && 'Generation Failed'}
          </span>
          <Badge variant="secondary" className="text-xs">
            {filesGenerated}/{estimatedTotal} files
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {status === 'generating' && onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs defaultValue="events" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 bg-white/5 border-b border-white/10">
            <TabsTrigger value="events" className="text-white data-[state=active]:bg-white/10">
              Events
            </TabsTrigger>
            <TabsTrigger value="files" className="text-white data-[state=active]:bg-white/10">
              Files ({generatedFiles.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="events" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full p-4">
              <div className="space-y-2">
                {events.map((event, index) => (
                  <div
                    key={index}
                    className={cn(
                      "p-3 rounded-lg border text-sm",
                      event.type === 'error' && "bg-red-500/10 border-red-500/30 text-red-300",
                      event.type === 'success' && "bg-green-500/10 border-green-500/30 text-green-300",
                      event.type === 'info' && "bg-blue-500/10 border-blue-500/30 text-blue-300",
                      event.type === 'progress' && "bg-purple-500/10 border-purple-500/30 text-purple-300"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-white/60">
                        {event.timestamp.toLocaleTimeString()}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {event.type}
                      </Badge>
                    </div>
                    <div>{event.message}</div>
                    {event.details && (
                      <div className="mt-2 text-xs text-white/60 font-mono">
                        {event.details}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={eventsEndRef} />
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="files" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full p-4">
              <div className="space-y-2">
                {generatedFiles.map((file) => (
                  <Card key={file.id} className="bg-white/5 border-white/10">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-400" />
                          <span className="font-medium text-white">{file.file_name}</span>
                          {file.is_main_file && (
                            <Badge variant="secondary" className="text-xs">Main</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
                            <Download className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-xs text-white/60 mb-2">
                        {file.description} • {(file.size_bytes / 1024).toFixed(1)} KB
                      </div>
                      <div className="bg-black/20 rounded p-2 text-xs font-mono text-white/80 max-h-32 overflow-y-auto">
                        {file.content.substring(0, 200)}
                        {file.content.length > 200 && '...'}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Progress */}
      {progress > 0 && progress < 100 && (
        <div className="p-4 border-t border-white/10">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-white/80">Generation Progress</span>
            <span className="text-sm text-white/60">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StreamingCodeView;