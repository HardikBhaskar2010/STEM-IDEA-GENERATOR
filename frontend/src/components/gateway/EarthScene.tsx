import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, useGLTF } from "@react-three/drei";
import * as THREE from "three";

/**
 * Placeholder spinning sphere that mimics an Earth.
 * To use your own .glb model:
 * 1. Place your file in public/models/earth.glb
 * 2. Uncomment the EarthModel component below
 * 3. Replace <PlaceholderEarth /> with <EarthModel /> in the Scene
 */
// ─── Updated to load planet.glb ───
const EarthModel = () => {
  const { scene } = useGLTF("/planet.glb");
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.15;
  });
  return <primitive ref={ref} object={scene} scale={2} />;
};

const GlowRing = () => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z += delta * 0.1;
  });

  return (
    <mesh ref={ref} rotation={[Math.PI / 3, 0, 0]}>
      <torusGeometry args={[2.6, 0.015, 16, 100]} />
      <meshBasicMaterial color="#a78bfa" transparent opacity={0.5} />
    </mesh>
  );
};

const Scene = () => (
  <>
    <ambientLight intensity={0.3} />
    <pointLight position={[10, 10, 10]} intensity={1.5} color="#a78bfa" />
    <pointLight position={[-10, -5, 5]} intensity={0.8} color="#3b82f6" />
    <Stars radius={50} depth={40} count={1500} factor={3} saturation={0.5} fade speed={1} />
    <EarthModel />
    {/* Wireframe placeholder removed in favor of GLB model */}
    <GlowRing />
    <OrbitControls
      enableZoom={false}
      enablePan={false}
      autoRotate
      autoRotateSpeed={0.5}
      minPolarAngle={Math.PI / 3}
      maxPolarAngle={Math.PI / 1.5}
    />
  </>
);

const EarthScene = () => {
  return (
    <div className="w-full h-[500px] sm:h-[600px] relative">
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default EarthScene;
