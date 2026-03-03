import React, { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useThreeD } from '@/contexts/ThreeDContext';

interface Card3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  color?: string;
  hovered?: boolean;
}

export const Card3D: React.FC<Card3DProps> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  color = '#1a1a1a',
  hovered = false
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { animationComplexity } = useThreeD();
  const [localHovered, setLocalHovered] = useState(false);

  useFrame((state) => {
    if (!meshRef.current || animationComplexity === 'minimal') return;

    const time = state.clock.getElapsedTime();
    const isHovered = hovered || localHovered;

    if (animationComplexity === 'full') {
      // Smooth hover animation
      meshRef.current.position.z = THREE.MathUtils.lerp(
        meshRef.current.position.z,
        isHovered ? position[2] + 0.5 : position[2],
        0.1
      );

      // Gentle floating when not hovered
      if (!isHovered) {
        meshRef.current.position.y = position[1] + Math.sin(time * 0.5) * 0.1;
      }
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      scale={scale}
      onPointerOver={() => setLocalHovered(true)}
      onPointerOut={() => setLocalHovered(false)}
    >
      <boxGeometry args={[2, 2.8, 0.1]} />
      <meshStandardMaterial
        color={color}
        metalness={0.3}
        roughness={0.4}
        emissive="#a855f7"
        emissiveIntensity={localHovered || hovered ? 0.3 : 0.1}
      />
    </mesh>
  );
};
