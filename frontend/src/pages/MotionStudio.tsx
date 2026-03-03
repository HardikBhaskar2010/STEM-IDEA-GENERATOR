/**
 * Motion Studio Page - Effects Lab and Control Center
 * Phase 9: Enhanced with performance monitoring integration
 * 
 * Layout: LEFT (Effects Browser) | RIGHT (Live Preview) | BOTTOM (Inspector)
 */

import { useMemo, useState, useCallback, useEffect } from 'react';
import { EffectsBrowser } from '@/components/motion-studio/EffectsBrowser';
import { LivePreview } from '@/components/motion-studio/LivePreview';
import { InspectorPanel } from '@/components/motion-studio/InspectorPanel';
import { SpecialsDrawer } from '@/components/motion-studio/SpecialsDrawer';
import { PresetManager } from '@/components/motion-studio/PresetManager';
import { PerformanceMonitor } from '@/components/debug/PerformanceMonitor';
import { Button } from '@/components/ui/button';
import { Sparkles, Settings, Save, Gauge, ShieldAlert } from 'lucide-react';
import type { EffectType, MotionStudioState } from '@/types/effects';
import { getEffectsCompatibilityReport } from '@/lib/effectsCompatibility';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { useEffects } from '@/contexts/EffectsContext';
import { effectsRegistry } from '@/effects/core/EffectsRegistry';
// 🔥 FIX M-10: Import deferred loader
import { loadAllEffects } from '@/effects';

export default function MotionStudio() {
  // 🔥 FIX M-10: Load effects when Motion Studio mounts
  useEffect(() => {
    loadAllEffects();
  }, []);
  
  const compatibility = useMemo(() => getEffectsCompatibilityReport(), []);
  const { isMobile, isLowEndDevice } = useMobileOptimization();
  
  // Get Effects Context methods to actually activate effects
  const {
    setTextEffect,
    setCursorEffect,
    setBackgroundEffect,
    setUIEffect,
  } = useEffects();
  
  // Local UI state
  const [state, setState] = useState<MotionStudioState>({
    selectedEffectId: null,
    previewMode: 'interactive',
    inspectorExpanded: true,
    specialsDrawerOpen: false,
    previewText: 'The Future of Motion',
    previewBackgroundColor: '#0a0a0a',
    searchQuery: '',
    selectedType: 'all',
    selectedTags: [],
  });
  
  const [presetManagerOpen, setPresetManagerOpen] = useState(false);
  const [performanceMonitorOpen, setPerformanceMonitorOpen] = useState(false);
  
  // Handler to select and activate an effect
  const handleSelectEffect = useCallback((effectId: string) => {
    // Update local UI state
    setState(s => ({ ...s, selectedEffectId: effectId }));
    
    // Get the effect from registry
    const effect = effectsRegistry.get(effectId);
    if (!effect) return;
    
    // Activate the effect in EffectsContext based on its type
    switch (effect.type) {
      case 'text':
        setTextEffect(effectId, effect.defaultSettings);
        break;
      case 'cursor':
        setCursorEffect(effectId, effect.defaultSettings);
        break;
      case 'background':
        setBackgroundEffect(effectId, effect.defaultSettings);
        break;
      case 'ui':
        setUIEffect(effectId, effect.defaultSettings);
        break;
    }
  }, [setTextEffect, setCursorEffect, setBackgroundEffect, setUIEffect]);
  
  return (
    <div 
      className="h-screen flex flex-col bg-background overflow-hidden" 
      data-testid="motion-studio-page"
      style={{ transform: 'translate3d(0, 0, 0)' }}
    >
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm px-6 py-4 flex items-center justify-between z-10" data-testid="motion-studio-header">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Motion Studio</h1>
            <p className="text-sm text-muted-foreground">
              Effects Lab & Control Center
              {isLowEndDevice && <span className="ml-2 text-amber-500">(Performance Mode)</span>}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setState(s => ({ ...s, specialsDrawerOpen: true }))}
            data-testid="motion-studio-specials-button"
          >
            <Settings className="h-4 w-4 mr-2" />
            Specials
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPresetManagerOpen(true)}
            data-testid="motion-studio-presets-button"
          >
            <Save className="h-4 w-4 mr-2" />
            Presets
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPerformanceMonitorOpen((prev) => !prev)}
            data-testid="motion-studio-performance-button"
            className={performanceMonitorOpen ? 'bg-primary/10' : ''}
          >
            <Gauge className="h-4 w-4 mr-2" />
            Monitor
          </Button>
        </div>
      </header>

      {/* Compatibility Warning Banner */}
      {compatibility.warnings.length > 0 && (
        <div className="mx-6 mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2" data-testid="motion-studio-compatibility-banner">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>{compatibility.warnings[0]}</span>
        </div>
      )}
      
      {/* Mobile Warning */}
      {isMobile && (
        <div className="mx-6 mt-3 rounded-lg border border-blue-500/25 bg-blue-500/10 px-4 py-2 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>Motion Studio is optimized for desktop. Some features may be limited on mobile.</span>
        </div>
      )}
      
      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Effects Browser */}
        <aside className="w-80 border-r border-border bg-card/30 backdrop-blur-sm overflow-y-auto" data-testid="motion-studio-effects-sidebar">
          <EffectsBrowser
            selectedEffectId={state.selectedEffectId}
            onSelectEffect={handleSelectEffect}
            searchQuery={state.searchQuery}
            onSearchChange={(q) => setState(s => ({ ...s, searchQuery: q }))}
            selectedType={state.selectedType}
            onTypeChange={(type) => setState(s => ({ ...s, selectedType: type as EffectType | 'all' }))}
          />
        </aside>
        
        {/* RIGHT: Live Preview */}
        <div className="flex-1 flex flex-col">
          <main className="flex-1 relative" data-testid="motion-studio-preview-area">
            <LivePreview
              previewText={state.previewText}
              backgroundColor={state.previewBackgroundColor}
              mode={state.previewMode}
            />
          </main>
          
          {/* BOTTOM: Inspector Panel */}
          {state.inspectorExpanded && (
            <div className="border-t border-border bg-card/50 backdrop-blur-sm" data-testid="motion-studio-inspector-wrapper">
              <InspectorPanel
                selectedEffectId={state.selectedEffectId}
                onClose={() => setState(s => ({ ...s, inspectorExpanded: false }))}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Specials Drawer */}
      <SpecialsDrawer
        open={state.specialsDrawerOpen}
        onOpenChange={(open) => setState(s => ({ ...s, specialsDrawerOpen: open }))}
      />
      
      {/* Preset Manager Modal */}
      <PresetManager
        open={presetManagerOpen}
        onOpenChange={setPresetManagerOpen}
      />

      {/* Performance Monitor - Phase 9 Integration */}
      <PerformanceMonitor
        isOpen={performanceMonitorOpen}
        onClose={() => setPerformanceMonitorOpen(false)}
      />
    </div>
  );
}

