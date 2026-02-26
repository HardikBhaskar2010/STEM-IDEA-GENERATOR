import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

interface ThreeHeroSceneProps {
  scrollProgressRef: React.MutableRefObject<number>;
  prefersReducedMotion: boolean;
  hoveredNodeId: string | null;
  selectedNodeId: string | null;
  focusedNodeId: string | null;
  onNodeHover: (id: string | null) => void;
  onNodeClick: (id: string | null) => void;
  onNodeFocus: (id: string | null) => void;
}

interface FeatureNode {
  id: string;
  type: 'cube' | 'sphere' | 'torus';
  position: [number, number, number];
  scale: number;
  color: string;
  rotation: [number, number, number];
  arcAngle: number;
}

export const ThreeHeroScene: React.FC<ThreeHeroSceneProps> = ({
  scrollProgressRef,
  prefersReducedMotion,
  hoveredNodeId,
  selectedNodeId,
  focusedNodeId,
  onNodeHover,
  onNodeClick,
  onNodeFocus,
}) => {
  const { viewport, raycaster, camera, pointer } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const orbitGroupRef = useRef<THREE.Group>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const neuralPathRef = useRef<THREE.Mesh>(null);

  const hoveredMeshRef = useRef<THREE.Mesh | null>(null);
  const focusedNodeRef = useRef<string | null>(null);

  const isMobile = viewport.width < 768;

  const colors = {
    primary: '#8B5CF6',
    secondary: '#3B82F6',
    accent: '#EC4899',
    highlight: '#A78BFA',
    soft: '#C4B5FD',
  };

  const orbitRadius = isMobile ? 2.5 : 3;
  const arcSpread = isMobile ? Math.PI / 2 : (Math.PI * 2) / 3;

  const interactiveNodeIds = [
    'core-engine',
    'component-system',
    'learning-sphere',
    'innovation-engine',
  ];

  const featureNodes = useMemo((): FeatureNode[] => {
    const baseNodes = [
      { id: 'core-engine', type: 'cube' as const, color: colors.primary },
      { id: 'component-system', type: 'cube' as const, color: colors.secondary },
      { id: 'learning-sphere', type: 'sphere' as const, color: colors.accent },
      { id: 'innovation-engine', type: 'torus' as const, color: colors.highlight },
    ];

    return baseNodes.map((node, index) => {
      const angleOffset = -arcSpread / 2;
      const angleStep = arcSpread / (baseNodes.length - 1);
      const angle = angleOffset + angleStep * index;

      const x = orbitRadius * Math.sin(angle);
      const z = -4 + orbitRadius * Math.cos(angle);
      const y = Math.sin(index * 0.6) * 0.3;

      return {
        id: node.id,
        type: node.type,
        position: [x, y, z],
        scale: node.type === 'torus' ? 0.75 : 0.85,
        color: node.color,
        rotation: [0.2, 0.3, 0.1],
        arcAngle: angle,
      };
    });
  }, [isMobile]);

  const neuralPath = useMemo(() => {
    const ordered = [...featureNodes].sort((a, b) => a.arcAngle - b.arcAngle);
    const points = ordered.map(n => new THREE.Vector3(...n.position));
    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.3);
  }, [featureNodes]);

  // ------------------------
  // Hover Detection (smoothed)
  // ------------------------
  useFrame(() => {
    if (!groupRef.current || prefersReducedMotion) return;

    const meshes = orbitGroupRef.current?.children.filter(
      c => c instanceof THREE.Mesh && c.userData.isInteractive
    ) as THREE.Mesh[];

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(meshes || []);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      if (hoveredMeshRef.current !== mesh) {
        hoveredMeshRef.current = mesh;
        onNodeHover(mesh.userData.nodeId);
        document.body.style.cursor = 'pointer';
      }
    } else {
      if (hoveredMeshRef.current) {
        hoveredMeshRef.current = null;
        onNodeHover(null);
        document.body.style.cursor = 'default';
      }
    }
  });

  useEffect(() => {
    const handleClick = () => {
      if (hoveredMeshRef.current?.userData.nodeId) {
        onNodeClick(hoveredMeshRef.current.userData.nodeId);
      }
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [onNodeClick]);

  // ------------------------
  // Main Animation Loop
  // ------------------------
  useFrame((state) => {
    const progress = scrollProgressRef.current;
    const orbitGroup = orbitGroupRef.current;
    const camera = cameraRef.current;
    if (!orbitGroup || !camera) return;

    if (prefersReducedMotion) return;

    // Floating motion (subtle)
    groupRef.current!.position.y =
      Math.sin(state.clock.elapsedTime * 0.3) * 0.1;

    // Camera movement
    const targetZ = 7 - progress * 1;
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.08);

    const rotationRange = 0.6 * Math.PI;
    orbitGroup.rotation.y = THREE.MathUtils.lerp(
      orbitGroup.rotation.y,
      progress * rotationRange,
      0.08
    );

    // Focus detection
    let newFocus: string | null = null;
    let closest = Infinity;

    orbitGroup.children.forEach(child => {
      if (child instanceof THREE.Mesh && child.userData.isInteractive) {
        const pos = new THREE.Vector3();
        child.getWorldPosition(pos);
        const camSpace = pos.clone().sub(camera.position);
        camSpace.applyQuaternion(camera.quaternion.clone().invert());

        if (Math.abs(camSpace.x) < 0.3 && camSpace.z < closest) {
          closest = camSpace.z;
          newFocus = child.userData.nodeId;
        }
      }
    });

    if (newFocus !== focusedNodeRef.current) {
      focusedNodeRef.current = newFocus;
      onNodeFocus(newFocus);
    }

    // Node Animations
    orbitGroup.children.forEach((child, index) => {
      if (!(child instanceof THREE.Mesh)) return;

      const id = child.userData.nodeId;
      const isFocused = id === focusedNodeId;
      const isHovered = id === hoveredNodeId;

      const breathe = Math.sin(state.clock.elapsedTime * 0.6 + index) * 0.05;
      let targetScale = child.userData.initialScale * (1 + breathe);

      if (isFocused) targetScale *= 1.08;
      if (isHovered) targetScale *= 1.04;

      const newScale = THREE.MathUtils.lerp(child.scale.x, targetScale, 0.08);
      child.scale.set(newScale, newScale, newScale);

      // Bring focused slightly forward
      const baseZ = child.userData.initialPositionZ ?? child.position.z;
      if (!child.userData.initialPositionZ)
        child.userData.initialPositionZ = child.position.z;

      const targetZ = isFocused
        ? baseZ + 0.6
        : baseZ;

      child.position.z = THREE.MathUtils.lerp(
        child.position.z,
        targetZ,
        0.08
      );

      const material = child.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = THREE.MathUtils.lerp(
        material.emissiveIntensity,
        isFocused ? 0.35 : 0.1,
        0.08
      );
    });

    // Neural path pulse
    if (neuralPathRef.current) {
      const mat = neuralPathRef.current.material as THREE.MeshStandardMaterial;
      const pulse =
        0.25 + Math.sin(state.clock.elapsedTime * 1.5) * 0.1;

      mat.emissiveIntensity = THREE.MathUtils.lerp(
        mat.emissiveIntensity,
        pulse,
        0.05
      );
    }
  });

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 0, 7]} fov={50} />

      <ambientLight intensity={0.4} color={colors.soft} />
      <directionalLight position={[5, 5, 5]} intensity={0.9} />
      <pointLight position={[-5, 3, -2]} intensity={0.6} color={colors.accent} />

      <group ref={groupRef}>
        <group ref={orbitGroupRef}>
          {featureNodes.map(node => (
            <mesh
              key={node.id}
              position={node.position}
              rotation={node.rotation}
              scale={node.scale}
              userData={{
                nodeId: node.id,
                initialScale: node.scale,
                isInteractive: interactiveNodeIds.includes(node.id),
              }}
            >
              {node.type === 'cube' && <boxGeometry args={[1, 1, 1]} />}
              {node.type === 'sphere' && <sphereGeometry args={[1, 32, 32]} />}
              {node.type === 'torus' && <torusGeometry args={[1, 0.4, 16, 32]} />}
              <meshStandardMaterial
                color={node.color}
                emissive={node.color}
                emissiveIntensity={0.1}
                transparent
              />
            </mesh>
          ))}
        </group>

        {neuralPath && (
          <mesh ref={neuralPathRef}>
            <tubeGeometry args={[neuralPath, 64, 0.08, 12, false]} />
            <meshStandardMaterial
              color={colors.highlight}
              emissive={colors.highlight}
              emissiveIntensity={0}
              transparent
              opacity={0.6}
            />
          </mesh>
        )}
      </group>

      <fog attach="fog" args={['#000000', 5, 15]} />
    </>
  );
};
export default ScrollDrivenHero;
