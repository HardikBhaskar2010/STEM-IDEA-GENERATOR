/**
 * ThreeHero.tsx — react-three-fiber scene for the STEM Idea Adventure hero.
 *
 * Features:
 *  • Loads `/public/models/planet.glb` via useGLTF (drei).
 *  • Exposes `setCameraFromProgress(p: 0→1)` API via `useImperativeHandle`
 *    so a parent scroll controller (GSAP or Framer) can drive camera directly.
 *  • Renders floating STEM-themed geometry (torus, octahedra) as debris.
 *  • Auto-spins the planet; orbit is locked if orbitEnabled = false.
 *  • Guards: disables on hardwareConcurrency < 4 OR deviceMemory < 4.
 *
 * TODO: Replace '/public/models/planet.glb' with your actual asset.
 *       See three/README.md for naming conventions and LOD guidance.
 *
 * Dependencies (add to package.json):
 *   three @react-three/fiber @react-three/drei
 */

import React, {
  useRef,
  useImperativeHandle,
  forwardRef,
  Suspense,
  useMemo,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, OrbitControls, Stars, Float } from '@react-three/drei';
import * as THREE from 'three';

// ─── Device capability guard ──────────────────────────────────────────────────
function deviceSupports3D(): boolean {
  if (typeof navigator === 'undefined') {return false;}
  const cores = navigator.hardwareConcurrency ?? 2;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memory = (navigator as any).deviceMemory ?? 4;
  // Allow on anything with at least 2 cores and 2 GB RAM.
  // The Canvas itself uses dpr=[1,1.5] cap so it stays performant.
  return cores >= 2 && memory >= 2;
}


// ─── Camera controller (imperative) ──────────────────────────────────────────
export interface ThreeHeroHandle {
  /** Drive camera from normalised scroll progress 0 → 1. */
  setCameraFromProgress: (progress: number) => void;
}

/**
 * CameraRig handles smooth camera interpolation driven by external progress.
 * Camera path: Z 8 → 2, Y 2 → 0 (cinematic fly-in).
 */
const CameraRig = forwardRef<ThreeHeroHandle>((_, ref) => {
  const { camera } = useThree();
  const targetRef = useRef({ x: 0, y: 2, z: 8 });

  useImperativeHandle(ref, () => ({
    setCameraFromProgress(p: number) {
      const clamped = Math.max(0, Math.min(1, p));
      // Lerp from start to end position
      targetRef.current.z = THREE.MathUtils.lerp(8, 2, clamped);
      targetRef.current.y = THREE.MathUtils.lerp(2, 0, clamped);
    },
  }));

  useFrame(() => {
    // Smooth damp toward target — decoupled from scroll frequency
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetRef.current.x, 0.04);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetRef.current.y, 0.04);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetRef.current.z, 0.04);
    camera.lookAt(0, 0, 0);
  });

  return null;
});
CameraRig.displayName = 'CameraRig';

// ─── Procedural planet (always works — no asset required) ────────────────────
const ProceduralPlanet = React.forwardRef<THREE.Group>((_, ref) => (
  <group ref={ref}>
    {/* Core sphere */}
    <mesh castShadow receiveShadow>
      <sphereGeometry args={[1.6, 64, 64]} />
      <meshStandardMaterial
        color="#1e1b4b"
        roughness={0.7}
        metalness={0.4}
        emissive={new THREE.Color('#3730a3')}
        emissiveIntensity={0.3}
      />
    </mesh>
    {/* Outer atmospheric glow */}
    <mesh>
      <sphereGeometry args={[1.72, 32, 32]} />
      <meshStandardMaterial
        color="#6366f1"
        transparent
        opacity={0.08}
        roughness={1}
        side={THREE.BackSide}
      />
    </mesh>
    {/* Accent ring */}
    <mesh rotation={[Math.PI * 0.4, 0, 0]}>
      <torusGeometry args={[2.6, 0.08, 8, 100]} />
      <meshStandardMaterial
        color="#22d3ee"
        emissive={new THREE.Color('#22d3ee')}
        emissiveIntensity={0.6}
        transparent
        opacity={0.7}
      />
    </mesh>
    {/* Second thinner ring */}
    <mesh rotation={[Math.PI * 0.35, Math.PI * 0.1, 0]}>
      <torusGeometry args={[2.2, 0.03, 8, 100]} />
      <meshStandardMaterial
        color="#a855f7"
        emissive={new THREE.Color('#a855f7')}
        emissiveIntensity={0.5}
        transparent
        opacity={0.5}
      />
    </mesh>
  </group>
));
ProceduralPlanet.displayName = 'ProceduralPlanet';

// ─── GLB loader — only mount this when the file actually exists ───────────────
// Hooks are called at the top level unconditionally — React rules satisfied.
const PlanetFromGLB: React.FC<{ path: string; groupRef: React.RefObject<THREE.Group> }> = ({
  path,
  groupRef,
}) => {
  const { scene } = useGLTF(path);
  return (
    <group ref={groupRef} scale={1.8}>
      <primitive object={scene} />
    </group>
  );
};

// ─── Tiny error boundary — catches "Failed to load" from useGLTF ─────────────
interface EBState { failed: boolean }
class PlanetErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  EBState
> {
  state: EBState = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

// ─── Planet — picks GLB or procedural depending on what's available ───────────
const Planet: React.FC<{ glbPath?: string }> = ({ glbPath }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.08;
    }
  });

  const procedural = <ProceduralPlanet ref={groupRef} />;

  // If no GLB path provided, always show procedural planet.
  // TODO: set glbPath="/models/planet.glb" once you drop the file in public/models/.
  if (!glbPath) {return procedural;}

  return (
    <PlanetErrorBoundary fallback={procedural}>
      <Suspense fallback={procedural}>
        <PlanetFromGLB path={glbPath} groupRef={groupRef} />
      </Suspense>
    </PlanetErrorBoundary>
  );
};

// ─── Floating STEM debris ─────────────────────────────────────────────────────
const FloatingDebris: React.FC = () => {
  const pieces = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        id: i,
        position: [
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 8 - 2,
        ] as [number, number, number],
        color: ['#a855f7', '#3b82f6', '#22d3ee', '#6366f1'][i % 4],
        scale: 0.08 + Math.random() * 0.14,
        speed: 0.3 + Math.random() * 0.4,
      })),
    []
  );

  return (
    <>
      {pieces.map((p) => (
        <Float
          key={p.id}
          speed={p.speed}
          rotationIntensity={0.6}
          floatIntensity={0.5}
          position={p.position}
        >
          <mesh scale={p.scale} castShadow>
            {p.id % 2 === 0 ? (
              <octahedronGeometry args={[1, 0]} />
            ) : (
              <torusGeometry args={[1, 0.35, 8, 12]} />
            )}
            <meshStandardMaterial
              color={p.color}
              emissive={new THREE.Color(p.color)}
              emissiveIntensity={0.8}
              roughness={0.2}
              metalness={0.6}
              transparent
              opacity={0.85}
            />
          </mesh>
        </Float>
      ))}
    </>
  );
};

// ─── Main exported component ──────────────────────────────────────────────────

// Stable module-level config objects — same reference on every render,
// so R3F never sees them as "changed" and never rebuilds the camera / GL context.
const CAMERA_CONFIG = { position: [0, 2, 8] as [number, number, number], fov: 55 };
const GL_CONFIG = { antialias: true, powerPreference: 'high-performance' as const };

export interface ThreeHeroProps {
  /**
   * Optional path to a GLB planet model (e.g. "/models/planet.glb").
   * If omitted or the file doesn't exist, a procedural planet is shown instead.
   * TODO: Set this prop once you drop a GLB in public/models/.
   */
  glbPath?: string;
  orbitEnabled?: boolean;
  className?: string;
}

const ThreeHero = forwardRef<ThreeHeroHandle, ThreeHeroProps>(
  ({ glbPath, orbitEnabled = false, className = '' }, ref) => {
    if (!deviceSupports3D()) {
      return null;
    }

    return (
      <div className={`${className}`} aria-hidden="true">
        <Canvas
          shadows
          camera={CAMERA_CONFIG}
          gl={GL_CONFIG}
          dpr={[1, 1.5]}
          frameloop="demand"
          style={{ background: 'transparent' }}
        >
          {/* Lighting */}
          <ambientLight intensity={0.3} />
          <directionalLight
            position={[5, 8, 5]}
            intensity={1.2}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <pointLight position={[-4, 2, 2]} color="#a855f7" intensity={2} distance={12} />
          <pointLight position={[4, -2, 1]} color="#22d3ee" intensity={1.5} distance={10} />

          {/* Background stars */}
          <Stars radius={80} depth={50} count={3000} factor={4} saturation={0.5} fade speed={0.3} />

          {/* Camera controller */}
          <CameraRig ref={ref} />

          {/* Planet + debris — no extra Suspense needed; Planet handles its own */}
          <Planet glbPath={glbPath} />
          <Suspense fallback={null}>
            <FloatingDebris />
          </Suspense>

          {orbitEnabled && (
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              maxPolarAngle={Math.PI * 0.65}
              minPolarAngle={Math.PI * 0.35}
            />
          )}
        </Canvas>
      </div>
    );
  }
);

ThreeHero.displayName = 'ThreeHero';

export default React.memo(ThreeHero);

