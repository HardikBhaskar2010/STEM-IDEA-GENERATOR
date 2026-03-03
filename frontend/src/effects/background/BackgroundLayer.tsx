/**
 * BackgroundLayer - Global Background Effect Wrapper
 * 
 * Renders the active background effect globally across the entire app.
 * Positioned as a fixed layer behind all content.
 */

import { lazy, Suspense } from 'react';
import { useEffects } from '@/contexts/EffectsContext';
import { effectsRegistry } from '@/effects/core/EffectsRegistry';
import type { BackgroundEffect } from '@/types/effects';
import { is3DEffectsSupported } from '@/lib/effectsCompatibility';
import { PHASE9_GPU_BASE_STYLE } from '@/effects/core/optimizationUtils';

// Lazy load heavy background effects
const LazyR3FScene = lazy(() => import('./LazyR3FScene'));
const LazyParticleBackground = lazy(() => import('./ParticleBackground'));

export function BackgroundLayer() {
  const {
    activeBackgroundEffect,
    activeBackgroundSettings,
    effectsEnabled,
    reducedMotion,
  } = useEffects();
  
  // Don't render if effects disabled or no active effect
  if (!effectsEnabled || !activeBackgroundEffect) {
    return null;
  }
  
  // Get the effect from registry
  const effect = effectsRegistry.get(activeBackgroundEffect) as BackgroundEffect | undefined;
  
  if (!effect || effect.type !== 'background') {
    return null;
  }
  
  // Skip heavy effects if reduced motion is enabled
  if (reducedMotion && effect.heavyLoad) {
    return null;
  }

  if (activeBackgroundEffect === 'r3f-scene' && !is3DEffectsSupported()) {
    return null;
  }
  
  const EffectComponent = effect.component;
  
  // Lazy load heavy effects
  const isR3F = activeBackgroundEffect.includes('r3f') || activeBackgroundEffect.includes('3d');
  const isParticle = activeBackgroundEffect.includes('particle');
  const LazyHeavyComponent = isR3F ? LazyR3FScene : isParticle ? LazyParticleBackground : null;
  
  return (
    <div 
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
      style={{ isolation: 'isolate', ...PHASE9_GPU_BASE_STYLE }}
      data-testid="global-background-layer"
    >
      {(isR3F || isParticle) ? (
        <Suspense fallback={
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
        }>
          {LazyHeavyComponent ? (
            <LazyHeavyComponent settings={activeBackgroundSettings} isActive={true} />
          ) : (
            <EffectComponent settings={activeBackgroundSettings} isActive={true} />
          )}
        </Suspense>
      ) : (
        <EffectComponent
          settings={activeBackgroundSettings}
          isActive={true}
        />
      )}
    </div>
  );
}

export default BackgroundLayer;


