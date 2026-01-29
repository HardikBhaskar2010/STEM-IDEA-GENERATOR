import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Mic, MicOff, Maximize2, Minimize2, Trash2, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { aiVoiceService } from '@/services/aiVoiceService';
import { chatHistoryService } from '@/services/chatHistoryService';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface UniversalChatProps {
  className?: string;
}

export const UniversalChat: React.FC<UniversalChatProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [readingMessageId, setReadingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionId = useRef(chatHistoryService.generateSessionId());

  // Load chat history on mount
  useEffect(() => {
    const history = chatHistoryService.getProjectHistory('universal_chat');
    if (history.length > 0) {
      setMessages(history as Message[]);
    } else {
      // Welcome message
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: "👋 **Welcome to your AI STEM Assistant!**\n\nI'm here to help you create amazing STEM projects! Here's what I can do:\n\n🔧 **Generate Projects**: \"Create a robotics project\" or \"Make an IoT device\"\n📱 **Navigate**: \"Open dashboard\" or \"Show my library\"\n🎓 **Learn**: \"Teach me about Arduino\" or \"How do sensors work?\"\n💬 **Chat**: Ask me anything about electronics, programming, or engineering!\n\n**Try saying:** \"Hi\" or \"Create a beginner robotics project\" to get started! 🚀",
        timestamp: new Date()
      }]);
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Keyboard shortcut: Ctrl+K to toggle chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        if (!isOpen) {
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    const newMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date()
    };
    
    setMessages(prev => {
      const updated = [...prev, newMessage];
      // Save to localStorage
      chatHistoryService.saveMessage('universal_chat', newMessage as any, sessionId.current);
      return updated;
    });

    return newMessage;
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    // Add user message
    addMessage('user', content);
    setInputValue('');
    setIsLoading(true);

    try {
      console.log('🔍 UniversalChat - Sending message:', content);
      
      // Get AI response
      const aiResponse = await aiVoiceService.processWithAI(content);
      console.log('✅ UniversalChat - Received AI response:', aiResponse);
      
      // Add assistant response
      addMessage('assistant', aiResponse.text);

      // Execute action if specified
      if (aiResponse.action === 'navigate' && aiResponse.parameters?.path) {
        let formData = aiResponse.parameters.formData || {};
        
        // If navigating to generator, always extract parameters from the user's message to ensure accuracy
        if (aiResponse.parameters.path === '/generator') {
          const contentLower = content.toLowerCase();
          console.log('🔍 UniversalChat - Original message:', content);
          console.log('🔍 UniversalChat - Lowercase message:', contentLower);
          console.log('🔍 UniversalChat - Existing formData from AI:', formData);
          
          // Extract project type
          let projectType = 'robotics'; // default
          if (contentLower.includes('robot')) {
            projectType = 'robotics';
          } else if (contentLower.includes('iot') || contentLower.includes('smart home')) {
            projectType = 'iot';
          } else if (contentLower.includes('electronic') || contentLower.includes('circuit')) {
            projectType = 'electronics';
          } else if (contentLower.includes('automation') || contentLower.includes('automat')) {
            projectType = 'automation';
          } else if (contentLower.includes('sensor') || contentLower.includes('monitor')) {
            projectType = 'sensors';
          }
          
          // Extract skill level
          let skillLevel = 'intermediate'; // default
          if (contentLower.includes('expert')) {
            skillLevel = 'expert';
            console.log('🎯 UniversalChat - Found "expert" in message, setting skillLevel to expert');
          } else if (contentLower.includes('advanced')) {
            skillLevel = 'advanced';
            console.log('🎯 UniversalChat - Found "advanced" in message, setting skillLevel to advanced');
          } else if (contentLower.includes('beginner') || contentLower.includes('start')) {
            skillLevel = 'beginner';
            console.log('🎯 UniversalChat - Found "beginner" in message, setting skillLevel to beginner');
          } else if (contentLower.includes('intermediate') || contentLower.includes('medium')) {
            skillLevel = 'intermediate';
            console.log('🎯 UniversalChat - Found "intermediate" in message, setting skillLevel to intermediate');
          } else {
            console.log('🎯 UniversalChat - No skill level found, defaulting to intermediate');
          }
          
          // Always use extracted data to override any AI-provided data
          formData = {
            projectType: projectType,
            skillLevel: skillLevel,
            interests: content,
            budget: formData.budget || '',
            duration: formData.duration || ''
          };
          
          console.log('🔍 UniversalChat - Final extracted form data:', formData);
        }
        
        // Store form data in sessionStorage for the Generator page
        if (formData && Object.keys(formData).length > 0) {
          sessionStorage.setItem('generatorFormData', JSON.stringify(formData));
          console.log('💾 UniversalChat - Stored form data in sessionStorage:', formData);
        }
        
        // Show navigation message
        setTimeout(() => {
          addMessage('assistant', `🚀 Taking you to ${aiResponse.parameters.path}...`);
        }, 500);
        
        setTimeout(() => {
          window.location.href = aiResponse.parameters.path;
        }, 1500);
      } else if (aiResponse.action === 'suggest_navigation' && aiResponse.parameters?.path) {
        // Add follow-up message with navigation option
        setTimeout(() => {
          addMessage('assistant', `Would you like me to take you to the Project Lab to create a ${aiResponse.parameters.type || 'new'} project? Just say "yes" or "take me there"!`);
        }, 1000);
      } else if (aiResponse.action === 'suggest_options') {
        // Add follow-up with options
        setTimeout(() => {
          addMessage('assistant', 'Would you like to:\n• Browse Arduino components in the catalog\n• Create an Arduino-based project\n• Learn more about Arduino\n\nJust let me know what interests you!');
        }, 1000);
      }

    } catch (error) {
      console.error('🚨 UniversalChat - Error:', error);
      
      // Provide a helpful error message
      const errorMessage = error.message?.includes('Failed to fetch') 
        ? "I'm having trouble connecting to my AI services right now. This might be a network issue. Please check your internet connection and try again."
        : `I encountered an error: ${error.message}. Please try rephrasing your question or try again in a moment.`;
      
      addMessage('assistant', errorMessage);
      
      toast({
        title: 'Connection Issue',
        description: 'Having trouble reaching AI services. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, addMessage]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  }, [inputValue, sendMessage]);

  const toggleVoiceMode = useCallback(async () => {
    if (!aiVoiceService.isSupported()) {
      toast({
        title: 'Not Supported',
        description: 'Voice input is not supported in your browser',
        variant: 'destructive'
      });
      return;
    }

    if (isVoiceMode) {
      // Stop listening
      aiVoiceService.stopListening();
      setIsVoiceMode(false);
      setVoiceTranscript('');
    } else {
      // Start listening
      setIsVoiceMode(true);
      try {
        await aiVoiceService.startListening((transcript, isFinal) => {
          setVoiceTranscript(transcript);
          if (isFinal) {
            sendMessage(transcript);
            setIsVoiceMode(false);
            setVoiceTranscript('');
          }
        });
      } catch (error) {
        console.error('Voice error:', error);
        setIsVoiceMode(false);
        toast({
          title: 'Voice Error',
          description: 'Failed to start voice input',
          variant: 'destructive'
        });
      }
    }
  }, [isVoiceMode, sendMessage]);

  const clearHistory = useCallback(() => {
    chatHistoryService.clearProjectHistory('universal_chat');
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: "Chat history cleared! How can I help you today?",
      timestamp: new Date()
    }]);
    toast({
      title: 'History Cleared',
      description: 'Chat history has been cleared'
    });
  }, []);

  const handleReadAloud = useCallback(async (messageId: string, content: string) => {
    if (readingMessageId === messageId) {
      // Stop reading if already reading this message
      aiVoiceService.stopSpeaking();
      setReadingMessageId(null);
      return;
    }

    try {
      setReadingMessageId(messageId);
      await aiVoiceService.speak(content, {
        useElevenLabs: true, // Use ElevenLabs for better quality
        rate: 1.2, // Enthusiastic pace
        pitch: 1.3, // Childish, cheerful tone
        volume: 0.8
      });
    } catch (error) {
      console.warn('TTS failed:', error);
      toast({
        title: 'Voice Error',
        description: 'Failed to read message aloud',
        variant: 'destructive'
      });
    } finally {
      setReadingMessageId(null);
    }
  }, [readingMessageId]);

  if (!isOpen) {
    return (
      <div className={cn("fixed bottom-6 right-6 z-50", className)}>
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-primary to-secondary hover:scale-110"
          size="icon"
          title="Open AI Assistant (Ctrl+K)"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(
      "fixed z-50 transition-all duration-300",
      isExpanded 
        ? "inset-4"
        : "bottom-6 right-6 w-96 h-[600px]",
      className
    )}>
      <Card className="h-full flex flex-col glass-effect border-primary/20 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-primary/10 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <h3 className="font-bold text-lg">AI Assistant</h3>
            <Badge variant="outline" className="text-xs">
              {messages.length - 1} messages
            </Badge>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={clearHistory}
              className="h-8 w-8"
              title="Clear history"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8"
              title={isExpanded ? "Minimize" : "Maximize"}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8"
              title="Close (Ctrl+K)"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                <div className={cn(
                  "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold",
                  message.role === 'user'
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                )}>
                  {message.role === 'user' ? 'You' : 'AI'}
                </div>
                
                <div className={cn(
                  "flex-1 rounded-2xl p-3 max-w-[80%] break-words",
                  message.role === 'user'
                    ? "bg-primary text-primary-foreground ml-auto"
                    : "bg-muted"
                )}>
                  {message.role === 'user' ? (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <div className="chat-markdown">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                            em: ({ children }) => <em className="italic">{children}</em>,
                            ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="ml-2">{children}</li>,
                            h1: ({ children }) => <h1 className="text-lg font-bold mb-2 text-foreground">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-base font-bold mb-2 text-foreground">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-sm font-bold mb-1 text-foreground">{children}</h3>,
                            code: ({ children, className }) => {
                              const isInline = !className;
                              return isInline ? (
                                <code className="bg-muted-foreground/10 px-1 py-0.5 rounded text-xs font-mono">
                                  {children}
                                </code>
                              ) : (
                                <pre className="bg-muted-foreground/10 p-2 rounded text-xs font-mono overflow-x-auto">
                                  <code>{children}</code>
                                </pre>
                              );
                            },
                            table: ({ children }) => (
                              <div className="overflow-x-auto mb-2">
                                <table className="min-w-full border-collapse border border-border">
                                  {children}
                                </table>
                              </div>
                            ),
                            thead: ({ children }) => (
                              <thead className="bg-muted/50">{children}</thead>
                            ),
                            tbody: ({ children }) => (
                              <tbody>{children}</tbody>
                            ),
                            tr: ({ children }) => (
                              <tr className="border-b border-border">{children}</tr>
                            ),
                            th: ({ children }) => (
                              <th className="border border-border px-2 py-1 text-left font-semibold text-xs">
                                {children}
                              </th>
                            ),
                            td: ({ children }) => (
                              <td className="border border-border px-2 py-1 text-xs">
                                {children}
                              </td>
                            ),
                            blockquote: ({ children }) => (
                              <blockquote className="border-l-4 border-primary/30 pl-3 italic text-muted-foreground mb-2">
                                {children}
                              </blockquote>
                            ),
                            hr: () => <hr className="border-border my-2" />
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                      
                      {/* Read Aloud Button for AI messages */}
                      <div className="flex items-center justify-between">
                        <p className="text-xs opacity-50">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReadAloud(message.id, message.content)}
                          className="h-6 px-2 text-xs opacity-60 hover:opacity-100 transition-opacity"
                          title={readingMessageId === message.id ? "Stop reading" : "Read aloud"}
                        >
                          {readingMessageId === message.id ? (
                            <>
                              <VolumeX className="h-3 w-3 mr-1" />
                              Stop
                            </>
                          ) : (
                            <>
                              <Volume2 className="h-3 w-3 mr-1" />
                              Read Aloud
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {message.role === 'user' && (
                    <p className="text-xs opacity-50 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold">
                  AI
                </div>
                <div className="bg-muted rounded-2xl p-3">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Voice transcript display */}
        {isVoiceMode && voiceTranscript && (
          <div className="px-4 py-2 bg-primary/10 border-t border-primary/20">
            <p className="text-sm text-muted-foreground">
              🎤 Listening: <span className="text-foreground">{voiceTranscript}</span>
            </p>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-primary/10">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a message or use voice..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={toggleVoiceMode}
              className={cn(
                "transition-colors",
                isVoiceMode ? "bg-red-500 text-white hover:bg-red-600" : ""
              )}
              title={isVoiceMode ? "Stop listening" : "Start voice input"}
            >
              {isVoiceMode ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button 
              type="submit" 
              size="icon"
              disabled={isLoading || !inputValue.trim()}
              className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+K</kbd> to toggle chat
          </p>
        </div>
      </Card>
    </div>
  );
};