import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { deviceCapability, DeviceCapability } from '@/lib/deviceCapability';

interface ThreeDContextValue {
  capability: DeviceCapability | null;
  isLoading: boolean;
  particleCount: number;
  animationComplexity: 'full' | 'reduced' | 'minimal';
  enablePostProcessing: boolean;
  enableShadows: boolean;
  pixelRatio: number;
  enable3D: boolean;
}

const ThreeDContext = createContext<ThreeDContextValue | undefined>(undefined);

export const ThreeDProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [capability, setCapability] = useState<DeviceCapability | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [enable3D, setEnable3D] = useState(true);

  useEffect(() => {
    const detectCapability = async () => {
      try {
        const detected = await deviceCapability.detect();
        setCapability(detected);
        
        // Disable 3D if minimal capability or user prefers reduced motion
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        setEnable3D(!prefersReducedMotion && detected !== 'minimal');
      } catch (error) {
        console.error('Failed to detect device capability:', error);
        setCapability('low');
        setEnable3D(false);
      } finally {
        setIsLoading(false);
      }
    };

    detectCapability();
  }, []);

  const value: ThreeDContextValue = {
    capability,
    isLoading,
    particleCount: deviceCapability.getParticleCount(),
    animationComplexity: deviceCapability.getAnimationComplexity(),
    enablePostProcessing: deviceCapability.shouldEnablePostProcessing(),
    enableShadows: deviceCapability.shouldEnableShadows(),
    pixelRatio: deviceCapability.getPixelRatio(),
    enable3D
  };

  return <ThreeDContext.Provider value={value}>{children}</ThreeDContext.Provider>;
};

export const useThreeD = (): ThreeDContextValue => {
  const context = useContext(ThreeDContext);
  if (context === undefined) {
    throw new Error('useThreeD must be used within a ThreeDProvider');
  }
  return context;
};
