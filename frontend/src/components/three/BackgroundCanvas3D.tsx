import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { useThreeD } from '@/contexts/ThreeDContext';
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
  const { enable3D, pixelRatio } = useThreeD();
  const [hasError, setHasError] = React.useState(false);

  if (!enable3D || hasError) {
    return null;
  }

  const handleContextLost = (event: Event) => {
    event.preventDefault();
    console.warn('WebGL context lost - disabling 3D');
    setHasError(true);
  };

  const handleCreated = (state: any) => {
    const canvas = state.gl.domElement;
    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    
    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost, false);
    };
  };

  return (
    <div className={`absolute inset-0 ${className}`} style={{ pointerEvents: 'none' }}>
      <Canvas
        dpr={pixelRatio}
        onCreated={handleCreated}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: 'high-performance',
          failIfMajorPerformanceCaveat: true,
          preserveDrawingBuffer: false
        }}
        frameloop="demand"
      >
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[0, 0, 15]} fov={60} />
          <AnimatedBackground density={density} color={color} />
        </Suspense>
      </Canvas>
    </div>
  );
};
