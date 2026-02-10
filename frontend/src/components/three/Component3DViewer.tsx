'use client';

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
import { useThreeD } from '@/contexts/ThreeDContext';
import * as THREE from 'three';

interface Component3DViewerProps {
  componentType: 'arduino' | 'sensor' | 'resistor' | 'led' | 'breadboard';
  className?: string;
  enableInteraction?: boolean;
}

const ComponentModel: React.FC<{ type: string }> = ({ type }) => {
  // Simple 3D representations of components
  switch (type) {
    case 'arduino':
      return (
        <group>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[2, 0.2, 1.5]} />
            <meshStandardMaterial color="#0066cc" metalness={0.3} roughness={0.7} />
          </mesh>
          {/* USB port */}
          <mesh position={[-0.8, 0.15, 0]}>
            <boxGeometry args={[0.3, 0.2, 0.4]} />
            <meshStandardMaterial color="#cccccc" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Pins */}
          {Array.from({ length: 14 }).map((_, i) => (
            <mesh key={i} position={[0.7 - i * 0.1, 0.15, 0.6]}>
              <boxGeometry args={[0.05, 0.2, 0.05]} />
              <meshStandardMaterial color="#333333" metalness={0.9} roughness={0.1} />
            </mesh>
          ))}
        </group>
      );
    
    case 'sensor':
      return (
        <group>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.5, 0.5, 0.3, 32]} />
            <meshStandardMaterial color="#2d5f2e" metalness={0.2} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <sphereGeometry args={[0.3, 32, 32]} />
            <meshStandardMaterial
              color="#1a1a1a"
              metalness={0.9}
              roughness={0.1}
              transparent
              opacity={0.8}
            />
          </mesh>
        </group>
      );
    
    case 'led':
      return (
        <group>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.25, 0.15, 0.5, 32]} />
            <meshStandardMaterial
              color="#ff0000"
              transparent
              opacity={0.6}
              emissive="#ff0000"
              emissiveIntensity={0.5}
            />
          </mesh>
          {/* Leads */}
          <mesh position={[0.1, -0.5, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
            <meshStandardMaterial color="#cccccc" metalness={0.9} roughness={0.1} />
          </mesh>
          <mesh position={[-0.1, -0.5, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
            <meshStandardMaterial color="#cccccc" metalness={0.9} roughness={0.1} />
          </mesh>
        </group>
      );
    
    case 'resistor':
      return (
        <group>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.8, 16]} />
            <meshStandardMaterial color="#d4a574" metalness={0.1} roughness={0.9} />
          </mesh>
          {/* Color bands */}
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.11, 0.11, 0.1, 16]} />
            <meshStandardMaterial color="#ff0000" />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.11, 0.11, 0.1, 16]} />
            <meshStandardMaterial color="#ffff00" />
          </mesh>
          {/* Leads */}
          <mesh position={[0, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
            <meshStandardMaterial color="#cccccc" metalness={0.9} roughness={0.1} />
          </mesh>
          <mesh position={[0, -0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
            <meshStandardMaterial color="#cccccc" metalness={0.9} roughness={0.1} />
          </mesh>
        </group>
      );
    
    case 'breadboard':
      return (
        <group>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[3, 0.2, 2]} />
            <meshStandardMaterial color="#ffffff" metalness={0.1} roughness={0.8} />
          </mesh>
          {/* Holes grid */}
          {Array.from({ length: 10 }).map((_, i) =>
            Array.from({ length: 15 }).map((_, j) => (
              <mesh key={`${i}-${j}`} position={[-1.3 + j * 0.18, 0.11, -0.8 + i * 0.18]}>
                <cylinderGeometry args={[0.03, 0.03, 0.05, 8]} />
                <meshStandardMaterial color="#333333" />
              </mesh>
            ))
          )}
        </group>
      );
    
    default:
      return (
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#a855f7" wireframe />
        </mesh>
      );
  }
};

const RotatingComponent: React.FC<{ type: string }> = ({ type }) => {
  const meshRef = React.useRef<THREE.Group>(null);
  const { animationComplexity } = useThreeD();

  React.useEffect(() => {
    let animationId: number;

    const animate = () => {
      if (meshRef.current && animationComplexity !== 'minimal') {
        meshRef.current.rotation.y += 0.01;
        if (animationComplexity === 'full') {
          meshRef.current.rotation.x = Math.sin(Date.now() * 0.001) * 0.1;
        }
      }
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [animationComplexity]);

  return (
    <group ref={meshRef}>
      <ComponentModel type={type} />
    </group>
  );
};

export const Component3DViewer: React.FC<Component3DViewerProps> = ({
  componentType,
  className = '',
  enableInteraction = true
}) => {
  const { enable3D, pixelRatio, enableShadows } = useThreeD();

  if (!enable3D) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="text-muted-foreground">3D Preview Unavailable</div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Canvas
        dpr={pixelRatio}
        shadows={enableShadows}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance'
        }}
      >
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[0, 2, 4]} fov={50} />
          
          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[5, 5, 5]}
            intensity={0.6}
            castShadow={enableShadows}
          />
          <pointLight position={[-5, 5, -5]} intensity={0.3} color="#a855f7" />
          
          {/* Component */}
          <RotatingComponent type={componentType} />
          
          {/* Ground plane */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow={enableShadows}>
            <planeGeometry args={[10, 10]} />
            <meshStandardMaterial color="#1a1a1a" transparent opacity={0.1} />
          </mesh>
          
          {enableInteraction && (
            <OrbitControls
              enableZoom={true}
              enablePan={false}
              minDistance={2}
              maxDistance={8}
              autoRotate={false}
            />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
};
