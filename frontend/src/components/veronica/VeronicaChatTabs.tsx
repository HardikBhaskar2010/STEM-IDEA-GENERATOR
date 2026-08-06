import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Plus,
  Cpu,
  Lightbulb,
  Bug,
  Trash2,
  ChevronRight,
  ArrowRight,
  Search,
  MoreHorizontal,
  Pencil,
  Copy,
} from 'lucide-react';

export type ChatTabStatus = 'completed' | 'in_progress' | 'failed' | 'idle';

export type ChatTab = {
  id: string;
  title: string;
  mode: 'idea' | 'full_build' | 'debug';
  messageCount: number;
  lastMessage?: string;
  createdAt: Date;
  projectId?: string;
  status?: ChatTabStatus;
};

const MODE_META = {
  idea: { label: 'Idea', pillColor: 'text-indigo-400 border-indigo-400/30 bg-indigo-500/10' },
  full_build: { label: 'Full Build', pillColor: 'text-emerald-400 border-emerald-400/30 bg-emerald-500/10' },
  debug: { label: 'Debug', pillColor: 'text-orange-400 border-orange-400/30 bg-orange-500/10' },
};

const STATUS_DOT: Record<ChatTabStatus, string> = {
  completed:   'bg-emerald-400',
  in_progress: 'bg-amber-400 animate-pulse',
  failed:      'bg-rose-400',
  idle:        'bg-gray-600',
};

function formatRelative(date: Date): string {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) {return 'now';}
  if (diff < 3600) {return `${Math.floor(diff / 60)}m`;}
  if (diff < 86400) {return `${Math.floor(diff / 3600)}h`;}
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface VeronicaChatTabsProps {
  tabs: ChatTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onNewChat: () => void;
  onDeleteTab: (id: string) => void;
  onRenameTab?: (id: string, title: string) => void;
  onDuplicateTab?: (id: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

// ─── Context Menu ─────────────────────────────────────────────────────────────

interface ContextMenuProps {
  tabId: string;
  tabTitle: string;
  onRename?: (id: string, title: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement>;
}

const TabContextMenu: React.FC<ContextMenuProps> = ({
  tabId, tabTitle, onRename, onDuplicate, onDelete, onClose, anchorRef,
}) => {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(tabTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleRenameSubmit = () => {
    if (draft.trim()) {onRename?.(tabId, draft.trim());}
    setRenaming(false);
    onClose();
  };

  return (
    <div
      className="absolute right-0 top-full mt-1 z-50 w-40 rounded-lg border border-white/10 bg-[#16161f] shadow-xl overflow-hidden"
      onMouseLeave={onClose}
    >
      {renaming ? (
        <div className="p-2">
          <input
            ref={inputRef}
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {handleRenameSubmit();}
              if (e.key === 'Escape') { setRenaming(false); onClose(); }
            }}
            className="w-full bg-[#0a0a0f] border border-white/10 rounded px-2 py-1 text-[12px] text-gray-200 outline-none focus:border-indigo-500/40"
          />
        </div>
      ) : (
        <>
          <button
            onClick={() => { setRenaming(true); setTimeout(() => inputRef.current?.focus(), 50); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-gray-300 hover:bg-white/5 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5 text-gray-500" />
            Rename
          </button>
          {onDuplicate && (
            <button
              onClick={() => { onDuplicate(tabId); onClose(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-gray-300 hover:bg-white/5 transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-gray-500" />
              Duplicate
            </button>
          )}
          <div className="border-t border-white/5 my-0.5" />
          <button
            onClick={() => { onDelete(tabId); onClose(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const VeronicaChatTabs: React.FC<VeronicaChatTabsProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onNewChat,
  onDeleteTab,
  onRenameTab,
  onDuplicateTab,
  collapsed = false,
  onToggleCollapse,
}) => {
  const [search, setSearch] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  const filteredTabs = search.trim()
    ? tabs.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
    : tabs;

  return (
    <div
      className={cn(
        'flex flex-col h-full transition-all duration-300 ease-in-out',
        'border-r border-primary/10 bg-background/60 backdrop-blur-xl',
        collapsed ? 'w-14' : 'w-64'
      )}
    >
      {/* Header / Logo */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4 shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
              <ArrowRight className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white font-sans">Veronica</span>
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
        <div className="px-4 pb-3 shrink-0">
          <Button
            onClick={onNewChat}
            className="w-full justify-start gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl h-10 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            New project
          </Button>
        </div>
      )}

      {/* Search bar */}
      {!collapsed && (
        <div className="px-4 pb-3 shrink-0">
          <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-1.5">
            <Search className="w-3.5 h-3.5 text-gray-600 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search chats…"
              className="flex-1 bg-transparent text-[12px] text-gray-300 placeholder:text-gray-600 outline-none"
            />
          </div>
        </div>
      )}

      {/* "RECENT" Subhead */}
      {!collapsed && filteredTabs.length > 0 && (
        <div className="px-5 pb-2 shrink-0 flex items-center justify-between">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">
            {search ? 'Results' : 'Recent'}
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
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2.5 pb-4 space-y-1">
          {filteredTabs.length === 0 && (
            <p className="text-[11px] text-gray-600 text-center py-6">No chats found</p>
          )}
          {filteredTabs.map((tab) => {
            const meta = MODE_META[tab.mode];
            const isActive = tab.id === activeTabId;
            const status = tab.status ?? 'idle';
            const isMenuOpen = menuOpenId === tab.id;

            return (
              <div key={tab.id} className="group relative flex items-center w-full min-w-0">
                <button
                  onClick={() => onSelectTab(tab.id)}
                  data-no-cursor="true"
                  className={cn(
                    'w-full min-w-0 text-left rounded-xl py-2 px-3 transition-all duration-200 border flex flex-col gap-1 relative overflow-hidden box-border',
                    isActive
                      ? 'bg-[#151722] border-indigo-500/30 shadow-md ring-1 ring-indigo-500/20'
                      : 'border-transparent hover:bg-white/[0.04]'
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-xl opacity-100" />
                  )}

                  {/* Title + status dot row */}
                  <div className="flex items-center gap-2 w-full min-w-0 pr-4">
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full shrink-0',
                        STATUS_DOT[status]
                      )}
                    />
                    <span className={cn(
                      'text-[13px] font-medium truncate flex-1 block',
                      isActive ? 'text-gray-100' : 'text-gray-300'
                    )}>
                      {tab.title}
                    </span>
                  </div>

                  {/* Mode badge + timestamp row */}
                  <div className="flex items-center justify-between w-full min-w-0 gap-1.5 pt-0.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        'h-4 px-1.5 text-[9px] font-medium border rounded-full font-sans tracking-wide shrink-0',
                        meta.pillColor
                      )}
                    >
                      {meta.label}
                    </Badge>
                    <span className="text-[10px] text-gray-500 shrink-0 font-mono">
                      {formatRelative(tab.createdAt)}
                    </span>
                  </div>
                </button>

                {/* "..." Context menu button */}
                <div className="absolute right-1.5 top-2.5 z-10">
                  <button
                    ref={isMenuOpen ? menuBtnRef : undefined}
                    onClick={(e) => { e.stopPropagation(); setMenuOpenId(isMenuOpen ? null : tab.id); }}
                    className={cn(
                      'p-1 rounded-md transition-all',
                      isMenuOpen
                        ? 'opacity-100 bg-white/10 text-gray-200'
                        : 'opacity-0 group-hover:opacity-100 hover:bg-white/10 text-gray-500'
                    )}
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>

                  {isMenuOpen && (
                    <TabContextMenu
                      tabId={tab.id}
                      tabTitle={tab.title}
                      onRename={onRenameTab}
                      onDuplicate={onDuplicateTab}
                      onDelete={onDeleteTab}
                      onClose={() => setMenuOpenId(null)}
                      anchorRef={menuBtnRef}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer model status */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-[11px] text-gray-500">claude-3-7-sonnet · online</span>
          </div>
        </div>
      )}
    </div>
  );
};
