'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useThreeD } from '@/contexts/ThreeDContext';

interface FloatingGeometryProps {
  position?: [number, number, number];
  geometry?: 'box' | 'sphere' | 'torus' | 'octahedron';
  color?: string;
  wireframe?: boolean;
  scale?: number;
}

export const FloatingGeometry: React.FC<FloatingGeometryProps> = ({
  position = [0, 0, 0],
  geometry = 'box',
  color = '#a855f7',
  wireframe = true,
  scale = 1
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { animationComplexity } = useThreeD();

  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.getElapsedTime();

    if (animationComplexity === 'full') {
      // Rotation
      meshRef.current.rotation.x = time * 0.3;
      meshRef.current.rotation.y = time * 0.2;
      
      // Floating animation
      meshRef.current.position.y = position[1] + Math.sin(time) * 0.5;
    } else if (animationComplexity === 'reduced') {
      // Slower rotation only
      meshRef.current.rotation.y = time * 0.1;
    }
  });

  const renderGeometry = () => {
    switch (geometry) {
      case 'sphere':
        return <sphereGeometry args={[1 * scale, 32, 32]} />;
      case 'torus':
        return <torusGeometry args={[1 * scale, 0.4 * scale, 16, 100]} />;
      case 'octahedron':
        return <octahedronGeometry args={[1 * scale]} />;
      case 'box':
      default:
        return <boxGeometry args={[1 * scale, 1 * scale, 1 * scale]} />;
    }
  };

  return (
    <mesh ref={meshRef} position={position}>
      {renderGeometry()}
      <meshStandardMaterial
        color={color}
        wireframe={wireframe}
        transparent
        opacity={0.4}
        emissive={color}
        emissiveIntensity={0.2}
      />
    </mesh>
  );
};
