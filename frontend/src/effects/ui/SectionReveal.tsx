/**
 * Section Reveal Effect
 * Phase 9: Optimized with GPU acceleration, intersection observer, and mobile optimization
 * 
 * Scroll-triggered section reveal animations
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { UIEffectComponentProps, UIEffect, EffectSettingsSchema } from '@/types/effects';
import { effectsRegistry } from '@/effects/core/EffectsRegistry';
import { useEffectOptimization } from '@/hooks/useEffectOptimization';
import { useLazyLoad } from '@/hooks/useIntersectionObserver';

const settingsSchema: EffectSettingsSchema = {
  duration: {
    type: 'range',
    label: 'Duration',
    defaultValue: 800,
    min: 300,
    max: 1500,
    step: 100,
    description: 'Animation duration in ms',
  },
  threshold: {
    type: 'range',
    label: 'Trigger Threshold',
    defaultValue: 0.2,
    min: 0.1,
    max: 0.9,
    step: 0.1,
    description: 'How much element must be visible to trigger',
  },
  translateY: {
    type: 'range',
    label: 'Slide Distance',
    defaultValue: 50,
    min: 0,
    max: 150,
    step: 10,
    description: 'Vertical slide distance',
  },
  blur: {
    type: 'range',
    label: 'Initial Blur',
    defaultValue: 10,
    min: 0,
    max: 30,
    step: 5,
    description: 'Starting blur amount',
  },
};

export function SectionReveal({ children, settings, trigger = 'view' }: UIEffectComponentProps) {
  const {
    duration = 800,
    threshold = 0.2,
    translateY = 50,
    blur = 10,
  } = settings;
  
  const { flags, reducedMotion, gpuStyle, animationFactor } = useEffectOptimization<HTMLDivElement>({ lazy: false });
  const [ref, isInView] = useLazyLoad<HTMLDivElement>({ threshold, rootMargin: '50px' });
  
  // Adjust duration for mobile/low-end devices
  const adaptiveDuration = (duration * animationFactor) / 1000;
  
  // Reduce blur on low-end devices
  const adaptiveBlur = flags.isLowEndDevice ? Math.min(blur, 10) : blur;
  
  // Simpler animation for reduced motion
  if (reducedMotion) {
    return (
      <div ref={ref} style={gpuStyle}>
        {children}
      </div>
    );
  }
  
  return (
    <motion.div
      ref={ref}
      initial={{
        opacity: 0,
        y: translateY,
        filter: `blur(${adaptiveBlur}px)`,
      }}
      animate={isInView ? {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
      } : {}}
      transition={{
        duration: adaptiveDuration,
        ease: [0.4, 0, 0.2, 1],
      }}
      style={gpuStyle}
      data-testid="effect-section-reveal"
    >
      {children}
    </motion.div>
  );
}

// Register this effect
const sectionRevealEffect: UIEffect = {
  id: 'section-reveal',
  name: 'Section Reveal',
  type: 'ui',
  library: 'framer',
  description: 'Scroll-triggered section reveal animations',
  tags: ['scroll', 'reveal', 'intersection', 'fade'],
  performanceModes: ['low', 'medium', 'high'],
  component: SectionReveal,
  defaultSettings: {
    duration: 800,
    threshold: 0.2,
    translateY: 50,
    blur: 10,
  },
  settingsSchema,
};

effectsRegistry.register(sectionRevealEffect);

export default sectionRevealEffect;
