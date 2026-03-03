/**
 * Mask Reveal Text Effect
 * 
 * Text reveals with a masking animation
 */

import { motion } from 'framer-motion';
import type { TextEffectComponentProps, TextEffect, EffectSettingsSchema } from '@/types/effects';
import { effectsRegistry } from '@/effects/core/EffectsRegistry';
import { useEffectOptimization } from '@/hooks/useEffectOptimization';
import { getAdaptiveDuration } from '@/effects/core/optimizationUtils';

const settingsSchema: EffectSettingsSchema = {
  direction: {
    type: 'select',
    label: 'Reveal Direction',
    defaultValue: 'right',
    options: [
      { value: 'left', label: 'Left to Right' },
      { value: 'right', label: 'Right to Left' },
      { value: 'up', label: 'Bottom to Top' },
      { value: 'down', label: 'Top to Bottom' },
    ],
    description: 'Direction of the mask reveal',
  },
  duration: {
    type: 'range',
    label: 'Duration',
    defaultValue: 1,
    min: 0.3,
    max: 3,
    step: 0.1,
    description: 'Duration of the reveal animation in seconds',
  },
  delay: {
    type: 'range',
    label: 'Delay',
    defaultValue: 0,
    min: 0,
    max: 2,
    step: 0.1,
    description: 'Delay before animation starts',
  },
  color: {
    type: 'color',
    label: 'Text Color',
    defaultValue: '#ffffff',
    description: 'Color of the text',
  },
  maskColor: {
    type: 'color',
    label: 'Mask Color',
    defaultValue: '#a855f7',
    description: 'Color of the reveal mask',
  },
};

export function MaskReveal({ children, settings, isPreview }: TextEffectComponentProps) {
  const {
    direction = 'right',
    duration = 1,
    delay = 0,
    color = '#ffffff',
    maskColor = '#a855f7',
  } = settings;

  const { ref, shouldRender, reducedMotion, flags, gpuStyle } = useEffectOptimization<HTMLDivElement>({
    lazy: !isPreview,
    rootMargin: '120px',
  });

  if (!shouldRender && !isPreview) {
    return (
      <div ref={ref} className="inline-block" style={{ color, ...gpuStyle }}>
        {children}
      </div>
    );
  }

  if (reducedMotion) {
    return (
      <div ref={ref} className="inline-block" style={{ color, ...gpuStyle }}>
        {children}
      </div>
    );
  }

  const adaptiveDuration = getAdaptiveDuration(duration, flags);
  
  const getMaskAnimation = () => {
    switch (direction) {
      case 'left':
        return { x: ['0%', '100%'] };
      case 'right':
        return { x: ['0%', '-100%'] };
      case 'up':
        return { y: ['0%', '-100%'] };
      case 'down':
        return { y: ['0%', '100%'] };
      default:
        return { x: ['0%', '-100%'] };
    }
  };
  
  const getInitialPosition = () => {
    switch (direction) {
      case 'left':
        return { x: '-100%' };
      case 'right':
        return { x: '100%' };
      case 'up':
        return { y: '100%' };
      case 'down':
        return { y: '-100%' };
      default:
        return { x: '100%' };
    }
  };
  
  return (
    <motion.div
      ref={ref}
      className="relative inline-block overflow-hidden"
      style={gpuStyle}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      data-testid="effect-mask-reveal"
    >
      <motion.div
        style={{ color }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay }}
      >
        {children}
      </motion.div>
      
      {/* Mask overlay */}
      <motion.div
        className="absolute inset-0"
        style={{ backgroundColor: maskColor }}
        initial={getInitialPosition()}
        animate={getMaskAnimation()}
        transition={{
          duration: adaptiveDuration,
          delay,
          ease: [0.4, 0, 0.2, 1],
        }}
      />
    </motion.div>
  );
}

// Register this effect
const maskRevealEffect: TextEffect = {
  id: 'mask-reveal',
  name: 'Mask Reveal',
  type: 'text',
  library: 'framer',
  description: 'Text reveals with a masking animation',
  tags: ['reveal', 'mask', 'wipe', 'transition'],
  performanceModes: ['low', 'medium', 'high'],
  component: MaskReveal,
  defaultSettings: {
    direction: 'right',
    duration: 1,
    delay: 0,
    color: '#ffffff',
    maskColor: '#a855f7',
  },
  settingsSchema,
};

effectsRegistry.register(maskRevealEffect);

export default maskRevealEffect;


