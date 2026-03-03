/**
 * Static Gradient Background
 * Phase 9: Optimized with GPU acceleration
 * 
 * Simple static gradient backgrounds with various preset options
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
    label: 'Angle',
    defaultValue: 135,
    min: 0,
    max: 360,
    step: 15,
    description: 'Gradient angle (for linear/conic)',
  },
  colorFrom: {
    type: 'color',
    label: 'Start Color',
    defaultValue: '#1e1b4b',
    description: 'Starting gradient color',
  },
  colorTo: {
    type: 'color',
    label: 'End Color',
    defaultValue: '#581c87',
    description: 'Ending gradient color',
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

export function StaticGradient({ settings, isActive }: BackgroundEffectComponentProps) {
  const {
    gradientType = 'linear',
    gradientAngle = 135,
    colorFrom = '#1e1b4b',
    colorTo = '#581c87',
    opacity = 1,
  } = settings;
  
  const { gpuStyle } = useEffectOptimization<HTMLDivElement>({ lazy: false });
  
  const getGradientString = () => {
    switch (gradientType) {
      case 'radial':
        return `radial-gradient(circle, ${colorFrom}, ${colorTo})`;
      case 'conic':
        return `conic-gradient(from ${gradientAngle}deg, ${colorFrom}, ${colorTo}, ${colorFrom})`;
      default:
        return `linear-gradient(${gradientAngle}deg, ${colorFrom}, ${colorTo})`;
    }
  };
  
  if (!isActive) return null;
  
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        background: getGradientString(),
        transform: 'translate3d(0, 0, 0)',
        ...gpuStyle,
      }}
      data-testid="effect-static-gradient"
    />
  );
}

// Register this effect
const staticGradientEffect: BackgroundEffect = {
  id: 'static-gradient',
  name: 'Static Gradient',
  type: 'background',
  library: 'css',
  description: 'Simple static gradient backgrounds',
  tags: ['gradient', 'static', 'simple', 'clean'],
  performanceModes: ['low', 'medium', 'high'],
  component: StaticGradient,
  defaultSettings: {
    gradientType: 'linear',
    gradientAngle: 135,
    colorFrom: '#1e1b4b',
    colorTo: '#581c87',
    opacity: 1,
  },
  settingsSchema,
  heavyLoad: false,
};

effectsRegistry.register(staticGradientEffect);

export default staticGradientEffect;
