import React, { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { useThreeD } from '@/contexts/ThreeDContext';
import { webglManager } from '@/lib/webglManager';
import { AnimatedBackground } from './AnimatedBackground';

interface BackgroundCanvas3DProps {
  density?: 'low' | 'medium' | 'high';
  color?: string;
  className?: string;
}

export const BackgroundCanvas3D: React.FC<BackgroundCanvas3DProps> = ({
  density = 'low',
  color = '#a855f7',
  className = ''
}) => {
  const { enable3D } = useThreeD();
  const [hasError, setHasError] = useState(false);
  const [canRender, setCanRender] = useState(false);

  // Check WebGL availability on mount
  useEffect(() => {
    const checkWebGL = () => {
      const isSupported = webglManager.isWebGLSupported();
      const canCreate = webglManager.canCreateContext();
      
      console.log('🎮 BackgroundCanvas3D - WebGL check:', { isSupported, canCreate, enable3D });
      
      if (!isSupported) {
        console.warn('⚠️ WebGL not supported, disabling 3D background');
        setHasError(true);
        return;
      }
      
      if (!canCreate) {
        console.warn('⚠️ Cannot create WebGL context (limit reached), disabling 3D background');
        setHasError(true);
        return;
      }
      
      // Temporarily disable 3D to prevent buffer errors
      console.warn('⚠️ 3D backgrounds temporarily disabled to prevent buffer errors');
      setHasError(true);
      setCanRender(false);
      return;
      
      // TODO: Re-enable when buffer issues are fully resolved
      // setCanRender(enable3D && isSupported && canCreate);
    };

    checkWebGL();

    // Listen for WebGL recovery
    const handleWebGLRecovery = () => {
      console.log('🔄 WebGL recovered, re-enabling 3D background');
      setHasError(false);
      checkWebGL();
    };

    window.addEventListener('webgl-recovered', handleWebGLRecovery);
    
    return () => {
      window.removeEventListener('webgl-recovered', handleWebGLRecovery);
    };
  }, [enable3D]);

  if (!canRender || hasError) {
    return null;
  }

  const handleContextLost = (event: Event) => {
    event.preventDefault();
    console.warn('🚨 WebGL context lost in BackgroundCanvas3D');
    setHasError(true);
  };

  const handleCreated = (state: any) => {
    const gl = state.gl.getContext();
    const canvas = state.gl.domElement;
    
    // Register context with manager
    webglManager.registerContext(gl);
    
    // Add context lost listener
    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    
    console.log('✅ BackgroundCanvas3D WebGL context created');
    
    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost, false);
      webglManager.unregisterContext(gl);
    };
  };

  // Get recommended settings from WebGL manager
  const settings = webglManager.getRecommendedSettings();

  return (
    <div className={`absolute inset-0 ${className}`} style={{ pointerEvents: 'none' }}>
      <Canvas
        dpr={settings.pixelRatio}
        onCreated={handleCreated}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: 'high-performance',
          failIfMajorPerformanceCaveat: false, // Allow fallback
          preserveDrawingBuffer: false,
          stencil: false,
          depth: true
        }}
        frameloop="demand"
        performance={{
          min: 0.2,
          max: 1,
          debounce: 200
        }}
      >
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[0, 0, 15]} fov={60} />
          <AnimatedBackground 
            density={density} 
            color={color}
            particleCount={settings.maxParticles}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};
