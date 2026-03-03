/**
 * Glow Ring Cursor Effect
 * Phase 9: Optimized with memory cleanup, touch support, and GPU acceleration
 * 
 * Glowing ring that follows the cursor with pulsing animation
 */

import { useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import type { CursorEffectComponentProps, CursorEffect, EffectSettingsSchema } from '@/types/effects';
import { effectsRegistry } from '@/effects/core/EffectsRegistry';
import { throttle } from '@/effects/core/PerformanceGuard';
import { useMemoryCleanup } from '@/hooks/useMemoryCleanup';
import { useEffectOptimization } from '@/hooks/useEffectOptimization';

const settingsSchema: EffectSettingsSchema = {
  size: {
    type: 'range',
    label: 'Ring Size',
    defaultValue: 40,
    min: 20,
    max: 80,
    step: 5,
    description: 'Size of the glow ring',
  },
  glowIntensity: {
    type: 'range',
    label: 'Glow Intensity',
    defaultValue: 0.8,
    min: 0.3,
    max: 1,
    step: 0.1,
    description: 'Intensity of the glow effect',
  },
  color: {
    type: 'color',
    label: 'Ring Color',
    defaultValue: '#a855f7',
    description: 'Color of the ring',
  },
  pulseSpeed: {
    type: 'range',
    label: 'Pulse Speed',
    defaultValue: 2,
    min: 0.5,
    max: 5,
    step: 0.5,
    description: 'Speed of the pulse animation',
  },
};

export function GlowRing({ settings, isActive }: CursorEffectComponentProps) {
  const { 
    size = 40, 
    glowIntensity = 0.8, 
    color = '#a855f7',
    pulseSpeed = 2,
  } = settings;
  
  const memoryManager = useMemoryCleanup();
  const { flags, reducedMotion, isTouchDevice, gpuStyle } = useEffectOptimization<HTMLDivElement>({ lazy: false });
  
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  
  // Adjust stiffness for performance
  const adaptiveStiffness = flags.isLowEndDevice ? 150 : 200;
  const springConfig = { damping: 30, stiffness: adaptiveStiffness, mass: 0.5 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);
  
  useEffect(() => {
    if (!isActive || reducedMotion || isTouchDevice) return;
    
    const handlePointerMove = throttle((e: PointerEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    }, flags.isLowEndDevice ? 32 : 16);
    
    memoryManager.addEventListener(window, 'pointermove', handlePointerMove as EventListener, { passive: true });
    
    // 🔥 FIX M-2: Return cleanup function to remove listener on effect re-run
    return () => {
      window.removeEventListener('pointermove', handlePointerMove as EventListener);
    };
  }, [isActive, cursorX, cursorY, reducedMotion, isTouchDevice, memoryManager, flags.isLowEndDevice]);
  
  if (!isActive || reducedMotion || isTouchDevice) return null;
  
  const pulseDuration = 2 / pulseSpeed;
  // Reduce glow on low-end devices
  const adaptiveGlow = flags.isLowEndDevice ? glowIntensity * 0.7 : glowIntensity;
  
  return (
    <>
      <style>{`
        * {
          cursor: none !important;
        }
      `}</style>
      
      {/* Outer glow ring */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-50 rounded-full border-2"
        style={{
          x: cursorXSpring,
          y: cursorYSpring,
          width: size,
          height: size,
          borderColor: color,
          transform: 'translate3d(-50%, -50%, 0)',
          boxShadow: `0 0 ${20 * adaptiveGlow}px ${color}, 0 0 ${40 * adaptiveGlow}px ${color}`,
          ...gpuStyle,
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{
          duration: pulseDuration,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        data-testid="effect-glow-ring-outer"
      />
      
      {/* Inner dot */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-50 rounded-full"
        style={{
          x: cursorXSpring,
          y: cursorYSpring,
          width: 6,
          height: 6,
          backgroundColor: color,
          transform: 'translate3d(-50%, -50%, 0)',
          ...gpuStyle,
        }}
        data-testid="effect-glow-ring-dot"
      />
    </>
  );
}

// Register this effect
const glowRingEffect: CursorEffect = {
  id: 'glow-ring',
  name: 'Glow Ring',
  type: 'cursor',
  library: 'framer',
  description: 'Glowing ring that follows cursor with pulsing animation',
  tags: ['glow', 'ring', 'pulse', 'neon'],
  performanceModes: ['medium', 'high'],
  component: GlowRing,
  defaultSettings: {
    size: 40,
    glowIntensity: 0.8,
    color: '#a855f7',
    pulseSpeed: 2,
  },
  settingsSchema,
};

effectsRegistry.register(glowRingEffect);

export default glowRingEffect;

