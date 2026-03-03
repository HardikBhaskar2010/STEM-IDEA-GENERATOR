/**
 * R3F Scene Background
 *
 * React Three Fiber 3D scene as background
 */

import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MeshDistortMaterial } from '@react-three/drei';
import { motion } from 'framer-motion';
import type { BackgroundEffectComponentProps, BackgroundEffect, EffectSettingsSchema } from '@/types/effects';
import { effectsRegistry } from '@/effects/core/EffectsRegistry';
import { cleanupThreeJS } from '@/lib/memoryManager';
import { useEffectOptimization } from '@/hooks/useEffectOptimization';
import { is3DEffectsSupported } from '@/lib/effectsCompatibility';
import { PHASE9_GPU_BASE_STYLE, shouldDisableHeavyEffects } from '@/effects/core/optimizationUtils';

const settingsSchema: EffectSettingsSchema = {
  geometry: {
    type: 'select',
    label: 'Geometry',
    defaultValue: 'sphere',
    options: [
      { value: 'sphere', label: 'Sphere' },
      { value: 'box', label: 'Box' },
      { value: 'torus', label: 'Torus' },
    ],
    description: 'Type of 3D geometry',
  },
  material: {
    type: 'select',
    label: 'Material',
    defaultValue: 'normal',
    options: [
      { value: 'normal', label: 'Normal' },
      { value: 'standard', label: 'Standard' },
    ],
    description: 'Material type',
  },
  rotationSpeed: {
    type: 'range',
    label: 'Rotation Speed',
    defaultValue: 0.01,
    min: 0,
    max: 0.1,
    step: 0.01,
    description: 'Speed of rotation',
  },
  distortSpeed: {
    type: 'range',
    label: 'Distortion Speed',
    defaultValue: 1,
    min: 0,
    max: 5,
    step: 0.5,
    description: 'Speed of mesh distortion',
  },
  color: {
    type: 'color',
    label: 'Color',
    defaultValue: '#a855f7',
    description: 'Geometry color',
  },
  opacity: {
    type: 'range',
    label: 'Opacity',
    defaultValue: 0.6,
    min: 0.1,
    max: 1,
    step: 0.1,
    description: 'Background opacity',
  },
};

function Scene({ geometry, material, rotationSpeed, distortSpeed, color }: any) {
  const { scene } = useThree();
  const meshRef = useRef<any>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x += rotationSpeed;
    meshRef.current.rotation.y += rotationSpeed * 1.35;
  });

  useEffect(() => {
    return () => {
      if (meshRef.current) {
        if (meshRef.current.geometry) {
          meshRef.current.geometry.dispose();
        }
        if (meshRef.current.material) {
          if (Array.isArray(meshRef.current.material)) {
            meshRef.current.material.forEach((mat: any) => mat.dispose());
          } else {
            meshRef.current.material.dispose();
          }
        }
      }
      cleanupThreeJS(scene);
    };
  }, [scene]);

  return (
    <mesh ref={meshRef}>
      {geometry === 'sphere' && <sphereGeometry args={[1, 32, 32]} />}
      {geometry === 'box' && <boxGeometry args={[1.5, 1.5, 1.5]} />}
      {geometry === 'torus' && <torusGeometry args={[1, 0.4, 16, 100]} />}
      
      {material === 'normal' ? (
        <meshNormalMaterial />
      ) : (
        <MeshDistortMaterial
          color={color}
          speed={distortSpeed}
          distort={0.4}
          radius={1}
        />
      )}
    </mesh>
  );
}

function R3FScene({ settings, isActive }: BackgroundEffectComponentProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const { flags, gpuStyle } = useEffectOptimization<HTMLDivElement>({ lazy: false });

  if (!isActive || !is3DEffectsSupported() || shouldDisableHeavyEffects(flags)) return null;

  const {
    geometry = 'sphere',
    material = 'normal',
    rotationSpeed = 0.01,
    distortSpeed = 1,
    color = '#a855f7',
    opacity = 0.6,
  } = settings || {};

  const dpr = useMemo(() => {
    if (flags.isLowEndDevice) return [1, 1.1] as [number, number];
    if (flags.isMobile) return [1, 1.5] as [number, number];
    return [1, 2] as [number, number];
  }, [flags.isLowEndDevice, flags.isMobile]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 -z-10"
      style={{ pointerEvents: 'none', ...PHASE9_GPU_BASE_STYLE, ...gpuStyle }}
      ref={canvasRef}
      data-testid="r3f-scene-background"
    >
      <Canvas
        dpr={dpr}
        frameloop={flags.reducedMotion ? 'demand' : 'always'}
        gl={{
          antialias: !flags.isLowEndDevice,
          alpha: true,
          powerPreference: flags.isLowEndDevice ? 'low-power' : 'high-performance',
        }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.45} />
          <pointLight position={[8, 8, 8]} intensity={1.1} />
          <Scene
            geometry={geometry}
            material={material}
            rotationSpeed={rotationSpeed}
            distortSpeed={distortSpeed}
            color={color}
          />
        </Suspense>
      </Canvas>
    </motion.div>
  );
}

const r3fSceneEffect: BackgroundEffect = {
  id: 'r3f-scene',
  name: 'R3F Scene',
  type: 'background',
  library: 'r3f',
  description: 'React Three Fiber 3D scene background',
  component: R3FScene,
  defaultSettings: {
    geometry: 'sphere',
    material: 'normal',
    rotationSpeed: 0.01,
    distortSpeed: 1,
    color: '#a855f7',
    opacity: 0.6,
  },
  settingsSchema,
  tags: ['3d', 'interactive', 'modern'],
  performanceModes: ['high'],
  heavyLoad: true,
};

effectsRegistry.register(r3fSceneEffect);

export default R3FScene;


