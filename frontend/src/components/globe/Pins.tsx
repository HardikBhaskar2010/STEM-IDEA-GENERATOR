/**
 * Pins.tsx
 * 4-layer node design:
 *  1. Core — tiny bright emissive sphere
 *  2. Glow halo — soft additive sphere around core
 *  3. Billboard ring — thin ring, always faces camera (via PulseWaves)
 *  4. Label — HTML pill via R3F Html helper, appears on hover
 */

import React, { useRef, useState, useMemo } from 'react';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { latLngToVec3 } from './GlobePoints';
import { GLOBE_PINS, GlobePin } from './globePins';

interface PinsProps {
  radius?: number;
  pins?: GlobePin[];
  onPinClick?: (pin: GlobePin) => void;
  onPinHover?: (pin: GlobePin | null) => void;
}

const PinMesh: React.FC<{
  pin: GlobePin;
  radius: number;
  onPinClick?: (pin: GlobePin) => void;
  onPinHover?: (pin: GlobePin | null) => void;
}> = ({ pin, radius, onPinClick, onPinHover }) => {
  const coreRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const { camera } = useThree();

  const position = useMemo(
    () => latLngToVec3(pin.lat, pin.lng, radius + 0.05),
    [pin.lat, pin.lng, radius]
  );

  // Outward-facing direction for label offset
  const labelOffset = useMemo(
    () => position.clone().normalize().multiplyScalar(0.18),
    [position]
  );

  useFrame(() => {
    if (!coreRef.current || !haloRef.current) return;
    const mat = coreRef.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = THREE.MathUtils.lerp(
      mat.emissiveIntensity,
      hovered ? 2.2 : 1.0,
      0.08
    );
    // Halo — scale pulse on hover
    const targetScale = hovered ? 1.5 : 1.0;
    haloRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.08
    );
  });

  // Label position = pin position shifted slightly outward
  const labelPos = useMemo(
    () => position.clone().add(labelOffset),
    [position, labelOffset]
  );

  return (
    <group>
      {/* Layer 1: Core bright dot */}
      <mesh
        ref={coreRef}
        position={position}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setHovered(true);
          onPinHover?.(pin);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          onPinHover?.(null);
          document.body.style.cursor = 'default';
        }}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onPinClick?.(pin);
        }}
      >
        <sphereGeometry args={[0.032, 12, 12]} />
        <meshStandardMaterial
          color={pin.accent}
          emissive={pin.accent}
          emissiveIntensity={1.0}
          toneMapped={false}
        />
      </mesh>

      {/* Layer 2: Soft glow halo */}
      <mesh ref={haloRef} position={position}>
        <sphereGeometry args={[0.068, 10, 10]} />
        <meshBasicMaterial
          color={pin.accent}
          transparent
          opacity={0.14}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Layer 4: Label pill — appears on hover */}
      {hovered && (
        <Html position={labelPos} center zIndexRange={[10, 20]} style={{ pointerEvents: 'none' }}>
          <div
            style={{
              background: 'rgba(2, 6, 23, 0.85)',
              backdropFilter: 'blur(10px)',
              border: `1px solid ${pin.accent}50`,
              borderRadius: '999px',
              padding: '3px 10px',
              whiteSpace: 'nowrap',
              boxShadow: `0 0 12px ${pin.accent}30`,
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 600, color: pin.accent }}>
              {pin.name}
            </span>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginLeft: '5px' }}>
              {pin.region}
            </span>
          </div>
        </Html>
      )}
    </group>
  );
};

export const Pins: React.FC<PinsProps> = ({
  radius = 2.0,
  pins = GLOBE_PINS,
  onPinClick,
  onPinHover,
}) => (
  <group>
    {pins.map((pin) => (
      <PinMesh
        key={pin.id}
        pin={pin}
        radius={radius}
        onPinClick={onPinClick}
        onPinHover={onPinHover}
      />
    ))}
  </group>
);

export default Pins;
