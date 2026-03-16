import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sendVeronicaMessage, type VeronicaAIAction, type VeronicaAIChatResponse } from '@/services/veronicaAIService';
import { ProjectCard } from '@/components/veronica/ProjectCard';

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

const newId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const inferProjectTypeHint = (message: string) => {
  const msg = message.toLowerCase();
  if (msg.includes('robot')) return 'robotics';
  if (msg.includes('iot') || msg.includes('monitor')) return 'iot';
  if (msg.includes('web') || msg.includes('react')) return 'web-development';
  return 'electronics';
};

const VeronicaAI: React.FC = () => {
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
    } catch (e) {
      appendMessage({
        role: 'assistant',
        content: e instanceof Error ? e.message : 'Something went wrong. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 pt-16 pb-10">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-4xl font-bold text-gradient flex items-center gap-2">
                <Sparkles className="w-7 h-7 text-primary" />
                Veronica AI
              </h1>
              <p className="text-muted-foreground">
                Chat to generate project ideas (code generation is kept in the backend for later).
              </p>
            </div>
            {lastUserMessage && (
              <Badge variant="outline" className="bg-primary/5 border-primary/15 text-primary">
                Last: {lastUserMessage.slice(0, 28)}{lastUserMessage.length > 28 ? '…' : ''}
              </Badge>
            )}
          </div>

          <Card className="glass-effect border-primary/10 overflow-hidden">
            <ScrollArea className="h-[65vh]">
              <div className="p-5 space-y-4">
                {messages.map((m) => (
                  <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[85%] space-y-2', m.role === 'user' ? 'text-right' : 'text-left')}>
                      <div
                        className={cn(
                          'rounded-2xl px-4 py-3 text-sm leading-relaxed',
                          m.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                      >
                        {m.role === 'user' ? (
                          <p className="whitespace-pre-wrap">{m.content}</p>
                        ) : (
                          <div className="chat-markdown">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {m.content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>

                      {m.role === 'assistant' && typeof m.confidence === 'number' && m.intent && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="bg-background/40">
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
                    <div className="bg-muted rounded-2xl px-4 py-3 text-sm text-muted-foreground">
                      Veronica is thinking…
                    </div>
                  </div>
                )}

                <div ref={endRef} />
              </div>
            </ScrollArea>

            <div className="border-t border-primary/10 p-4">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Describe what you want (e.g., 'Give me a robotics project idea')"
                  disabled={isLoading}
                  className="h-12"
                />
                <Button
                  onClick={handleSend}
                  disabled={isLoading || !inputValue.trim()}
                  className="h-12 px-4 bg-gradient-primary text-white"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Press Enter to send.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default VeronicaAI;

