import React, { useEffect, useRef, useState } from 'react';
import {
  Terminal, Code, CheckCircle2, FlaskConical, AlertTriangle,
  HeartPulse, ShieldCheck, ShieldAlert, Cpu, Zap, SearchCheck,
  ChevronDown, ChevronUp, Sparkles, Pencil, ChevronRight, X,
  RotateCcw, CheckCheck, TriangleAlert,
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
  | 'healing_start' | 'healing_success' | 'healing_failed'
  | 'decision'
  | 'intent_enriched'
  | 'qa_start' | 'qa_check_pass' | 'qa_check_fail' | 'qa_done'
  | 'done' | 'done_failed';

export type AgentEvent = {
  event: AgentEventType;
  data?: string;
  path?: string;
  lines?: number;
  timestamp: string;
  // for decision events
  question?: string;
  chosen?: string;
  alternatives?: string[];
  // for intent_enriched events
  requirements?: string[];
  // for qa events
  route?: string;
  statusCode?: number;
  latency?: number;
  total?: number;
  passed?: number;
};

interface AgentTerminalProps {
  events: AgentEvent[];
  isStreaming: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(isoStr: string): string {
  return isoStr
    ? new Date(isoStr).toLocaleTimeString([], { hour12: false })
    : new Date().toLocaleTimeString([], { hour12: false });
}

// ---------------------------------------------------------------------------
// Intent Enrichment Card
// ---------------------------------------------------------------------------

const IntentCard: React.FC<{ ev: AgentEvent }> = ({ ev }) => {
  const [expanded, setExpanded] = useState(false);
  const [removed, setRemoved] = useState<Set<number>>(new Set());
  const reqs = ev.requirements ?? (ev.data ? ev.data.split('\n').filter(Boolean) : []);

  return (
    <div className="mb-4 rounded-lg border border-indigo-500/20 bg-indigo-500/5 overflow-hidden font-sans">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-indigo-500/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="text-[12px] font-semibold text-indigo-300 tracking-wide">
            Veronica understood your prompt as…
          </span>
        </div>
        {expanded
          ? <ChevronUp className="w-3.5 h-3.5 text-indigo-400" />
          : <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
        }
      </button>
      {expanded && (
        <div className="px-4 pb-3 space-y-1.5 animate-in slide-in-from-top-1 duration-200">
          {reqs.map((req, i) => (
            !removed.has(i) && (
              <div key={i} className="flex items-center gap-2 group/req">
                <ChevronRight className="w-3 h-3 text-indigo-500 shrink-0" />
                <span className="text-[12px] text-gray-300 flex-1">{req}</span>
                <button
                  onClick={() => setRemoved(s => new Set([...s, i]))}
                  className="opacity-0 group-hover/req:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400"
                  title="Remove"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )
          ))}
          <button className="mt-2 flex items-center gap-1.5 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors">
            <Pencil className="w-3 h-3" />
            Edit requirements
          </button>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Decision Card
// ---------------------------------------------------------------------------

const DecisionCard: React.FC<{ ev: AgentEvent }> = ({ ev }) => {
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [chosen, setChosen] = useState(ev.chosen ?? '');
  const alternatives = ev.alternatives ?? [];

  return (
    <div
      className={cn(
        'my-4 rounded-lg border border-violet-500/20 bg-violet-500/5 p-4 font-sans',
        'animate-in slide-in-from-top-2 duration-300'
      )}
    >
      <div className="flex items-center gap-2 text-violet-300 text-[11px] font-bold tracking-widest uppercase mb-2">
        <Cpu className="w-3.5 h-3.5" />
        Veronica is making a call…
      </div>
      {ev.question && (
        <p className="text-[13px] text-gray-300 mb-3">{ev.question}</p>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="px-2.5 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-200 text-[12px] font-medium">
          {chosen}
        </span>
        <button
          onClick={() => setOverrideOpen(v => !v)}
          className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors ml-1"
        >
          Override
        </button>
      </div>
      {overrideOpen && alternatives.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5 animate-in slide-in-from-top-1 duration-150">
          {alternatives.map((alt, i) => (
            <button
              key={i}
              onClick={() => { setChosen(alt); setOverrideOpen(false); }}
              className={cn(
                'px-2 py-0.5 rounded-full text-[11px] border transition-all',
                chosen === alt
                  ? 'border-violet-500/40 bg-violet-500/15 text-violet-300'
                  : 'border-white/10 text-gray-400 hover:border-violet-500/30 hover:text-violet-300'
              )}
            >
              {alt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Healing Badge (header pill, 3 states)
// ---------------------------------------------------------------------------

type HealingState = 'attempting' | 'succeeded' | 'failed' | null;

function getHealingState(events: AgentEvent[]): HealingState {
  const last = events.slice().reverse().find(e => e.event.startsWith('healing_'));
  if (!last) return null;
  if (last.event === 'healing_start') return 'attempting';
  if (last.event === 'healing_success') return 'succeeded';
  if (last.event === 'healing_failed') return 'failed';
  return null;
}

const HealingBadge: React.FC<{ state: HealingState }> = ({ state }) => {
  if (!state) return null;
  if (state === 'attempting') return (
    <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
      <span className="text-[11px] font-bold text-amber-400 tracking-wide uppercase">Self-healing…</span>
    </div>
  );
  if (state === 'succeeded') return (
    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
      <CheckCheck className="w-3 h-3 text-emerald-400 shrink-0" />
      <span className="text-[11px] font-bold text-emerald-400 tracking-wide uppercase">Auto-fixed</span>
    </div>
  );
  if (state === 'failed') return (
    <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full">
      <X className="w-3 h-3 text-rose-400 shrink-0" />
      <span className="text-[11px] font-bold text-rose-400 tracking-wide uppercase">Fix failed</span>
    </div>
  );
  return null;
};

// ---------------------------------------------------------------------------
// Heal Failed Diff Viewer (collapsible, shown inline after healing_failed)
// ---------------------------------------------------------------------------

const HealFailedCard: React.FC<{ ev: AgentEvent }> = ({ ev }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="my-4 rounded-lg border border-rose-500/20 bg-rose-500/5 font-sans overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <TriangleAlert className="w-4 h-4 text-rose-400 shrink-0" />
        <div className="flex-1">
          <div className="text-[12px] font-bold text-rose-300 tracking-wide uppercase mb-0.5">Fix failed</div>
          <div className="text-[12px] text-gray-400">{ev.data}</div>
        </div>
        <button
          onClick={() => setOpen(v => !v)}
          className="text-[11px] text-rose-400 hover:text-rose-300 border border-rose-500/20 px-2 py-1 rounded transition-colors flex items-center gap-1"
        >
          View patch {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>
      {open && (
        <div className="px-4 pb-4 animate-in slide-in-from-top-1 duration-200">
          <pre className="text-[11px] font-mono text-gray-400 bg-black/40 rounded p-3 overflow-x-auto leading-5 border border-white/5">
            <span className="text-red-400">- // original code that failed</span>{'\n'}
            <span className="text-red-400">- const result = riskyOperation();</span>{'\n'}
            <span className="text-green-400">+ // attempted auto-fix</span>{'\n'}
            <span className="text-green-400">+ const result = safeOperation().catch(fallback);</span>{'\n'}
            <span className="text-gray-600">  // patch could not be applied cleanly</span>
          </pre>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// QA Panel (exported — rendered below terminal by parent)
// ---------------------------------------------------------------------------

type QACheck = {
  route: string;
  passed: boolean;
  statusCode?: number;
  latency?: number;
};

interface QAPanelProps {
  checks: QACheck[];
  summary: { total: number; passed: number };
  onRerun?: () => void;
  loading?: boolean;
}

export const QAPanel: React.FC<QAPanelProps> = ({ checks, summary, onRerun, loading }) => {
  return (
    <div className="mt-4 rounded-xl border border-[#1e1e24] bg-[#0d0d14] overflow-hidden font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e24]">
        <span className="text-[12px] font-bold text-gray-300 tracking-wide">QA Checks</span>
        <div className="flex items-center gap-3">
          <span className={cn(
            'text-[11px] font-bold px-2.5 py-0.5 rounded-full border',
            summary.passed === summary.total
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          )}>
            {summary.passed} / {summary.total} passed
          </span>
          {onRerun && (
            <button
              onClick={onRerun}
              className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-300 border border-white/10 hover:border-white/20 px-2 py-0.5 rounded transition-all"
            >
              <RotateCcw className="w-3 h-3" />
              Re-run QA
            </button>
          )}
        </div>
      </div>
      {/* Rows */}
      <div className="divide-y divide-[#1e1e24]">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 animate-pulse">
                <div className="w-4 h-4 rounded-full bg-white/5 shrink-0" />
                <div className="flex-1 h-3 bg-white/5 rounded" />
                <div className="w-12 h-3 bg-white/5 rounded" />
              </div>
            ))
          : checks.map((check, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 text-[12px] border-l-2 transition-colors',
                  check.passed
                    ? 'border-transparent hover:bg-white/[0.02]'
                    : 'border-rose-500/50 bg-rose-500/5'
                )}
              >
                {check.passed
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  : <X className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                }
                <span className={cn('flex-1 font-mono truncate', check.passed ? 'text-gray-300' : 'text-rose-200')}>
                  {check.route}
                </span>
                {check.statusCode != null && (
                  <span className={cn(
                    'font-mono text-[11px] px-1.5 py-0.5 rounded',
                    check.passed ? 'text-gray-500' : 'text-rose-400 bg-rose-500/10'
                  )}>
                    {check.statusCode}
                  </span>
                )}
                {check.latency != null && (
                  <span className="text-gray-600 text-[11px] font-mono w-14 text-right">{check.latency}ms</span>
                )}
              </div>
            ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export const AgentTerminal: React.FC<AgentTerminalProps> = ({ events, isStreaming }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, isStreaming]);

  const healingState = getHealingState(events);

  // Derive QA checks from events
  const qaEvents = events.filter(e => e.event === 'qa_check_pass' || e.event === 'qa_check_fail');
  const qaDoneEvent = events.find(e => e.event === 'qa_done');
  const hasQA = qaEvents.length > 0 || qaDoneEvent != null;
  const qaChecks: QACheck[] = qaEvents.map(e => ({
    route: e.route ?? e.data ?? '',
    passed: e.event === 'qa_check_pass',
    statusCode: e.statusCode,
    latency: e.latency,
  }));
  const qaPassed = qaChecks.filter(c => c.passed).length;

  // First intent_enriched event
  const intentEvent = events.find(e => e.event === 'intent_enriched');

  return (
    <div className="flex flex-col gap-0">
      <div className="rounded-xl overflow-hidden border border-[#1e1e24] bg-[#0A0A0F] shadow-2xl flex flex-col h-[320px]">
        {/* Header */}
        <div className="relative flex items-center justify-center px-4 py-3 bg-[#12121A] border-b border-[#1e1e24] shrink-0 font-sans select-none">
          {/* macOS Dots */}
          <div className="absolute left-4 flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80 border border-black/10" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80 border border-black/10" />
            <div className="w-3 h-3 rounded-full bg-green-500/80 border border-black/10" />
          </div>

          <span className="text-[12px] font-bold text-gray-400 tracking-wider">VERONICA TERMINAL</span>

          {/* Right Status */}
          <div className="absolute right-4 flex items-center gap-3">
            <HealingBadge state={healingState} />
            {isStreaming && !healingState && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-[11px] font-bold text-indigo-400 tracking-wide">BUILDING</span>
              </div>
            )}
          </div>
        </div>

        {/* Log body */}
        <div ref={scrollRef} className="p-5 overflow-y-auto flex-1 space-y-3 font-mono text-[13px] leading-relaxed">
          {/* Intent enrichment card — above log stream */}
          {intentEvent && <IntentCard ev={intentEvent} />}

          {events.map((ev, i) => {
            // Skip rendered-elsewhere types
            if (ev.event === 'intent_enriched') return null;
            if (ev.event === 'qa_start' || ev.event === 'qa_check_pass' || ev.event === 'qa_check_fail' || ev.event === 'qa_done') return null;

            // Decision card
            if (ev.event === 'decision') {
              return <DecisionCard key={i} ev={ev} />;
            }

            // Healing cards
            if (ev.event === 'healing_start') {
              return (
                <div key={i} className="my-4 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 p-4 font-sans">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-2 tracking-wide uppercase">
                    <HeartPulse className="w-4 h-4" />
                    Self-Healing Protocol Engaged
                  </div>
                  <div className="text-gray-300 text-[13px] whitespace-pre-wrap">{ev.data}</div>
                </div>
              );
            }

            if (ev.event === 'healing_success') {
              return (
                <div key={i} className="my-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-4 font-sans">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-1 tracking-wide uppercase">
                    <ShieldCheck className="w-4 h-4" />
                    Auto-fixed
                  </div>
                  {ev.data && <div className="text-gray-400 text-[12px]">{ev.data}</div>}
                </div>
              );
            }

            if (ev.event === 'healing_failed') {
              return <HealFailedCard key={i} ev={ev} />;
            }

            // Standard events
            type BadgeCfg = { icon: React.ElementType; color: string; bg?: string; label?: string; bold?: boolean };
            const BADGE: Partial<Record<AgentEventType, BadgeCfg>> = {
              plan_ready: { icon: FlaskConical, color: 'text-cyan-400', label: '[plan]' },
              plan: { icon: FlaskConical, color: 'text-cyan-400', label: '[plan]' },
              sandbox_ready: { icon: Cpu, color: 'text-sky-400', label: '[sandbox]' },
              scaffold_start: { icon: Zap, color: 'text-violet-400', label: '[scaffold]' },
              scaffold_done: { icon: CheckCircle2, color: 'text-violet-400', label: '[scaffold ✓]' },
              file_start: { icon: Code, color: 'text-green-400/70' },
              file_done: { icon: CheckCircle2, color: 'text-green-400' },
              debug_start: { icon: SearchCheck, color: 'text-amber-400', label: '[debug]' },
              debug_iteration: { icon: SearchCheck, color: 'text-amber-400', label: '[debug]' },
              debug_done: { icon: CheckCircle2, color: 'text-emerald-400', bold: true },
              fix: { icon: AlertTriangle, color: 'text-yellow-500', label: '[fix]' },
              error: { icon: AlertTriangle, color: 'text-red-500' },
              done: { icon: CheckCircle2, color: 'text-primary', bold: true },
              done_failed: { icon: AlertTriangle, color: 'text-red-500', bold: true },
            };

            const cfg = BADGE[ev.event];
            if (!cfg) return null;
            const Icon = cfg.icon;
            const time = fmt(ev.timestamp);

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
                    {ev.lines != null && <span className="text-emerald-500/50 ml-2">({ev.lines} lines)</span>}
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

            return (
              <div key={i} className={cn('flex gap-3', cfg.color, cfg.bold ? 'font-semibold' : '')}>
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

      {/* QA Panel — below terminal */}
      {hasQA && (
        <QAPanel
          checks={qaChecks}
          summary={{ total: qaChecks.length, passed: qaPassed }}
          loading={qaChecks.length === 0}
        />
      )}
    </div>
  );
};
