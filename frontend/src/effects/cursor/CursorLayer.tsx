/**
 * CursorLayer - Global Cursor Effect Wrapper
 * Phase 9: Optimized with proper GPU acceleration and device detection
 *
 * Renders the active cursor effect globally across the entire app.
 * Positioned as a fixed layer with pointer-events-none.
 */

import { useEffects } from '@/contexts/EffectsContext';
import { effectsRegistry } from '@/effects/core/EffectsRegistry';
import type { CursorEffect } from '@/types/effects';
import { useEffectOptimization } from '@/hooks/useEffectOptimization';
import { isCursorEffectsSupported } from '@/lib/effectsCompatibility';

export function CursorLayer() {
  const { activeCursorEffect, activeCursorSettings, effectsEnabled, reducedMotion } = useEffects();
  const { isTouchDevice, gpuStyle } = useEffectOptimization<HTMLDivElement>({ lazy: false });

  // Don't render on touch devices or if cursor effects are not supported
  if (isTouchDevice || !isCursorEffectsSupported()) {
    return null;
  }

  // Don't render if effects are disabled, reduced motion, or no effect selected
  if (!effectsEnabled || reducedMotion || !activeCursorEffect) {
    return null;
  }

  const effect = effectsRegistry.get(activeCursorEffect) as CursorEffect | undefined;

  if (!effect || effect.type !== 'cursor') {
    return null;
  }

  const EffectComponent = effect.component;

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-none overflow-hidden"
      aria-hidden="true"
      style={{ isolation: 'isolate', ...gpuStyle }}
      data-testid="global-cursor-layer"
    >
      <EffectComponent settings={activeCursorSettings} isActive={true} />
    </div>
  );
}

export default CursorLayer;
