import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Plus,
  MessageSquare,
  Cpu,
  Lightbulb,
  Bug,
  Trash2,
  ChevronRight,
} from 'lucide-react';

export type ChatTab = {
  id: string;
  title: string;
  mode: 'idea' | 'full_build' | 'debug';
  messageCount: number;
  lastMessage?: string;
  createdAt: Date;
  projectId?: string;
};

const MODE_META = {
  idea: { icon: Lightbulb, label: 'Idea', color: 'text-amber-400' },
  full_build: { icon: Cpu, label: 'Build', color: 'text-primary' },
  debug: { icon: Bug, label: 'Debug', color: 'text-rose-400' },
};

function formatRelative(date: Date): string {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface VeronicaChatTabsProps {
  tabs: ChatTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onNewChat: () => void;
  onDeleteTab: (id: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const VeronicaChatTabs: React.FC<VeronicaChatTabsProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onNewChat,
  onDeleteTab,
  collapsed = false,
  onToggleCollapse,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col h-full transition-all duration-300 ease-in-out',
        'border-r border-primary/10 bg-background/60 backdrop-blur-xl',
        collapsed ? 'w-14' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-primary/10 shrink-0">
        {!collapsed && (
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Chats
          </span>
        )}
        <div className={cn('flex items-center gap-1', collapsed && 'w-full justify-center')}>
          {!collapsed && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onNewChat}
              className="h-7 w-7 rounded-full hover:bg-primary/10 hover:text-primary"
              title="New Chat"
            >
              <Plus className="w-4 h-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={onToggleCollapse}
            className="h-7 w-7 rounded-full hover:bg-primary/10"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronRight
              className={cn(
                'w-4 h-4 transition-transform duration-300',
                collapsed ? '' : 'rotate-180'
              )}
            />
          </Button>
        </div>
      </div>

      {/* Collapsed: new chat only */}
      {collapsed && (
        <div className="flex flex-col items-center gap-2 py-3">
          <Button
            size="icon"
            variant="ghost"
            onClick={onNewChat}
            className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
            title="New Chat"
          >
            <Plus className="w-4 h-4" />
          </Button>
          {tabs.map((tab) => {
            const ModeIcon = MODE_META[tab.mode].icon;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                title={tab.title}
                className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center transition',
                  tab.id === activeTabId
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-primary/5'
                )}
              >
                <ModeIcon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      )}

      {/* Expanded list */}
      {!collapsed && (
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-2 space-y-1">
            {tabs.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6 px-2">
                No chats yet. Click <strong>+</strong> to start.
              </p>
            )}
            {tabs.map((tab) => {
              const meta = MODE_META[tab.mode];
              const ModeIcon = meta.icon;
              const isActive = tab.id === activeTabId;
              return (
                <div key={tab.id} className="group relative">
                  <button
                    onClick={() => onSelectTab(tab.id)}
                    className={cn(
                      'w-full text-left rounded-xl px-3 py-2.5 transition-all',
                      isActive
                        ? 'bg-primary/10 border border-primary/20 shadow-sm'
                        : 'hover:bg-primary/5 border border-transparent'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={cn(
                          'mt-0.5 shrink-0 w-6 h-6 rounded-full flex items-center justify-center',
                          isActive ? 'bg-primary/15' : 'bg-muted/40'
                        )}
                      >
                        <ModeIcon className={cn('w-3.5 h-3.5', isActive ? 'text-primary' : meta.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className={cn('text-sm font-medium truncate', isActive ? 'text-foreground' : 'text-muted-foreground')}>
                            {tab.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatRelative(tab.createdAt)}
                          </span>
                        </div>
                        {tab.lastMessage && (
                          <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
                            {tab.lastMessage}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge
                            variant="outline"
                            className={cn(
                              'h-4 px-1.5 text-[9px] border-0',
                              isActive ? 'bg-primary/10 text-primary' : 'bg-muted/40 text-muted-foreground'
                            )}
                          >
                            {meta.label}
                          </Badge>
                          {tab.messageCount > 0 && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <MessageSquare className="w-2.5 h-2.5" />
                              {tab.messageCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Delete button - shows on hover, only for non-active or if >1 tab */}
                  {tabs.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteTab(tab.id); }}
                      className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 rounded-full flex items-center justify-center hover:bg-destructive/10 hover:text-destructive"
                      title="Delete chat"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
