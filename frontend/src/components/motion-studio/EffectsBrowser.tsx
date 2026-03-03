/**
 * Effects Browser - LEFT sidebar component
 * 
 * Displays all available effects in a searchable, categorized list
 */

import { useState, useMemo } from 'react';
import { effectsRegistry } from '@/effects/core/EffectsRegistry';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Search, Type, MousePointer, Image, Sparkles } from 'lucide-react';
import { BackgroundSelector } from '@/components/motion-studio/BackgroundSelector';
import type { EffectType } from '@/types/effects';

interface EffectsBrowserProps {
  selectedEffectId: string | null;
  onSelectEffect: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedType: EffectType | 'all';
  onTypeChange: (type: EffectType | 'all') => void;
}

export function EffectsBrowser({
  selectedEffectId,
  onSelectEffect,
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
}: EffectsBrowserProps) {
  const effects = useMemo(() => {
    let filtered = effectsRegistry.getAll();
    
    // Filter by type
    if (selectedType !== 'all') {
      filtered = effectsRegistry.getByType(selectedType);
    }
    
    // Filter by search
    if (searchQuery) {
      filtered = effectsRegistry.search(searchQuery);
    }
    
    return filtered;
  }, [selectedType, searchQuery]);
  
  const getTypeIcon = (type: EffectType | 'all') => {
    switch (type) {
      case 'text': return <Type className="h-4 w-4" />;
      case 'cursor': return <MousePointer className="h-4 w-4" />;
      case 'background': return <Image className="h-4 w-4" />;
      case 'ui': return <Sparkles className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
          Effects Browser
        </h2>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search effects..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      
      {/* Type Tabs */}
      <Tabs value={selectedType} onValueChange={(v) => onTypeChange(v as EffectType | 'all')} className="flex-1 flex flex-col">
        <div className="px-4 py-3 border-b border-border">
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="all" className="text-xs">
              All
            </TabsTrigger>
            <TabsTrigger value="text" className="text-xs">
              {getTypeIcon('text')}
            </TabsTrigger>
            <TabsTrigger value="cursor" className="text-xs">
              {getTypeIcon('cursor')}
            </TabsTrigger>
            <TabsTrigger value="background" className="text-xs">
              {getTypeIcon('background')}
            </TabsTrigger>
            <TabsTrigger value="ui" className="text-xs">
              {getTypeIcon('ui')}
            </TabsTrigger>
            <TabsTrigger value="backgrounds" className="text-xs">
              BG
            </TabsTrigger>
          </TabsList>
        </div>
        
        {/* Effects List for all tabs except backgrounds */}
        <TabsContent value="all" className="flex-1 m-0">
          <EffectsList effects={effects} selectedEffectId={selectedEffectId} onSelectEffect={onSelectEffect} getTypeIcon={getTypeIcon} />
        </TabsContent>
        <TabsContent value="text" className="flex-1 m-0">
          <EffectsList effects={effects} selectedEffectId={selectedEffectId} onSelectEffect={onSelectEffect} getTypeIcon={getTypeIcon} />
        </TabsContent>
        <TabsContent value="cursor" className="flex-1 m-0">
          <EffectsList effects={effects} selectedEffectId={selectedEffectId} onSelectEffect={onSelectEffect} getTypeIcon={getTypeIcon} />
        </TabsContent>
        <TabsContent value="background" className="flex-1 m-0">
          <EffectsList effects={effects} selectedEffectId={selectedEffectId} onSelectEffect={onSelectEffect} getTypeIcon={getTypeIcon} />
        </TabsContent>
        <TabsContent value="ui" className="flex-1 m-0">
          <EffectsList effects={effects} selectedEffectId={selectedEffectId} onSelectEffect={onSelectEffect} getTypeIcon={getTypeIcon} />
        </TabsContent>
        
        {/* Background Selector Tab */}
        <TabsContent value="backgrounds" className="flex-1 m-0">
          <BackgroundSelector />
        </TabsContent>
      </Tabs>
      
      {/* Stats Footer */}
      <div className="p-4 border-t border-border bg-card/30">
        <p className="text-xs text-muted-foreground">
          {effects.length} effect{effects.length !== 1 ? 's' : ''} available
        </p>
      </div>
    </div>
  );
}

// Extracted EffectsList component for reuse
function EffectsList({ effects, selectedEffectId, onSelectEffect, getTypeIcon }: {
  effects: any[];
  selectedEffectId: string | null;
  onSelectEffect: (id: string) => void;
  getTypeIcon: (type: EffectType | 'all') => JSX.Element;
}) {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-2">
        {effects.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No effects found</p>
            <p className="text-xs mt-1">Try a different search or filter</p>
          </div>
        ) : (
          effects.map((effect) => (
            <button
              key={effect.id}
              onClick={() => onSelectEffect(effect.id)}
              className={
                `w-full text-left p-3 rounded-lg border transition-all duration-200 hover:border-primary/50 ${
                  selectedEffectId === effect.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card/50'
                }`
              }
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-md bg-background">
                  {getTypeIcon(effect.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm">{effect.name}</h3>
                  {effect.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {effect.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {effect.library}
                    </span>
                    {effect.tags && effect.tags.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {effect.tags[0]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </ScrollArea>
  );
}
