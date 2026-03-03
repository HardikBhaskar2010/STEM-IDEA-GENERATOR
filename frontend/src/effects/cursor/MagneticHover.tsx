/**
 * Magnetic Hover Cursor Effect
 * Phase 9: Optimized with memory cleanup, touch support, and GPU acceleration
 * 
 * Cursor that magnetically attracts to hoverable elements
 */

import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import type { CursorEffectComponentProps, CursorEffect, EffectSettingsSchema } from '@/types/effects';
import { effectsRegistry } from '@/effects/core/EffectsRegistry';
import { useMemoryCleanup } from '@/hooks/useMemoryCleanup';
import { useEffectOptimization } from '@/hooks/useEffectOptimization';
import { throttle } from '@/effects/core/PerformanceGuard';

const settingsSchema: EffectSettingsSchema = {
  size: {
    type: 'range',
    label: 'Cursor Size',
    defaultValue: 40,
    min: 20,
    max: 80,
    step: 5,
    description: 'Size of the magnetic cursor',
  },
  magneticStrength: {
    type: 'range',
    label: 'Magnetic Strength',
    defaultValue: 0.3,
    min: 0.1,
    max: 1,
    step: 0.1,
    description: 'How strongly cursor is pulled to elements',
  },
  color: {
    type: 'color',
    label: 'Cursor Color',
    defaultValue: '#a855f7',
    description: 'Color of the cursor',
  },
  stiffness: {
    type: 'range',
    label: 'Spring Stiffness',
    defaultValue: 150,
    min: 50,
    max: 300,
    step: 25,
    description: 'Stiffness of cursor spring animation',
  },
};

export function MagneticHover({ settings, isActive }: CursorEffectComponentProps) {
  const { 
    size = 40, 
    magneticStrength = 0.3, 
    color = '#a855f7',
    stiffness = 150,
  } = settings;
  
  const memoryManager = useMemoryCleanup();
  const { flags, reducedMotion, isTouchDevice, gpuStyle } = useEffectOptimization<HTMLDivElement>({ lazy: false });
  
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  
  // Adjust spring stiffness for mobile
  const adaptiveStiffness = flags.isLowEndDevice ? Math.max(50, stiffness * 0.7) : stiffness;
  const springConfig = { damping: 20, stiffness: adaptiveStiffness, mass: 0.5 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);
  
  const [isHovering, setIsHovering] = useState(false);
  
  useEffect(() => {
    if (!isActive || reducedMotion || isTouchDevice) return;
    
    const handlePointerMove = throttle((e: PointerEvent) => {
      let targetX = e.clientX;
      let targetY = e.clientY;
      
      // Check if hovering over interactive elements
      const target = e.target as HTMLElement;
      const interactive = target.closest('button, a, input, [data-magnetic]');
      
      if (interactive) {
        const rect = interactive.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Pull cursor towards center
        const deltaX = centerX - e.clientX;
        const deltaY = centerY - e.clientY;
        
        targetX = e.clientX + deltaX * magneticStrength;
        targetY = e.clientY + deltaY * magneticStrength;
        
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
      
      cursorX.set(targetX);
      cursorY.set(targetY);
    }, flags.isLowEndDevice ? 32 : 16);
    
    memoryManager.addEventListener(window, 'pointermove', handlePointerMove as EventListener, { passive: true });
  }, [isActive, magneticStrength, cursorX, cursorY, reducedMotion, isTouchDevice, memoryManager, flags.isLowEndDevice]);
  
  if (!isActive || reducedMotion || isTouchDevice) return null;
  
  return (
    <>
      <style>{`
        * {
          cursor: none !important;
        }
      `}</style>
      
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-50 rounded-full mix-blend-difference"
        style={{
          x: cursorXSpring,
          y: cursorYSpring,
          width: size,
          height: size,
          backgroundColor: color,
          transform: 'translate3d(-50%, -50%, 0)',
          ...gpuStyle,
        }}
        animate={{
          scale: isHovering ? 1.5 : 1,
          opacity: isHovering ? 0.8 : 0.5,
        }}
        transition={{ duration: 0.2 }}
        data-testid="effect-magnetic-cursor"
      />
    </>
  );
}

// Register this effect
const magneticHoverEffect: CursorEffect = {
  id: 'magnetic-hover',
  name: 'Magnetic Hover',
  type: 'cursor',
  library: 'framer',
  description: 'Cursor that magnetically attracts to hoverable elements',
  tags: ['magnetic', 'interactive', 'smooth', 'spring'],
  performanceModes: ['medium', 'high'],
  component: MagneticHover,
  defaultSettings: {
    size: 40,
    magneticStrength: 0.3,
    color: '#a855f7',
    stiffness: 150,
  },
  settingsSchema,
};

effectsRegistry.register(magneticHoverEffect);

export default magneticHoverEffect;
