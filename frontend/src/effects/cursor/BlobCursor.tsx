/**
 * Blob Cursor Effect
 * Phase 9: Optimized with memory cleanup, touch support, and GPU acceleration
 * 
 * Organic blob that follows the cursor with smooth morphing
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
    label: 'Blob Size',
    defaultValue: 50,
    min: 30,
    max: 100,
    step: 5,
    description: 'Size of the blob cursor',
  },
  color: {
    type: 'color',
    label: 'Blob Color',
    defaultValue: '#a855f7',
    description: 'Color of the blob',
  },
  blendMode: {
    type: 'select',
    label: 'Blend Mode',
    defaultValue: 'normal',
    options: [
      { value: 'normal', label: 'Normal' },
      { value: 'multiply', label: 'Multiply' },
      { value: 'screen', label: 'Screen' },
      { value: 'overlay', label: 'Overlay' },
      { value: 'difference', label: 'Difference' },
    ],
    description: 'CSS blend mode for the blob',
  },
  stiffness: {
    type: 'range',
    label: 'Smoothness',
    defaultValue: 80,
    min: 40,
    max: 200,
    step: 20,
    description: 'How smoothly the blob follows cursor',
  },
};

export function BlobCursor({ settings, isActive }: CursorEffectComponentProps) {
  const { 
    size = 50, 
    color = '#a855f7', 
    blendMode = 'normal',
    stiffness = 80,
  } = settings;
  
  const memoryManager = useMemoryCleanup();
  const { flags, reducedMotion, isTouchDevice, gpuStyle } = useEffectOptimization<HTMLDivElement>({ lazy: false });
  
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  
  // Adjust for performance
  const adaptiveStiffness = flags.isLowEndDevice ? Math.max(40, stiffness * 0.7) : stiffness;
  const springConfig = { damping: 25, stiffness: adaptiveStiffness, mass: 0.8 };
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
  
  // Simpler animation for low-end devices
  const morphDuration = flags.isLowEndDevice ? 6 : 4;
  
  return (
    <>
      <style>{`
        * {
          cursor: none !important;
        }
      `}</style>
      
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-50"
        style={{
          x: cursorXSpring,
          y: cursorYSpring,
          width: size,
          height: size,
          backgroundColor: color,
          transform: 'translate3d(-50%, -50%, 0)',
          mixBlendMode: blendMode as any,
          filter: 'blur(8px)',
          opacity: 0.7,
          ...gpuStyle,
        }}
        animate={{
          borderRadius: [
            '60% 40% 30% 70% / 60% 30% 70% 40%',
            '30% 60% 70% 40% / 50% 60% 30% 60%',
            '60% 40% 30% 70% / 60% 30% 70% 40%',
          ],
        }}
        transition={{
          duration: morphDuration,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        data-testid="effect-blob-cursor"
      />
    </>
  );
}

// Register this effect
const blobCursorEffect: CursorEffect = {
  id: 'blob-cursor',
  name: 'Blob Cursor',
  type: 'cursor',
  library: 'framer',
  description: 'Organic blob that follows cursor with smooth morphing',
  tags: ['blob', 'organic', 'smooth', 'morph'],
  performanceModes: ['medium', 'high'],
  component: BlobCursor,
  defaultSettings: {
    size: 50,
    color: '#a855f7',
    blendMode: 'normal',
    stiffness: 80,
  },
  settingsSchema,
};

effectsRegistry.register(blobCursorEffect);

export default blobCursorEffect;

