import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

interface ThreeHeroSceneProps {
  scrollProgressRef: React.MutableRefObject<number>;
  prefersReducedMotion: boolean;
  hoveredNodeId: string | null;
  selectedNodeId: string | null;
  onNodeHover: (id: string | null) => void;
  onNodeClick: (id: string | null) => void;
}

interface FeatureNode {
  id: string;
  title: string;
  type: 'cube' | 'sphere' | 'torus';
  position: [number, number, number];
  scale: number;
  color: string;
  rotation: [number, number, number];
  layer: 1 | 2 | 3; // Depth staging
}

/**
 * Luna V2: Interactive Product Atlas with Neural Motion Path
 * Feature nodes connected by architected neural pathway
 * Controlled powerful energy + System responds to you
 */
export const ThreeHeroScene: React.FC<ThreeHeroSceneProps> = ({
  scrollProgressRef,
  prefersReducedMotion,
  hoveredNodeId,
  selectedNodeId,
  onNodeHover,
  onNodeClick,
}) => {
  const { viewport, raycaster, camera, pointer } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const neuralPathRef = useRef<THREE.Mesh>(null);
  const [hoveredMesh, setHoveredMesh] = useState<THREE.Mesh | null>(null);

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

  // Feature Nodes with metadata (Depth-staged)
  const featureNodes = useMemo((): FeatureNode[] => {
    const nodes: FeatureNode[] = [];

    // Layer 1 (Z -2): Core Engine
    nodes.push({
      id: 'core-engine',
      title: 'AI Idea Generation',
      type: 'cube',
      position: [0, 0, -2],
      scale: 0.8,
      color: colors.primary,
      rotation: [0.2, 0.3, 0.1],
      layer: 1,
    });

    // Layer 2 (Z -4): Systems
    if (!isMobile) {
      nodes.push({
        id: 'component-system',
        title: '500+ Components',
        type: 'cube',
        position: [3, 1, -4],
        scale: 0.6,
        color: colors.secondary,
        rotation: [0.3, 0.2, 0.4],
        layer: 2,
      });

      nodes.push({
        id: 'component-cluster-1',
        title: 'Component Cluster',
        type: 'cube',
        position: [2.5, -0.5, -4.5],
        scale: 0.4,
        color: colors.secondary,
        rotation: [0.1, 0.5, 0.2],
        layer: 2,
      });

      nodes.push({
        id: 'component-cluster-2',
        title: 'Component Cluster',
        type: 'cube',
        position: [3.5, 0.5, -3.5],
        scale: 0.35,
        color: colors.secondary,
        rotation: [0.4, 0.1, 0.3],
        layer: 2,
      });
    } else {
      // Mobile: Single component node
      nodes.push({
        id: 'component-system',
        title: '500+ Components',
        type: 'cube',
        position: [3, 0.5, -4],
        scale: 0.6,
        color: colors.secondary,
        rotation: [0.3, 0.2, 0.4],
        layer: 2,
      });
    }

    nodes.push({
      id: 'learning-sphere',
      title: 'Learn By Doing',
      type: 'sphere',
      position: [-3, 0, -4],
      scale: 0.65,
      color: colors.accent,
      rotation: [0, 0, 0],
      layer: 2,
    });

    if (!isMobile) {
      nodes.push({
        id: 'learning-support',
        title: 'Learning Support',
        type: 'sphere',
        position: [-3.5, -1, -4.5],
        scale: 0.4,
        color: colors.accent,
        rotation: [0, 0, 0],
        layer: 2,
      });
    }

    // Layer 3 (Z -6): Innovation
    if (!isMobile) {
      nodes.push({
        id: 'innovation-engine',
        title: 'Innovation Engine',
        type: 'torus',
        position: [0, 1.5, -6],
        scale: 0.7,
        color: colors.highlight,
        rotation: [Math.PI / 4, 0, Math.PI / 6],
        layer: 3,
      });

      nodes.push({
        id: 'innovation-ring-2',
        title: 'Innovation Ring',
        type: 'torus',
        position: [0, -1.5, -6.5],
        scale: 0.55,
        color: colors.soft,
        rotation: [Math.PI / 3, Math.PI / 4, 0],
        layer: 3,
      });
    }

    return nodes;
  }, [isMobile]);

  // Interactive feature nodes (clickable)
  const interactiveNodeIds = ['core-engine', 'component-system', 'learning-sphere', 'innovation-engine'];

  // Neural Motion Path - CatmullRomCurve3
  const neuralPath = useMemo(() => {
    // Order nodes by depth (layer) for path flow
    const orderedNodes = [...featureNodes]
      .filter(node => interactiveNodeIds.includes(node.id))
      .sort((a, b) => a.layer - b.layer);

    // Create curve from node positions
    const points = orderedNodes.map(
      node => new THREE.Vector3(...node.position)
    );

    // Add smooth intermediate points for better flow
    if (points.length >= 2) {
      const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.3);
      return curve;
    }

    return null;
  }, [featureNodes]);

  // Raycaster for hover detection
  useFrame(() => {
    if (!groupRef.current || prefersReducedMotion) return;

    const meshes = groupRef.current.children
      .filter(child => child instanceof THREE.Mesh && child.userData.isInteractive) as THREE.Mesh[];

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      if (mesh !== hoveredMesh) {
        setHoveredMesh(mesh);
        onNodeHover(mesh.userData.nodeId);
        document.body.style.cursor = 'pointer';
      }
    } else {
      if (hoveredMesh) {
        setHoveredMesh(null);
        onNodeHover(null);
        document.body.style.cursor = 'default';
      }
    }
  });

  // Handle click
  useEffect(() => {
    const handleClick = () => {
      if (hoveredMesh && hoveredMesh.userData.nodeId) {
        onNodeClick(hoveredMesh.userData.nodeId);
      }
    };

    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('click', handleClick);
      document.body.style.cursor = 'default';
    };
  }, [hoveredMesh, onNodeClick]);

  // Animation loop - ALL movement logic here
  useFrame((state) => {
    const progress = scrollProgressRef.current; // 0-1 for 500vh
    const camera = cameraRef.current;
    const group = groupRef.current;
    const neuralPathMesh = neuralPathRef.current;

    if (!camera || !group) return;

    // If reduced motion is preferred, keep static positions
    if (prefersReducedMotion) {
      camera.position.z = 8;
      camera.position.y = 0;
      group.rotation.y = 0;
      if (neuralPathMesh) {
        (neuralPathMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.4;
      }
      return;
    }

    // Scroll-based damping when panel is open
    const motionDamping = selectedNodeId ? 0.4 : 1.0;

    // LERP-BASED CAMERA MOVEMENT (smooth, no jitter)
    // Target positions based on scroll progress
    const targetCameraZ = 8 - progress * 3; // 8 → 5
    const targetCameraY = progress * 0.5; // 0 → 0.5

    // Apply smooth lerp (0.08 = premium smoothness)
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCameraZ, 0.08);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCameraY, 0.08);

    // Subtle camera tilt
    const targetCameraRotationX = -progress * 0.1;
    camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, targetCameraRotationX, 0.08);

    // Hover: Camera micro-tilt (very subtle)
    if (hoveredNodeId && hoveredMesh) {
      const meshPos = new THREE.Vector3();
      hoveredMesh.getWorldPosition(meshPos);
      const screenPos = meshPos.project(camera);
      
      const tiltX = screenPos.y * 0.02; // Very small tilt
      const tiltY = -screenPos.x * 0.02;
      
      camera.rotation.x = THREE.MathUtils.lerp(
        camera.rotation.x, 
        targetCameraRotationX + tiltX, 
        0.1
      );
      camera.rotation.y = THREE.MathUtils.lerp(
        camera.rotation.y, 
        tiltY, 
        0.1
      );
    }

    // Click: Slight forward camera lerp
    if (selectedNodeId) {
      const targetZ = targetCameraZ - 0.5; // Subtle forward movement
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.05);
    }

    // Scene rotation with restraint (dampened when panel open)
    const targetGroupRotationY = progress * 0.3 * Math.PI * motionDamping;
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, targetGroupRotationY, 0.08);

    // Subtle sine wave for X rotation (adds life, dampened when panel open)
    const targetGroupRotationX = Math.sin(state.clock.elapsedTime * 0.2) * 0.05 * motionDamping;
    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, targetGroupRotationX, 0.05);

    // Neural Path: Progressive emissive reveal (250vh-420vh = progress 0.5-0.84)
    if (neuralPathMesh) {
      const material = neuralPathMesh.material as THREE.MeshStandardMaterial;
      
      // Scroll-based reveal: 0 at 250vh (0.5) → 0.4 at 420vh (0.84)
      let targetIntensity = 0;
      if (progress >= 0.5 && progress <= 0.84) {
        const revealProgress = (progress - 0.5) / 0.34; // 0-1 in reveal zone
        targetIntensity = revealProgress * 0.4;
      } else if (progress > 0.84) {
        targetIntensity = 0.4;
      }

      // Hover: Path emissive ripple (system responds to you)
      if (hoveredNodeId && !selectedNodeId) {
        targetIntensity = Math.min(0.6, targetIntensity + 0.2);
        
        // Subtle pulse
        const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.1;
        targetIntensity += pulse;
      }

      // Selected: Stronger glow near active node
      if (selectedNodeId) {
        targetIntensity = Math.min(0.7, targetIntensity + 0.3);
      }

      // Apply lerp for smooth transitions
      material.emissiveIntensity = THREE.MathUtils.lerp(
        material.emissiveIntensity,
        targetIntensity,
        0.1
      );
    }

    // Individual node animations (controlled)
    group.children.forEach((child, index) => {
      if (child instanceof THREE.Mesh && child.userData.nodeId) {
        const nodeId = child.userData.nodeId;
        const isHovered = nodeId === hoveredNodeId;
        const isSelected = nodeId === selectedNodeId;
        const isOtherSelected = selectedNodeId && nodeId !== selectedNodeId;

        // Rotation (max 180° influence from scroll)
        const baseRotationSpeed = 0.001 + (index * 0.0002);
        const targetRotationY = child.userData.initialRotation.y + (progress * Math.PI);
        const targetRotationX = child.userData.initialRotation.x + (progress * Math.PI * 0.5);

        child.rotation.y = THREE.MathUtils.lerp(child.rotation.y, targetRotationY, 0.06);
        child.rotation.x = THREE.MathUtils.lerp(child.rotation.x, targetRotationX, 0.06);

        // Gentle continuous rotation
        child.rotation.z += baseRotationSpeed * motionDamping;

        // Scale: Base breathing + hover/select effects
        const breatheAmount = Math.sin(state.clock.elapsedTime * 0.5 + index) * 0.05;
        let targetScale = child.userData.initialScale * (1 + breatheAmount + progress * 0.1);

        // Hover: Scale to 1.08
        if (isHovered) {
          targetScale *= 1.08;
        }

        // Selected: Slight emphasis
        if (isSelected) {
          targetScale *= 1.05;
        }

        const currentScale = child.scale.x;
        const newScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.06);
        child.scale.set(newScale, newScale, newScale);

        // Opacity: Reduce non-selected nodes when one is selected
        const material = child.material as THREE.MeshStandardMaterial;
        let targetOpacity = 1;
        if (isOtherSelected) {
          targetOpacity = 0.4;
        }
        material.opacity = THREE.MathUtils.lerp(material.opacity, targetOpacity, 0.1);
        material.transparent = targetOpacity < 1;

        // Emissive: Boost on hover
        let targetEmissive = 0.1;
        if (isHovered) {
          targetEmissive = 0.3;
        }
        if (isSelected) {
          targetEmissive = 0.25;
        }
        material.emissiveIntensity = THREE.MathUtils.lerp(
          material.emissiveIntensity,
          targetEmissive,
          0.1
        );
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
        {/* Feature Nodes */}
        {featureNodes.map((node) => {
          const isInteractive = interactiveNodeIds.includes(node.id);

          // Common material properties
          const materialProps = {
            color: node.color,
            metalness: node.type === 'cube' ? 0.3 : 0.1,
            roughness: node.type === 'cube' ? 0.4 : 0.2,
            emissive: node.color,
            emissiveIntensity: 0.1,
          };

          return (
            <mesh
              key={node.id}
              position={node.position}
              rotation={node.rotation}
              scale={node.scale}
              castShadow={!isMobile}
              receiveShadow={!isMobile}
              userData={{
                nodeId: node.id,
                initialScale: node.scale,
                initialRotation: { x: node.rotation[0], y: node.rotation[1], z: node.rotation[2] },
                isInteractive,
              }}
            >
              {node.type === 'cube' && <boxGeometry args={[1, 1, 1]} />}
              {node.type === 'sphere' && <sphereGeometry args={[1, 32, 32]} />}
              {node.type === 'torus' && <torusGeometry args={[1, 0.4, 16, 32]} />}
              <meshStandardMaterial
                {...materialProps}
                transparent={node.type === 'torus'}
                opacity={node.type === 'torus' ? 0.6 : 1}
              />
            </mesh>
          );
        })}

        {/* Neural Motion Path - Architected System */}
        {neuralPath && (
          <mesh ref={neuralPathRef}>
            <tubeGeometry
              args={[
                neuralPath,
                isMobile ? 32 : 64, // Segments (lower for mobile)
                0.08, // Radius (thin tube)
                isMobile ? 8 : 12, // Radial segments
                false, // Not closed
              ]}
            />
            <meshStandardMaterial
              color={colors.highlight}
              emissive={colors.highlight}
              emissiveIntensity={0} // Starts at 0, reveals with scroll
              transparent={true}
              opacity={0.5}
              metalness={0.2}
              roughness={0.3}
            />
          </mesh>
        )}
      </group>

      {/* Fog for depth */}
      <fog attach="fog" args={['#000000', 5, 15]} />
    </>
  );
};


