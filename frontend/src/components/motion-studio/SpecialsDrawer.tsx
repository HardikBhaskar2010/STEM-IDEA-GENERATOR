/**
 * Specials Drawer - Background presets selector
 * 
 * Modal/drawer showing all background effect presets with thumbnails
 */

import { useState } from 'react';
import { effectsRegistry } from '@/effects/core/EffectsRegistry';
import { useEffects } from '@/contexts/EffectsContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check } from 'lucide-react';

interface SpecialsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SpecialsDrawer({ open, onOpenChange }: SpecialsDrawerProps) {
  const { setBackgroundEffect, activeBackgroundEffect } = useEffects();
  const [category, setCategory] = useState<'all' | 'gradient' | 'particle' | '3d'>('all');
  
  const backgroundEffects = effectsRegistry.getByType('background');
  
  const filteredEffects = backgroundEffects.filter((effect) => {
    if (category === 'all') return true;
    if (category === 'gradient') return effect.tags?.includes('gradient');
    if (category === 'particle') return effect.tags?.includes('particle');
    if (category === '3d') return effect.tags?.includes('3d');
    return true;
  });
  
  const handleSelectBackground = (effectId: string) => {
    const effect = effectsRegistry.get(effectId);
    if (effect && effect.type === 'background') {
      setBackgroundEffect(effectId, effect.defaultSettings);
      onOpenChange(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>Specials - Background Effects</DialogTitle>
          <DialogDescription>
            Choose a background effect to apply to your preview
          </DialogDescription>
        </DialogHeader>
        
        {/* Category Tabs */}
        <Tabs value={category} onValueChange={(v) => setCategory(v as typeof category)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="gradient">Gradients</TabsTrigger>
            <TabsTrigger value="particle">Particles</TabsTrigger>
            <TabsTrigger value="3d">3D Scenes</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* Background Grid */}
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-3 gap-4 p-1">
            {/* None Option */}
            <button
              onClick={() => {
                setBackgroundEffect(null);
                onOpenChange(false);
              }}
              className={
                `relative aspect-video rounded-lg border-2 transition-all overflow-hidden group ${
                  !activeBackgroundEffect
                    ? 'border-primary shadow-lg shadow-primary/20'
                    : 'border-border hover:border-primary/50'
                }`
              }
            >
              <div className="absolute inset-0 bg-gradient-to-br from-background to-muted flex items-center justify-center">
                <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  None
                </span>
              </div>
              {!activeBackgroundEffect && (
                <div className="absolute top-2 right-2 p-1 rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </button>
            
            {/* Effect Options */}
            {filteredEffects.map((effect) => (
              <button
                key={effect.id}
                onClick={() => handleSelectBackground(effect.id)}
                className={
                  `relative aspect-video rounded-lg border-2 transition-all overflow-hidden group ${
                    activeBackgroundEffect === effect.id
                      ? 'border-primary shadow-lg shadow-primary/20'
                      : 'border-border hover:border-primary/50'
                  }`
                }
              >
                {/* Thumbnail */}
                {effect.preview ? (
                  <img
                    src={effect.preview}
                    alt={effect.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">Preview</span>
                  </div>
                )}
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-sm font-medium text-white">Select</span>
                </div>
                
                {/* Name */}
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-xs font-medium text-white truncate">
                    {effect.name}
                  </p>
                </div>
                
                {/* Selected Indicator */}
                {activeBackgroundEffect === effect.id && (
                  <div className="absolute top-2 right-2 p-1 rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </button>
            ))}
          </div>
          
          {filteredEffects.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No backgrounds in this category yet</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
