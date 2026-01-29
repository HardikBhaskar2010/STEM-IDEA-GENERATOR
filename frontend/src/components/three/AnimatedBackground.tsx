import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useThreeD } from '@/contexts/ThreeDContext';

interface AnimatedBackgroundProps {
  density?: 'low' | 'medium' | 'high';
  color?: string;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  density = 'medium',
  color = '#a855f7'
}) => {
  const { particleCount, animationComplexity } = useThreeD();
  const pointsRef = useRef<THREE.Points>(null);

  // Adjust count based on density
  const densityMultiplier = { low: 0.3, medium: 0.5, high: 0.8 };
  const count = Math.floor(particleCount * densityMultiplier[density]);

  const positions = React.useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return pos;
  }, [count]);

  useFrame((state) => {
    if (!pointsRef.current || animationComplexity === 'minimal') return;

    const time = state.clock.getElapsedTime();
    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3 + 1] += Math.sin(time * 0.5 + i * 0.1) * 0.001;
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    
    if (animationComplexity === 'full') {
      pointsRef.current.rotation.z = time * 0.02;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color={color}
        transparent
        opacity={0.4}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};
