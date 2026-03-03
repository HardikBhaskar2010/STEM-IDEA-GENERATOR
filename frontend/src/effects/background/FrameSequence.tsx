/**
 * Frame Sequence Background
 * Phase 9: Optimized with memory cleanup and mobile optimization
 * 
 * Plays a sequence of images as an animation
 */

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import type { BackgroundEffectComponentProps, BackgroundEffect, EffectSettingsSchema } from '@/types/effects';
import { effectsRegistry } from '@/effects/core/EffectsRegistry';
import { useInterval } from '@/hooks/useMemoryCleanup';
import { useEffectOptimization } from '@/hooks/useEffectOptimization';

const settingsSchema: EffectSettingsSchema = {
  fps: {
    type: 'range',
    label: 'Frames Per Second',
    defaultValue: 24,
    min: 12,
    max: 60,
    step: 6,
    description: 'Playback speed in frames per second',
  },
  opacity: {
    type: 'range',
    label: 'Opacity',
    defaultValue: 0.7,
    min: 0.1,
    max: 1,
    step: 0.1,
    description: 'Frame sequence opacity',
  },
  blur: {
    type: 'range',
    label: 'Blur',
    defaultValue: 0,
    min: 0,
    max: 20,
    step: 2,
    description: 'Blur amount in pixels',
  },
  loop: {
    type: 'boolean',
    label: 'Loop Animation',
    defaultValue: true,
    description: 'Loop the frame sequence',
  },
};

export function FrameSequence({ settings, isActive }: BackgroundEffectComponentProps) {
  const {
    frameSequence = [],
    fps = 24,
    opacity = 0.7,
    blur = 0,
    loop = true,
  } = settings;
  
  const [currentFrame, setCurrentFrame] = useState(0);
  const { flags, reducedMotion, gpuStyle } = useEffectOptimization<HTMLDivElement>({ lazy: false });
  
  // Adjust FPS for mobile devices
  const adaptiveFps = flags.isLowEndDevice ? Math.min(fps, 24) : fps;
  const intervalMs = reducedMotion ? null : (1000 / adaptiveFps);
  
  // Use optimized interval hook with automatic cleanup
  useInterval(() => {
    if (!isActive || frameSequence.length === 0) return;
    
    setCurrentFrame((prev) => {
      const next = prev + 1;
      if (next >= frameSequence.length) {
        return loop ? 0 : prev;
      }
      return next;
    });
  }, intervalMs);
  
  // Reset frame when effect becomes inactive
  useEffect(() => {
    if (!isActive) {
      setCurrentFrame(0);
    }
  }, [isActive]);
  
  if (!isActive || frameSequence.length === 0) {
    return (
      <motion.div
        className="absolute inset-0 flex items-center justify-center bg-gray-900"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        style={gpuStyle}
      >
        <div className="text-white/50 text-center">
          <p className="text-sm">Frame Sequence Effect</p>
          <p className="text-xs mt-2">No frames provided</p>
        </div>
      </motion.div>
    );
  }
  
  // Reduce blur for low-end devices
  const adaptiveBlur = flags.isLowEndDevice ? Math.min(blur, 10) : blur;
  
  return (
    <motion.div
      className="absolute inset-0 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={gpuStyle}
      data-testid="effect-frame-sequence"
    >
      <img
        src={frameSequence[currentFrame]}
        alt={`Frame ${currentFrame + 1}`}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          filter: adaptiveBlur > 0 ? `blur(${adaptiveBlur}px)` : 'none',
          transform: 'translate3d(0, 0, 0)',
        }}
        loading="lazy"
      />
    </motion.div>
  );
}

// Register this effect
const frameSequenceEffect: BackgroundEffect = {
  id: 'frame-sequence',
  name: 'Frame Sequence',
  type: 'background',
  library: 'custom',
  description: 'Plays a sequence of images as an animation',
  tags: ['frames', 'sequence', 'animation', 'flipbook'],
  performanceModes: ['medium', 'high'],
  component: FrameSequence,
  defaultSettings: {
    frameSequence: [],
    fps: 24,
    opacity: 0.7,
    blur: 0,
    loop: true,
  },
  settingsSchema,
  heavyLoad: true,
};

effectsRegistry.register(frameSequenceEffect);

export default frameSequenceEffect;
