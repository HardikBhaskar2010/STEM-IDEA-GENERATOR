import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useThreeD } from '@/contexts/ThreeDContext';
import { ParticleField } from './ParticleField';
import { FloatingGeometry } from './FloatingGeometry';

interface HeroScene3DProps {
  enableInteraction?: boolean;
  className?: string;
}

export const HeroScene3D: React.FC<HeroScene3DProps> = ({
  enableInteraction = false,
  className = ''
}) => {
  const { enable3D, pixelRatio, enableShadows } = useThreeD();

  if (!enable3D) {
    return null;
  }

  return (
    <div className={`absolute inset-0 ${className}`} style={{ pointerEvents: enableInteraction ? 'auto' : 'none' }}>
      <Canvas
        dpr={pixelRatio}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance'
        }}
      >
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={75} />
          
          {/* Lighting */}
          <ambientLight intensity={0.3} />
          <pointLight position={[10, 10, 10]} intensity={0.5} />
          <pointLight position={[-10, -10, -10]} intensity={0.3} color="#a855f7" />
          
          {/* Particle Field */}
          <ParticleField color="#a855f7" size={0.05} speed={0.5} />
          
          {/* Floating Geometries */}
          <FloatingGeometry position={[-5, 2, -5]} geometry="box" color="#a855f7" scale={0.5} />
          <FloatingGeometry position={[5, -2, -5]} geometry="sphere" color="#ec4899" scale={0.6} />
          <FloatingGeometry position={[0, 3, -8]} geometry="torus" color="#8b5cf6" scale={0.4} />
          <FloatingGeometry position={[-3, -3, -6]} geometry="octahedron" color="#d946ef" scale={0.5} />
          
          {/* Optional orbit controls for interaction */}
          {enableInteraction && (
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              autoRotate
              autoRotateSpeed={0.5}
            />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
};
