/**
 * GridLines.tsx
 * Renders latitude and longitude rings as a subtle tech-grid overlay.
 * Lat rings = horizontal circles; lng rings = vertical great circles.
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';

interface GridLinesProps {
  radius?: number;
  latCount?: number;
  lngCount?: number;
  color?: string;
  opacity?: number;
}

export const GridLines: React.FC<GridLinesProps> = ({
  radius = 2.02,       // slightly outside the dot sphere
  latCount = 9,
  lngCount = 12,
  color = '#4444ff',
  opacity = 0.12,
}) => {
  const lineSegments = useMemo(() => {
    const segments: React.ReactElement[] = [];
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    // ── Latitude rings ──────────────────────────────────────────────────────
    for (let i = 1; i < latCount; i++) {
      const lat = -90 + (180 / latCount) * i;       // avoid poles
      const phi = (90 - lat) * (Math.PI / 180);
      const y = radius * Math.cos(phi);
      const r = radius * Math.sin(phi);

      const pts: THREE.Vector3[] = [];
      const STEPS = 64;
      for (let s = 0; s <= STEPS; s++) {
        const theta = (s / STEPS) * Math.PI * 2;
        pts.push(new THREE.Vector3(r * Math.cos(theta), y, r * Math.sin(theta)));
      }

      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      segments.push(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <primitive key={`lat-${i}`} object={new THREE.Line(geo, mat)} />
      );
    }

    // ── Longitude rings (great circles) ────────────────────────────────────
    for (let j = 0; j < lngCount; j++) {
      const lng = (360 / lngCount) * j;
      const theta = lng * (Math.PI / 180);

      const pts: THREE.Vector3[] = [];
      const STEPS = 64;
      for (let s = 0; s <= STEPS; s++) {
        const phi = (s / STEPS) * Math.PI;
        pts.push(
          new THREE.Vector3(
            radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.cos(phi),
            radius * Math.sin(phi) * Math.sin(theta)
          )
        );
      }

      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      segments.push(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <primitive key={`lng-${j}`} object={new THREE.Line(geo, mat)} />
      );
    }

    return segments;
  }, [radius, latCount, lngCount, color, opacity]);

  return <group>{lineSegments}</group>;
};

export default GridLines;
