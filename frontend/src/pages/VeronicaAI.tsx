import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Layout from '@/components/layout/Layout';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, Sparkles, Cpu, Bug, Lightbulb, PanelLeftClose, PanelLeftOpen, Clock, AppWindowMac, Activity, Clock3, Filter, ArrowRight, Columns2, ExternalLink, RotateCcw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  sendVeronicaMessage,
  sendVeronicaMessageStream,
  startVeronicaRun,
  downloadProjectZip,
  type VeronicaAIAction,
  type VeronicaAIChatResponse,
} from '@/services/veronicaAIService';
import { AgentBuildPanel } from '@/components/veronica/AgentBuildPanel';
import { LivePreview } from '@/components/veronica/LivePreview';
import { ProjectCard } from '@/components/veronica/ProjectCard';
import DarkVeil from '@/components/veronica/DarkVeil';
import { VeronicaChatTabs, type ChatTab } from '@/components/veronica/VeronicaChatTabs';
import { VeronicaCommunity } from '@/components/veronica/VeronicaCommunity';
import { useNavigate } from 'react-router-dom';
import { AgentTerminal, type AgentEvent } from '@/components/veronica/AgentTerminal';
import { useDebugMode } from '@/hooks/useDebugMode';
import { DebugBar } from '@/components/debug/DebugPanel';
import ErrorBoundary from '@/components/ui/error-boundary';
import { supabase, upsertVeronicaChat, saveVeronicaMessage, getVeronicaChats, deleteVeronicaChat, upsertVeronicaMessage } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { trackEvent } from '@/lib/posthog';

// ─── Types ───────────────────────────────────────────────────────────────────

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: VeronicaAIChatResponse['intent'];
  confidence?: number;
  actions?: VeronicaAIAction[];
  project?: Record<string, any> | null;
  projectTypeHint?: string;
  agentEvents?: AgentEvent[];
  isStreamingBuild?: boolean;
};

type VeronicaMode = 'idea' | 'full_build' | 'debug';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const newId = () => crypto.randomUUID();
const newTabId = () => crypto.randomUUID();

const WELCOME_MSG = (mode: VeronicaMode): ChatMessage => ({
  id: 'welcome',
  role: 'assistant',
  content:
    mode === 'debug'
      ? "Paste your error or describe the bug and I'll help you diagnose it."
      : mode === 'full_build'
      ? "Tell me what to build — I'll design it, generate code, and start a live run."
      : "Tell me what you want to build, and I'll help you shape it into a great STEM project.",
  timestamp: new Date(),
});

const inferProjectTypeHint = (message: string) => {
  const msg = message.toLowerCase();
  if (msg.includes('robot')) {return 'robotics';}
  if (msg.includes('iot') || msg.includes('monitor')) {return 'iot';}
  if (msg.includes('web') || msg.includes('react')) {return 'web-development';}
  return 'electronics';
};

const QUICK_PROMPTS = [
  'Beginner Arduino robot for 2 weeks',
  'IoT sensor project under $50',
  'Web app to track experiments',
  'AI-based study planner',
];

const makeDefaultTab = (mode: VeronicaMode = 'idea'): { tab: ChatTab; messages: ChatMessage[] } => {
  const id = newTabId();
  return {
    tab: { id, title: 'New Chat', mode, messageCount: 1, createdAt: new Date() },
    messages: [WELCOME_MSG(mode)],
  };
};

// ─── Debouncing Helpers ─────────────────────────────────────────────────────────

const pendingSaves = new Map<string, NodeJS.Timeout>();
function debouncedSave(key: string, runSave: () => void) {
  if (pendingSaves.has(key)) {clearTimeout(pendingSaves.get(key));}
  pendingSaves.set(
    key,
    setTimeout(() => {
      runSave();
      pendingSaves.delete(key);
    }, 1200)
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

const VeronicaAI: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isDebug = useDebugMode();
  const { user } = useAuth();

  // ── Tab state ──
  const initialTab = useMemo(() => makeDefaultTab('idea'), []);
  const [tabs, setTabs] = useState<ChatTab[]>([initialTab.tab]);
  const [activeTabId, setActiveTabId] = useState<string>(initialTab.tab.id);
  const [chatHistory, setChatHistory] = useState<Record<string, ChatMessage[]>>({
    [initialTab.tab.id]: initialTab.messages,
  });

  // ── Active chat ──
  const activeMessages = chatHistory[activeTabId] ?? [];
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const [mode, setMode] = useState<VeronicaMode>('idea');

  // Load Database Chats
  useEffect(() => {
    async function initChats() {
      if (!user) {return;}
      const dbChats = await getVeronicaChats();
      if (dbChats && dbChats.length > 0) {
        const loadedTabs: ChatTab[] = dbChats.map((c: any) => ({
          id: c.id,
          title: c.title,
          mode: c.mode as VeronicaMode,
          messageCount: c.message_count,
          createdAt: new Date(c.created_at),
          lastMessage: c.veronica_chat_messages?.[0]?.content?.slice(0, 60)
        }));
        
        const loadedHistory: Record<string, ChatMessage[]> = {};
        dbChats.forEach((c: any) => {
           const dbMsgs = c.veronica_chat_messages || [];
           loadedHistory[c.id] = dbMsgs.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((m: any) => ({
             id: m.id,
             role: m.role,
             content: m.content,
             timestamp: new Date(m.created_at),
             intent: m.intent,
             confidence: m.confidence,
             actions: m.actions,
             agentEvents: (Array.isArray(m.actions) && m.actions.length > 0 && (m.actions[0] as any).event)
               ? (m.actions as any[])
               : undefined,
           }));
        });
        
        setTabs(loadedTabs);
        setChatHistory(loadedHistory);
        setActiveTabId(loadedTabs[0].id);
      } else {
        upsertVeronicaChat({ id: initialTab.tab.id, title: initialTab.tab.title, mode: initialTab.tab.mode });
      }
    }
    initChats();
  }, [user, initialTab]);

  // ── Realtime subscription for external updates (e.g. from backend) ──
  useEffect(() => {
    if (!activeTabId) {return;}

    const channel = supabase
      .channel(`veronica-chat-realtime-${activeTabId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'veronica_chat_messages',
          filter: `chat_id=eq.${activeTabId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const m = payload.new;
            const newMsg: ChatMessage = {
              id: m.id,
              role: m.role as 'user' | 'assistant',
              content: m.content,
              timestamp: new Date(m.created_at),
              intent: m.intent,
              confidence: m.confidence,
              actions: m.actions,
              agentEvents: (Array.isArray(m.actions) && m.actions.length > 0 && (m.actions[0] as any).event)
                ? (m.actions as any[])
                : undefined,
            };

            setChatHistory((prev) => {
              const current = prev[activeTabId] || [];
              if (current.some(msg => msg.id === newMsg.id || (msg.role === newMsg.role && msg.content.trim() === newMsg.content.trim()))) {
                return prev;
              }
              return { ...prev, [activeTabId]: [...current, newMsg] };
            });
          } else if (payload.eventType === 'UPDATE') {
            const m = payload.new;
            setChatHistory((prev) => {
              const active = prev[activeTabId] ?? [];
              return {
                ...prev,
                [activeTabId]: active.map(old => old.id === m.id ? {
                  ...old,
                  content: m.content,
                  intent: m.intent,
                  confidence: m.confidence,
                  actions: m.actions,
                  agentEvents: (Array.isArray(m.actions) && m.actions.length > 0 && (m.actions[0] as any).event)
                    ? (m.actions as any[])
                    : undefined,
                  project: m.project_snap || old.project,
                } : old)
              };
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [activeTabId]);

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  // ── E2B Sandbox state ──
  type SandboxStatus = 'idle' | 'starting' | 'running' | 'stopped' | 'error';
  type SandboxInfo = { runId: string | null; status: SandboxStatus; previewUrl: string | null; startupLogs: string[] };
  const [sandboxState, setSandboxState] = useState<Record<string, SandboxInfo>>({});

  // Sync preview URL from any running sandbox
  useEffect(() => {
    const running = Object.values(sandboxState).find(s => s.previewUrl);
    if (running?.previewUrl) {setPreviewUrl(running.previewUrl);}
  }, [sandboxState]);

  const handleRunProject = useCallback(async (projectId: string) => {
    setSandboxState(prev => ({ ...prev, [projectId]: { runId: null, status: 'starting', previewUrl: null, startupLogs: ['🚀 Initializing E2B sandbox…'] } } as Record<string, SandboxInfo>));
    try {
      const result = await startVeronicaRun(projectId);
      setSandboxState(prev => ({
        ...prev,
        [projectId]: {
          runId: result.run_id,
          status: 'running' as SandboxStatus,
          previewUrl: result.preview_url ?? null,
          startupLogs: result.startup_logs ?? [],
        }
      } as Record<string, SandboxInfo>));
    } catch (e) {
      setSandboxState(prev => ({
        ...prev,
        [projectId]: {
          runId: prev[projectId]?.runId ?? null,
          previewUrl: prev[projectId]?.previewUrl ?? null,
          status: 'error' as SandboxStatus,
          startupLogs: [...(prev[projectId]?.startupLogs ?? []), `❌ ${e instanceof Error ? e.message : 'Sandbox failed'}`],
        }
      } as Record<string, SandboxInfo>));
    }
  }, []);

  const handleStopProject = useCallback(async (projectId: string) => {
    setSandboxState(prev => ({
      ...prev,
      [projectId]: {
        runId: prev[projectId]?.runId ?? null,
        previewUrl: prev[projectId]?.previewUrl ?? null,
        startupLogs: prev[projectId]?.startupLogs ?? [],
        status: 'stopped' as SandboxStatus,
      }
    } as Record<string, SandboxInfo>));
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://perfection-v2.onrender.com/api';
    const runId = sandboxState[projectId]?.runId;
    if (runId) {
      await fetch(`${API_BASE}/veronica-projects/${projectId}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_id: runId }),
      }).catch(() => {});
    }
  }, [sandboxState]);

  const handleDownload = useCallback((projectId: string) => {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://perfection-v2.onrender.com/api';
    const a = document.createElement('a');
    a.href = `${API_BASE}/veronica-projects/${projectId}/download/zip`;
    a.download = `veronica-project-${projectId.slice(0, 8)}.zip`;
    a.click();
  }, []);

  // Smart auto-scroll: only scroll to bottom when user is already near the bottom
  // (within 120 px) — so reading history isn't interrupted by new messages.
  const scrollToBottomIfNear = useCallback(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) {return;}
    const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    if (distanceFromBottom < 120) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
    }
  }, []);

  // Always jump to bottom when switching tabs (new context)
  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'auto' });
    }
  }, [activeTabId]);

  // Smart scroll on new messages / loading state
  useEffect(() => {
    scrollToBottomIfNear();
  }, [chatHistory, isLoading, scrollToBottomIfNear]);

  // ── Helpers ──
  const appendToActive = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const fullMsg: ChatMessage = { ...msg, id: newId(), timestamp: new Date() };
    setChatHistory((prev) => ({
      ...prev,
      [activeTabId]: [...(prev[activeTabId] ?? []), fullMsg],
    }));
    
    // Save to DB
    if (msg.role === 'user' || msg.id !== 'welcome') {
      saveVeronicaMessage(activeTabId, fullMsg.role, fullMsg.content, { 
        id: fullMsg.id,
        intent: fullMsg.intent, 
        confidence: fullMsg.confidence, 
        actions: fullMsg.actions,
        projectSnap: fullMsg.project
      });
    }

    // Update tab metadata
    setTabs((prev) => {
      let requiresTitleUpdate = false;
      let newTitle = '';
      
      const next = prev.map((t) => {
        if (t.id === activeTabId) {
          const autoTitle = t.title === 'New Chat' && msg.role === 'user'
            ? msg.content.length > 40 ? msg.content.slice(0, 37) + '…' : msg.content
            : t.title;
            
          if (autoTitle !== t.title) {
            requiresTitleUpdate = true;
            newTitle = autoTitle;
          }

          return {
            ...t,
            messageCount: t.messageCount + 1,
            lastMessage: msg.content.slice(0, 60),
            title: autoTitle,
          };
        }
        return t;
      });
      
      if (requiresTitleUpdate) {
        upsertVeronicaChat({ id: activeTabId, title: newTitle });
      }
      return next;
    });
  }, [activeTabId]);

  const createNewChat = useCallback((seedMessage?: string) => {
    const newMode = activeTab?.mode ?? 'idea';
    const { tab, messages } = makeDefaultTab(newMode);
    setTabs((prev) => [...prev, tab]);
    setChatHistory((prev) => ({ ...prev, [tab.id]: messages }));
    setActiveTabId(tab.id);
    upsertVeronicaChat({ id: tab.id, title: tab.title, mode: tab.mode });
    
    if (seedMessage) {
      setInputValue(seedMessage);
    }
  }, [activeTab]);

  const deleteTab = useCallback(async (id: string) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (activeTabId === id) {
        setActiveTabId(next[next.length - 1]?.id ?? '');
      }
      return next;
    });
    setChatHistory((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
    // Delete from DB directly
    await deleteVeronicaChat(id);
  }, [activeTabId]);

  const updateActiveMessage = useCallback((msgId: string, updater: (m: ChatMessage) => ChatMessage) => {
    setChatHistory((prev) => {
      const active = prev[activeTabId] ?? [];
      return {
        ...prev,
        [activeTabId]: active.map(m => m.id === msgId ? updater(m) : m)
      };
    });
  }, [activeTabId]);

  // ── Send ──
  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? inputValue).trim();
    if (!text || isLoading) {return;}

    appendToActive({ role: 'user', content: text, projectTypeHint: inferProjectTypeHint(text) });
    trackEvent('veronica_message_sent', { mode });
    setInputValue('');
    setIsLoading(true);

    try {
      // Both idea and full_build use the same generate endpoint
      // full_build uses streaming agent events, idea uses simple mode
      if (mode === 'full_build') {
        const streamMsgId = newId();
        const initialAssistantMsg: ChatMessage = {
          id: streamMsgId,
          role: 'assistant',
          content: 'Building your project…',
          timestamp: new Date(),
          agentEvents: [],
          isStreamingBuild: true
        };
        setChatHistory((prev) => ({
          ...prev,
          [activeTabId]: [...(prev[activeTabId] ?? []), initialAssistantMsg],
        }));

        // Save initial placeholder to DB
        saveVeronicaMessage(activeTabId, 'assistant', initialAssistantMsg.content);

        try {
          // Find the most recent project_id in this chat to enable "Edit Mode"
          const projectMsgs = activeMessages.filter(m => m.project && (m.project as any).project_id);
          const lastProjectId = projectMsgs.length > 0 
            ? (projectMsgs[projectMsgs.length - 1].project as any).project_id 
            : undefined;

          const res = await sendVeronicaMessageStream(
            { message: text, project_id: lastProjectId },
            (ev) => {
              updateActiveMessage(streamMsgId, (m) => {
                const nextEvents = [...(m.agentEvents || []), ev];
                
                // Real-time sync to Supabase (debounced to avoid spam/401 flood)
                debouncedSave(streamMsgId, () => {
                  upsertVeronicaMessage(streamMsgId, activeTabId, 'assistant', m.content, {
                      intent: m.intent,
                      confidence: m.confidence,
                      actions: nextEvents // Store events in 'actions' column
                  });
                });

                return {
                  ...m,
                  agentEvents: nextEvents
                };
              });
            }
          );
          updateActiveMessage(streamMsgId, (m) => {
            const finalMsg = {
              ...m,
              content: res.assistant_text,
              intent: res.intent,
              confidence: res.confidence,
              actions: m.agentEvents, // Keep events
              project: res.project ?? null,
              projectTypeHint: inferProjectTypeHint(text),
              isStreamingBuild: false
            };

            // Final sync to Supabase with content and project data
            upsertVeronicaMessage(streamMsgId, activeTabId, 'assistant', res.assistant_text, {
              intent: res.intent,
              confidence: res.confidence,
              actions: m.agentEvents,
              projectSnap: res.project
            });

            return finalMsg;
          });

          if (res.project?.project_id) {
            trackEvent('veronica_project_generated', {
              mode,
              project_type: inferProjectTypeHint(text),
              generation_type: 'full_build',
            });
          }

          // Update sidebar metadata
          setTabs((prev) => prev.map((t) => (t.id === activeTabId ? {
            ...t,
            messageCount: t.messageCount + 1,
            lastMessage: res.assistant_text.slice(0, 60),
          } : t)));
        } catch (e) {
          updateActiveMessage(streamMsgId, (m) => ({
            ...m,
            content: e instanceof Error ? e.message : 'Build failed.',
            isStreamingBuild: false
          }));
        }
      } else {
        // idea / debug mode — simple send
        const res = await sendVeronicaMessage({ message: text });
        if (res.project?.project_id) {
          trackEvent('veronica_project_generated', {
            mode,
            project_type: inferProjectTypeHint(text),
            generation_type: 'idea',
          });
        }
        appendToActive({
          role: 'assistant',
          content: res.assistant_text,
          intent: res.intent,
          confidence: res.confidence,
          actions: res.actions,
          project: res.project ?? null,
          projectTypeHint: inferProjectTypeHint(text),
        });
      }
    } catch (e) {
      appendToActive({
        role: 'assistant',
        content: e instanceof Error ? e.message : 'Something went wrong. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, mode, appendToActive, updateActiveMessage, activeTabId]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // When mode changes, update the active tab's mode label and persistence
  const handleModeChange = (m: VeronicaMode) => {
    setMode(m);
    setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, mode: m } : t)));
    
    // Save state to IndexedDB so it survives navigation
    if (activeTabId) {
      const title = tabs.find(t => t.id === activeTabId)?.title || 'New Project';
      upsertVeronicaChat({ id: activeTabId, mode: m, title });
    }
  };

  return (
    <Layout>
      {/* ── Full-screen chat section ── */}
      <div className="relative flex flex-col" style={{ height: '100dvh' }}>
        {/* DarkVeil WebGL background */}
        <ErrorBoundary fallback={<div className="absolute inset-0 bg-[#0a0a0f]" />}>
          <div className="absolute inset-0" style={{ zIndex: 0 }}>
            <DarkVeil
              hueShift={0}
              noiseIntensity={0.03}
              scanlineIntensity={0}
              speed={0.5}
              scanlineFrequency={0}
              warpAmount={0.3}
            />
          </div>
        </ErrorBoundary>

        {/* ───────── Compact header ───────── */}
        <div className="relative z-10 container mx-auto px-4 pt-6 pb-3 flex-shrink-0 max-w-7xl">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className="border-primary/30 bg-primary/5 text-xs uppercase tracking-wide">
              Veronica Studio
            </Badge>
            <h1 className="text-xl font-semibold tracking-tight text-gradient flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Where STEM ideas become reality
            </h1>
            <p className="text-muted-foreground text-xs hidden sm:block">
              Describe what you want to build and Veronica will turn it into a structured STEM project.
            </p>
          </div>
        </div>

        {/* ───────── Panel – fills remaining viewport height ───────── */}
        <div className="relative z-10 flex-1 min-h-0 container mx-auto px-4 pb-2 max-w-7xl">
          <div className="h-full flex gap-0 rounded-2xl overflow-hidden border border-primary/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)] bg-background/40 backdrop-blur-2xl">

            {/* Sidebar */}
            <VeronicaChatTabs
              tabs={tabs}
              activeTabId={activeTabId}
              onSelectTab={setActiveTabId}
              onNewChat={() => createNewChat()}
              onDeleteTab={deleteTab}
              onRenameTab={(id, title) => {
                setTabs(prev => prev.map(t => t.id === id ? { ...t, title } : t));
                upsertVeronicaChat({ id, title });
              }}
              onDuplicateTab={(id) => {
                const source = tabs.find(t => t.id === id);
                if (!source) {return;}
                const { tab, messages } = makeDefaultTab(source.mode);
                const newTab = { ...tab, title: `${source.title} (copy)` };
                setTabs(prev => [...prev, newTab]);
                setChatHistory(prev => ({ ...prev, [newTab.id]: chatHistory[id] ?? messages }));
                setActiveTabId(newTab.id);
                upsertVeronicaChat({ id: newTab.id, title: newTab.title, mode: newTab.mode });
              }}
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
            />

            {/* Chat area */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
              {/* Mode Tabs and Actions Header */}
              <div className="flex items-center justify-between px-6 py-0 border-b border-white/[0.08] bg-[#0A0A0F] shrink-0 h-14">
                {/* Tabs */}
                <div className="flex items-center gap-6 h-full">
                  {(['idea', 'full_build', 'debug'] as VeronicaMode[]).map((m) => {
                    const icons = { idea: Clock, full_build: AppWindowMac, debug: Activity };
                    const labels = { idea: 'Project idea', full_build: 'Full build', debug: 'Debug help' };
                    const Icon = icons[m];
                    const isActive = mode === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleModeChange(m)}
                        className={cn(
                          'relative h-full inline-flex items-center gap-2 px-1 transition-colors text-sm font-medium',
                          isActive ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{labels[m]}</span>
                        {isActive && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t-full" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="w-8 h-8 rounded-md text-gray-500 hover:text-gray-200 border border-white/5 bg-white/[0.02]">
                    <Clock3 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-8 h-8 rounded-md text-gray-500 hover:text-gray-200 border border-white/5 bg-white/[0.02]">
                    <Filter className="w-4 h-4" />
                  </Button>

                  {/* Split-view preview toggle */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPreview(v => !v)}
                    className={cn(
                      'w-8 h-8 rounded-md border transition-colors',
                      showPreview
                        ? 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10'
                        : 'text-gray-500 hover:text-gray-200 border-white/5 bg-white/[0.02]'
                    )}
                    title="Toggle preview pane"
                  >
                    <Columns2 className="w-4 h-4" />
                  </Button>
                  
                  {/* Debug bar — only when ?debug=true */}
                  {isDebug && <DebugBar className="shrink-0" />}

                  {/* Collapse toggle (mobile fallback) */}
                  <button
                    onClick={() => setSidebarCollapsed((v) => !v)}
                    className="md:hidden p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground ml-2"
                  >
                    {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Messages + optional preview split */}
              <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Chat messages column */}
                <div className={cn('flex flex-col min-w-0 min-h-0 overflow-hidden transition-all duration-300', showPreview ? 'w-1/2 border-r border-white/[0.08]' : 'flex-1')}>
                <ScrollArea className="flex-1 h-full" viewportRef={scrollViewportRef}>
                  {/* Empty state */}
                  {activeMessages.length <= 1 && !isLoading && (
                    <div className="flex flex-col items-center justify-center min-h-[300px] py-16 px-6">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5">
                        <ArrowRight className="w-7 h-7 text-indigo-400" />
                      </div>
                      <h2 className="text-xl font-semibold text-white mb-1">What will you build today?</h2>
                      <p className="text-sm text-gray-500 mb-8">Describe an idea, paste an error, or pick a prompt below.</p>
                      <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                        {QUICK_PROMPTS.map((p) => (
                          <button
                            key={p}
                            onClick={() => handleSend(p)}
                            className="px-3 py-2.5 rounded-xl border border-white/[0.08] text-[12px] text-gray-400 bg-white/[0.02] hover:bg-indigo-500/5 hover:border-indigo-500/20 hover:text-indigo-300 transition-all text-center leading-snug"
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                <div className="p-5 space-y-4">
                  {activeMessages.map((m) => (
                    <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                      <div className={cn('max-w-[80%] space-y-2', m.role === 'user' ? 'text-right' : 'text-left')}>
                        {/* Special Render for Assistant Builds */}
                        {m.role === 'assistant' && activeTab?.mode === 'full_build' && (m.isStreamingBuild || (m.agentEvents && m.agentEvents.length > 0)) ? (
                          <div className="w-full text-left space-y-5 px-1 py-2">
                            {/* Header row */}
                            <div className="space-y-1">
                              <h2 className="text-2xl font-bold text-white tracking-tight">{activeTab?.title || 'Building project...'}</h2>
                              <p className="text-[13px] text-gray-500">veronica_agent_v2.1.0 • started {new Date(m.timestamp).toLocaleTimeString([], { hour12: false })}</p>
                            </div>

                            {/* Progress bar area */}
                            <div className="space-y-3">
                              {(() => {
                                const p = (() => {
                                  if (!m.isStreamingBuild) {return '100%';}
                                  if (!m.agentEvents) {return '0%';}
                                  const ev = [...m.agentEvents].reverse().find(e => typeof e.progress === 'number');
                                  return ev && ev.progress ? `${Math.floor(ev.progress * 100)}%` : '0%';
                                })();
                                return (
                                  <>
                                    <div className="flex items-center justify-between text-[13px] text-gray-400 font-medium">
                                      <span>{m.isStreamingBuild ? 'Building...' : m.agentEvents?.some(e => e.event === 'error') ? 'Build failed' : 'Build complete'}</span>
                                      <span className="text-indigo-400 font-mono font-bold">{p}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mt-3">
                                      <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: p }} />
                                    </div>
                                  </>
                                );
                              })()}
                              
                              {/* Pipeline stages */}
                              <div className="flex flex-wrap items-center gap-3 pt-2">
                                {[
                                  { id: 'plan', label: 'Plan', done: true, current: false },
                                  { id: 'scaffold', label: 'Scaffold', done: true, current: false },
                                  { id: 'install', label: 'Install', done: false, current: m.isStreamingBuild },
                                  { id: 'build', label: 'Build', done: false, current: false },
                                  { id: 'qa', label: 'QA', done: false, current: false },
                                  { id: 'preview', label: 'Preview', done: !m.isStreamingBuild, current: false }
                                ].map((stage) => (
                                  <div key={stage.id} className={cn(
                                    "px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 border",
                                    stage.done ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" :
                                    stage.current ? "border-indigo-500/30 text-indigo-400 bg-indigo-500/10 shadow-[0_0_10px_rgba(99,102,241,0.2)]" :
                                    "border-white/5 text-gray-600 bg-white/[0.02]"
                                  )}>
                                    <div className={cn(
                                      "w-1.5 h-1.5 rounded-full",
                                      stage.done ? "bg-emerald-400" :
                                      stage.current ? "bg-indigo-400" :
                                      "bg-gray-600"
                                    )} />
                                    {stage.label}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Standard Chat Bubble */
                          <div className={cn(
                            'rounded-2xl px-5 py-3.5 text-[14px] leading-relaxed shadow-sm',
                            m.role === 'user'
                              ? 'bg-[#151722] text-gray-200 border border-white/5'
                              : 'bg-transparent text-gray-300'
                          )}>
                            {m.role === 'user' ? (
                              <p className="whitespace-pre-wrap">{m.content}</p>
                            ) : (
                              <div className="chat-markdown prose prose-invert max-w-none text-sm">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Terminal Panel */}
                        {((m.agentEvents && m.agentEvents.length > 0) || m.isStreamingBuild) && (
                          <div className="mt-6 w-full px-1">
                            <AgentTerminal events={m.agentEvents || []} isStreaming={!!m.isStreamingBuild} />
                          </div>
                        )}
                        {m.role === 'assistant' && m.project && (m.project as any).project_id && !m.isStreamingBuild && (() => {
                          const proj = m.project as any;
                          const sb = sandboxState[proj.project_id];
                          return (
                            <>
                              <div className="mt-4">
                                <AgentBuildPanel
                                  project={proj}
                                  onRun={handleRunProject}
                                  onDownload={handleDownload}
                                  isRunning={sb?.status === 'starting' || sb?.status === 'running'}
                                  className="w-full"
                                />
                              </div>
                              {sb && sb.status !== 'idle' && (
                                <div className="mt-3">
                                  <LivePreview
                                    projectId={proj.project_id}
                                    previewUrl={sb.previewUrl}
                                    runId={sb.runId}
                                    status={sb.status}
                                    startupLogs={sb.startupLogs}
                                    onStop={() => handleStopProject(proj.project_id)}
                                  />
                                </div>
                              )}
                            </>
                          );
                        })()}

                        {/* ProjectCard: show for idea/debug mode messages that have a project */}
                        {m.role === 'assistant' && m.project && Array.isArray(m.actions) && activeTab?.mode !== 'full_build' && (
                          <ProjectCard
                            project={m.project as any}
                            actions={m.actions}
                            defaultProjectType={m.projectTypeHint}
                            onActionsChange={(next) => {
                              setChatHistory((prev) => ({
                                ...prev,
                                [activeTabId]: (prev[activeTabId] ?? []).map((x) =>
                                  x.id === m.id ? { ...x, actions: next } : x
                                ),
                              }));
                            }}
                          />
                        )}
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-background/70 border border-primary/15 rounded-2xl px-4 py-3 text-sm text-muted-foreground shadow-sm flex items-center gap-2">
                        <span className="inline-flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
                        </span>
                        Veronica is thinking…
                      </div>
                    </div>
                  )}
                  <div ref={endRef} />
                </div>
                </ScrollArea>
                </div>{/* end chat messages column */}

                {/* Preview pane */}
                {showPreview && (
                  <div className="w-1/2 flex flex-col bg-[#08080e] min-h-0">
                    {/* URL bar */}
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06] shrink-0 bg-[#0d0d14]">
                      <div className="flex-1 flex items-center gap-2 bg-white/[0.04] border border-white/[0.07] rounded-md px-3 py-1">
                        <span className="w-2 h-2 rounded-full shrink-0 bg-emerald-400/70" />
                        <span className="text-[11px] text-gray-500 font-mono truncate flex-1">
                          {previewUrl ?? 'Preview not ready'}
                        </span>
                      </div>
                      <button
                        onClick={() => { if (previewUrl) { const el = document.querySelector<HTMLIFrameElement>('#veronica-preview-frame'); if (el) {el.src = previewUrl;} } }}
                        className="p-1.5 rounded hover:bg-white/[0.06] text-gray-500 hover:text-gray-200 transition-colors"
                        title="Reload"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      {previewUrl && (
                        <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded hover:bg-white/[0.06] text-gray-500 hover:text-gray-200 transition-colors">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    {/* iframe or placeholder */}
                    {previewUrl ? (
                      <iframe
                        id="veronica-preview-frame"
                        src={previewUrl}
                        className="flex-1 w-full border-0"
                        title="Veronica preview"
                        sandbox="allow-scripts allow-same-origin allow-forms"
                      />
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-600">
                        <Loader2 className="w-8 h-8 animate-spin opacity-30" />
                        <p className="text-[13px]">Preview not ready</p>
                        <p className="text-[11px] text-gray-700 text-center px-8">Run your project to see a live preview here</p>
                      </div>
                    )}
                  </div>
                )}
              </div>{/* end flex split */}

              {/* Input area */}
              <div className="border-t border-white/[0.08] px-6 pt-4 pb-20 md:pb-24 bg-[#0A0A0F] shrink-0">
                {/* Quick prompts — hide when empty state is shown to avoid duplication */}
                {activeMessages.length > 1 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {QUICK_PROMPTS.map((p) => (
                      <button
                        key={p}
                        className="px-4 py-1.5 rounded-full border border-white/10 text-[12px] text-gray-400 bg-transparent hover:bg-white/5 transition-colors"
                        onClick={() => handleSend(p)}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="flex-1 rounded-xl border border-white/10 bg-[#12121A] flex items-center shadow-inner overflow-hidden">
                    <Input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={onKeyDown}
                      placeholder="Describe what you want to build..."
                      disabled={isLoading}
                      className="h-12 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-[14px] px-4 text-gray-200 placeholder:text-gray-600"
                    />
                  </div>
                  <Button
                    onClick={() => handleSend()}
                    disabled={isLoading || !inputValue.trim()}
                    className="h-12 w-12 p-0 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl shadow-[0_4px_14px_rgba(99,102,241,0.3)] shrink-0"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>{/* end chat area */}
          </div>{/* end panel (h-full flex) */}
        </div>{/* end panel wrapper (flex-1) */}
      </div>{/* end full-screen chat section */}

      {/* ───────── Community Section (below the fold) ───────── */}
      <div className="relative container mx-auto px-4 py-12 max-w-7xl">
        <VeronicaCommunity
          onRemixWithVeronica={(msg) => {
            createNewChat(msg);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </div>
    </Layout>
  );
};

export default VeronicaAI;
