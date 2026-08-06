import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { Connection } from '@/store/useCircuitStore';
import { useCircuitStore } from '@/store/useCircuitStore';

// Wire color palette based on connection type
const WIRE_COLORS = [
  '#ff3333', // red
  '#3388ff', // blue
  '#33ff77', // green
  '#ffcc00', // yellow
  '#ff88cc', // pink
  '#00ffff', // cyan
  '#ff8800', // orange
];

interface WireProps {
  connection: Connection;
  index: number;
}

const Wire: React.FC<WireProps> = ({ connection, index }) => {
  const { pins, isPowered, components } = useCircuitStore();

  const fromPin = pins[connection.from];
  const toPin = pins[connection.to];

  const { points, color } = useMemo(() => {
    // Default positions if pins not registered yet
    const from = fromPin
      ? new THREE.Vector3(...fromPin.position)
      : new THREE.Vector3(0, 0, 0);
    const to = toPin
      ? new THREE.Vector3(...toPin.position)
      : new THREE.Vector3(1, 0, 0);

    // Create a smooth catmull-rom curve
    const mid = from.clone().lerp(to, 0.5);
    mid.y += 0.4; // arc up

    const curve = new THREE.CatmullRomCurve3([from, mid, to]);
    const pts = curve.getPoints(32);

    const wireColor = isPowered ? '#00e5ff' : WIRE_COLORS[index % WIRE_COLORS.length];

    return { points: pts, color: wireColor };
  }, [fromPin, toPin, index, isPowered]);

  if (!fromPin || !toPin) {
    // Still draw a placeholder wire using default positions
    return null;
  }

  // Build tube geometry from the curve points
  const from3 = new THREE.Vector3(...fromPin.position);
  const to3 = new THREE.Vector3(...toPin.position);
  const mid3 = from3.clone().lerp(to3, 0.5);
  mid3.y += 0.4;

  const curve = new THREE.CatmullRomCurve3([from3, mid3, to3]);
  const tubeGeometry = new THREE.TubeGeometry(curve, 24, 0.012, 6, false);

  const isLive = isPowered && connection.isLive;

  return (
    <>
      <mesh geometry={tubeGeometry}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isLive ? 1.2 : 0.2}
          roughness={0.3}
          metalness={0.1}
          transparent
          opacity={0.95}
        />
      </mesh>
      {/* Wire end caps */}
      <mesh position={from3}>
        <sphereGeometry args={[0.02, 6, 6]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} />
      </mesh>
      <mesh position={to3}>
        <sphereGeometry args={[0.02, 6, 6]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} />
      </mesh>
    </>
  );
};

// ─── WireLayer: renders all wires from the store ─────────────────────────────

export const WireLayer: React.FC = () => {
  const { connections } = useCircuitStore();

  return (
    <>
      {connections.map((conn, i) => (
        <Wire key={conn.id} connection={conn} index={i} />
      ))}
    </>
  );
};

// ─── WireInProgress: preview wire while user is connecting pins ───────────────

interface WireInProgressProps {
  fromPosition: [number, number, number];
  toPosition: [number, number, number];
}

export const WireInProgress: React.FC<WireInProgressProps> = ({ fromPosition, toPosition }) => {
  const from3 = new THREE.Vector3(...fromPosition);
  const to3 = new THREE.Vector3(...toPosition);
  const mid3 = from3.clone().lerp(to3, 0.5);
  mid3.y += 0.3;

  const curve = new THREE.CatmullRomCurve3([from3, mid3, to3]);
  const tubeGeometry = new THREE.TubeGeometry(curve, 16, 0.01, 6, false);

  return (
    <mesh geometry={tubeGeometry}>
      <meshStandardMaterial
        color="#00e5ff"
        emissive="#00e5ff"
        emissiveIntensity={1.5}
        transparent
        opacity={0.7}
      />
    </mesh>
  );
};

export default Wire;
