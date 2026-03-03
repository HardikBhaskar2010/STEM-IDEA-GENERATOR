/**
 * Pixel Trail Cursor Effect
 * Phase 9: Optimized with memory cleanup, touch support, and GPU acceleration
 * 
 * Creates a pixelated/retro trail behind the cursor
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CursorEffectComponentProps, CursorEffect, EffectSettingsSchema } from '@/types/effects';
import { effectsRegistry } from '@/effects/core/EffectsRegistry';
import { throttle } from '@/effects/core/PerformanceGuard';
import { useMemoryCleanup } from '@/hooks/useMemoryCleanup';
import { useEffectOptimization } from '@/hooks/useEffectOptimization';
import { getAdaptiveCount } from '@/effects/core/optimizationUtils';

interface Pixel {
  id: number;
  x: number;
  y: number;
  color: string;
}

const settingsSchema: EffectSettingsSchema = {
  size: {
    type: 'range',
    label: 'Pixel Size',
    defaultValue: 8,
    min: 4,
    max: 16,
    step: 2,
    description: 'Size of each pixel',
  },
  trailLength: {
    type: 'range',
    label: 'Trail Length',
    defaultValue: 15,
    min: 5,
    max: 30,
    step: 5,
    description: 'Number of pixels in trail',
  },
  color: {
    type: 'color',
    label: 'Pixel Color',
    defaultValue: '#22d3ee',
    description: 'Color of the pixels',
  },
  colorful: {
    type: 'boolean',
    label: 'Rainbow Colors',
    defaultValue: false,
    description: 'Use rainbow colors for pixels',
  },
};

const rainbowColors = [
  '#ff0000', '#ff7f00', '#ffff00', '#00ff00', 
  '#0000ff', '#4b0082', '#9400d3'
];

export function PixelTrail({ settings, isActive }: CursorEffectComponentProps) {
  const { 
    size = 8, 
    trailLength = 15, 
    color = '#22d3ee',
    colorful = false,
  } = settings;
  
  const [pixels, setPixels] = useState<Pixel[]>([]);
  const pixelIdCounter = useRef(0);
  const colorIndex = useRef(0);
  const memoryManager = useMemoryCleanup();
  const { flags, reducedMotion, isTouchDevice, gpuStyle } = useEffectOptimization<HTMLDivElement>({ lazy: false });
  
  const adaptiveTrailLength = getAdaptiveCount(trailLength, flags, { mobileRatio: 0.6, lowEndRatio: 0.5, min: 5 });
  const moveThrottleMs = flags.isLowEndDevice ? 48 : 32;
  
  useEffect(() => {
    if (!isActive || reducedMotion) return;
    
    const handlePointerMove = throttle((e: PointerEvent) => {
      // Snap to grid
      const gridX = Math.floor(e.clientX / size) * size;
      const gridY = Math.floor(e.clientY / size) * size;
      
      const pixelColor = colorful 
        ? rainbowColors[colorIndex.current % rainbowColors.length]
        : color;
      
      if (colorful) {
        colorIndex.current++;
      }
      
      const newPixel: Pixel = {
        id: pixelIdCounter.current++,
        x: gridX,
        y: gridY,
        color: pixelColor,
      };
      
      setPixels((prev) => {
        const updated = [newPixel, ...prev];
        return updated.slice(0, adaptiveTrailLength);
      });
    }, moveThrottleMs);
    
    const handleTouchMove = throttle((e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        handlePointerMove({ clientX: touch.clientX, clientY: touch.clientY } as PointerEvent);
      }
    }, moveThrottleMs);
    
    memoryManager.addEventListener(window, 'pointermove', handlePointerMove as EventListener, { passive: true });
    memoryManager.addEventListener(window, 'touchmove', handleTouchMove as EventListener, { passive: true });
    
    // 🔥 FIX M-2: Return cleanup function to remove listeners on effect re-run
    return () => {
      window.removeEventListener('pointermove', handlePointerMove as EventListener);
      window.removeEventListener('touchmove', handleTouchMove as EventListener);
    };
  }, [isActive, size, adaptiveTrailLength, color, colorful, reducedMotion, memoryManager, moveThrottleMs]);
  
  if (!isActive || reducedMotion) return null;
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50" style={gpuStyle} data-testid="effect-pixel-trail-layer">
      <AnimatePresence>
        {pixels.map((pixel, index) => (
          <motion.div
            key={pixel.id}
            className="absolute"
            style={{
              left: pixel.x,
              top: pixel.y,
              width: size,
              height: size,
              backgroundColor: pixel.color,
              imageRendering: 'pixelated',
              transform: 'translate3d(0, 0, 0)',
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: 1 - (index / adaptiveTrailLength), 
              scale: 1,
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.1 }}
            data-testid="effect-pixel-trail-particle"
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// Register this effect
const pixelTrailEffect: CursorEffect = {
  id: 'pixel-trail',
  name: 'Pixel Trail',
  type: 'cursor',
  library: 'framer',
  description: 'Creates a pixelated/retro trail behind the cursor',
  tags: ['pixel', 'retro', '8bit', 'trail'],
  performanceModes: ['medium', 'high'],
  component: PixelTrail,
  defaultSettings: {
    size: 8,
    trailLength: 15,
    color: '#22d3ee',
    colorful: false,
  },
  settingsSchema,
};

effectsRegistry.register(pixelTrailEffect);

export default pixelTrailEffect;

