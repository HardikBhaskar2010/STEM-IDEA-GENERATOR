/**
 * Noise Texture Background
 * Phase 9: Optimized with GPU acceleration, memory cleanup, and mobile optimization
 * 
 * Animated noise/grain texture for a cinematic or metallic look
 */

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { BackgroundEffectComponentProps, BackgroundEffect, EffectSettingsSchema } from '@/types/effects';
import { effectsRegistry } from '@/effects/core/EffectsRegistry';
import { useMemoryCleanup, useCanvasCleanup } from '@/hooks/useMemoryCleanup';
import { useEffectOptimization } from '@/hooks/useEffectOptimization';

const settingsSchema: EffectSettingsSchema = {
  intensity: {
    type: 'range',
    label: 'Noise Intensity',
    defaultValue: 0.5,
    min: 0.1,
    max: 1,
    step: 0.1,
    description: 'Intensity of noise effect',
  },
  speed: {
    type: 'range',
    label: 'Animation Speed',
    defaultValue: 1,
    min: 0,
    max: 5,
    step: 0.5,
    description: 'Speed of noise animation (0 = static)',
  },
  baseColor: {
    type: 'color',
    label: 'Base Color',
    defaultValue: '#1a1a2e',
    description: 'Base background color',
  },
  noiseColor: {
    type: 'color',
    label: 'Noise Color',
    defaultValue: '#c0c0c0',
    description: 'Color of the noise pattern',
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

export function NoiseTexture({ settings, isActive }: BackgroundEffectComponentProps) {
  const {
    intensity = 0.5,
    speed = 1,
    baseColor = '#1a1a2e',
    noiseColor = '#c0c0c0',
    opacity = 1,
  } = settings;
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const memoryManager = useMemoryCleanup();
  const { flags, reducedMotion, gpuStyle } = useEffectOptimization<HTMLDivElement>({ lazy: false });
  
  // Proper canvas cleanup
  useCanvasCleanup(canvasRef);
  
  useEffect(() => {
    if (!isActive || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: false });
    if (!ctx) return;
    
    // Set canvas size with device pixel ratio for sharpness
    const updateSize = () => {
      const dpr = flags.isLowEndDevice ? 1 : Math.min(window.devicePixelRatio, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
    };
    updateSize();
    
    memoryManager.addEventListener(window, 'resize', updateSize as EventListener, { passive: true });
    
    // Generate noise
    const generateNoise = () => {
      const width = canvas.width;
      const height = canvas.height;
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;
      
      // Parse noise color
      const rgb = parseInt(noiseColor.slice(1), 16);
      const r = (rgb >> 16) & 255;
      const g = (rgb >> 8) & 255;
      const b = rgb & 255;
      
      // Reduce quality for low-end devices
      const step = flags.isLowEndDevice ? 2 : 1;
      
      for (let i = 0; i < data.length; i += 4 * step) {
        const noise = Math.random() * 255 * intensity;
        data[i] = Math.min(r + noise, 255);     // Red
        data[i + 1] = Math.min(g + noise, 255); // Green
        data[i + 2] = Math.min(b + noise, 255); // Blue
        data[i + 3] = Math.random() * 100;       // Alpha (for grain effect)
      }
      
      ctx.putImageData(imageData, 0, 0);
    };
    
    // Animation loop
    let lastTime = 0;
    const adjustedSpeed = flags.isLowEndDevice ? Math.max(0.5, speed * 0.7) : speed;
    
    const animate = (time: number) => {
      if (reducedMotion || speed === 0) {
        generateNoise();
        return;
      }
      
      const delta = time - lastTime;
      const targetFrameTime = 1000 / (adjustedSpeed * 30); // Adjust frame rate based on speed
      
      if (delta > targetFrameTime) {
        generateNoise();
        lastTime = time;
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate(0);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, intensity, speed, noiseColor, reducedMotion, memoryManager, flags.isLowEndDevice]);
  
  if (!isActive) return null;
  
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{ backgroundColor: baseColor, ...gpuStyle }}
      data-testid="effect-noise-texture"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ 
          mixBlendMode: 'overlay', 
          opacity: 0.3,
          transform: 'translate3d(0, 0, 0)',
        }}
      />
    </motion.div>
  );
}

// Register this effect
const noiseTextureEffect: BackgroundEffect = {
  id: 'noise-texture',
  name: 'Noise Texture',
  type: 'background',
  library: 'custom',
  description: 'Animated noise/grain texture for cinematic look',
  tags: ['noise', 'grain', 'texture', 'cinematic', 'metallic'],
  performanceModes: ['medium', 'high'],
  component: NoiseTexture,
  defaultSettings: {
    intensity: 0.5,
    speed: 1,
    baseColor: '#1a1a2e',
    noiseColor: '#c0c0c0',
    opacity: 1,
  },
  settingsSchema,
  heavyLoad: false,
};

effectsRegistry.register(noiseTextureEffect);

export default noiseTextureEffect;
