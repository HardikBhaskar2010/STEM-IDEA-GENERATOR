import React, { Suspense, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { Component3D } from './Component3D';
import { WireLayer } from './Wire';
import { useCircuitStore } from '@/store/useCircuitStore';
import { Move, RotateCcw, Maximize2, MousePointer2 } from 'lucide-react';

// ─── Infinite Grid Floor ─────────────────────────────────────────────────────

function GridFloor() {
  return (
    <>
      {/* Main grid */}
      <Grid
        args={[40, 40]}
        position={[0, -0.01, 0]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#1a4a4a"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#00e5ff"
        fadeDistance={30}
        fadeStrength={1}
        infiniteGrid
      />
      {/* Ground plane (subtle) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#050a0f" transparent opacity={0.95} />
      </mesh>
    </>
  );
}

// ─── Ambient neon fog ─────────────────────────────────────────────────────────

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={1.5} color="#ffffff" />
      <directionalLight
        position={[10, 15, 10]}
        intensity={2.5}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      {/* Backlight to show details */}
      <directionalLight
        position={[-10, 5, -10]}
        intensity={1.0}
        color="#aaccff"
      />
      {/* Neon cyan fill */}
      <pointLight position={[-4, 3, -2]} intensity={2.0} color="#00e5ff" distance={20} />
      {/* Neon purple fill */}
      <pointLight position={[4, 2, 4]} intensity={1.5} color="#bb00ff" distance={15} />
      {/* Warm top key light */}
      <pointLight position={[0, 8, 0]} intensity={1.5} color="#ffffff" distance={25} />
    </>
  );
}

// ─── Stars background ─────────────────────────────────────────────────────────

function StarField() {
  return (
    <Stars
      radius={80}
      depth={50}
      count={3000}
      factor={3}
      saturation={0.5}
      fade
      speed={0.3}
    />
  );
}

// ─── Scene content ────────────────────────────────────────────────────────────

function SceneContent() {
  const { components } = useCircuitStore();

  return (
    <>
      <SceneLighting />
      <GridFloor />
      <StarField />

      {/* Render all placed components */}
      <Suspense fallback={null}>
        {components.map((comp) => (
          <Component3D key={comp.id} comp={comp} />
        ))}
      </Suspense>

      {/* Render all wires */}
      <WireLayer />
    </>
  );
}

// ─── Camera controller ────────────────────────────────────────────────────────

function CameraSetup() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 5, 8);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  return null;
}

// ─── Main PlaygroundScene ─────────────────────────────────────────────────────

interface PlaygroundSceneProps {
  className?: string;
}

export const PlaygroundScene: React.FC<PlaygroundSceneProps> = ({ className }) => {
  const { setSelectedComponentId, transformMode, setTransformMode } = useCircuitStore();

  const Toolbar = () => (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 transition-all hover:border-cyan-500/30">
      {[
        { id: null, icon: MousePointer2, label: 'Select' },
        { id: 'translate', icon: Move, label: 'Move (G)' },
        { id: 'rotate', icon: RotateCcw, label: 'Rotate (R)' },
        { id: 'scale', icon: Maximize2, label: 'Scale (S)' },
      ].map((btn) => (
        <button
          key={btn.label}
          onClick={() => setTransformMode(btn.id as any)}
          className={`group relative p-2.5 rounded-xl transition-all ${
            transformMode === btn.id
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
          }`}
          title={btn.label}
        >
          <btn.icon size={18} className={transformMode === btn.id ? 'scale-110' : 'scale-100'} />
          <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 text-[10px] text-white rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none border border-white/10 transition-opacity">
            {btn.label}
          </span>
        </button>
      ))}
      <div className="w-[1px] h-6 bg-white/10 mx-1" />
      <div className="px-3 py-1 flex flex-col">
        <span className="text-[9px] font-bold text-cyan-400/80 uppercase tracking-tighter italic">Edit Mode</span>
        <span className="text-[10px] text-gray-500 font-mono lowercase">autocad v1.0</span>
      </div>
    </div>
  );

  return (
    <div className={`relative w-full h-full ${className ?? ''}`}>
      <Canvas
        shadows
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false,
        }}
        dpr={[1, 1.5]}
        camera={{ fov: 55, near: 0.1, far: 200 }}
        style={{ background: 'linear-gradient(to bottom, #020810 0%, #050a18 100%)' }}
        onPointerMissed={() => setSelectedComponentId(null)}
      >
        <CameraSetup />

        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>

        <OrbitControls
          makeDefault
          enabled={!transformMode}
          enableDamping
          dampingFactor={0.06}
          minDistance={2}
          maxDistance={30}
          maxPolarAngle={Math.PI / 2.05}
          rotateSpeed={0.7}
          zoomSpeed={0.8}
        />
      </Canvas>

      {/* Overlay: corner labels */}
      <div className="absolute top-3 left-3 pointer-events-none">
        <span className="text-cyan-400/50 text-xs font-mono">3D WORKSPACE</span>
      </div>

      <Toolbar />
    </div>
  );
};

export default PlaygroundScene;
