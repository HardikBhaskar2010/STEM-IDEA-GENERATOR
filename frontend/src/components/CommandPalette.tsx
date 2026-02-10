'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from '@/lib/navigation';
import { 
  Command, 
  Search, 
  Zap, 
  BookOpen, 
  Cpu, 
  Library, 
  User, 
  Settings,
  Home,
  Sparkles,
  Calculator,
  FileText,
  Globe,
  Clock,
  Folder
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { projectService } from '@/services/projectService';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  category: 'navigation' | 'actions' | 'projects' | 'components';
  keywords?: string[];
  badge?: string;
  timestamp?: Date;
}

export const CommandPalette: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentProjects, setRecentProjects] = useState<any[]>([]);

  // Load recent projects
  useEffect(() => {
    const loadRecentProjects = async () => {
      try {
        const projects = await projectService.getUserProjects();
        // Get the 5 most recent projects
        const recent = projects
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
          .slice(0, 5);
        setRecentProjects(recent);
      } catch (error) {
        console.error('Failed to load recent projects:', error);
      }
    };

    if (open) {
      loadRecentProjects();
    }
  }, [open]);

  // Define all available commands
  const commands: CommandItem[] = useMemo(() => [
    // Navigation
    {
      id: 'nav-home',
      label: 'Go to Home',
      description: 'Return to welcome page',
      icon: Home,
      action: () => navigate('/'),
      category: 'navigation',
      keywords: ['home', 'welcome', 'start']
    },
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      description: 'View your command center',
      icon: Zap,
      action: () => navigate('/dashboard'),
      category: 'navigation',
      keywords: ['dashboard', 'projects', 'overview']
    },
    {
      id: 'nav-generator',
      label: 'Go to Project Lab',
      description: 'Generate new AI-powered projects',
      icon: Sparkles,
      action: () => navigate('/generator'),
      category: 'navigation',
      keywords: ['generator', 'create', 'ai', 'new', 'lab'],
      badge: 'AI'
    },
    {
      id: 'nav-components',
      label: 'Go to Components',
      description: 'Browse 500+ electronic components',
      icon: Cpu,
      action: () => navigate('/components'),
      category: 'navigation',
      keywords: ['components', 'parts', 'catalog', 'electronics']
    },
    {
      id: 'nav-library',
      label: 'Go to Library',
      description: 'View saved projects',
      icon: Library,
      action: () => navigate('/library'),
      category: 'navigation',
      keywords: ['library', 'saved', 'collection']
    },
    {
      id: 'nav-learn',
      label: 'Go to Learn',
      description: 'Access interactive learning materials',
      icon: BookOpen,
      action: () => navigate('/learn'),
      category: 'navigation',
      keywords: ['learn', 'education', 'tutorials', 'book']
    },
    {
      id: 'nav-profile',
      label: 'Go to Profile',
      description: 'Manage your account',
      icon: User,
      action: () => navigate('/profile'),
      category: 'navigation',
      keywords: ['profile', 'account', 'settings', 'user']
    },
    
    // Actions
    {
      id: 'action-new-project',
      label: 'Generate New Project',
      description: 'Create AI-powered STEM project',
      icon: Sparkles,
      action: () => navigate('/generator'),
      category: 'actions',
      keywords: ['new', 'create', 'generate', 'project', 'ai'],
      badge: 'Hot'
    },
    {
      id: 'action-search-components',
      label: 'Search Components',
      description: 'Find electronic parts',
      icon: Search,
      action: () => navigate('/components'),
      category: 'actions',
      keywords: ['search', 'find', 'components', 'parts']
    },
    {
      id: 'action-view-library',
      label: 'View All Projects',
      description: 'See your complete project library',
      icon: Folder,
      action: () => navigate('/library'),
      category: 'actions',
      keywords: ['library', 'all', 'projects', 'collection']
    },
    {
      id: 'action-docs',
      label: 'View Documentation',
      description: 'Access help and guides',
      icon: FileText,
      action: () => navigate('/about'),
      category: 'actions',
      keywords: ['docs', 'help', 'documentation', 'guide']
    },
    // Recent projects
    ...recentProjects.map(project => ({
      id: `project-${project.id}`,
      label: project.title,
      description: `${project.difficulty || 'Project'} • ${project.estimatedTime || 'View details'}`,
      icon: Clock,
      action: () => navigate(`/project/${project.id}`),
      category: 'projects' as const,
      keywords: ['project', 'recent', project.title.toLowerCase()],
      timestamp: new Date(project.createdAt || Date.now())
    }))
  ], [navigate, recentProjects]);

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!search) return commands;
    
    const searchLower = search.toLowerCase();
    return commands.filter(cmd => 
      cmd.label.toLowerCase().includes(searchLower) ||
      cmd.description?.toLowerCase().includes(searchLower) ||
      cmd.keywords?.some(kw => kw.includes(searchLower))
    );
  }, [search, commands]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {
      navigation: [],
      actions: [],
      projects: [],
      components: []
    };
    
    filteredCommands.forEach(cmd => {
      groups[cmd.category].push(cmd);
    });
    
    return groups;
  }, [filteredCommands]);

  // Keyboard shortcut handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // CMD+K or CTRL+K to open
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setOpen(prev => !prev);
    }
    
    // ESC to close
    if (e.key === 'Escape' && open) {
      setOpen(false);
    }
    
    // Arrow navigation
    if (open) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : prev
        );
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
      }
      
      // Enter to execute
      if (e.key === 'Enter') {
        e.preventDefault();
        const selectedCommand = filteredCommands[selectedIndex];
        if (selectedCommand) {
          selectedCommand.action();
          setOpen(false);
          setSearch('');
          setSelectedIndex(0);
        }
      }
    }
  }, [open, selectedIndex, filteredCommands]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const executeCommand = (cmd: CommandItem) => {
    cmd.action();
    setOpen(false);
    setSearch('');
    setSelectedIndex(0);
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'navigation': return 'Navigation';
      case 'actions': return 'Quick Actions';
      case 'projects': return 'Recent Projects';
      case 'components': return 'Components';
      default: return category;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl p-0 gap-0 bg-background/95 backdrop-blur-xl border-primary/20">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-primary/10">
          <Search className="w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent outline-none text-lg placeholder:text-muted-foreground"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-mono bg-muted rounded border border-border">
            ESC
          </kbd>
        </div>

        {/* Command List */}
        <div className="max-h-[500px] overflow-y-auto py-2">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground">
              <Command className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No commands found</p>
              <p className="text-sm mt-1">Try searching for something else</p>
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, items]) => 
              items.length > 0 && (
                <div key={category} className="mb-4">
                  <div className="px-4 py-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {getCategoryLabel(category)}
                    </p>
                  </div>
                  {items.map((cmd, idx) => {
                    const globalIndex = filteredCommands.indexOf(cmd);
                    const isSelected = globalIndex === selectedIndex;
                    
                    return (
                      <button
                        key={cmd.id}
                        onClick={() => executeCommand(cmd)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={`w-full flex items-center gap-3 px-4 py-3 transition-all ${
                          isSelected 
                            ? 'bg-primary/10 text-primary' 
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isSelected ? 'bg-primary/20' : 'bg-muted'
                        }`}>
                          <cmd.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{cmd.label}</p>
                            {cmd.badge && (
                              <Badge 
                                variant="outline" 
                                className="text-xs px-1.5 py-0 h-5 bg-primary/10 text-primary border-primary/20"
                              >
                                {cmd.badge}
                              </Badge>
                            )}
                          </div>
                          {cmd.description && (
                            <p className="text-sm text-muted-foreground">{cmd.description}</p>
                          )}
                        </div>
                        {isSelected && (
                          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-mono bg-primary/10 rounded border border-primary/20">
                            ↵
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              )
            )
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-primary/10 bg-muted/30">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-background rounded border border-border">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-background rounded border border-border">↓</kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-background rounded border border-border">↵</kbd>
              <span>Select</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 bg-background rounded border border-border font-mono">
              {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+K
            </kbd>
            <span>to toggle</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};