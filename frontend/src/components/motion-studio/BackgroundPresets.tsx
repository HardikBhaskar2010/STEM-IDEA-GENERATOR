/**
 * BackgroundPresets Component
 * 
 * Displays and manages background presets (built-in and user-created).
 * Allows users to apply presets and save custom configurations.
 */

import React, { useState, useCallback } from 'react';
import { BackgroundLibrary } from '@/lib/backgrounds';
import type { BackgroundPreset } from '@/lib/backgrounds/types';
import { useEffects } from '@/contexts/EffectsContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Star, Plus, Trash2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BackgroundPresetsProps {
  className?: string;
}

export function BackgroundPresets({ className }: BackgroundPresetsProps) {
  const { activeBackgroundEffect, activeBackgroundSettings, setBackgroundEffect } = useEffects();
  
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  
  // Get all presets
  const builtInPresets = BackgroundLibrary.getBuiltInPresets();
  const userPresets = BackgroundLibrary.getUserPresets();
  
  // Handle preset application
  const handleApplyPreset = useCallback(
    (preset: BackgroundPreset) => {
      setBackgroundEffect(preset.backgroundId, preset.settings);
    },
    [setBackgroundEffect]
  );
  
  // Handle save custom preset
  const handleSavePreset = useCallback(() => {
    if (!activeBackgroundEffect || !presetName.trim()) {
      return;
    }
    
    const newPreset: BackgroundPreset = {
      id: `user-${Date.now()}`,
      name: presetName.trim(),
      description: presetDescription.trim() || 'Custom preset',
      backgroundId: activeBackgroundEffect,
      settings: { ...activeBackgroundSettings },
      isBuiltIn: false,
      createdAt: new Date(),
    };
    
    BackgroundLibrary.addUserPreset(newPreset);
    
    // Reset form and close dialog
    setPresetName('');
    setPresetDescription('');
    setSaveDialogOpen(false);
  }, [activeBackgroundEffect, activeBackgroundSettings, presetName, presetDescription]);
  
  // Handle delete user preset
  const handleDeletePreset = useCallback((presetId: string) => {
    BackgroundLibrary.removeUserPreset(presetId);
  }, []);
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with Save Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Presets</h3>
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={!activeBackgroundEffect}
              title="Save current settings as preset"
            >
              <Plus className="h-4 w-4 mr-1" />
              Save
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Preset</DialogTitle>
              <DialogDescription>
                Save your current background configuration as a preset for quick access later.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="preset-name">Preset Name</Label>
                <Input
                  id="preset-name"
                  placeholder="My Custom Preset"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preset-description">Description (optional)</Label>
                <Input
                  id="preset-description"
                  placeholder="Describe your preset..."
                  value={presetDescription}
                  onChange={(e) => setPresetDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSavePreset} disabled={!presetName.trim()}>
                Save Preset
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Built-in Presets */}
      {builtInPresets.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-medium text-muted-foreground">Curated Presets</h4>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {builtInPresets.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                onApply={handleApplyPreset}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* User Presets */}
      {userPresets.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-medium text-muted-foreground">My Presets</h4>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {userPresets.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                onApply={handleApplyPreset}
                onDelete={handleDeletePreset}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Empty State */}
      {builtInPresets.length === 0 && userPresets.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No presets available</p>
        </div>
      )}
    </div>
  );
}

/**
 * Individual preset card component
 */
interface PresetCardProps {
  preset: BackgroundPreset;
  onApply: (preset: BackgroundPreset) => void;
  onDelete?: (presetId: string) => void;
}

function PresetCard({ preset, onApply, onDelete }: PresetCardProps) {
  const background = BackgroundLibrary.getById(preset.backgroundId);
  
  return (
    <div className="group relative rounded-lg border overflow-hidden hover:border-primary transition-all">
      <button
        onClick={() => onApply(preset)}
        className="w-full text-left"
      >
        {/* Thumbnail or Placeholder */}
        <div className="aspect-video bg-muted relative">
          {preset.thumbnailUrl ? (
            <img
              src={preset.thumbnailUrl}
              alt={preset.name}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : background?.thumbnailUrl ? (
            <img
              src={background.thumbnailUrl}
              alt={preset.name}
              loading="lazy"
              className="w-full h-full object-cover opacity-70"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Sparkles className="h-6 w-6" />
            </div>
          )}
          
          {/* Built-in Badge */}
          {preset.isBuiltIn && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="text-xs">
                Curated
              </Badge>
            </div>
          )}
        </div>
        
        {/* Info */}
        <div className="p-2">
          <p className="text-xs font-medium truncate">{preset.name}</p>
          <p className="text-xs text-muted-foreground truncate">{preset.description}</p>
        </div>
      </button>
      
      {/* Delete Button (User Presets Only) */}
      {!preset.isBuiltIn && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(preset.id);
          }}
          className="absolute top-2 right-2 p-1 rounded bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete preset"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
