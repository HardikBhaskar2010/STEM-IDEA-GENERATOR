/**
 * Live Preview - RIGHT canvas component
 * Phase 9: Enhanced with performance monitoring and mobile optimization
 *
 * Interactive preview area showing the selected effect in action
 */

import { useMemo } from 'react';
import { useEffects } from '@/contexts/EffectsContext';
import { effectsRegistry } from '@/effects/core/EffectsRegistry';
import { cn } from '@/lib/utils';
import { useFPSMonitor } from '@/hooks/useFPSMonitor';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { getEffectsCompatibilityReport } from '@/lib/effectsCompatibility';
import { BackgroundLayer } from '@/components/motion-studio/BackgroundLayer';
import { useTheme } from '@/hooks/useTheme';

interface LivePreviewProps {
  previewText: string;
  backgroundColor: string;
  mode: 'interactive' | 'static';
}

export function LivePreview({ previewText, backgroundColor, mode }: LivePreviewProps) {
  const {
    activeTextEffect,
    activeTextSettings,
    activeCursorEffect,
    activeCursorSettings,
    activeBackgroundEffect,
    activeBackgroundSettings,
    effectsEnabled,
    reducedMotion,
  } = useEffects();

  const { theme: rawTheme, isDark } = useTheme();
  const theme = rawTheme === 'system' ? (isDark ? 'dark' : 'light') : rawTheme;
  const { isMobile, isLowEndDevice } = useMobileOptimization();
  const fps = useFPSMonitor(mode === 'interactive' && effectsEnabled);
  const compatibility = useMemo(() => getEffectsCompatibilityReport(), []);

  const textEffect = activeTextEffect ? effectsRegistry.get(activeTextEffect) : null;
  const cursorEffect = activeCursorEffect ? effectsRegistry.get(activeCursorEffect) : null;
  const backgroundEffect = activeBackgroundEffect ? effectsRegistry.get(activeBackgroundEffect) : null;

  const shouldDisableHeavy = reducedMotion || isLowEndDevice;

  return (
    <div
      className="h-full relative overflow-hidden"
      style={{ 
        backgroundColor,
        transform: 'translate3d(0, 0, 0)', // Phase 9: GPU acceleration
      }}
      data-testid="motion-studio-live-preview"
    >
      {/* Background Effect Layer - Using BackgroundLayer component */}
      {activeBackgroundEffect && effectsEnabled && (
        <BackgroundLayer
          backgroundId={activeBackgroundEffect}
          settings={activeBackgroundSettings}
          theme={theme}
          isActive={!(shouldDisableHeavy && backgroundEffect?.heavyLoad)}
        />
      )}

      {/* Cursor Effect Layer */}
      {cursorEffect && cursorEffect.type === 'cursor' && effectsEnabled && !reducedMotion && !isMobile && (
        <div className="absolute inset-0 z-10 pointer-events-none" data-testid="live-preview-cursor-layer">
          <cursorEffect.component settings={activeCursorSettings} isActive={true} />
        </div>
      )}

      {/* Text Content */}
      <div className="relative z-20 h-full flex items-center justify-center p-8 md:p-12">
        <div className="max-w-4xl w-full text-center">
          {textEffect && textEffect.type === 'text' && effectsEnabled ? (
            <textEffect.component settings={activeTextSettings} isPreview={true}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold" data-testid="live-preview-heading">
                {previewText}
              </h1>
            </textEffect.component>
          ) : (
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground" data-testid="live-preview-heading-fallback">
              {previewText}
            </h1>
          )}

          <p className="mt-6 text-muted-foreground text-base md:text-lg" data-testid="live-preview-hint-text">
            {!activeTextEffect && !activeCursorEffect && !activeBackgroundEffect
              ? 'Select an effect from the browser to preview it here.'
              : 'Adjust settings in the inspector panel below.'}
          </p>
        </div>
      </div>

      {/* Performance Status Panel - Phase 9 */}
      <div className="absolute top-4 right-4 z-30 space-y-2" data-testid="live-preview-status-panel">
        <div
          className="px-3 py-1.5 rounded-lg bg-card/80 backdrop-blur-sm border border-border text-xs font-medium"
          data-testid="live-preview-mode-indicator"
        >
          {mode === 'interactive' ? 'Interactive Mode' : 'Static Mode'}
        </div>

        {/* FPS Indicator - Phase 9 */}
        <div
          className={cn(
            'px-3 py-1.5 rounded-lg backdrop-blur-sm border text-xs font-medium',
            fps.averageFPS >= 50 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' 
              : fps.averageFPS >= 30
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
              : 'bg-red-500/10 border-red-500/30 text-red-500'
          )}
          data-testid="live-preview-fps-indicator"
        >
          Avg FPS: {fps.averageFPS}
        </div>
        
        {/* Device Performance Indicator - Phase 9 */}
        {isLowEndDevice && (
          <div
            className="px-3 py-1.5 rounded-lg bg-blue-500/10 backdrop-blur-sm border border-blue-500/30 text-xs font-medium text-blue-500"
            data-testid="live-preview-performance-mode"
          >
            Performance Mode
          </div>
        )}
      </div>

      {/* Compatibility Warning */}
      {compatibility.warnings.length > 0 && (
        <div className="absolute top-4 left-4 z-30 max-w-sm" data-testid="live-preview-compatibility-warning">
          <div className="px-3 py-2 rounded-lg bg-amber-500/10 backdrop-blur-sm border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
            Compatibility fallback active: {compatibility.warnings[0]}
          </div>
        </div>
      )}

      {/* Reduced Motion Warning */}
      {reducedMotion && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30" data-testid="live-preview-reduced-motion-warning">
          <div className="px-4 py-2 rounded-lg bg-yellow-500/10 backdrop-blur-sm border border-yellow-500/20 text-xs font-medium text-yellow-600 dark:text-yellow-400">
            Reduced motion enabled. Heavy animations are simplified.
          </div>
        </div>
      )}

      {/* Effects Disabled Warning */}
      {!effectsEnabled && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30" data-testid="live-preview-effects-disabled-warning">
          <div className="px-4 py-2 rounded-lg bg-red-500/10 backdrop-blur-sm border border-red-500/20 text-xs font-medium text-red-600 dark:text-red-400">
            Effects are currently disabled.
          </div>
        </div>
      )}
    </div>
  );
}


