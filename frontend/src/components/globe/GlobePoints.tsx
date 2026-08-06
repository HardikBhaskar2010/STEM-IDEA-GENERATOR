/**
 * GlobePoints.tsx
 * Renders REAL country borders as a cloud of dots on a sphere.
 * Data source: world.geojson (D3-graph-gallery, Holtz)
 *
 * Strategy:
 *  1. Fetch the GeoJSON on mount (cached in memory after first load)
 *  2. Sample every border vertex of every country polygon
 *  3. Project lat/lng → XYZ on the sphere surface
 *  4. Render as additive-blended points with a soft circular texture
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { loadGeoJson } from '../../utils/loadGeoJson';
import { geoJsonToPoints } from '../../utils/geoToPoints';

/* -------------------------------------------------------------------------- */
/* Exported helper (re-used by Pins, Arcs, PulseWaves)                        */
/* -------------------------------------------------------------------------- */

export function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
     radius * Math.cos(phi),
     radius * Math.sin(phi) * Math.sin(theta)
  );
}

/* -------------------------------------------------------------------------- */
/* Circular glowing dot texture (generated once, discarded on unmount)        */
/* -------------------------------------------------------------------------- */

function createDotTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0,   'rgba(255, 255, 255, 1.0)');
  g.addColorStop(0.4, 'rgba(255, 255, 255, 0.9)');
  g.addColorStop(1,   'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(32, 32, 32, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

interface GlobePointsProps {
  radius?: number;
  color?: string;
  size?: number;
}

export const GlobePoints: React.FC<GlobePointsProps> = ({
  radius = 2.0,
  color = '#00e5ff',
  size = 0.018,
}) => {
  const [positions, setPositions] = useState<Float32Array | null>(null);
  const dotTexture = useMemo(() => createDotTexture(), []);
  const matColor = useMemo(() => new THREE.Color(color), [color]);

  /* Fetch real GeoJSON on mount */
  useEffect(() => {
    let cancelled = false;
    loadGeoJson()
      .then((geo) => {
        if (cancelled) {return;}
        setPositions(geoJsonToPoints(geo, radius));
      })
      .catch(console.error);
    return () => { cancelled = true; };
  }, [radius]);

  if (!positions) {return null;}

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        map={dotTexture}
        alphaTest={0.005}
        color={matColor}
        transparent
        opacity={0.95}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default GlobePoints;
