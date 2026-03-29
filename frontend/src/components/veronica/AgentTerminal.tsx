import React, { useEffect, useRef } from 'react';
import {
  Terminal, Code, CheckCircle2, FlaskConical, AlertTriangle,
  HeartPulse, ShieldCheck, ShieldAlert, Cpu, Zap, SearchCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AgentEventType =
  | 'plan' | 'plan_ready'
  | 'file_start' | 'file_done'
  | 'fix' | 'error'
  | 'sandbox_ready'
  | 'scaffold_start' | 'scaffold_done'
  | 'debug_start' | 'debug_iteration' | 'debug_done'
  // Brain Upgrade v2 + v3 badge events
  | 'healing_start' | 'healing_success' | 'healing_failed'
  // done variants
  | 'done' | 'done_failed';

export type AgentEvent = {
  event: AgentEventType;
  data?: string;
  path?: string;
  lines?: number;
  timestamp: string;
};

interface AgentTerminalProps {
  events: AgentEvent[];
  isStreaming: boolean;
}

// ---------------------------------------------------------------------------
// Badge config — one entry per event category
// ---------------------------------------------------------------------------

type BadgeCfg = {
  icon: React.ElementType;
  color: string;      // Tailwind text color
  bg?: string;        // optional pill background
  label?: string;     // prefix shown before ev.data
  bold?: boolean;
};

const BADGE: Partial<Record<AgentEventType, BadgeCfg>> = {
  plan_ready: {
    icon: FlaskConical,
    color: 'text-cyan-400',
    label: '[plan]',
  },
  plan: {
    icon: FlaskConical,
    color: 'text-cyan-400',
    label: '[plan]',
  },
  sandbox_ready: {
    icon: Cpu,
    color: 'text-sky-400',
    label: '[sandbox]',
  },
  scaffold_start: {
    icon: Zap,
    color: 'text-violet-400',
    label: '[scaffold]',
  },
  scaffold_done: {
    icon: CheckCircle2,
    color: 'text-violet-400',
    label: '[scaffold ✓]',
  },
  file_start: {
    icon: Code,
    color: 'text-green-400/70',
  },
  file_done: {
    icon: CheckCircle2,
    color: 'text-green-400',
  },
  debug_start: {
    icon: SearchCheck,
    color: 'text-amber-400',
    label: '[debug]',
  },
  debug_iteration: {
    icon: SearchCheck,
    color: 'text-amber-400',
    label: '[debug]',
  },
  debug_done: {
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bold: true,
  },
  fix: {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    label: '[fix]',
  },
  error: {
    icon: AlertTriangle,
    color: 'text-red-500',
  },

  // ── Healing badges ─────────────────────────────────────────────────────────
  healing_start: {
    icon: HeartPulse,
    color: 'text-amber-300',
    bg: 'bg-amber-500/15 border border-amber-500/30',
    label: '⚕ HEALING',
    bold: true,
  },
  healing_success: {
    icon: ShieldCheck,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15 border border-emerald-500/30',
    label: '✅ HEALED',
    bold: true,
  },
  healing_failed: {
    icon: ShieldAlert,
    color: 'text-rose-400',
    bg: 'bg-rose-500/15 border border-rose-500/30',
    label: '⚠ HEAL PARTIAL',
    bold: true,
  },

  done: {
    icon: CheckCircle2,
    color: 'text-primary',
    bold: true,
  },
  done_failed: {
    icon: AlertTriangle,
    color: 'text-red-500',
    bold: true,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(isoStr: string): string {
  return isoStr
    ? new Date(isoStr).toLocaleTimeString([], { hour12: false })
    : new Date().toLocaleTimeString([], { hour12: false });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const AgentTerminal: React.FC<AgentTerminalProps> = ({ events, isStreaming }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, isStreaming]);

  // Determine active states for the header badges
  const latestHealingEvent = events.slice().reverse().find(e => e.event.startsWith('healing_'))?.event;
  const isCurrentlyHealing = latestHealingEvent === 'healing_start';

  return (
    <div className="rounded-xl overflow-hidden border border-[#1e1e24] bg-[#0A0A0F] shadow-2xl flex flex-col h-[320px]">
      {/* Header */}
      <div className="relative flex items-center justify-center px-4 py-3 bg-[#12121A] border-b border-[#1e1e24] shrink-0 font-sans select-none">
        {/* macOS Dots */}
        <div className="absolute left-4 flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80 border border-black/10"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/80 border border-black/10"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/80 border border-black/10"></div>
        </div>

        {/* Title */}
        <span className="text-[12px] font-bold text-gray-400 tracking-wider">VERONICA TERMINAL</span>

        {/* Right Status Badges */}
        <div className="absolute right-4 flex items-center gap-3">
          {isCurrentlyHealing && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[11px] font-bold text-amber-500 tracking-wide uppercase">Self-healing...</span>
            </div>
          )}
          {isStreaming && !isCurrentlyHealing && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[11px] font-bold text-indigo-400 tracking-wide">BUILDING</span>
            </div>
          )}
        </div>
      </div>

      {/* Log body */}
      <div ref={scrollRef} className="p-5 overflow-y-auto flex-1 space-y-3 font-mono text-[13px] leading-relaxed">
        {events.map((ev, i) => {
          const cfg = BADGE[ev.event];
          if (!cfg) return null;

          const Icon = cfg.icon;
          const time = fmt(ev.timestamp);

          // File-specific display for file_start / file_done
          if (ev.event === 'file_start') {
            return (
              <div key={i} className="flex gap-3 text-gray-500">
                <Icon className="w-4 h-4 shrink-0 mt-0.5 opacity-50" />
                <span className="break-all">[{time}] Generating {ev.path}...</span>
              </div>
            );
          }

          if (ev.event === 'file_done') {
            return (
              <div key={i} className="flex gap-3 text-emerald-400">
                <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="break-all">
                  <span className="text-gray-500">[{time}]</span> ✓ {ev.path}
                  {ev.lines != null && (
                    <span className="text-emerald-500/50 flex-shrink-0 ml-2">({ev.lines} lines)</span>
                  )}
                </span>
              </div>
            );
          }

          if (ev.event === 'done') {
            return (
              <div key={i} className="flex gap-3 text-indigo-400 font-bold mt-6 pt-4 border-t border-white/5">
                <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                <span>[{time}] Build complete — project saved successfully.</span>
              </div>
            );
          }

          // Special Card Layout for healing_start
          if (ev.event === 'healing_start') {
            return (
              <div key={i} className="my-4 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 p-4">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-2 font-sans tracking-wide uppercase">
                  <HeartPulse className="w-4 h-4" />
                  Self-Healing Protocol Engaged
                </div>
                <div className="text-gray-300 font-sans text-[13px] whitespace-pre-wrap">
                  {ev.data}
                </div>
              </div>
            );
          }

          return (
            <div
              key={i}
              className={cn(
                'flex gap-3',
                cfg.color,
                cfg.bold ? 'font-semibold' : ''
              )}
            >
              <Icon className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="break-all">
                <span className="text-gray-500 select-none">[{time}]</span>
                {cfg.label && <span className="mx-1.5 opacity-80 select-none">{cfg.label}</span>}
                {ev.data}
              </span>
            </div>
          );
        })}

        {/* Streaming cursor */}
        {isStreaming && (
          <div className="flex gap-3 text-indigo-500/50 mt-4 p-1 rounded transition">
            <span className="shrink-0">▶</span>
            <span className="animate-pulse">_</span>
          </div>
        )}
      </div>
    </div>
  );
};
