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
  ArrowRight,
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
  idea: { label: 'Idea', pillColor: 'text-indigo-400 border-indigo-400/30 bg-indigo-500/10' },
  full_build: { label: 'Full Build', pillColor: 'text-emerald-400 border-emerald-400/30 bg-emerald-500/10' },
  debug: { label: 'Debug', pillColor: 'text-orange-400 border-orange-400/30 bg-orange-500/10' },
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
      {/* Header / Logo Area */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4 shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
              <ArrowRight className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white font-sans">
              Veronica
            </span>
            <Badge variant="outline" className="border-indigo-500/40 text-indigo-400 bg-indigo-500/10 text-[9px] px-1.5 py-0">
              V2.1
            </Badge>
          </div>
        )}
        {collapsed && (
          <div className="w-full flex justify-center">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
              <ArrowRight className="w-5 h-5 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* New Project Button */}
      {!collapsed && (
        <div className="px-4 pb-4 shrink-0">
          <Button
            onClick={onNewChat}
            className="w-full justify-start gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl h-10 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            New project
          </Button>
        </div>
      )}

      {/* "RECENT" Subhead */}
      {!collapsed && tabs.length > 0 && (
        <div className="px-5 pb-2 shrink-0 flex items-center justify-between">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">
            RECENT
          </span>
          <Button
             size="icon"
             variant="ghost"
             onClick={onToggleCollapse}
             className="h-6 w-6 rounded hover:bg-white/5 opacity-50 hover:opacity-100"
          >
             <ChevronRight className="w-3.5 h-3.5 rotate-180" />
          </Button>
        </div>
      )}

      {/* Collapsed: Expansion toggle */}
      {collapsed && (
        <div className="flex flex-col items-center gap-4 py-3 border-t border-primary/10">
           <Button
             size="icon"
             variant="ghost"
             onClick={onToggleCollapse}
             className="h-8 w-8 rounded-full hover:bg-white/10"
             title="Expand sidebar"
           >
             <ChevronRight className="w-4 h-4" />
           </Button>
           <Button
             size="icon"
             variant="ghost"
             onClick={onNewChat}
             className="h-8 w-8 rounded-full hover:bg-indigo-500/20 text-indigo-400"
             title="New Chat"
           >
             <Plus className="w-4 h-4" />
           </Button>
        </div>
      )}

      {/* Expanded list */}
      {!collapsed && (
        <ScrollArea className="flex-1 min-h-0">
          <div className="flex flex-col gap-1 px-3 pb-4">
            {tabs.map((tab) => {
              const meta = MODE_META[tab.mode];
              const isActive = tab.id === activeTabId;
              
              return (
                <div key={tab.id} className="group relative flex items-center w-full min-w-0">
                  <button
                    onClick={() => onSelectTab(tab.id)}
                    className={cn(
                      'w-full min-w-0 text-left rounded-xl p-3 transition-colors duration-200 border border-transparent flex flex-col gap-2 relative overflow-hidden',
                      isActive
                        ? 'bg-[#151722] border-indigo-500/20' // active background
                        : 'hover:bg-white/[0.03]' // hover background
                    )}
                  >
                    {/* The specific purple left border overlay for active state */}
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-indigo-500 rounded-none opacity-100" />
                    )}
                    
                    {/* Title */}
                    <span className={cn(
                      'text-[13px] font-medium truncate w-full block',
                      isActive ? 'text-gray-100' : 'text-gray-300'
                    )}>
                      {tab.title}
                    </span>
                    
                    {/* Meta row: Mode badge + note count */}
                    <div className="flex items-center justify-between w-full">
                      <Badge
                        variant="outline"
                        className={cn(
                          'h-5 px-2 text-[10px] font-medium border rounded-full font-sans tracking-wide',
                          meta.pillColor
                        )}
                      >
                        {meta.label}
                      </Badge>
                      <span className="text-[11px] text-gray-500">
                        {tab.messageCount} notes
                      </span>
                    </div>
                  </button>

                  {/* Delete button on hover */}
                  {tabs.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteTab(tab.id); }}
                      className="absolute right-3 top-2.5 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-red-500/20 text-red-400"
                      title="Delete chat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
