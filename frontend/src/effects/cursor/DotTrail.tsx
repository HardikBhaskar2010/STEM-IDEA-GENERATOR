/**
 * Dot Trail Cursor Effect
 * 
 * Creates a trail of dots that follow the cursor
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CursorEffectComponentProps, CursorEffect, EffectSettingsSchema } from '@/types/effects';
import { effectsRegistry } from '@/effects/core/EffectsRegistry';
import { throttle } from '@/effects/core/PerformanceGuard';
import { useMemoryCleanup } from '@/hooks/useMemoryCleanup';
import { useEffectOptimization } from '@/hooks/useEffectOptimization';
import { getAdaptiveCount } from '@/effects/core/optimizationUtils';

interface Dot {
  id: number;
  x: number;
  y: number;
}

const settingsSchema: EffectSettingsSchema = {
  size: {
    type: 'range',
    label: 'Dot Size',
    defaultValue: 6,
    min: 2,
    max: 20,
    step: 1,
    description: 'Size of each trail dot',
  },
  trailLength: {
    type: 'range',
    label: 'Trail Length',
    defaultValue: 10,
    min: 3,
    max: 30,
    step: 1,
    description: 'Number of dots in the trail',
  },
  color: {
    type: 'color',
    label: 'Dot Color',
    defaultValue: '#a855f7',
    description: 'Color of the trail dots',
  },
};

export function DotTrail({ settings, isActive }: CursorEffectComponentProps) {
  const { size = 6, trailLength = 10, color = '#a855f7' } = settings;
  
  const [dots, setDots] = useState<Dot[]>([]);
  const dotIdCounter = useRef(0);
  const memoryManager = useMemoryCleanup();
  const { flags, reducedMotion, gpuStyle } = useEffectOptimization<HTMLDivElement>({ lazy: false });
  const adaptiveTrailLength = getAdaptiveCount(trailLength, flags, { mobileRatio: 0.6, lowEndRatio: 0.45, min: 3 });
  const moveThrottleMs = flags.isLowEndDevice ? 32 : 16;
  
  useEffect(() => {
    if (!isActive || reducedMotion) return;
    
    const handlePointerMove = throttle((e: PointerEvent) => {
      const newDot: Dot = {
        id: dotIdCounter.current++,
        x: e.clientX,
        y: e.clientY,
      };
      
      setDots((prev) => {
        const updated = [newDot, ...prev];
        return updated.slice(0, adaptiveTrailLength);
      });
    }, moveThrottleMs);

    const handleTouchMove = throttle((e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;

      const newDot: Dot = {
        id: dotIdCounter.current++,
        x: touch.clientX,
        y: touch.clientY,
      };

      setDots((prev) => {
        const updated = [newDot, ...prev];
        return updated.slice(0, adaptiveTrailLength);
      });
    }, moveThrottleMs);
    
    // 🔥 FIX M-2: Add listeners via memoryManager
    memoryManager.addEventListener(window, 'pointermove', handlePointerMove as EventListener, { passive: true });
    memoryManager.addEventListener(window, 'touchmove', handleTouchMove as EventListener, { passive: true });
    
    // 🔥 FIX M-2: Return cleanup function to remove listeners on effect re-run
    return () => {
      window.removeEventListener('pointermove', handlePointerMove as EventListener);
      window.removeEventListener('touchmove', handleTouchMove as EventListener);
    };
  }, [isActive, adaptiveTrailLength, reducedMotion, memoryManager, moveThrottleMs]);
  
  if (!isActive || reducedMotion) return null;
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50" style={gpuStyle} data-testid="effect-dot-trail-layer">
      <AnimatePresence>
        {dots.map((dot, index) => (
          <motion.div
            key={dot.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1 - (index / Math.max(1, adaptiveTrailLength)), scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              left: dot.x,
              top: dot.y,
              width: size,
              height: size,
              borderRadius: '50%',
              backgroundColor: color,
              transform: 'translate3d(-50%, -50%, 0)',
              pointerEvents: 'none',
            }}
            data-testid="effect-dot-trail-particle"
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// Register this effect
const dotTrailEffect: CursorEffect = {
  id: 'dot-trail',
  name: 'Dot Trail',
  type: 'cursor',
  library: 'framer',
  description: 'Creates a trail of dots that follow the cursor',
  tags: ['trail', 'dots', 'follow'],
  performanceModes: ['medium', 'high'],
  component: DotTrail,
  defaultSettings: {
    size: 6,
    trailLength: 10,
    color: '#a855f7',
  },
  settingsSchema,
};

effectsRegistry.register(dotTrailEffect);

export default dotTrailEffect;


