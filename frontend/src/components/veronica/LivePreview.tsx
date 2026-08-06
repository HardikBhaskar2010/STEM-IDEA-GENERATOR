import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { ExternalLink, Square, RefreshCw, Terminal, Monitor, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LivePreviewProps {
  projectId: string;
  previewUrl: string | null;
  runId: string | null;
  status: 'idle' | 'starting' | 'running' | 'stopped' | 'error';
  startupLogs?: string[];
  onStop: () => void;
  className?: string;
}

type Tab = 'preview' | 'terminal';

export const LivePreview: React.FC<LivePreviewProps> = ({
  projectId,
  previewUrl,
  runId,
  status,
  startupLogs = [],
  onStop,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>(previewUrl ? 'preview' : 'terminal');
  const [streamLogs, setStreamLogs] = useState<string[]>([]);
  const [iframeKey, setIframeKey] = useState(0);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  // Switch to preview tab when URL becomes available
  useEffect(() => {
    if (previewUrl) {setActiveTab('preview');}
  }, [previewUrl]);

  // Auto-scroll terminal
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [streamLogs, startupLogs]);

  // SSE log stream when running
  useEffect(() => {
    if (status !== 'running' || !runId) {return;}

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://perfection-v2.onrender.com/api';
    const url = `${API_BASE}/veronica-projects/${projectId}/runs/${runId}/logs/stream`;

    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (e) => {
      const line = e.data;
      if (line === '[STREAM_END]') {
        es.close();
        return;
      }
      setStreamLogs(prev => [...prev, line]);
    };

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [projectId, runId, status]);

  const allLogs = [...startupLogs, ...streamLogs];

  return (
    <div className={cn('flex flex-col rounded-2xl border border-primary/20 overflow-hidden bg-black/40 backdrop-blur-xl', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-primary/15 bg-white/3">
        <div className="flex items-center gap-2">
          {/* Tab switcher */}
          <button
            onClick={() => setActiveTab('preview')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all',
              activeTab === 'preview'
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            )}
          >
            <Monitor className="w-3 h-3" />
            Preview
          </button>
          <button
            onClick={() => setActiveTab('terminal')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all',
              activeTab === 'terminal'
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            )}
          >
            <Terminal className="w-3 h-3" />
            Logs
            {allLogs.length > 0 && (
              <span className="ml-1 px-1 py-0 rounded text-[9px] bg-primary/20 text-primary">
                {allLogs.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Status badge */}
          <span className={cn(
            'flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full',
            status === 'running' ? 'bg-emerald-500/15 text-emerald-400' :
            status === 'starting' ? 'bg-amber-500/15 text-amber-400' :
            status === 'error' ? 'bg-red-500/15 text-red-400' :
            'bg-muted/20 text-muted-foreground'
          )}>
            {status === 'starting' && <Loader2 className="w-3 h-3 animate-spin" />}
            {status === 'running' && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
            {status === 'starting' ? 'Starting…' : status === 'running' ? 'Live' : status}
          </span>

          {previewUrl && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              title="Refresh preview"
              onClick={() => setIframeKey(k => k + 1)}
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          )}

          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open in new tab"
              className="flex items-center justify-center h-6 w-6 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

          {status === 'running' && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 hover:text-red-400 hover:bg-red-500/10"
              onClick={onStop}
              title="Stop sandbox"
            >
              <Square className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Preview panel */}
      {activeTab === 'preview' && (
        <div className="relative flex-1 min-h-0" style={{ height: '520px' }}>
          {status === 'starting' && !previewUrl && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Booting sandbox…</p>
                <p className="text-xs text-muted-foreground mt-1">Running npm install + npm run dev</p>
              </div>
            </div>
          )}
          {previewUrl ? (
            <iframe
              key={iframeKey}
              src={previewUrl}
              title="Live preview"
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          ) : status !== 'starting' ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No preview available
            </div>
          ) : null}
        </div>
      )}

      {/* Terminal panel */}
      {activeTab === 'terminal' && (
        <div
          className="flex-1 font-mono text-xs overflow-y-auto p-4 space-y-0.5 min-h-0"
          style={{ height: '520px', background: 'rgba(0,0,0,0.7)' }}
        >
          {allLogs.length === 0 ? (
            <span className="text-muted-foreground">Waiting for logs…</span>
          ) : (
            allLogs.map((line, i) => (
              <div
                key={i}
                className={cn(
                  'leading-5',
                  line.startsWith('✅') ? 'text-emerald-400' :
                  line.startsWith('⚠️') ? 'text-amber-400' :
                  line.startsWith('❌') ? 'text-red-400' :
                  line.startsWith('🚀') ? 'text-blue-400' :
                  line.startsWith('🌐') ? 'text-cyan-400' :
                  'text-slate-300'
                )}
              >
                {line}
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      )}
    </div>
  );
};
