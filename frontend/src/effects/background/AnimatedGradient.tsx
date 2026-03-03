/**
 * Animated Gradient Background
 * Phase 9: Optimized with GPU acceleration and mobile optimization
 * 
 * Smooth animated gradient background with customizable colors
 */

import { motion } from 'framer-motion';
import type { BackgroundEffectComponentProps, BackgroundEffect, EffectSettingsSchema } from '@/types/effects';
import { effectsRegistry } from '@/effects/core/EffectsRegistry';
import { useEffectOptimization } from '@/hooks/useEffectOptimization';

const settingsSchema: EffectSettingsSchema = {
  gradientType: {
    type: 'select',
    label: 'Gradient Type',
    defaultValue: 'linear',
    options: [
      { value: 'linear', label: 'Linear' },
      { value: 'radial', label: 'Radial' },
      { value: 'conic', label: 'Conic' },
    ],
    description: 'Type of gradient',
  },
  gradientAngle: {
    type: 'range',
    label: 'Gradient Angle',
    defaultValue: 45,
    min: 0,
    max: 360,
    step: 1,
    description: 'Angle of the gradient (for linear)',
  },
  animateGradient: {
    type: 'boolean',
    label: 'Animate',
    defaultValue: true,
    description: 'Enable gradient animation',
  },
  opacity: {
    type: 'range',
    label: 'Opacity',
    defaultValue: 1,
    min: 0,
    max: 1,
    step: 0.1,
    description: 'Background opacity',
  },
};

export function AnimatedGradient({ settings, isActive }: BackgroundEffectComponentProps) {
  const {
    gradientType = 'linear',
    gradientAngle = 45,
    gradientColors = ['#667eea', '#764ba2', '#f093fb'],
    animateGradient = true,
    opacity = 1,
  } = settings;
  
  const { flags, reducedMotion, gpuStyle } = useEffectOptimization<HTMLDivElement>({ lazy: false });
  
  const getGradientString = (angle: number) => {
    const colors = gradientColors.join(', ');
    
    switch (gradientType) {
      case 'radial':
        return `radial-gradient(circle, ${colors})`;
      case 'conic':
        return `conic-gradient(from ${angle}deg, ${colors})`;
      default:
        return `linear-gradient(${angle}deg, ${colors})`;
    }
  };
  
  if (!isActive) return null;
  
  // Disable animation for reduced motion or low-end devices
  const shouldAnimate = animateGradient && !reducedMotion && !flags.isLowEndDevice;
  const animationDuration = flags.isMobile ? 10 : 8;
  
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={gpuStyle}
      data-testid="effect-animated-gradient"
    >
      <div
        className="absolute inset-0"
        style={{
          background: getGradientString(gradientAngle),
          transform: 'translate3d(0, 0, 0)',
        }}
      />
      
      {shouldAnimate && (
        <motion.div
          className="absolute inset-0"
          style={{
            background: getGradientString(gradientAngle + 180),
            mixBlendMode: 'overlay',
            transform: 'translate3d(0, 0, 0)',
          }}
          animate={{
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            duration: animationDuration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
    </motion.div>
  );
}

// Register this effect
const animatedGradientEffect: BackgroundEffect = {
  id: 'animated-gradient',
  name: 'Animated Gradient',
  type: 'background',
  library: 'framer',
  description: 'Smooth animated gradient background',
  tags: ['gradient', 'animated', 'colorful'],
  performanceModes: ['medium', 'high'],
  component: AnimatedGradient,
  defaultSettings: {
    gradientType: 'linear',
    gradientAngle: 45,
    gradientColors: ['#667eea', '#764ba2', '#f093fb'],
    animateGradient: true,
    opacity: 1,
  },
  settingsSchema,
  heavyLoad: false,
};

effectsRegistry.register(animatedGradientEffect);

export default animatedGradientEffect;
