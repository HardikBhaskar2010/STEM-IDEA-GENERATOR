/**
 * Arcs.tsx
 * Animated arc trails between connected pins.
 * Each arc is a CatmullRomCurve3 lifted above the globe surface.
 * A dash-flow effect is achieved by animating dashOffset on LineDashedMaterial.
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { latLngToVec3 } from './GlobePoints';
import { GLOBE_PINS, GlobePin } from './globePins';

interface ArcProps {
  from: THREE.Vector3;
  to: THREE.Vector3;
  color: string;
  speed?: number;
}

const Arc: React.FC<ArcProps> = ({ from, to, color, speed = 0.4 }) => {
  const lineRef = useRef<THREE.Line>(null);

  const { curve, points } = useMemo(() => {
    // Midpoint lifted slightly above sphere for a graceful arc
    const mid = from.clone().add(to).multiplyScalar(0.5).normalize().multiplyScalar(
      from.length() + 0.35 + from.distanceTo(to) * 0.15
    );
    const curve = new THREE.CatmullRomCurve3([from, mid, to], false, 'catmullrom', 0.4);
    const points = curve.getPoints(60);
    return { curve, points };
  }, [from, to]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    geo.computeBoundingSphere();
    return geo;
  }, [points]);

  const material = useMemo(
    () =>
      new THREE.LineDashedMaterial({
        color,
        dashSize: 0.15,
        gapSize: 0.1,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [color]
  );

  useFrame((_, delta) => {
    if (lineRef.current) {
      const mat = lineRef.current.material as THREE.LineDashedMaterial;
      mat.dashOffset -= speed * delta;
    }
  });

  return (
    <line ref={lineRef} geometry={geometry} material={material} onUpdate={(self) => self.computeLineDistances()} />
  );
};

interface ArcsProps {
  radius?: number;
  pins?: GlobePin[];
}

export const Arcs: React.FC<ArcsProps> = ({
  radius = 2.0,
  pins = GLOBE_PINS,
}) => {
  const arcs = useMemo(() => {
    const pinMap = new Map<string, GlobePin>(pins.map((p) => [p.id, p]));
    const rendered = new Set<string>();
    const result: Array<{ key: string; from: THREE.Vector3; to: THREE.Vector3; color: string }> = [];

    pins.forEach((pin) => {
      (pin.connectsTo ?? []).forEach((targetId) => {
        const pairKey = [pin.id, targetId].sort().join('--');
        if (rendered.has(pairKey)) return;
        rendered.add(pairKey);

        const target = pinMap.get(targetId);
        if (!target) return;

        result.push({
          key: pairKey,
          from: latLngToVec3(pin.lat, pin.lng, radius),
          to: latLngToVec3(target.lat, target.lng, radius),
          color: pin.accent,
        });
      });
    });

    return result;
  }, [pins, radius]);

  return (
    <group>
      {arcs.map((arc) => (
        <Arc key={arc.key} from={arc.from} to={arc.to} color={arc.color} />
      ))}
    </group>
  );
};

export default Arcs;
