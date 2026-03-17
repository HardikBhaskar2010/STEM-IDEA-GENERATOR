import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, Sparkles, Cpu, Bug, Lightbulb, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  sendVeronicaMessage,
  startVeronicaRun,
  startVeronicaAgentJob,
  type VeronicaAIAction,
  type VeronicaAIChatResponse,
} from '@/services/veronicaAIService';
import { ProjectCard } from '@/components/veronica/ProjectCard';
import Silk from '@/components/veronica/Silk';
import { VeronicaChatTabs, type ChatTab } from '@/components/veronica/VeronicaChatTabs';
import { VeronicaCommunity } from '@/components/veronica/VeronicaCommunity';
import { useNavigate } from 'react-router-dom';

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
};

type VeronicaMode = 'idea' | 'full_build' | 'debug';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const newId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
const newTabId = () => `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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
  if (msg.includes('robot')) return 'robotics';
  if (msg.includes('iot') || msg.includes('monitor')) return 'iot';
  if (msg.includes('web') || msg.includes('react')) return 'web-development';
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

// ─── Component ───────────────────────────────────────────────────────────────

const VeronicaAI: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isLoading, activeTabId]);

  // ── Helpers ──
  const appendToActive = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const fullMsg: ChatMessage = { ...msg, id: newId(), timestamp: new Date() };
    setChatHistory((prev) => ({
      ...prev,
      [activeTabId]: [...(prev[activeTabId] ?? []), fullMsg],
    }));
    // Update tab metadata
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId
          ? {
              ...t,
              messageCount: t.messageCount + 1,
              lastMessage: msg.content.slice(0, 60),
              // Auto-name tab from first user message
              title:
                t.title === 'New Chat' && msg.role === 'user'
                  ? msg.content.length > 40
                    ? msg.content.slice(0, 37) + '…'
                    : msg.content
                  : t.title,
            }
          : t
      )
    );
  }, [activeTabId]);

  const createNewChat = useCallback((seedMessage?: string) => {
    const newMode = activeTab?.mode ?? 'idea';
    const { tab, messages } = makeDefaultTab(newMode);
    setTabs((prev) => [...prev, tab]);
    setChatHistory((prev) => ({ ...prev, [tab.id]: messages }));
    setActiveTabId(tab.id);
    if (seedMessage) {
      setInputValue(seedMessage);
    }
  }, [activeTab]);

  const deleteTab = useCallback((id: string) => {
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
  }, [activeTabId]);

  // ── Send ──
  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? inputValue).trim();
    if (!text || isLoading) return;

    appendToActive({ role: 'user', content: text, projectTypeHint: inferProjectTypeHint(text) });
    setInputValue('');
    setIsLoading(true);

    try {
      if (mode === 'full_build') {
        appendToActive({
          role: 'assistant',
          content: "Full Build mode: generating a runnable project, then starting a live run and automatic build/fix loop.",
        });
      }

      const res = await sendVeronicaMessage({ message: text });

      appendToActive({
        role: 'assistant',
        content: res.assistant_text,
        intent: res.intent,
        confidence: res.confidence,
        actions: res.actions,
        project: res.project ?? null,
        projectTypeHint: inferProjectTypeHint(text),
      });

      const projectId = (res.project as any)?.project_id as string | undefined;
      if (mode === 'full_build' && projectId) {
        appendToActive({ role: 'assistant', content: 'Starting live run…' });
        const runRes = await startVeronicaRun(projectId);
        appendToActive({
          role: 'assistant',
          content: `Run started (run_id: \`${runRes.run_id}\`). Launching build/fix agent…`,
        });
        await startVeronicaAgentJob(projectId, runRes.run_id);
        appendToActive({
          role: 'assistant',
          content: 'Agent job started. Opening your project view now so you can watch preview + logs.',
        });
        navigate(`/veronica-project/${projectId}`);
      }
    } catch (e) {
      appendToActive({
        role: 'assistant',
        content: e instanceof Error ? e.message : 'Something went wrong. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, mode, navigate, appendToActive]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // When mode changes, update the active tab's mode label
  const handleModeChange = (m: VeronicaMode) => {
    setMode(m);
    setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, mode: m } : t)));
  };

  return (
    <Layout>
      <div className="relative min-h-screen">
        <Silk speed={5} scale={1.2} rotation={0.15} />

        <div className="relative container mx-auto px-4 pt-24 pb-12 max-w-7xl">

          {/* ───────── Header ───────── */}
          <div className="mb-6 space-y-2">
            <Badge variant="outline" className="border-primary/30 bg-primary/5 text-xs uppercase tracking-wide">
              Veronica Studio
            </Badge>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-gradient flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-primary" />
              Where STEM ideas become reality
            </h1>
            <p className="text-muted-foreground max-w-2xl text-sm">
              Describe what you want to build and Veronica will turn it into a structured STEM project you can actually ship.
            </p>
          </div>

          {/* ───────── Two-column layout ───────── */}
          <div className="flex gap-0 rounded-2xl overflow-hidden border border-primary/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)] bg-background/40 backdrop-blur-2xl"
               style={{ height: 'calc(100vh - 280px)', minHeight: '520px' }}>

            {/* Sidebar */}
            <VeronicaChatTabs
              tabs={tabs}
              activeTabId={activeTabId}
              onSelectTab={setActiveTabId}
              onNewChat={() => createNewChat()}
              onDeleteTab={deleteTab}
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
            />

            {/* Chat area */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Mode pills */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-primary/10 bg-background/50 shrink-0">
                <div className="inline-flex items-center gap-1 rounded-full border border-primary/10 bg-background/60 px-1.5 py-0.5 text-xs">
                  {(['idea', 'full_build', 'debug'] as VeronicaMode[]).map((m) => {
                    const icons = { idea: Lightbulb, full_build: Cpu, debug: Bug };
                    const labels = { idea: 'Project Idea', full_build: 'Full Build', debug: 'Debug Help' };
                    const Icon = icons[m];
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleModeChange(m)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-3 py-1 transition',
                          mode === m ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-background/60'
                        )}
                      >
                        <Icon className="w-3 h-3" />
                        <span>{labels[m]}</span>
                      </button>
                    );
                  })}
                </div>
                {/* Collapse toggle (mobile fallback) */}
                <button
                  onClick={() => setSidebarCollapsed((v) => !v)}
                  className="md:hidden p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground"
                >
                  {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                </button>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1">
                <div className="p-5 space-y-4">
                  {activeMessages.map((m) => (
                    <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                      <div className={cn('max-w-[80%] space-y-2', m.role === 'user' ? 'text-right' : 'text-left')}>
                        <div className={cn(
                          'rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm',
                          m.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-gradient-to-br from-background/80 to-background/40 border border-primary/10 text-foreground'
                        )}>
                          {m.role === 'user' ? (
                            <p className="whitespace-pre-wrap">{m.content}</p>
                          ) : (
                            <div className="chat-markdown prose prose-invert max-w-none text-sm">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                            </div>
                          )}
                        </div>

                        {m.role === 'assistant' && typeof m.confidence === 'number' && m.intent && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="bg-background/40 border-primary/20">{m.intent}</Badge>
                            <span>confidence: {(m.confidence * 100).toFixed(0)}%</span>
                          </div>
                        )}

                        {m.role === 'assistant' && m.project && Array.isArray(m.actions) && (
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

              {/* Input area */}
              <div className="border-t border-primary/10 px-4 py-3 bg-background/70 shrink-0">
                {/* Quick prompts */}
                <div className="flex flex-wrap gap-1.5 mb-2.5 text-xs">
                  <span className="text-muted-foreground mr-1 self-center">Try:</span>
                  {QUICK_PROMPTS.map((p) => (
                    <Badge
                      key={p}
                      variant="outline"
                      className="cursor-pointer bg-background/80 hover:bg-primary/10 hover:text-primary transition-colors"
                      onClick={() => handleSend(p)}
                    >
                      {p}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 rounded-full border border-primary/20 bg-background/80 px-4 py-1 flex items-center gap-3 shadow-inner">
                    <Input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={onKeyDown}
                      placeholder="Describe what you want to build…"
                      disabled={isLoading}
                      className="h-10 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                    />
                  </div>
                  <Button
                    onClick={() => handleSend()}
                    disabled={isLoading || !inputValue.trim()}
                    className="h-11 px-5 bg-gradient-primary text-white rounded-full shadow-lg"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground text-center">
                  Veronica focuses on structured STEM project ideas. Code generation and live runs are enabled from your project view.
                </p>
              </div>
            </div>
          </div>

          {/* ───────── Community Section ───────── */}
          <VeronicaCommunity
            onRemixWithVeronica={(msg) => {
              // open a new chat tab pre-seeded with the remix message
              createNewChat(msg);
              // scroll back up to the chat
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </div>
      </div>
    </Layout>
  );
};

export default VeronicaAI;
