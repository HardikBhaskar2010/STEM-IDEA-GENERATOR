/**
 * Spark Ripple Cursor Effect
 * Phase 9: Optimized with memory cleanup, touch support, and GPU acceleration
 * 
 * Creates spark particles and ripple effect on click
 */

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CursorEffectComponentProps, CursorEffect, EffectSettingsSchema } from '@/types/effects';
import { effectsRegistry } from '@/effects/core/EffectsRegistry';
import { useMemoryCleanup } from '@/hooks/useMemoryCleanup';
import { useEffectOptimization } from '@/hooks/useEffectOptimization';
import { getAdaptiveCount } from '@/effects/core/optimizationUtils';

interface Ripple {
  id: number;
  x: number;
  y: number;
}

interface Spark {
  id: number;
  x: number;
  y: number;
  angle: number;
}

const settingsSchema: EffectSettingsSchema = {
  sparkCount: {
    type: 'range',
    label: 'Spark Count',
    defaultValue: 8,
    min: 4,
    max: 16,
    step: 2,
    description: 'Number of sparks on click',
  },
  color: {
    type: 'color',
    label: 'Effect Color',
    defaultValue: '#fbbf24',
    description: 'Color of sparks and ripple',
  },
  size: {
    type: 'range',
    label: 'Spark Size',
    defaultValue: 4,
    min: 2,
    max: 10,
    step: 1,
    description: 'Size of spark particles',
  },
};

export function SparkRipple({ settings, isActive }: CursorEffectComponentProps) {
  const { sparkCount = 8, color = '#fbbf24', size = 4 } = settings;
  
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const rippleIdRef = useRef(0);
  const sparkIdRef = useRef(0);
  const memoryManager = useMemoryCleanup();
  const { flags, reducedMotion, gpuStyle } = useEffectOptimization<HTMLDivElement>({ lazy: false });
  
  const adaptiveSparkCount = getAdaptiveCount(sparkCount, flags, { mobileRatio: 0.6, lowEndRatio: 0.5, min: 4 });
  
  useEffect(() => {
    if (!isActive || reducedMotion) return;
    
    const handleClick = (e: PointerEvent) => {
      // Create ripple
      const newRipple: Ripple = {
        id: rippleIdRef.current++,
        x: e.clientX,
        y: e.clientY,
      };
      
      setRipples((prev) => [...prev, newRipple]);
      
      // Create sparks
      const newSparks: Spark[] = [];
      for (let i = 0; i < adaptiveSparkCount; i++) {
        newSparks.push({
          id: sparkIdRef.current++,
          x: e.clientX,
          y: e.clientY,
          angle: (360 / adaptiveSparkCount) * i,
        });
      }
      
      setSparks((prev) => [...prev, ...newSparks]);
      
      // Clean up after animation
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
        newSparks.forEach((spark) => {
          setTimeout(() => {
            setSparks((prev) => prev.filter((s) => s.id !== spark.id));
          }, 600);
        });
      }, 600);
    };
    
    // Support both click and touch
    const handleTouch = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        handleClick({ clientX: touch.clientX, clientY: touch.clientY } as PointerEvent);
      }
    };
    
    memoryManager.addEventListener(window, 'click', handleClick as EventListener, { passive: true });
    memoryManager.addEventListener(window, 'touchstart', handleTouch as EventListener, { passive: true });
    
    // 🔥 FIX M-2: Return cleanup function to remove listeners on effect re-run
    return () => {
      window.removeEventListener('click', handleClick as EventListener);
      window.removeEventListener('touchstart', handleTouch as EventListener);
    };
  }, [isActive, adaptiveSparkCount, reducedMotion, memoryManager]);
  
  if (!isActive || reducedMotion) return null;
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50" style={gpuStyle} data-testid="effect-spark-ripple-layer">
      {/* Ripples */}
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.div
            key={`ripple-${ripple.id}`}
            className="absolute rounded-full border-2"
            style={{
              left: ripple.x,
              top: ripple.y,
              borderColor: color,
              transform: 'translate3d(-50%, -50%, 0)',
            }}
            initial={{ width: 0, height: 0, opacity: 1 }}
            animate={{ width: 100, height: 100, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            data-testid="effect-spark-ripple"
          />
        ))}
      </AnimatePresence>
      
      {/* Sparks */}
      <AnimatePresence>
        {sparks.map((spark) => {
          const distance = flags.isMobile ? 30 : 40;
          const radians = (spark.angle * Math.PI) / 180;
          const targetX = Math.cos(radians) * distance;
          const targetY = Math.sin(radians) * distance;
          
          return (
            <motion.div
              key={`spark-${spark.id}`}
              className="absolute rounded-full"
              style={{
                left: spark.x,
                top: spark.y,
                width: size,
                height: size,
                backgroundColor: color,
                transform: 'translate3d(-50%, -50%, 0)',
              }}
              initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
              animate={{ 
                x: targetX, 
                y: targetY, 
                scale: 0,
                opacity: 0,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              data-testid="effect-spark-particle"
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// Register this effect
const sparkRippleEffect: CursorEffect = {
  id: 'spark-ripple',
  name: 'Spark Ripple',
  type: 'cursor',
  library: 'framer',
  description: 'Creates spark particles and ripple effect on click',
  tags: ['spark', 'ripple', 'click', 'particles'],
  performanceModes: ['medium', 'high'],
  component: SparkRipple,
  defaultSettings: {
    sparkCount: 8,
    color: '#fbbf24',
    size: 4,
  },
  settingsSchema,
};

effectsRegistry.register(sparkRippleEffect);

export default sparkRippleEffect;

