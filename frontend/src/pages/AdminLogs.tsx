import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Terminal, Activity, Wifi, WifiOff, Trash2, Download, ArrowDown, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

// ─────────────────────────────────────────────────────────────────────────────
// Types & helpers
// ─────────────────────────────────────────────────────────────────────────────

interface LogEntry {
  id: number;
  raw: string;
  level: "INFO" | "WARNING" | "ERROR" | "DEBUG" | "CRITICAL" | "ACCESS" | "UNKNOWN";
  timestamp: string;
}

let _idCounter = 0;
const nextId = () => ++_idCounter;

function parseLevel(line: string): LogEntry["level"] {
  if (/\bCRITICAL\b/.test(line)) {return "CRITICAL";}
  if (/\bERROR\b|Traceback|Exception/.test(line)) {return "ERROR";}
  if (/\bWARNING\b|\bWARN\b/.test(line)) {return "WARNING";}
  if (/\bDEBUG\b/.test(line)) {return "DEBUG";}
  if (/\bINFO\b/.test(line)) {return "INFO";}
  if (/\d{3} [A-Z]{3,7} \//.test(line)) {return "ACCESS";} // HTTP access log
  return "UNKNOWN";
}

const LEVEL_STYLES: Record<LogEntry["level"], string> = {
  CRITICAL: "text-red-300 bg-red-500/10 border-l-2 border-red-400",
  ERROR:    "text-red-400",
  WARNING:  "text-yellow-400",
  DEBUG:    "text-slate-500",
  INFO:     "text-sky-400",
  ACCESS:   "text-emerald-400",
  UNKNOWN:  "text-slate-300",
};

const LEVEL_BADGE: Record<LogEntry["level"], string> = {
  CRITICAL: "bg-red-500/20 text-red-300 border-red-500/40",
  ERROR:    "bg-red-500/10 text-red-400 border-red-500/30",
  WARNING:  "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  DEBUG:    "bg-slate-500/10 text-slate-400 border-slate-500/20",
  INFO:     "bg-sky-500/10 text-sky-400 border-sky-500/30",
  ACCESS:   "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  UNKNOWN:  "bg-white/5 text-slate-400 border-white/10",
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const MAX_LOGS = 500;

const AdminLogs: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: authLoading } = useAuth();

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterLevel, setFilterLevel] = useState<LogEntry["level"] | "ALL">("ALL");

  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "Admin privileges required to view system logs.",
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  }, [isAdmin, authLoading, navigate]);

  // ── SSE connection ──────────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const base = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api").replace(/\/+$/, "");
    const url = `${base}/admin/system/logs/stream`;

    const es = new EventSource(url, { withCredentials: true });
    esRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (e) => {
      const raw: string = e.data ?? "";
      if (!raw.trim()) {return;}

      const entry: LogEntry = {
        id: nextId(),
        raw,
        level: parseLevel(raw),
        timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
      };

      setLogs((prev) => {
        const next = [...prev, entry];
        return next.length > MAX_LOGS ? next.slice(next.length - MAX_LOGS) : next;
      });
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
      esRef.current = null;
      // Retry after 3 s
      setTimeout(connect, 3000);
    };
  }, []);

  useEffect(() => {
    if (!authLoading && isAdmin) {connect();}
    return () => {
      esRef.current?.close();
    };
  }, [authLoading, isAdmin, connect]);

  // ── Auto-scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) {return;}
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setAutoScroll(nearBottom);
  };

  // ── Actions ─────────────────────────────────────────────────────────────────
  const clearLogs = () => setLogs([]);

  const downloadLogs = () => {
    const text = logs.map((l) => `[${l.timestamp}] ${l.raw}`).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `stem-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ── Filtered view ───────────────────────────────────────────────────────────
  const visible = filterLevel === "ALL" ? logs : logs.filter((l) => l.level === filterLevel);

  const levelCounts = logs.reduce<Record<string, number>>((acc, l) => {
    acc[l.level] = (acc[l.level] ?? 0) + 1;
    return acc;
  }, {});

  // ── Loading / auth guard render ─────────────────────────────────────────────
  if (authLoading || !isAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="relative min-h-screen pt-20 pb-8 flex flex-col">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto w-full px-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            {/* Title */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Terminal className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-gradient">
                  System Logs
                </h1>
                <p className="text-sm text-muted-foreground">
                  Live backend stdout · uvicorn access &amp; error streams
                </p>
              </div>
            </div>

            {/* Status + actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                className="border-white/10 bg-white/5 hover:bg-white/10 text-white mr-2"
                onClick={() => navigate("/admin")}
                id="admin-logs-back-btn"
              >
                <Shield className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>

              {/* Connection badge */}
              <Badge
                variant="outline"
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold transition-all ${
                  connected
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_0_rgba(52,211,153,0.2)]"
                    : "bg-red-500/10 text-red-400 border-red-500/30"
                }`}
              >
                {connected ? (
                  <>
                    <Wifi className="w-3 h-3" />
                    <span>Live</span>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                    </span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3" />
                    Disconnected — reconnecting…
                  </>
                )}
              </Badge>

              {/* Admin badge */}
              <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-xs">
                <Shield className="w-3 h-3 mr-1" />
                Admin
              </Badge>

              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-white gap-1.5"
                onClick={clearLogs}
                id="admin-logs-clear-btn"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-white gap-1.5"
                onClick={downloadLogs}
                disabled={logs.length === 0}
                id="admin-logs-download-btn"
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* ── Level filter strip ──────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto w-full px-4 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {(["ALL", "INFO", "WARNING", "ERROR", "CRITICAL", "DEBUG", "ACCESS"] as const).map((lvl) => {
              const count = lvl === "ALL" ? logs.length : (levelCounts[lvl] ?? 0);
              const active = filterLevel === lvl;
              return (
                <button
                  key={lvl}
                  onClick={() => setFilterLevel(lvl)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold border transition-all ${
                    active
                      ? lvl === "ALL"
                        ? "bg-white/10 text-white border-white/20"
                        : LEVEL_BADGE[lvl as LogEntry["level"]]
                      : "bg-white/[0.03] text-slate-500 border-white/5 hover:border-white/10 hover:text-slate-300"
                  }`}
                  id={`admin-logs-filter-${lvl.toLowerCase()}`}
                >
                  {lvl} {count > 0 && <span className="opacity-60">({count})</span>}
                </button>
              );
            })}

            <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
              <Activity className="w-3 h-3" />
              {logs.length} / {MAX_LOGS} entries
            </div>
          </div>
        </div>

        {/* ── Terminal pane ───────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto w-full px-4 flex-1 flex flex-col min-h-0">
          <div
            className="relative rounded-xl border border-white/10 overflow-hidden flex flex-col"
            style={{
              background: "rgba(5, 7, 15, 0.85)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 20px 60px -15px rgba(0,0,0,0.6), 0 0 40px 0 rgba(99,102,241,0.05)",
              minHeight: "calc(100vh - 340px)",
            }}
          >
            {/* Terminal title bar */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5 bg-white/[0.02]">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
              </div>
              <span className="text-xs text-slate-500 font-mono ml-2">
                stem-backend · uvicorn stdout
              </span>
            </div>

            {/* Log lines */}
            <div
              ref={containerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed space-y-0.5"
              id="admin-logs-output"
              style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}
            >
              {visible.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-600">
                  <Terminal className="w-12 h-12 opacity-20" />
                  <p className="text-sm">
                    {connected ? "Waiting for log events…" : "Connecting to log stream…"}
                  </p>
                </div>
              ) : (
                visible.map((entry) => (
                  <div
                    key={entry.id}
                    className={`flex gap-2 px-2 py-0.5 rounded-sm group hover:bg-white/[0.03] transition-colors ${LEVEL_STYLES[entry.level]}`}
                  >
                    <span className="shrink-0 text-slate-600 group-hover:text-slate-500 w-[72px] text-right select-none">
                      {entry.timestamp}
                    </span>
                    <span className="break-all whitespace-pre-wrap">{entry.raw}</span>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {/* Auto-scroll FAB */}
            {!autoScroll && (
              <button
                onClick={() => {
                  setAutoScroll(true);
                  bottomRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
                className="absolute bottom-4 right-5 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40 transition-all"
                id="admin-logs-scroll-btn"
              >
                <ArrowDown className="w-3.5 h-3.5" />
                Jump to latest
              </button>
            )}
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default AdminLogs;
