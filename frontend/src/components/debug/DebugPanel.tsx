/**
 * DebugPanel
 *
 * Shows a live system-health console when ?debug=true is in the URL.
 *
 * Checks:
 *  - Backend /api/health (or /health)
 *  - Veronica AI endpoint reachability
 *  - Supabase connection (components count)
 *
 * Variants:
 *  - variant="bar"    → compact horizontal strip (for Veronica mode bar)
 *  - variant="panel"  → full bottom panel (for Dashboard)
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Terminal, XCircle } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/api$/, '');
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

type Status = 'idle' | 'checking' | 'ok' | 'warn' | 'error';

interface Check {
  label: string;
  status: Status;
  detail: string;
}

const DOT: Record<Status, string> = {
  idle:     'bg-muted-foreground/30',
  checking: 'bg-yellow-400 animate-pulse',
  ok:       'bg-emerald-400',
  warn:     'bg-yellow-400',
  error:    'bg-red-500',
};

const ICON: Record<Status, React.ReactNode> = {
  idle:     <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />,
  checking: <Loader2 className="w-3 h-3 animate-spin text-yellow-400" />,
  ok:       <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
  warn:     <AlertCircle className="w-3 h-3 text-yellow-400" />,
  error:    <XCircle className="w-3 h-3 text-red-500" />,
};

async function checkBackend(): Promise<Check> {
  const label = 'Backend';
  const start = Date.now();
  const urls = [`${API_BASE}/api/health`, `${API_BASE}/health`];

  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const ms = Date.now() - start;
        let body: any = {};
        try { body = await res.json(); } catch {}
        return {
          label,
          status: 'ok',
          detail: `${res.status} · ${ms}ms${body.version ? ` · v${body.version}` : ''}`,
        };
      }
      return { label, status: 'warn', detail: `${res.status} ${res.statusText}` };
    } catch (e: any) {
      if (e.name !== 'TypeError') {
        return { label, status: 'error', detail: e.message ?? 'Network error' };
      }
    }
  }
  return { label, status: 'error', detail: 'Unreachable' };
}

async function checkVeronica(): Promise<Check> {
  const label = 'Veronica AI';
  try {
    const res = await fetch(`${API_BASE}/api/veronica-ai/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      let body: any = {};
      try { body = await res.json(); } catch {}
      const model = body.model ?? body.ai_model ?? '';
      return { label, status: 'ok', detail: `Online${model ? ` · ${model}` : ''}` };
    }
    // fallback — any 2xx from base means server is up even if no dedicated endpoint
    if (res.status === 404) return { label, status: 'ok', detail: 'Server up (no /health)' };
    return { label, status: 'warn', detail: `${res.status} ${res.statusText}` };
  } catch (e: any) {
    return { label, status: 'error', detail: 'Unreachable' };
  }
}

async function checkSupabase(): Promise<Check> {
  const label = 'Supabase DB';
  if (!SUPABASE_URL || !SUPABASE_KEY || SUPABASE_KEY.startsWith('GET_FROM')) {
    return { label, status: 'warn', detail: 'Anon key not configured' };
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/components?select=id&limit=1`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return { label, status: 'ok', detail: 'Connected · components accessible' };
    return { label, status: 'warn', detail: `${res.status} ${res.statusText}` };
  } catch (e: any) {
    return { label, status: 'error', detail: 'Unreachable' };
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

function useChecks() {
  const [checks, setChecks] = useState<Check[]>([
    { label: 'Backend',      status: 'idle', detail: 'Not checked' },
    { label: 'Veronica AI',  status: 'idle', detail: 'Not checked' },
    { label: 'Supabase DB',  status: 'idle', detail: 'Not checked' },
  ]);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [running, setRunning] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    setChecks(c => c.map(ch => ({ ...ch, status: 'checking', detail: 'Checking…' })));

    const [backend, veronica, supabase] = await Promise.all([
      checkBackend(),
      checkVeronica(),
      checkSupabase(),
    ]);

    setChecks([backend, veronica, supabase]);
    setLastRun(new Date());
    setRunning(false);
  }, []);

  // Auto-run once on mount
  useEffect(() => { run(); }, [run]);

  return { checks, lastRun, running, run };
}

// ─── Bar variant (Veronica mode toolbar) ─────────────────────────────────────

export function DebugBar({ className }: { className?: string }) {
  const { checks, lastRun, running, run } = useChecks();

  return (
    <div className={cn(
      'inline-flex items-center gap-2 rounded-full border border-primary/10 bg-black/40 backdrop-blur-sm px-3 py-1 text-[10px] font-mono',
      className,
    )}>
      <Terminal className="w-3 h-3 text-primary/60 shrink-0" />
      {checks.map(c => (
        <span key={c.label} className="flex items-center gap-1 text-muted-foreground" title={c.detail}>
          {ICON[c.status]}
          <span className={c.status === 'ok' ? 'text-emerald-400' : c.status === 'error' ? 'text-red-400' : 'text-yellow-400'}>
            {c.label.split(' ')[0]}
          </span>
        </span>
      ))}
      <button
        onClick={run}
        disabled={running}
        className="ml-1 text-muted-foreground/60 hover:text-primary transition-colors"
        title="Re-check"
      >
        <RefreshCw className={cn('w-2.5 h-2.5', running && 'animate-spin')} />
      </button>
      {lastRun && (
        <span className="text-muted-foreground/40">
          {lastRun.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      )}
    </div>
  );
}

// ─── Panel variant (Dashboard bottom) ────────────────────────────────────────

export function DebugPanel({ className }: { className?: string }) {
  const { checks, lastRun, running, run } = useChecks();
  const [expanded, setExpanded] = useState(true);

  const overall: Status =
    checks.some(c => c.status === 'error') ? 'error' :
    checks.some(c => c.status === 'warn')  ? 'warn'  :
    checks.every(c => c.status === 'ok')   ? 'ok'    :
    'checking';

  return (
    <div className={cn(
      'rounded-xl border border-primary/10 bg-black/60 backdrop-blur-md font-mono text-xs overflow-hidden',
      className,
    )}>
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-primary/5 transition-colors"
      >
        <span className="flex items-center gap-2 text-muted-foreground">
          <Terminal className="w-3.5 h-3.5 text-primary/60" />
          <span className="uppercase tracking-widest text-[10px]">Debug Console</span>
          <span className={cn('w-2 h-2 rounded-full', DOT[overall])} />
        </span>
        <span className="flex items-center gap-3 text-muted-foreground/50">
          {lastRun && <span>Last check: {lastRun.toLocaleTimeString()}</span>}
          <span className="text-[10px]">{expanded ? '▲' : '▼'}</span>
        </span>
      </button>

      {expanded && (
        <div className="border-t border-primary/10 px-4 py-3 space-y-2">
          {checks.map(c => (
            <div key={c.label} className="flex items-center gap-3">
              {ICON[c.status]}
              <span className="w-28 shrink-0 text-muted-foreground">{c.label}</span>
              <span
                className={cn(
                  'flex-1 truncate',
                  c.status === 'ok'       ? 'text-emerald-400' :
                  c.status === 'error'    ? 'text-red-400' :
                  c.status === 'warn'     ? 'text-yellow-400' :
                  c.status === 'checking' ? 'text-yellow-300 animate-pulse' :
                  'text-muted-foreground/50',
                )}
              >
                {c.detail}
              </span>
            </div>
          ))}

          <div className="pt-1 flex items-center justify-between text-muted-foreground/40">
            <span>API: {API_BASE || '(not set)'}</span>
            <button
              onClick={run}
              disabled={running}
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <RefreshCw className={cn('w-3 h-3', running && 'animate-spin')} />
              {running ? 'Checking…' : 'Refresh'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
