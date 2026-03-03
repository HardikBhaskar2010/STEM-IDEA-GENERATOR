/**
 * LazyR3FScene Component
 * Phase 9: Performance & Accessibility
 * 
 * Lazy-loaded R3F Scene with proper cleanup
 */

import { Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import type { BackgroundEffectComponentProps } from '@/types/effects';
import { PHASE9_GPU_BASE_STYLE } from '@/effects/core/optimizationUtils';

// Lazy load the R3F Scene
const R3FSceneComponent = lazy(() => import('./R3FScene'));

/**
 * Lazy R3F Scene with loading state
 */
export function LazyR3FScene(props: BackgroundEffectComponentProps) {
  if (!props.isActive) return null;

  return (
    <Suspense
      fallback={
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={PHASE9_GPU_BASE_STYLE}
          data-testid="lazy-r3f-fallback"
        >
          <div className="text-purple-400 text-sm animate-pulse" data-testid="lazy-r3f-fallback-text">
            Loading 3D Scene...
          </div>
        </motion.div>
      }
    >
      <R3FSceneComponent {...props} />
    </Suspense>
  );
}

export default LazyR3FScene;


