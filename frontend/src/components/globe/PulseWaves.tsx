/**
 * PulseWaves.tsx
 * Each pin emits an expanding ring that fades out and loops — radar pulse effect.
 */

import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { latLngToVec3 } from './GlobePoints';
import type { GlobePin } from './globePins';
import { GLOBE_PINS } from './globePins';

interface WaveRingProps {
  position: THREE.Vector3;
  normal: THREE.Vector3; // outward normal so the ring faces away from globe
  color: string;
  phaseOffset: number;
}

const WaveRing: React.FC<WaveRingProps> = ({ position, color, phaseOffset }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  useFrame((state) => {
    if (!meshRef.current) {return;}
    const t = (state.clock.elapsedTime * 0.5 + phaseOffset) % 1;
    const scale = 1 + t * 4;
    const opacity = (1 - t) * 0.8;

    meshRef.current.scale.setScalar(scale);
    // Billboard: always face camera
    meshRef.current.quaternion.copy(camera.quaternion);
    (meshRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
  });

  return (
    <mesh ref={meshRef} position={position}>
      <ringGeometry args={[0.04, 0.065, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.7}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

interface PulseWavesProps {
  radius?: number;
  pins?: GlobePin[];
  wavesPerPin?: number;
}

export const PulseWaves: React.FC<PulseWavesProps> = ({
  radius = 2.0,
  pins = GLOBE_PINS,
  wavesPerPin = 2,
}) => {
  const waves = useMemo(() => {
    const result: Array<{
      id: string;
      position: THREE.Vector3;
      color: string;
      phaseOffset: number;
    }> = [];

    pins.forEach((pin) => {
      const pos = latLngToVec3(pin.lat, pin.lng, radius + 0.02);
      for (let w = 0; w < wavesPerPin; w++) {
        result.push({
          id: `${pin.id}-wave-${w}`,
          position: pos,
          color: pin.accent,
          phaseOffset: w / wavesPerPin,
        });
      }
    });

    return result;
  }, [pins, radius, wavesPerPin]);

  return (
    <group>
      {waves.map((w) => (
        <WaveRing
          key={w.id}
          position={w.position}
          color={w.color}
          phaseOffset={w.phaseOffset}
        />
      ))}

    </group>
  );
};

export default PulseWaves;
