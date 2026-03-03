/**
 * Inspector Panel - BOTTOM controls component
 * 
 * Dynamic controls for adjusting active effect settings
 */

import { useEffects } from '@/contexts/EffectsContext';
import { effectsRegistry } from '@/effects/core/EffectsRegistry';
import { BackgroundControls } from '@/components/motion-studio/BackgroundControls';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { X, RotateCcw } from 'lucide-react';
import type { EffectSettingsSchema, SettingDefinition } from '@/types/effects';

interface InspectorPanelProps {
  selectedEffectId: string | null;
  onClose: () => void;
}

export function InspectorPanel({ selectedEffectId, onClose }: InspectorPanelProps) {
  const {
    updateTextSettings,
    updateCursorSettings,
    updateBackgroundSettings,
    updateUISettings,
    activeTextSettings,
    activeCursorSettings,
    activeBackgroundSettings,
    activeUISettings,
    activeBackgroundEffect,
  } = useEffects();
  
  // Check if we have an active background from BackgroundLibrary (not from effectsRegistry)
  const hasActiveBackgroundFromLibrary = activeBackgroundEffect !== null;
  
  const effect = selectedEffectId ? effectsRegistry.get(selectedEffectId) : null;
  
  // If no effect selected but we have an active background, show BackgroundControls
  if (!effect && hasActiveBackgroundFromLibrary) {
    return (
      <div className="h-64 flex flex-col">
        {/* Header */}
        <div className="px-6 py-3 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">Inspector Panel</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Adjusting: <span className="text-foreground font-medium">Background Effect</span>
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Background Controls */}
        <div className="flex-1 overflow-y-auto">
          <BackgroundControls />
        </div>
      </div>
    );
  }
  
  if (!effect) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Select an effect to adjust its settings</p>
      </div>
    );
  }
  
  const settingsSchema = effect.settingsSchema;
  const currentSettings = 
    effect.type === 'text' ? activeTextSettings :
    effect.type === 'cursor' ? activeCursorSettings :
    effect.type === 'background' ? activeBackgroundSettings :
    activeUISettings;
  
  const updateSettings = (key: string, value: any) => {
    const updates = { [key]: value };
    if (effect.type === 'text') updateTextSettings(updates);
    else if (effect.type === 'cursor') updateCursorSettings(updates);
    else if (effect.type === 'background') updateBackgroundSettings(updates);
    else if (effect.type === 'ui') updateUISettings(updates);
  };
  
  const resetToDefaults = () => {
    if (effect.type === 'text') updateTextSettings(effect.defaultSettings);
    else if (effect.type === 'cursor') updateCursorSettings(effect.defaultSettings);
    else if (effect.type === 'background') updateBackgroundSettings(effect.defaultSettings);
    else if (effect.type === 'ui') updateUISettings(effect.defaultSettings);
  };
  
  const renderControl = (key: string, setting: SettingDefinition) => {
    const value = currentSettings[key] ?? setting.defaultValue;
    
    switch (setting.type) {
      case 'range':
      case 'number':
        return (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={key} className="text-sm">{setting.label}</Label>
              <span className="text-xs text-muted-foreground">{value}</span>
            </div>
            <Slider
              id={key}
              min={setting.min ?? 0}
              max={setting.max ?? 100}
              step={setting.step ?? 1}
              value={[value]}
              onValueChange={([v]) => updateSettings(key, v)}
              className="w-full"
            />
            {setting.description && (
              <p className="text-xs text-muted-foreground">{setting.description}</p>
            )}
          </div>
        );
      
      case 'string':
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key} className="text-sm">{setting.label}</Label>
            <Input
              id={key}
              type="text"
              value={value}
              onChange={(e) => updateSettings(key, e.target.value)}
              className="w-full"
            />
            {setting.description && (
              <p className="text-xs text-muted-foreground">{setting.description}</p>
            )}
          </div>
        );
      
      case 'color':
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key} className="text-sm">{setting.label}</Label>
            <div className="flex gap-2">
              <Input
                id={key}
                type="color"
                value={value}
                onChange={(e) => updateSettings(key, e.target.value)}
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={value}
                onChange={(e) => updateSettings(key, e.target.value)}
                className="flex-1"
              />
            </div>
            {setting.description && (
              <p className="text-xs text-muted-foreground">{setting.description}</p>
            )}
          </div>
        );
      
      case 'boolean':
        return (
          <div key={key} className="flex items-center justify-between">
            <div>
              <Label htmlFor={key} className="text-sm">{setting.label}</Label>
              {setting.description && (
                <p className="text-xs text-muted-foreground mt-1">{setting.description}</p>
              )}
            </div>
            <Switch
              id={key}
              checked={value}
              onCheckedChange={(checked) => updateSettings(key, checked)}
            />
          </div>
        );
      
      case 'select':
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key} className="text-sm">{setting.label}</Label>
            <Select value={value} onValueChange={(v) => updateSettings(key, v)}>
              <SelectTrigger id={key}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {setting.options?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {setting.description && (
              <p className="text-xs text-muted-foreground">{setting.description}</p>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <div className="h-64 flex flex-col">
      {/* Header */}
      <div className="px-6 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Inspector Panel</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Adjusting: <span className="text-foreground font-medium">{effect.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={resetToDefaults}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Controls */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {settingsSchema ? (
          <div className="grid grid-cols-3 gap-6">
            {Object.entries(settingsSchema).map(([key, setting]) =>
              renderControl(key, setting)
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No settings available for this effect</p>
          </div>
        )}
      </div>
    </div>
  );
}
