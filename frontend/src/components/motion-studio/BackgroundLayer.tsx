/**
 * BackgroundLayer Component
 * 
 * Rendering container for active background in LivePreview.
 * Handles loading states, error states, and applies standardized positioning.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 10.1, 10.3, 16.2
 */

import { useEffect, useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { BackgroundManager } from '@/lib/backgrounds/BackgroundManager';
import { useFPSMonitor } from '@/hooks/useFPSMonitor';
import type { BackgroundEffectSettings } from '@/types/effects';
import type { LoadingState } from '@/lib/backgrounds/types';

interface BackgroundLayerProps {
  backgroundId: string | null;
  settings: BackgroundEffectSettings;
  theme: 'light' | 'dark';
  isActive: boolean;
}

/**
 * BackgroundLayer component
 * Renders the active background with proper positioning and state handling
 */
export function BackgroundLayer({
  backgroundId,
  settings,
  theme,
  isActive,
}: BackgroundLayerProps) {
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [BackgroundComponent, setBackgroundComponent] = useState<React.ComponentType<any> | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [showPerformanceWarning, setShowPerformanceWarning] = useState(false);
  const [qualityLevel, setQualityLevel] = useState<'high' | 'medium' | 'low'>('high');

  // Monitor FPS when background is active and loaded
  const fps = useFPSMonitor(isActive && loadingState === 'loaded');

  // Subscribe to BackgroundManager loading state changes
  useEffect(() => {
    const manager = BackgroundManager.getInstance();
    
    const unsubscribe = manager.onLoadingStateChange((state) => {
      setLoadingState(state);
    });

    return unsubscribe;
  }, []);

  // Load background when backgroundId changes
  useEffect(() => {
    if (!backgroundId) {
      setBackgroundComponent(null);
      setError(null);
      setLoadingState('idle');
      return;
    }

    const loadBackground = async () => {
      const manager = BackgroundManager.getInstance();
      
      try {
        setError(null);
        await manager.loadBackground(backgroundId);
        
        // Get the loaded component
        const component = manager.getCurrentBackground();
        setBackgroundComponent(() => component);
      } catch (err) {
        console.error('Failed to load background:', err);
        setError(err as Error);
      }
    };

    loadBackground();
  }, [backgroundId]);

  // Apply theme variant when theme changes
  useEffect(() => {
    if (backgroundId) {
      const manager = BackgroundManager.getInstance();
      manager.applyThemeVariant(theme);
    }
  }, [theme, backgroundId]);

  // Performance monitoring and adaptive quality adjustment
  useEffect(() => {
    if (!isActive || loadingState !== 'loaded') {
      return;
    }

    // Show warning when FPS drops below 30
    if (fps.averageFPS < 30 && !showPerformanceWarning) {
      console.warn('[BackgroundLayer] Low FPS detected:', fps.averageFPS);
      setShowPerformanceWarning(true);
    }

    // Adaptive quality adjustment based on FPS
    if (fps.averageFPS < 20 && qualityLevel !== 'low') {
      console.log('[BackgroundLayer] Reducing quality to low');
      setQualityLevel('low');
    } else if (fps.averageFPS < 40 && fps.averageFPS >= 20 && qualityLevel === 'high') {
      console.log('[BackgroundLayer] Reducing quality to medium');
      setQualityLevel('medium');
    } else if (fps.averageFPS >= 50 && qualityLevel !== 'high') {
      console.log('[BackgroundLayer] Increasing quality to high');
      setQualityLevel('high');
      setShowPerformanceWarning(false);
    }
  }, [fps.averageFPS, isActive, loadingState, showPerformanceWarning, qualityLevel]);

  // Don't render anything if no background is selected
  if (!backgroundId) {
    return null;
  }

  return (
    <div 
      className="absolute inset-0 z-0 pointer-events-none"
      data-testid="background-layer"
    >
      {/* Performance Warning */}
      {showPerformanceWarning && (
        <div 
          className="absolute top-4 right-4 z-50 pointer-events-auto bg-yellow-500/90 text-yellow-950 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 max-w-sm"
          data-testid="performance-warning"
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <div className="text-xs">
            <p className="font-semibold">Low Performance Detected</p>
            <p className="opacity-90">
              Background FPS: {fps.averageFPS} (Quality: {qualityLevel})
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loadingState === 'loading' && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-background/50"
          data-testid="background-loading-spinner"
        >
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading background...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {loadingState === 'error' && error && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-background"
          data-testid="background-error-fallback"
        >
          <div className="text-center p-4">
            <p className="text-sm text-muted-foreground">
              Background effect unavailable
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {error.message}
            </p>
          </div>
        </div>
      )}

      {/* Loaded Background */}
      {loadingState === 'loaded' && BackgroundComponent && (
        <div 
          className="absolute inset-0"
          data-testid="background-component-container"
        >
          <BackgroundComponent
            settings={{
              ...settings,
              qualityLevel, // Pass quality level to background for adaptive rendering
            }}
            theme={theme}
            isActive={isActive}
          />
        </div>
      )}
    </div>
  );
}
