/**
 * BackgroundControls Component
 * 
 * Configuration UI for active background parameters.
 * Displays dynamic controls based on background's settingsSchema.
 */

import React, { useCallback, useState } from 'react';
import { BackgroundLibrary } from '@/lib/backgrounds';
import { BackgroundMetadata, EffectSettingsSchema } from '@/lib/backgrounds/types';
import { useEffects } from '@/contexts/EffectsContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RotateCcw, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BackgroundControlsProps {
  className?: string;
}

export function BackgroundControls({ className }: BackgroundControlsProps) {
  const {
    activeBackgroundEffect,
    activeBackgroundSettings,
    updateBackgroundSettings,
    setBackgroundEffect,
  } = useEffects();
  
  // Local state for animation controls
  const [isPaused, setIsPaused] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1.0);
  
  // Get active background metadata
  const activeBackground = activeBackgroundEffect
    ? BackgroundLibrary.getById(activeBackgroundEffect)
    : null;
  
  // Handle setting change with validation
  const handleSettingChange = useCallback(
    (key: string, value: any, schema: EffectSettingsSchema[string]) => {
      // Validate value
      let validatedValue = value;
      
      if (schema.type === 'range' || schema.type === 'number') {
        const numValue = typeof value === 'number' ? value : parseFloat(value);
        
        if (isNaN(numValue)) {
          validatedValue = schema.defaultValue;
        } else if (schema.min !== undefined && numValue < schema.min) {
          validatedValue = schema.min;
        } else if (schema.max !== undefined && numValue > schema.max) {
          validatedValue = schema.max;
        } else {
          validatedValue = numValue;
        }
      }
      
      // Update settings
      updateBackgroundSettings({ [key]: validatedValue });
    },
    [updateBackgroundSettings]
  );
  
  // Handle reset to defaults
  const handleReset = useCallback(() => {
    if (activeBackground) {
      setBackgroundEffect(activeBackground.id, activeBackground.defaultSettings);
      setIsPaused(false);
      setAnimationSpeed(1.0);
    }
  }, [activeBackground, setBackgroundEffect]);
  
  // Handle pause/play toggle
  const handleTogglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
    updateBackgroundSettings({ isPaused: !isPaused });
  }, [isPaused, updateBackgroundSettings]);
  
  // Handle animation speed change
  const handleSpeedChange = useCallback(
    (speed: number) => {
      setAnimationSpeed(speed);
      updateBackgroundSettings({ animationSpeed: speed });
    },
    [updateBackgroundSettings]
  );
  
  // No active background
  if (!activeBackground) {
    return (
      <div className={cn('p-4 text-center text-muted-foreground', className)}>
        <p className="text-sm">No background selected</p>
        <p className="text-xs mt-1">Select a background to configure its settings</p>
      </div>
    );
  }
  
  return (
    <div className={cn('p-4 space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{activeBackground.name}</h3>
          <p className="text-xs text-muted-foreground">{activeBackground.description}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          title="Reset to defaults"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Animation Controls */}
      {activeBackground.supportsAnimationControl && (
        <div className="space-y-3 pb-3 border-b">
          <Label className="text-sm font-medium">Animation Controls</Label>
          
          {/* Pause/Play */}
          <div className="flex items-center justify-between">
            <span className="text-sm">Animation</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTogglePause}
              className="w-20"
            >
              {isPaused ? (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Play
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </>
              )}
            </Button>
          </div>
          
          {/* Speed Control */}
          {activeBackground.supportsSpeedControl && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="animation-speed" className="text-sm">
                  Speed
                </Label>
                <span className="text-xs text-muted-foreground">
                  {animationSpeed.toFixed(1)}x
                </span>
              </div>
              <Slider
                id="animation-speed"
                min={0.1}
                max={2.0}
                step={0.1}
                value={[animationSpeed]}
                onValueChange={([value]) => handleSpeedChange(value)}
                className="w-full"
              />
            </div>
          )}
        </div>
      )}
      
      {/* Dynamic Settings Controls */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">Settings</Label>
        
        {Object.entries(activeBackground.settingsSchema).map(([key, schema]) => {
          const currentValue = activeBackgroundSettings[key] ?? schema.defaultValue;
          
          return (
            <div key={key} className="space-y-2">
              {/* Range Control */}
              {schema.type === 'range' && (
                <>
                  <div className="flex items-center justify-between">
                    <Label htmlFor={key} className="text-sm">
                      {schema.label}
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {typeof currentValue === 'number' ? currentValue.toFixed(2) : currentValue}
                    </span>
                  </div>
                  {schema.description && (
                    <p className="text-xs text-muted-foreground">{schema.description}</p>
                  )}
                  <Slider
                    id={key}
                    min={schema.min}
                    max={schema.max}
                    step={schema.step}
                    value={[currentValue]}
                    onValueChange={([value]) => handleSettingChange(key, value, schema)}
                    className="w-full"
                  />
                </>
              )}
              
              {/* Number Input */}
              {schema.type === 'number' && (
                <>
                  <Label htmlFor={key} className="text-sm">
                    {schema.label}
                  </Label>
                  {schema.description && (
                    <p className="text-xs text-muted-foreground">{schema.description}</p>
                  )}
                  <Input
                    id={key}
                    type="number"
                    min={schema.min}
                    max={schema.max}
                    step={schema.step}
                    value={currentValue}
                    onChange={(e) => handleSettingChange(key, e.target.value, schema)}
                    className="w-full"
                  />
                </>
              )}
              
              {/* Color Picker */}
              {schema.type === 'color' && (
                <>
                  <Label htmlFor={key} className="text-sm">
                    {schema.label}
                  </Label>
                  {schema.description && (
                    <p className="text-xs text-muted-foreground">{schema.description}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      id={key}
                      type="color"
                      value={currentValue}
                      onChange={(e) => handleSettingChange(key, e.target.value, schema)}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={currentValue}
                      onChange={(e) => handleSettingChange(key, e.target.value, schema)}
                      className="flex-1 font-mono text-sm"
                      placeholder="#000000"
                    />
                  </div>
                </>
              )}
              
              {/* Select Dropdown */}
              {schema.type === 'select' && schema.options && (
                <>
                  <Label htmlFor={key} className="text-sm">
                    {schema.label}
                  </Label>
                  {schema.description && (
                    <p className="text-xs text-muted-foreground">{schema.description}</p>
                  )}
                  <Select
                    value={currentValue}
                    onValueChange={(value) => handleSettingChange(key, value, schema)}
                  >
                    <SelectTrigger id={key}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {schema.options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
              
              {/* Boolean Switch */}
              {schema.type === 'boolean' && (
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor={key} className="text-sm">
                      {schema.label}
                    </Label>
                    {schema.description && (
                      <p className="text-xs text-muted-foreground">{schema.description}</p>
                    )}
                  </div>
                  <Switch
                    id={key}
                    checked={currentValue}
                    onCheckedChange={(checked) => handleSettingChange(key, checked, schema)}
                  />
                </div>
              )}
              
              {/* String Input */}
              {schema.type === 'string' && (
                <>
                  <Label htmlFor={key} className="text-sm">
                    {schema.label}
                  </Label>
                  {schema.description && (
                    <p className="text-xs text-muted-foreground">{schema.description}</p>
                  )}
                  <Input
                    id={key}
                    type="text"
                    value={currentValue}
                    onChange={(e) => handleSettingChange(key, e.target.value, schema)}
                    className="w-full"
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
