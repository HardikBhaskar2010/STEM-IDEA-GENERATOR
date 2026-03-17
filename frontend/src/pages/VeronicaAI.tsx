import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, Sparkles, Cpu, Bug, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sendVeronicaMessage, startVeronicaRun, startVeronicaAgentJob, type VeronicaAIAction, type VeronicaAIChatResponse } from '@/services/veronicaAIService';
import { ProjectCard } from '@/components/veronica/ProjectCard';
import Silk from '@/components/veronica/Silk';
import { useNavigate } from 'react-router-dom';

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

const newId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const inferProjectTypeHint = (message: string) => {
  const msg = message.toLowerCase();
  if (msg.includes('robot')) return 'robotics';
  if (msg.includes('iot') || msg.includes('monitor')) return 'iot';
  if (msg.includes('web') || msg.includes('react')) return 'web-development';
  return 'electronics';
};

const VeronicaAI: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Tell me what you want to build, and I’ll help you shape it into a great STEM project.',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<VeronicaMode>('idea');
  const endRef = useRef<HTMLDivElement>(null);

  const lastUserMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') return messages[i].content;
    }
    return '';
  }, [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const appendMessage = (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    setMessages((prev) => [
      ...prev,
      { ...msg, id: newId(), timestamp: new Date() },
    ]);
  };

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    appendMessage({ role: 'user', content: text, projectTypeHint: inferProjectTypeHint(text) });
    setInputValue('');
    setIsLoading(true);

    try {
      if (mode === 'full_build') {
        appendMessage({
          role: 'assistant',
          content: "Full Build mode: generating a runnable project, then I’ll start a live run and attempt an automatic build/fix loop.",
        });
      }

      const res = await sendVeronicaMessage({ message: text });

      appendMessage({
        role: 'assistant',
        content: res.assistant_text,
        intent: res.intent,
        confidence: res.confidence,
        actions: res.actions,
        project: res.project ?? null,
        projectTypeHint: inferProjectTypeHint(text),
      });

      // Full Build: auto-run + agent job, then send the user to the project view.
      const projectId = (res.project as any)?.project_id as string | undefined;
      if (mode === 'full_build' && projectId) {
        appendMessage({ role: 'assistant', content: "Starting live run…" });
        const runRes = await startVeronicaRun(projectId);
        appendMessage({
          role: 'assistant',
          content: `Run started (run_id: \`${runRes.run_id}\`). Launching build/fix agent…`,
        });
        await startVeronicaAgentJob(projectId, runRes.run_id);
        appendMessage({
          role: 'assistant',
          content: "Agent job started. Opening your project view now so you can watch preview + logs.",
        });
        navigate(`/veronica-project/${projectId}`);
      }
    } catch (e) {
      appendMessage({
        role: 'assistant',
        content: e instanceof Error ? e.message : 'Something went wrong. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, mode, navigate]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Layout>
      <div className="relative min-h-screen overflow-hidden">
        <Silk speed={5} scale={1.2} rotation={0.15} />
        <div className="container mx-auto px-4 pt-24 pb-12 relative">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <Badge variant="outline" className="border-primary/30 bg-primary/5 text-xs uppercase tracking-wide">
                  Veronica Studio
                </Badge>
                <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-gradient flex items-center gap-2">
                  <Sparkles className="w-7 h-7 text-primary" />
                  Where STEM ideas become reality
                </h1>
                <p className="text-muted-foreground max-w-2xl">
                  Describe what you want to build and Veronica will turn it into a structured STEM project you can actually ship.
                </p>
              </div>
              {lastUserMessage && (
                <div className="hidden md:flex flex-col items-end gap-2">
                  <Badge variant="outline" className="bg-primary/5 border-primary/15 text-primary text-xs">
                    Last prompt
                  </Badge>
                  <p className="text-xs text-muted-foreground max-w-xs text-right line-clamp-2">
                    {lastUserMessage}
                  </p>
                </div>
              )}
            </div>

            {/* Mode pills row */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-background/70 px-2 py-1 text-xs shadow-sm">
              <button
                type="button"
                onClick={() => setMode('idea')}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-3 py-1 transition',
                  mode === 'idea' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-background/60'
                )}
              >
                <Lightbulb className="w-3 h-3" />
                <span>Project Idea</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('full_build')}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-3 py-1 transition',
                  mode === 'full_build' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-background/60'
                )}
              >
                <Cpu className="w-3 h-3" />
                <span>Full Build</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('debug')}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-3 py-1 transition',
                  mode === 'debug' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-background/60'
                )}
              >
                <Bug className="w-3 h-3" />
                <span>Debug Help</span>
              </button>
            </div>

            <Card className="glass-effect border-primary/20 bg-background/80 backdrop-blur-2xl shadow-[0_18px_45px_rgba(0,0,0,0.55)] overflow-hidden">
              <ScrollArea className="h-[65vh]">
                <div className="p-6 space-y-4">
                  {messages.map((m) => (
                    <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                      <div className={cn('max-w-[80%] space-y-2', m.role === 'user' ? 'text-right' : 'text-left')}>
                        <div
                          className={cn(
                            'rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm',
                            m.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-gradient-to-br from-background/80 to-background/40 border border-primary/10 text-foreground'
                          )}
                        >
                          {m.role === 'user' ? (
                            <p className="whitespace-pre-wrap">{m.content}</p>
                          ) : (
                            <div className="chat-markdown prose prose-invert max-w-none text-sm">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {m.content}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>

                        {m.role === 'assistant' && typeof m.confidence === 'number' && m.intent && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="bg-background/40 border-primary/20">
                              {m.intent}
                            </Badge>
                            <span>confidence: {(m.confidence * 100).toFixed(0)}%</span>
                          </div>
                        )}

                        {m.role === 'assistant' && m.project && Array.isArray(m.actions) && (
                          <ProjectCard
                            project={m.project as any}
                            actions={m.actions}
                            defaultProjectType={m.projectTypeHint}
                            onActionsChange={(next) => {
                              setMessages((prev) =>
                                prev.map((x) => (x.id === m.id ? { ...x, actions: next } : x))
                              );
                            }}
                          />
                        )}
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-background/70 border border-primary/15 rounded-2xl px-4 py-3 text-sm text-muted-foreground shadow-sm">
                        Veronica is thinking…
                      </div>
                    </div>
                  )}

                  <div ref={endRef} />
                </div>
              </ScrollArea>

              <div className="border-t border-primary/10 px-4 py-4 bg-background/70">
                {/* Quick prompt suggestions */}
                <div className="flex flex-wrap gap-2 mb-3 text-xs">
                  <span className="text-muted-foreground mr-1">Try:</span>
                  <Badge variant="outline" className="cursor-pointer bg-background/80 hover:bg-primary/10">
                    Beginner Arduino robot for 2 weeks
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer bg-background/80 hover:bg-primary/10">
                    IoT sensor project under $50
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer bg-background/80 hover:bg-primary/10">
                    Web app to track experiments
                  </Badge>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 rounded-full border border-primary/20 bg-background/80 px-4 py-1 flex items-center gap-3 shadow-inner">
                    <Input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={onKeyDown}
                      placeholder="Describe what you want to build (platform, difficulty, goals)…"
                      disabled={isLoading}
                      className="h-10 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                    />
                  </div>
                  <Button
                    onClick={handleSend}
                    disabled={isLoading || !inputValue.trim()}
                    className="h-11 px-5 bg-gradient-primary text-white rounded-full shadow-lg"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Veronica focuses on structured STEM project ideas first. Code generation and live runs are enabled from your project view.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default VeronicaAI;

