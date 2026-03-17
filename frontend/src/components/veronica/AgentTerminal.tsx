import React, { useEffect, useRef } from 'react';
import { Terminal, Code, CheckCircle2, FlaskConical, AlertTriangle } from 'lucide-react';

export type AgentEvent = {
  event: 'plan' | 'file_start' | 'file_done' | 'fix' | 'error' | 'done';
  data?: string;
  path?: string;
  timestamp: string; // ISO string
};

interface AgentTerminalProps {
  events: AgentEvent[];
  isStreaming: boolean;
}

export const AgentTerminal: React.FC<AgentTerminalProps> = ({ events, isStreaming }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, isStreaming]);

  return (
    <div className="rounded-xl overflow-hidden border border-primary/20 bg-black/90 font-mono text-sm shadow-2xl flex flex-col h-[300px] mt-4">
      <div className="flex items-center gap-2 px-4 py-2 bg-black/50 border-b border-primary/20 text-xs text-primary/70 shrink-0">
        <Terminal className="w-4 h-4" />
        <span>veronica_agent_v2.1.0</span>
        {isStreaming && (
          <span className="ml-auto flex items-center gap-2 text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            BUILDING
          </span>
        )}
      </div>
      
      <div ref={scrollRef} className="p-4 overflow-y-auto flex-1 space-y-2">
        {events.map((ev, i) => {
          const timeStr = new Date(ev.timestamp).toLocaleTimeString([], { hour12: false });
          
          if (ev.event === 'plan') {
            return (
              <div key={i} className="flex gap-3 text-cyan-400">
                <FlaskConical className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="break-all">[{timeStr}] {ev.data}</span>
              </div>
            );
          }
          
          if (ev.event === 'file_start') {
            return (
              <div key={i} className="flex gap-3 text-green-400/70">
                <Code className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="break-all">[{timeStr}] Generating {ev.path}...</span>
              </div>
            );
          }
          
          if (ev.event === 'file_done') {
            return (
              <div key={i} className="flex gap-3 text-green-400">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="break-all">[{timeStr}] Successfully wrote {ev.path}</span>
              </div>
            );
          }

          if (ev.event === 'fix') {
            return (
              <div key={i} className="flex gap-3 text-yellow-500">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="break-all">[{timeStr}] {ev.data}</span>
              </div>
            );
          }

          if (ev.event === 'error') {
            return (
              <div key={i} className="flex gap-3 text-red-500">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="break-all">[{timeStr}] ERROR: {ev.data}</span>
              </div>
            );
          }
          
          if (ev.event === 'done') {
            return (
              <div key={i} className="flex gap-3 text-primary font-bold mt-4">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>[{timeStr}] Build complete and saved successfully.</span>
              </div>
            );
          }

          return null;
        })}
        
        {isStreaming && (
          <div className="flex gap-3 text-green-500/50 mt-2 hover:bg-white/5 p-1 rounded transition">
            <span className="shrink-0">▶</span>
            <span className="animate-pulse">_</span>
          </div>
        )}
      </div>
    </div>
  );
};
