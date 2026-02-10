'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { deviceCapability, DeviceCapability } from '@/lib/deviceCapability';
import { webglManager } from '@/lib/webglManager';

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
        const webglInfo = webglManager.getContextInfo();
        
        console.log('🎮 3D Context - Device capability:', detected);
        console.log('🎮 3D Context - WebGL info:', webglInfo);
        
        setCapability(detected);
        
        // Disable 3D if WebGL not supported or user prefers reduced motion
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const webglSupported = webglInfo?.isSupported || false;
        
        const shouldEnable3D = !prefersReducedMotion && 
                              detected !== 'minimal' && 
                              webglSupported;
        
        console.log('🎮 3D Context - Enable 3D:', shouldEnable3D, {
          prefersReducedMotion,
          capability: detected,
          webglSupported
        });
        
        setEnable3D(shouldEnable3D);
      } catch (error) {
        console.error('Failed to detect device capability:', error);
        setCapability('low');
        setEnable3D(false);
      } finally {
        setIsLoading(false);
      }
    };

    detectCapability();

    // Listen for WebGL recovery
    const handleWebGLRecovery = () => {
      console.log('🔄 3D Context - WebGL recovered, re-evaluating 3D support');
      detectCapability();
    };

    window.addEventListener('webgl-recovered', handleWebGLRecovery);
    
    return () => {
      window.removeEventListener('webgl-recovered', handleWebGLRecovery);
    };
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
