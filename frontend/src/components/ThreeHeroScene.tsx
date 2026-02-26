import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

interface ThreeHeroSceneProps {
  scrollProgressRef: React.MutableRefObject<number>;
  prefersReducedMotion: boolean;
}

/**
 * 3D Hero Scene with scroll-driven animations
 * Uses lerp for smooth camera/object movements
 * Respects reduced motion preferences
 */
export const ThreeHeroScene: React.FC<ThreeHeroSceneProps> = ({
  scrollProgressRef,
  prefersReducedMotion,
}) => {
  const { viewport } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  // Detect mobile for responsive object count
  const isMobile = viewport.width < 768;

  // Brand color palette
  const colors = {
    primary: '#8B5CF6',
    secondary: '#3B82F6',
    accent: '#EC4899',
    highlight: '#A78BFA',
    soft: '#C4B5FD',
  };

  // Generate scene objects with controlled positioning
  const sceneObjects = useMemo(() => {
    const objects: Array<{
      type: 'cube' | 'sphere' | 'torus';
      position: [number, number, number];
      scale: number;
      color: string;
      rotation: [number, number, number];
    }> = [];

    // Cubes - main building blocks
    const cubeCount = isMobile ? 4 : 6;
    const cubeColors = [colors.primary, colors.secondary, colors.accent, colors.highlight];
    
    for (let i = 0; i < cubeCount; i++) {
      const angle = (i / cubeCount) * Math.PI * 2;
      const radius = 3 + Math.random() * 2;
      objects.push({
        type: 'cube',
        position: [
          Math.cos(angle) * radius,
          (Math.random() - 0.5) * 3,
          Math.sin(angle) * radius - 2,
        ],
        scale: 0.4 + Math.random() * 0.4,
        color: cubeColors[i % cubeColors.length],
        rotation: [
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI,
        ],
      });
    }

    // Spheres - soft contrast
    const sphereCount = isMobile ? 2 : 3;
    const sphereColors = [colors.highlight, colors.soft, colors.primary];
    
    for (let i = 0; i < sphereCount; i++) {
      const angle = (i / sphereCount) * Math.PI * 2 + Math.PI / 3;
      const radius = 4 + Math.random() * 1.5;
      objects.push({
        type: 'sphere',
        position: [
          Math.cos(angle) * radius,
          (Math.random() - 0.5) * 2.5,
          Math.sin(angle) * radius - 3,
        ],
        scale: 0.3 + Math.random() * 0.3,
        color: sphereColors[i % sphereColors.length],
        rotation: [0, 0, 0],
      });
    }

    // Torus - depth cues
    if (!isMobile) {
      objects.push({
        type: 'torus',
        position: [-3, 1, -4],
        scale: 0.6,
        color: colors.accent,
        rotation: [Math.PI / 4, 0, Math.PI / 6],
      });
      
      objects.push({
        type: 'torus',
        position: [3.5, -1.5, -5],
        scale: 0.5,
        color: colors.secondary,
        rotation: [Math.PI / 3, Math.PI / 4, 0],
      });
    }

    return objects;
  }, [isMobile]);

  // Animation loop - ALL movement logic here
  useFrame((state) => {
    const progress = scrollProgressRef.current;
    const camera = cameraRef.current;
    const group = groupRef.current;

    if (!camera || !group) return;

    // If reduced motion is preferred, keep static positions
    if (prefersReducedMotion) {
      camera.position.z = 8;
      camera.position.y = 0;
      group.rotation.y = 0;
      return;
    }

    // LERP-BASED CAMERA MOVEMENT (smooth, no jitter)
    // Target positions based on scroll progress
    const targetCameraZ = 8 - progress * 3; // 8 → 5
    const targetCameraY = progress * 0.5; // 0 → 0.5
    const targetGroupRotationY = progress * 0.3 * Math.PI; // 0 → 54°

    // Apply smooth lerp (0.08 = premium smoothness)
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCameraZ, 0.08);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCameraY, 0.08);
    
    // Subtle camera tilt
    const targetCameraRotationX = -progress * 0.1;
    camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, targetCameraRotationX, 0.08);

    // Scene rotation with restraint
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, targetGroupRotationY, 0.08);

    // Subtle sine wave for X rotation (adds life)
    const targetGroupRotationX = Math.sin(state.clock.elapsedTime * 0.2) * 0.05;
    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, targetGroupRotationX, 0.05);

    // Individual object animations (controlled)
    group.children.forEach((child, index) => {
      if (child instanceof THREE.Mesh) {
        const baseRotationSpeed = 0.001 + (index * 0.0002);
        
        // Rotation (max 180° influence from scroll)
        const targetRotationY = child.userData.initialRotation.y + (progress * Math.PI);
        const targetRotationX = child.userData.initialRotation.x + (progress * Math.PI * 0.5);
        
        child.rotation.y = THREE.MathUtils.lerp(child.rotation.y, targetRotationY, 0.06);
        child.rotation.x = THREE.MathUtils.lerp(child.rotation.x, targetRotationX, 0.06);
        
        // Gentle continuous rotation
        child.rotation.z += baseRotationSpeed;

        // Scale breathing (±10% max)
        const breatheAmount = Math.sin(state.clock.elapsedTime * 0.5 + index) * 0.05;
        const targetScale = child.userData.initialScale * (1 + breatheAmount + progress * 0.1);
        const currentScale = child.scale.x;
        const newScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.06);
        child.scale.set(newScale, newScale, newScale);
      }
    });
  });

  return (
    <>
      {/* Camera with initial position */}
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        position={[0, 0, 8]}
        fov={50}
      />

      {/* Lighting setup - ambient + directional + accent */}
      <ambientLight intensity={0.4} color={colors.soft} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={0.8}
        color="#ffffff"
        castShadow={!isMobile}
        shadow-mapSize-width={isMobile ? 512 : 2048}
        shadow-mapSize-height={isMobile ? 512 : 2048}
      />
      <pointLight
        position={[-5, 3, -2]}
        intensity={0.5}
        color={colors.accent}
        distance={10}
      />
      <pointLight
        position={[5, -3, -2]}
        intensity={0.4}
        color={colors.secondary}
        distance={8}
      />

      {/* Scene group - contains all objects */}
      <group ref={groupRef}>
        {sceneObjects.map((obj, index) => {
          const key = `${obj.type}-${index}`;
          
          // Common material properties
          const materialProps = {
            color: obj.color,
            metalness: obj.type === 'cube' ? 0.3 : 0.1,
            roughness: obj.type === 'cube' ? 0.4 : 0.2,
            emissive: obj.color,
            emissiveIntensity: 0.1,
          };

          return (
            <mesh
              key={key}
              position={obj.position}
              rotation={obj.rotation}
              scale={obj.scale}
              castShadow={!isMobile}
              receiveShadow={!isMobile}
              userData={{
                initialScale: obj.scale,
                initialRotation: { x: obj.rotation[0], y: obj.rotation[1], z: obj.rotation[2] },
              }}
            >
              {obj.type === 'cube' && <boxGeometry args={[1, 1, 1]} />}
              {obj.type === 'sphere' && <sphereGeometry args={[1, 32, 32]} />}
              {obj.type === 'torus' && <torusGeometry args={[1, 0.4, 16, 32]} />}
              <meshStandardMaterial
                {...materialProps}
                transparent={obj.type === 'torus'}
                opacity={obj.type === 'torus' ? 0.6 : 1}
              />
            </mesh>
          );
        })}
      </group>

      {/* Fog for depth */}
      <fog attach="fog" args={['#000000', 5, 15]} />
    </>
  );
};


