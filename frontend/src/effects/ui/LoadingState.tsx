/**
 * Loading State Effect
 * Phase 9: Optimized with GPU acceleration and mobile optimization
 * 
 * Animated loading indicators and skeleton states
 */

import { motion } from 'framer-motion';
import type { UIEffectComponentProps, UIEffect, EffectSettingsSchema } from '@/types/effects';
import { effectsRegistry } from '@/effects/core/EffectsRegistry';
import { useEffectOptimization } from '@/hooks/useEffectOptimization';

const settingsSchema: EffectSettingsSchema = {
  type: {
    type: 'select',
    label: 'Loading Type',
    defaultValue: 'pulse',
    options: [
      { value: 'pulse', label: 'Pulse' },
      { value: 'shimmer', label: 'Shimmer' },
      { value: 'bounce', label: 'Bounce' },
    ],
    description: 'Type of loading animation',
  },
  speed: {
    type: 'range',
    label: 'Animation Speed',
    defaultValue: 1.5,
    min: 0.5,
    max: 3,
    step: 0.5,
    description: 'Speed of animation',
  },
  opacity: {
    type: 'range',
    label: 'Min Opacity',
    defaultValue: 0.5,
    min: 0.2,
    max: 0.8,
    step: 0.1,
    description: 'Minimum opacity in animation',
  },
};

export function LoadingState({ children, settings, trigger = 'mount' }: UIEffectComponentProps) {
  const {
    type = 'pulse',
    speed = 1.5,
    opacity = 0.5,
  } = settings;
  
  const { flags, reducedMotion, gpuStyle, animationFactor } = useEffectOptimization<HTMLDivElement>({ lazy: false });
  
  // Adjust speed for mobile/low-end devices
  const adaptiveSpeed = speed * animationFactor;
  
  // Static state for reduced motion
  if (reducedMotion) {
    return (
      <div className="opacity-70" style={gpuStyle}>
        {children}
      </div>
    );
  }
  
  const getAnimation = () => {
    switch (type) {
      case 'pulse':
        return {
          opacity: [opacity, 1, opacity],
        };
      case 'shimmer':
        return {
          backgroundPosition: ['200% 0', '-200% 0'],
        };
      case 'bounce':
        // Disable bounce on low-end devices
        if (flags.isLowEndDevice) {
          return { opacity: [opacity, 1, opacity] };
        }
        return {
          scale: [1, 1.05, 1],
          y: [0, -5, 0],
        };
      default:
        return { opacity: [opacity, 1, opacity] };
    }
  };
  
  return (
    <motion.div
      className={type === 'shimmer' ? 'bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700' : ''}
      style={{
        ...(type === 'shimmer' ? { backgroundSize: '200% 100%' } : {}),
        transform: 'translate3d(0, 0, 0)',
        ...gpuStyle,
      }}
      animate={getAnimation()}
      transition={{
        duration: adaptiveSpeed,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      data-testid="effect-loading-state"
    >
      {children}
    </motion.div>
  );
}

// Register this effect
const loadingStateEffect: UIEffect = {
  id: 'loading-state',
  name: 'Loading State',
  type: 'ui',
  library: 'framer',
  description: 'Animated loading indicators and skeleton states',
  tags: ['loading', 'skeleton', 'pulse', 'shimmer'],
  performanceModes: ['low', 'medium', 'high'],
  component: LoadingState,
  defaultSettings: {
    type: 'pulse',
    speed: 1.5,
    opacity: 0.5,
  },
  settingsSchema,
};

effectsRegistry.register(loadingStateEffect);

export default loadingStateEffect;
