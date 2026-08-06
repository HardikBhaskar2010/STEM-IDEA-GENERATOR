// ChatMessage Component
// Requirements: 8.3, 8.4

import React from 'react';
import { Bot, User, Clock, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { ChatMessage } from '@/types/aiGuidance';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: ChatMessage;
}

/**
 * ChatMessage component for individual message rendering
 * Displays messages with sender identification and timestamps
 * Supports formatted content and long message handling
 * 
 * Requirements: 8.3, 8.4
 */
const ChatMessageComponent: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.sender === 'user';
  const isError = message.metadata?.isError;

  /**
   * Format timestamp for display
   */
  const formatTimestamp = (timestamp: Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  /**
   * Format message content with basic markdown-like formatting
   * Requirements: 8.3
   */
  const formatContent = (content: string) => {
    // Split content into paragraphs
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    
    return paragraphs.map((paragraph, index) => {
      // Handle lists
      if (paragraph.includes('\n- ') || paragraph.includes('\n• ')) {
        const lines = paragraph.split('\n');
        const listItems = lines.filter(line => line.trim().startsWith('- ') || line.trim().startsWith('• '));
        const otherLines = lines.filter(line => !line.trim().startsWith('- ') && !line.trim().startsWith('• '));
        
        return (
          <div key={index} className="space-y-2">
            {otherLines.length > 0 && (
              <p className="text-sm leading-relaxed">
                {otherLines.join(' ').trim()}
              </p>
            )}
            {listItems.length > 0 && (
              <ul className="list-disc list-inside space-y-1 text-sm ml-2">
                {listItems.map((item, itemIndex) => (
                  <li key={itemIndex} className="leading-relaxed">
                    {item.replace(/^[•-]\s*/, '').trim()}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      }

      // Handle numbered lists
      if (paragraph.match(/^\d+\./m)) {
        const lines = paragraph.split('\n');
        const listItems = lines.filter(line => /^\d+\./.test(line.trim()));
        const otherLines = lines.filter(line => !/^\d+\./.test(line.trim()));
        
        return (
          <div key={index} className="space-y-2">
            {otherLines.length > 0 && (
              <p className="text-sm leading-relaxed">
                {otherLines.join(' ').trim()}
              </p>
            )}
            {listItems.length > 0 && (
              <ol className="list-decimal list-inside space-y-1 text-sm ml-2">
                {listItems.map((item, itemIndex) => (
                  <li key={itemIndex} className="leading-relaxed">
                    {item.replace(/^\d+\.\s*/, '').trim()}
                  </li>
                ))}
              </ol>
            )}
          </div>
        );
      }

      // Regular paragraph
      return (
        <p key={index} className="text-sm leading-relaxed">
          {paragraph.trim()}
        </p>
      );
    });
  };

  return (
    <div 
      className={cn(
        "flex gap-3 max-w-full",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
      role="article"
      aria-label={`${isUser ? 'Your' : 'AI'} message at ${formatTimestamp(message.timestamp)}`}
    >
      {/* Avatar */}
      <Avatar className="w-8 h-8 flex-shrink-0" aria-hidden="true">
        <AvatarFallback className={cn(
          "text-xs",
          isUser ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
        )}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div className={cn(
        "flex flex-col gap-1 max-w-[80%]",
        isUser ? "items-end" : "items-start"
      )}>
        {/* Message Bubble */}
        <div 
          className={cn(
            "rounded-lg px-3 py-2 shadow-sm",
            isUser 
              ? "bg-primary text-primary-foreground" 
              : isError
                ? "bg-destructive/10 text-destructive border border-destructive/20"
                : "bg-muted text-muted-foreground",
            "max-w-full break-words"
          )}
          role={isError ? "alert" : "text"}
          aria-live={isError ? "assertive" : "off"}
        >
          {isError && (
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4" aria-hidden="true" />
              <span className="text-xs font-medium">Error</span>
            </div>
          )}
          
          <div className="space-y-2">
            {formatContent(message.content)}
          </div>
        </div>

        {/* Metadata */}
        <div className={cn(
          "flex items-center gap-2 text-xs text-muted-foreground",
          isUser ? "flex-row-reverse" : "flex-row"
        )}>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" aria-hidden="true" />
            <time dateTime={message.timestamp.toISOString()}>
              {formatTimestamp(message.timestamp)}
            </time>
          </div>
          
          {message.metadata?.confidence && (
            <Badge variant="outline" className="text-xs px-1 py-0" aria-label={`AI confidence: ${Math.round(message.metadata.confidence * 100)} percent`}>
              {Math.round(message.metadata.confidence * 100)}% confidence
            </Badge>
          )}
        </div>

        {/* AI Message Metadata */}
        {!isUser && message.metadata && (
          <div className="space-y-2 mt-2" aria-label="Additional AI response information">
            {message.metadata.suggestions && message.metadata.suggestions.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Suggestions available</span>
              </div>
            )}
            
            {message.metadata.nextSteps && message.metadata.nextSteps.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Next steps provided</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessageComponent;