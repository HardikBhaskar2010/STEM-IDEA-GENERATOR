/**
 * Effects Context - Global State for Effects System
 * 
 * Manages the global state of active effects, settings, and presets.
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import type {
  EffectsContextValue,
  EffectPreset,
  PerformanceMode,
  TextEffectSettings,
  CursorEffectSettings,
  BackgroundEffectSettings,
  UIEffectSettings,
} from '@/types/effects';
import { prefersReducedMotion } from '@/effects/core/PerformanceGuard';
import { usePerf } from '@/contexts/PerfContext';

const EffectsContext = createContext<EffectsContextValue | undefined>(undefined);

export function EffectsProvider({ children }: { children: React.ReactNode }) {
  // Get performance mode from existing PerfContext
  const { lowPerf } = usePerf();
  
  // Map existing perf mode to our types
  // lowPerf is boolean: true = low mode, false = high mode (default to medium for balance)
  const performanceMode: PerformanceMode = lowPerf ? 'low' : 'medium';
  
  // State for active effects
  const [activeTextEffect, setActiveTextEffect] = useState<string | null>(null);
  const [activeTextSettings, setActiveTextSettings] = useState<TextEffectSettings>({});
  
  const [activeCursorEffect, setActiveCursorEffect] = useState<string | null>(null);
  const [activeCursorSettings, setActiveCursorSettings] = useState<CursorEffectSettings>({});
  
  const [activeBackgroundEffect, setActiveBackgroundEffect] = useState<string | null>(null);
  const [activeBackgroundSettings, setActiveBackgroundSettings] = useState<BackgroundEffectSettings>({});
  
  const [activeUIEffect, setActiveUIEffect] = useState<string | null>(null);
  const [activeUISettings, setActiveUISettings] = useState<UIEffectSettings>({});
  
  // Current preset
  const [currentPreset, setCurrentPreset] = useState<EffectPreset | null>(null);
  
  // Global toggles
  const [effectsEnabled, setEffectsEnabled] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion());
  
  // Listen for reduced motion changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  // Effect activation handlers
  const setTextEffect = useCallback((effectId: string | null, settings?: TextEffectSettings) => {
    setActiveTextEffect(effectId);
    if (settings) {
      setActiveTextSettings(settings);
    }
  }, []);
  
  const setCursorEffect = useCallback((effectId: string | null, settings?: CursorEffectSettings) => {
    setActiveCursorEffect(effectId);
    if (settings) {
      setActiveCursorSettings(settings);
    }
  }, []);
  
  const setBackgroundEffect = useCallback((effectId: string | null, settings?: BackgroundEffectSettings) => {
    setActiveBackgroundEffect(effectId);
    if (settings) {
      setActiveBackgroundSettings(settings);
    }
  }, []);
  
  const setUIEffect = useCallback((effectId: string | null, settings?: UIEffectSettings) => {
    setActiveUIEffect(effectId);
    if (settings) {
      setActiveUISettings(settings);
    }
  }, []);
  
  // Settings update handlers
  const updateTextSettings = useCallback((settings: Partial<TextEffectSettings>) => {
    setActiveTextSettings((prev) => ({ ...prev, ...settings }));
  }, []);
  
  const updateCursorSettings = useCallback((settings: Partial<CursorEffectSettings>) => {
    setActiveCursorSettings((prev) => ({ ...prev, ...settings }));
  }, []);
  
  const updateBackgroundSettings = useCallback((settings: Partial<BackgroundEffectSettings>) => {
    setActiveBackgroundSettings((prev) => ({ ...prev, ...settings }));
  }, []);
  
  const updateUISettings = useCallback((settings: Partial<UIEffectSettings>) => {
    setActiveUISettings((prev) => ({ ...prev, ...settings }));
  }, []);
  
  // Preset management
  const loadPreset = useCallback((preset: EffectPreset) => {
    setCurrentPreset(preset);
    
    // Apply preset effects
    if (preset.effects.text) {
      setActiveTextEffect(preset.effects.text.effectId);
      setActiveTextSettings(preset.effects.text.settings);
    }
    
    if (preset.effects.cursor) {
      setActiveCursorEffect(preset.effects.cursor.effectId);
      setActiveCursorSettings(preset.effects.cursor.settings);
    }
    
    if (preset.effects.background) {
      setActiveBackgroundEffect(preset.effects.background.effectId);
      setActiveBackgroundSettings(preset.effects.background.settings);
    }
    
    if (preset.effects.ui) {
      setActiveUIEffect(preset.effects.ui.effectId);
      setActiveUISettings(preset.effects.ui.settings);
    }
  }, []);
  
  const clearPreset = useCallback(() => {
    setCurrentPreset(null);
    setActiveTextEffect(null);
    setActiveCursorEffect(null);
    setActiveBackgroundEffect(null);
    setActiveUIEffect(null);
  }, []);
  
  // Global controls
  const toggleEffects = useCallback(() => {
    setEffectsEnabled((prev) => !prev);
  }, []);
  
  const setPerformanceModeLocal = useCallback((mode: PerformanceMode) => {
    // This would need to update the PerfContext
    // For now, we'll just use the existing perfMode from PerfContext
    console.log('Performance mode change requested:', mode);
  }, []);
  
  // 🔥 FIX M-1: Memoize context value to prevent global re-render storm
  // Only recreate when dependencies actually change
  const value: EffectsContextValue = useMemo(() => ({
    // State
    activeTextEffect,
    activeTextSettings,
    activeCursorEffect,
    activeCursorSettings,
    activeBackgroundEffect,
    activeBackgroundSettings,
    activeUIEffect,
    activeUISettings,
    currentPreset,
    performanceMode,
    effectsEnabled,
    reducedMotion,
    
    // Actions (already memoized with useCallback)
    setTextEffect,
    setCursorEffect,
    setBackgroundEffect,
    setUIEffect,
    updateTextSettings,
    updateCursorSettings,
    updateBackgroundSettings,
    updateUISettings,
    loadPreset,
    clearPreset,
    toggleEffects,
    setPerformanceMode: setPerformanceModeLocal,
  }), [
    // State dependencies
    activeTextEffect,
    activeTextSettings,
    activeCursorEffect,
    activeCursorSettings,
    activeBackgroundEffect,
    activeBackgroundSettings,
    activeUIEffect,
    activeUISettings,
    currentPreset,
    performanceMode,
    effectsEnabled,
    reducedMotion,
    // Action dependencies (callbacks are stable)
    setTextEffect,
    setCursorEffect,
    setBackgroundEffect,
    setUIEffect,
    updateTextSettings,
    updateCursorSettings,
    updateBackgroundSettings,
    updateUISettings,
    loadPreset,
    clearPreset,
    toggleEffects,
    setPerformanceModeLocal,
  ]);
  
  return (
    <EffectsContext.Provider value={value}>
      {children}
    </EffectsContext.Provider>
  );
}

export function useEffects(): EffectsContextValue {
  const context = useContext(EffectsContext);
  if (!context) {
    throw new Error('useEffects must be used within EffectsProvider');
  }
  return context;
}



