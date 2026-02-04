import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StreamingResponseProps {
  content: string;
  isStreaming: boolean;
  title?: string;
  className?: string;
}

export const StreamingResponse: React.FC<StreamingResponseProps> = ({
  content,
  isStreaming,
  title = 'AI Response',
  className = ''
}) => {
  const [displayContent, setDisplayContent] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const prevContentRef = useRef('');

  // Typewriter effect for streaming content
  useEffect(() => {
    if (isStreaming && content !== prevContentRef.current) {
      prevContentRef.current = content;
      
      // If content is growing, show it immediately with a slight delay
      if (content.length > displayContent.length) {
        setDisplayContent(content);
        
        // Auto-scroll to bottom
        if (contentRef.current) {
          contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
      }
    } else if (!isStreaming && content) {
      // When streaming completes, ensure all content is displayed
      setDisplayContent(content);
    }
  }, [content, isStreaming]);

  // Reset when content changes drastically
  useEffect(() => {
    if (!content) {
      setDisplayContent('');
      setCurrentIndex(0);
      prevContentRef.current = '';
    }
  }, [content]);

  // Parse content to extract JSON if present
  const parseContent = (text: string) => {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e) {
        // If parsing fails, return null and display as text
        return null;
      }
    }

    // Try to parse as direct JSON
    try {
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  };

  const parsedProject = parseContent(displayContent);

  return (
    <div className={`relative ${className}`}>
      <Card className="glass-effect border-primary/20 overflow-hidden">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Sparkles className="w-5 h-5 text-primary" />
                {isStreaming && (
                  <span className="absolute inset-0 animate-ping">
                    <Sparkles className="w-5 h-5 text-primary opacity-75" />
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-gradient">{title}</h3>
            </div>
            {isStreaming && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 animate-pulse">
                <Zap className="w-3 h-3 mr-1" />
                Synthesizing...
              </Badge>
            )}
          </div>

          {/* Content */}
          <div
            ref={contentRef}
            className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar"
          >
            {isStreaming ? (
              // Cool loading animation during streaming - NO raw JSON displayed
              <div className="flex flex-col items-center justify-center py-16 space-y-8">
                {/* Animated logo/icon */}
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center animate-pulse">
                    <Sparkles className="w-12 h-12 text-primary animate-spin" style={{ animationDuration: '3s' }} />
                  </div>
                  {/* Orbiting particles */}
                  <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s' }}>
                    <div className="absolute top-0 left-1/2 w-3 h-3 bg-primary rounded-full -translate-x-1/2" />
                  </div>
                  <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s', animationDelay: '1s' }}>
                    <div className="absolute top-0 left-1/2 w-3 h-3 bg-secondary rounded-full -translate-x-1/2" />
                  </div>
                  <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s', animationDelay: '2s' }}>
                    <div className="absolute top-0 left-1/2 w-3 h-3 bg-accent rounded-full -translate-x-1/2" />
                  </div>
                </div>

                {/* Status messages */}
                <div className="text-center space-y-3">
                  <h4 className="text-xl font-bold text-gradient">AI is Synthesizing Your Project</h4>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Our AI is analyzing your requirements and generating a custom STEM project tailored to your specifications...
                  </p>
                </div>

                {/* Progress indicators */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>Processing with Solar Pro AI</span>
                </div>

                {/* Gradient lines animation */}
                <div className="w-full max-w-xs space-y-2 opacity-50">
                  <div className="h-2 bg-gradient-to-r from-transparent via-primary/30 to-transparent rounded-full animate-pulse" />
                  <div className="h-2 bg-gradient-to-r from-transparent via-secondary/30 to-transparent rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
                  <div className="h-2 bg-gradient-to-r from-transparent via-accent/30 to-transparent rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
                </div>
              </div>
            ) : parsedProject ? (
              // Structured project display after completion
              <div className="space-y-6">
                <div>
                  <h4 className="text-2xl font-bold text-gradient mb-2">
                    {parsedProject.title}
                  </h4>
                  <p className="text-muted-foreground">
                    {parsedProject.description}
                  </p>
                </div>

                {/* Project metadata */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {parsedProject.difficulty && (
                    <div className="glass-effect p-3 rounded-lg border border-primary/10">
                      <p className="text-xs text-muted-foreground mb-1">Difficulty</p>
                      <p className="font-semibold text-primary">{parsedProject.difficulty}</p>
                    </div>
                  )}
                  {parsedProject.estimatedTime && (
                    <div className="glass-effect p-3 rounded-lg border border-primary/10">
                      <p className="text-xs text-muted-foreground mb-1">Time</p>
                      <p className="font-semibold">{parsedProject.estimatedTime}</p>
                    </div>
                  )}
                  {parsedProject.estimatedCost && (
                    <div className="glass-effect p-3 rounded-lg border border-primary/10">
                      <p className="text-xs text-muted-foreground mb-1">Cost</p>
                      <p className="font-semibold">{parsedProject.estimatedCost}</p>
                    </div>
                  )}
                </div>

                {/* Components */}
                {parsedProject.components && parsedProject.components.length > 0 && (
                  <div>
                    <h5 className="font-bold mb-2 flex items-center gap-2">
                      <span className="text-primary">📦</span>
                      Required Components
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {parsedProject.components.map((component: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="bg-muted/50">
                          {component}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills */}
                {parsedProject.skills && parsedProject.skills.length > 0 && (
                  <div>
                    <h5 className="font-bold mb-2 flex items-center gap-2">
                      <span className="text-primary">🎯</span>
                      Skills Required
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {parsedProject.skills.map((skill: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="border-primary/20">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Steps */}
                {parsedProject.steps && parsedProject.steps.length > 0 && (
                  <div>
                    <h5 className="font-bold mb-3 flex items-center gap-2">
                      <span className="text-primary">📋</span>
                      Implementation Steps
                    </h5>
                    <ol className="space-y-3">
                      {parsedProject.steps.map((step: string, idx: number) => (
                        <li key={idx} className="flex gap-3 group">
                          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary group-hover:scale-110 transition-transform">
                            {idx + 1}
                          </span>
                          <span className="flex-1 pt-1">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Ambient glow */}
      {isStreaming && (
        <div className="absolute -inset-4 bg-primary/10 rounded-3xl blur-3xl -z-10 animate-pulse" />
      )}
    </div>
  );
};