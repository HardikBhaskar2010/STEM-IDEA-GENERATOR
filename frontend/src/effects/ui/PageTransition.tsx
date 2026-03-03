/**
 * Page Transition Effect
 * Phase 9: Optimized with GPU acceleration and mobile optimization
 * 
 * Smooth transitions between pages/views
 */

import { motion } from 'framer-motion';
import type { UIEffectComponentProps, UIEffect, EffectSettingsSchema } from '@/types/effects';
import { effectsRegistry } from '@/effects/core/EffectsRegistry';
import { useEffectOptimization } from '@/hooks/useEffectOptimization';

const settingsSchema: EffectSettingsSchema = {
  duration: {
    type: 'range',
    label: 'Duration',
    defaultValue: 400,
    min: 200,
    max: 800,
    step: 100,
    description: 'Transition duration in ms',
  },
  direction: {
    type: 'select',
    label: 'Direction',
    defaultValue: 'up',
    options: [
      { value: 'up', label: 'Slide Up' },
      { value: 'down', label: 'Slide Down' },
      { value: 'left', label: 'Slide Left' },
      { value: 'right', label: 'Slide Right' },
      { value: 'none', label: 'Fade Only' },
    ],
    description: 'Transition direction',
  },
  distance: {
    type: 'range',
    label: 'Slide Distance',
    defaultValue: 20,
    min: 0,
    max: 100,
    step: 10,
    description: 'Slide distance in pixels',
  },
};

export function PageTransition({ children, settings, trigger = 'mount' }: UIEffectComponentProps) {
  const {
    duration = 400,
    direction = 'up',
    distance = 20,
  } = settings;
  
  const { flags, reducedMotion, gpuStyle, animationFactor } = useEffectOptimization<HTMLDivElement>({ lazy: false });
  
  // Adjust duration for mobile/low-end devices
  const adaptiveDuration = (duration * animationFactor) / 1000;
  
  // Reduce distance on mobile
  const adaptiveDistance = flags.isMobile ? Math.min(distance, 15) : distance;
  
  const getInitialPosition = () => {
    switch (direction) {
      case 'up':
        return { y: adaptiveDistance };
      case 'down':
        return { y: -adaptiveDistance };
      case 'left':
        return { x: adaptiveDistance };
      case 'right':
        return { x: -adaptiveDistance };
      default:
        return {};
    }
  };
  
  // Simpler animation for reduced motion
  if (reducedMotion) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={gpuStyle}
      >
        {children}
      </motion.div>
    );
  }
  
  return (
    <motion.div
      initial={{ 
        opacity: 0,
        ...getInitialPosition(),
      }}
      animate={{ 
        opacity: 1,
        x: 0,
        y: 0,
      }}
      exit={{ 
        opacity: 0,
        ...getInitialPosition(),
      }}
      transition={{
        duration: adaptiveDuration,
        ease: [0.4, 0, 0.2, 1],
      }}
      style={gpuStyle}
      data-testid="effect-page-transition"
    >
      {children}
    </motion.div>
  );
}

// Register this effect
const pageTransitionEffect: UIEffect = {
  id: 'page-transition',
  name: 'Page Transition',
  type: 'ui',
  library: 'framer',
  description: 'Smooth transitions between pages/views',
  tags: ['page', 'transition', 'route', 'navigation'],
  performanceModes: ['low', 'medium', 'high'],
  component: PageTransition,
  defaultSettings: {
    duration: 400,
    direction: 'up',
    distance: 20,
  },
  settingsSchema,
};

effectsRegistry.register(pageTransitionEffect);

export default pageTransitionEffect;
