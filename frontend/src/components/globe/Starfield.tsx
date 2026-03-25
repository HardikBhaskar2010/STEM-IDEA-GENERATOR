/**
 * Starfield.tsx
 * A cloud of tiny dots simulating background stars.
 * Rotates extremely slowly — gives a living "space" feel without being distracting.
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface StarfieldProps {
  count?: number;
  spread?: number;
  color?: string;
  opacity?: number;
  rotationSpeed?: number;
}

export const Starfield: React.FC<StarfieldProps> = ({
  count = 3000,
  spread = 80,
  color = '#aaaaff',
  opacity = 0.5,
  rotationSpeed = 0.00008,
}) => {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Uniform distribution on a sphere shell
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = spread * (0.8 + Math.random() * 0.2);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count, spread]);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += rotationSpeed * delta * 60;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.15}
        transparent
        opacity={opacity}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

export default Starfield;
