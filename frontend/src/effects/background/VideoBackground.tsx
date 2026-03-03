/**
 * Video Background Effect
 * Phase 9: Optimized with memory cleanup and mobile optimization
 * 
 * Displays a video as the background with controls
 */

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { BackgroundEffectComponentProps, BackgroundEffect, EffectSettingsSchema } from '@/types/effects';
import { effectsRegistry } from '@/effects/core/EffectsRegistry';
import { useEffectOptimization } from '@/hooks/useEffectOptimization';

const settingsSchema: EffectSettingsSchema = {
  videoUrl: {
    type: 'string',
    label: 'Video URL',
    defaultValue: '',
    description: 'URL to the video file (MP4, WebM)',
  },
  playbackSpeed: {
    type: 'range',
    label: 'Playback Speed',
    defaultValue: 1,
    min: 0.25,
    max: 2,
    step: 0.25,
    description: 'Video playback speed',
  },
  opacity: {
    type: 'range',
    label: 'Opacity',
    defaultValue: 0.5,
    min: 0.1,
    max: 1,
    step: 0.1,
    description: 'Video opacity',
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
  blendMode: {
    type: 'select',
    label: 'Blend Mode',
    defaultValue: 'normal',
    options: [
      { value: 'normal', label: 'Normal' },
      { value: 'multiply', label: 'Multiply' },
      { value: 'screen', label: 'Screen' },
      { value: 'overlay', label: 'Overlay' },
    ],
    description: 'CSS blend mode',
  },
};

export function VideoBackground({ settings, isActive }: BackgroundEffectComponentProps) {
  const {
    videoUrl = '',
    playbackSpeed = 1,
    opacity = 0.5,
    blur = 0,
    blendMode = 'normal',
  } = settings;
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const { flags, gpuStyle } = useEffectOptimization<HTMLDivElement>({ lazy: false });
  
  useEffect(() => {
    if (!isActive || !videoRef.current) return;
    
    const video = videoRef.current;
    video.playbackRate = playbackSpeed;
    
    // Auto-play video
    const playVideo = async () => {
      try {
        await video.play();
      } catch (err) {
        console.warn('Video autoplay failed:', err);
      }
    };
    
    playVideo();
    
    return () => {
      // Proper cleanup
      video.pause();
      video.currentTime = 0;
      video.src = '';
      video.load();
    };
  }, [isActive, playbackSpeed]);
  
  if (!isActive || !videoUrl) return null;
  
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
      data-testid="effect-video-background"
    >
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          filter: adaptiveBlur > 0 ? `blur(${adaptiveBlur}px)` : 'none',
          mixBlendMode: blendMode as any,
          transform: 'translate3d(0, 0, 0)',
        }}
        src={videoUrl}
        loop
        muted
        playsInline
        preload="metadata"
      />
    </motion.div>
  );
}

// Register this effect
const videoBackgroundEffect: BackgroundEffect = {
  id: 'video-background',
  name: 'Video Background',
  type: 'background',
  library: 'custom',
  description: 'Displays a video as the background',
  tags: ['video', 'motion', 'cinematic'],
  performanceModes: ['high'],
  component: VideoBackground,
  defaultSettings: {
    videoUrl: '',
    playbackSpeed: 1,
    opacity: 0.5,
    blur: 0,
    blendMode: 'normal',
  },
  settingsSchema,
  heavyLoad: true,
};

effectsRegistry.register(videoBackgroundEffect);

export default videoBackgroundEffect;
