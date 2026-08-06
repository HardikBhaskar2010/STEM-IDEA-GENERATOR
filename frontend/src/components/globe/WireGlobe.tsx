/**
 * WireGlobe.tsx
 * 🌍 The main globe component — composes all layers:
 *   GlobePoints → GridLines → Starfield → Pins → PulseWaves → Arcs → Atmosphere
 *
 * Exposes clean props for Framer / parent control.
 */

import React, { useRef, useState, Suspense, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer, RenderPass, UnrealBloomPass } from 'three-stdlib';

import { GlobePoints } from './GlobePoints';
import { GridLines } from './GridLines';
import { Starfield } from './Starfield';
import { Pins } from './Pins';
import { PulseWaves } from './PulseWaves';
import { Arcs } from './Arcs';
import { PinInfoCard } from './PinInfoCard';
import type { GlobePin } from './globePins';
import { GLOBE_PINS } from './globePins';
import { latLngToVec3 } from './GlobePoints';

/* -------------------------------------------------------------------------- */
/* Stable Post-Processing Bloom */
/* -------------------------------------------------------------------------- */

const CustomEffects = () => {
  const { gl, scene, camera, size } = useThree();
  const composer = useMemo(() => {
    const comp = new EffectComposer(gl);
    const renderPass = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(size.width, size.height), 1.5, 0.8, 0.2);
    comp.addPass(renderPass);
    comp.addPass(bloomPass);
    return comp;
  }, [gl, scene, camera, size]);

  useEffect(() => {
    composer.setSize(size.width, size.height);
  }, [composer, size]);

  useFrame(() => composer.render(), 1);
  return null;
};

/* -------------------------------------------------------------------------- */
/* Atmosphere glow shell — 3 layers for depth */
/* -------------------------------------------------------------------------- */

const GlobeAtmosphere: React.FC<{ radius?: number }> = ({ radius = 2.0 }) => (
  <>
    {/* Layer 1: bright inner rim */}
    <mesh>
      <sphereGeometry args={[radius * 1.02, 32, 32]} />
      <meshBasicMaterial
        color="#4f7cff"
        transparent
        opacity={0.07}
        side={THREE.BackSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
    {/* Layer 2: mid glow */}
    <mesh>
      <sphereGeometry args={[radius * 1.09, 32, 32]} />
      <meshBasicMaterial
        color="#3b82f6"
        transparent
        opacity={0.045}
        side={THREE.BackSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
    {/* Layer 3: wide halo */}
    <mesh>
      <sphereGeometry args={[radius * 1.18, 32, 32]} />
      <meshBasicMaterial
        color="#6366f1"
        transparent
        opacity={0.022}
        side={THREE.BackSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  </>
);

/* -------------------------------------------------------------------------- */
/* Subtle wireframe grid shell */
/* -------------------------------------------------------------------------- */

const WireGrid: React.FC<{ radius?: number }> = ({ radius = 2.0 }) => (
  <mesh>
    <sphereGeometry args={[radius * 1.005, 36, 36]} />
    <meshBasicMaterial
      wireframe
      color="#1e3a8a"
      transparent
      opacity={0.12}
      depthWrite={false}
    />
  </mesh>
);

/* -------------------------------------------------------------------------- */
/* Auto-rotation wrapper (so the globe slowly spins) */
/* -------------------------------------------------------------------------- */

const RotatingGlobe: React.FC<{
  children: React.ReactNode;
  rotationSpeed: number;
  paused: boolean;
}> = ({ children, rotationSpeed, paused }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current && !paused) {
      groupRef.current.rotation.y += rotationSpeed * delta;
    }
  });

  return <group ref={groupRef}>{children}</group>;
};

/* -------------------------------------------------------------------------- */
/* Globe scene (all Three.js content goes here) */
/* -------------------------------------------------------------------------- */

const GLOBE_RADIUS = 2.0;

interface GlobeSceneProps {
  rotationSpeed: number;
  glowIntensity: number;
  pins: GlobePin[];
  showGrid: boolean;
  showStars: boolean;
  enableInteraction: boolean;
  onPinClick: (pin: GlobePin) => void;
  onPinHover: (pin: GlobePin | null) => void;
  isDragging: boolean;
  activePin: GlobePin | null;
  lineRef: React.RefObject<SVGLineElement>;
}

const GlobeScene: React.FC<GlobeSceneProps> = ({
  rotationSpeed,
  pins,
  showGrid,
  showStars,
  enableInteraction,
  onPinClick,
  onPinHover,
  isDragging,
  activePin,
  lineRef,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const targetQuaternion = useRef(new THREE.Quaternion());

  useEffect(() => {
    if (activePin) {
      // Find local position of pin
      const pos = latLngToVec3(activePin.lat, activePin.lng, 1).normalize();
      // We want to bring the pin to face the camera (which is +Z)
      const targetDir = new THREE.Vector3(0, 0, 1);
      // Construct rotation quaternion to move pos -> targetDir
      const q = new THREE.Quaternion().setFromUnitVectors(pos, targetDir);
      targetQuaternion.current.copy(q);
    }
  }, [activePin]);

  useFrame(({ camera, size }, delta) => {
    if (!groupRef.current) {return;}

    if (activePin) {
      // Smoothly rotate the targeted pin to the front
      groupRef.current.quaternion.slerp(targetQuaternion.current, 0.04);
    } else {
      // Smoothly level the globe back to upright
      const currentEuler = new THREE.Euler().setFromQuaternion(groupRef.current.quaternion, 'YXZ');
      const uprightTarget = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, currentEuler.y, 0, 'YXZ'));
      groupRef.current.quaternion.slerp(uprightTarget, 0.04);

      if (!isDragging) {
        // Continue spinning on global Y-axis
        groupRef.current.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), rotationSpeed * delta);
      }
    }

    // Dynamic Leader Line projection
    if (activePin && lineRef.current) {
      const pos = latLngToVec3(activePin.lat, activePin.lng, GLOBE_RADIUS);
      // Project 3D vector -> 2D screen NDC
      pos.applyMatrix4(groupRef.current.matrixWorld);
      pos.project(camera);

      // Convert NDC to pixel coordinates
      const x = (pos.x * 0.5 + 0.5) * size.width;
      const y = (pos.y * -0.5 + 0.5) * size.height;

      lineRef.current.setAttribute('x1', String(x));
      lineRef.current.setAttribute('y1', String(y));
      lineRef.current.setAttribute('x2', String(size.width / 2));
      // target line exactly above the card (approx 210px from bottom)
      lineRef.current.setAttribute('y2', String(size.height - 210)); 
    }
  });

  return (
    <>
      {/* Strict WebGL Background (so mix-blend-mode ignores the HTML wrapper) */}
      <color attach="background" args={['#000000']} />

      {/* Lighting */}
      <ambientLight intensity={0.12} />
      <pointLight position={[10, 8, 6]} color="#4466ff" intensity={0.5} distance={30} />
      <pointLight position={[-8, -6, -4]} color="#8b5cf6" intensity={0.3} distance={25} />

      {/* Depth fog — blends globe into background */}
      <fog attach="fog" args={['#020617', 4, 12]} />

      {/* Layer 1: Starfield */}
      {showStars && <Starfield count={3000} spread={80} />}

      <group ref={groupRef}>
        {/* Layer 2: Atmosphere glow */}
        <GlobeAtmosphere radius={GLOBE_RADIUS} />

        {/* Layer 3: Continent dots — color matched to UI purple/blue palette */}
        <GlobePoints radius={GLOBE_RADIUS} color="#7dd3fc" size={0.016} />

        {/* Layer 4: Wireframe grid */}
        {showGrid && <WireGrid radius={GLOBE_RADIUS} />}

        {/* Layer 5: Arc trails */}
        <Arcs radius={GLOBE_RADIUS} pins={pins} />

        {/* Layer 6: Pulse waves */}
        <PulseWaves radius={GLOBE_RADIUS} pins={pins} wavesPerPin={2} />

        {/* Layer 7: Pins */}
        {enableInteraction && (
          <Pins
            radius={GLOBE_RADIUS}
            pins={pins}
            onPinClick={onPinClick}
            onPinHover={onPinHover}
          />
        )}
      </group>

      <CustomEffects />
    </>
  );
};

/* -------------------------------------------------------------------------- */
/* Public component */
/* -------------------------------------------------------------------------- */

export interface WireGlobeProps {
  rotationSpeed?: number;
  glowIntensity?: number;
  pins?: GlobePin[];
  showGrid?: boolean;
  showStars?: boolean;
  enableInteraction?: boolean;
  className?: string;
  height?: string;
}

export const WireGlobe: React.FC<WireGlobeProps> = ({
  rotationSpeed = 0.06,
  glowIntensity = 1,
  pins = GLOBE_PINS,
  showGrid = false,  // Hidden by default to match reference image
  showStars = true,
  enableInteraction = true,
  className = '',
  height = '600px',
}) => {
  const [activePin, setActivePin] = useState<GlobePin | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const svgLineRef = useRef<SVGLineElement>(null);

  const handlePinClick = (pin: GlobePin) => {
    setActivePin((prev) => (prev?.id === pin.id ? null : pin));
  };

  return (
    <div
      className={`relative globe-canvas-wrapper ${className}`}
      style={{ height, width: '100%' }}
    >
      <style>{`
        .globe-canvas-wrapper canvas {
          mix-blend-mode: lighten !important;
        }
      `}</style>
      
      {/* Dynamic leader line linking node to card */}
      {activePin && (
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
          <line
            ref={svgLineRef}
            x1="0" y1="0" x2="0" y2="0"
            stroke={activePin.accent}
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.6"
            className="animate-pulse"
          />
        </svg>
      )}

      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onPointerDown={() => setIsDragging(true)}
        onPointerUp={() => setIsDragging(false)}
      >
        <Suspense fallback={null}>
          <GlobeScene
            rotationSpeed={rotationSpeed}
            glowIntensity={glowIntensity}
            pins={pins}
            showGrid={showGrid}
            showStars={showStars}
            enableInteraction={enableInteraction}
            onPinClick={handlePinClick}
            onPinHover={() => {}}
            isDragging={isDragging}
            activePin={activePin}
            lineRef={svgLineRef}
          />
        </Suspense>

        <CustomEffects />

        {/* Drag to rotate */}
        {enableInteraction && (
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            rotateSpeed={0.5}
            dampingFactor={0.06}
            enableDamping
          />
        )}
      </Canvas>

      {/* Pin info card — DOM overlay */}
      {enableInteraction && (
        <PinInfoCard pin={activePin} onClose={() => setActivePin(null)} />
      )}
    </div>
  );
};

export default WireGlobe;
