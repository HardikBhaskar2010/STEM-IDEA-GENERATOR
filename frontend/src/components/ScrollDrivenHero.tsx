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
  title: string;
  type: 'cube' | 'sphere' | 'torus';
  position: [number, number, number];
  scale: number;
  color: string;
  rotation: [number, number, number];
  arcAngle: number; // Angle on orbital arc
}

/**
 * Luna V3: Orbital Focus System
 * Feature nodes revolve along controlled arc
 * Scroll rotates orbit group (subtle, not aggressive)
 * Each node becomes centered sequentially with focus detection
 * Premium, curated staging with intentional choreography
 */
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
  const [hoveredMesh, setHoveredMesh] = useState<THREE.Mesh | null>(null);
  const focusedNodeRef = useRef<string | null>(null);

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

  // Orbital parameters
  const orbitRadius = 3;
  const arcSpread = isMobile ? Math.PI / 2 : (Math.PI * 2) / 3; // 90° mobile, 120° desktop

  // Feature Nodes with Orbital Arc Positioning
  const featureNodes = useMemo((): FeatureNode[] => {
    const nodes: FeatureNode[] = [];

    // Calculate orbital positions for 4 main nodes
    const mainNodeIds = [
      { id: 'core-engine', title: 'AI Idea Generation', type: 'cube' as const, color: colors.primary },
      { id: 'component-system', title: '500+ Components', type: 'cube' as const, color: colors.secondary },
      { id: 'learning-sphere', title: 'Learn By Doing', type: 'sphere' as const, color: colors.accent },
      { id: 'innovation-engine', title: 'Innovation Engine', type: 'torus' as const, color: colors.highlight },
    ];

    // Distribute nodes along arc
    mainNodeIds.forEach((node, index) => {
      const angleOffset = -arcSpread / 2; // Start angle
      const angleStep = arcSpread / (mainNodeIds.length - 1);
      const angle = angleOffset + angleStep * index;

      // Orbital positioning formula
      const x = orbitRadius * Math.sin(angle);
      const z = -4 + orbitRadius * Math.cos(angle);
      const y = Math.sin(index * 0.5) * 0.3; // Slight vertical variation

      nodes.push({
        id: node.id,
        title: node.title,
        type: node.type,
        position: [x, y, z],
        scale: node.type === 'torus' ? 0.7 : 0.8,
        color: node.color,
        rotation: [0.2, 0.3, 0.1],
        arcAngle: angle,
      });
    });

    // Add supporting cluster nodes only on desktop
    if (!isMobile) {
      // Component clusters
      nodes.push({
        id: 'component-cluster-1',
        title: 'Component Cluster',
        type: 'cube',
        position: [2.5, -0.5, -4.5],
        scale: 0.4,
        color: colors.secondary,
        rotation: [0.1, 0.5, 0.2],
        arcAngle: 0,
      });

      nodes.push({
        id: 'component-cluster-2',
        title: 'Component Cluster',
        type: 'cube',
        position: [3.5, 0.5, -3.5],
        scale: 0.35,
        color: colors.secondary,
        rotation: [0.4, 0.1, 0.3],
        arcAngle: 0,
      });

      // Learning support
      nodes.push({
        id: 'learning-support',
        title: 'Learning Support',
        type: 'sphere',
        position: [-3.5, -1, -4.5],
        scale: 0.4,
        color: colors.accent,
        rotation: [0, 0, 0],
        arcAngle: 0,
      });

      // Innovation ring
      nodes.push({
        id: 'innovation-ring-2',
        title: 'Innovation Ring',
        type: 'torus',
        position: [0, -1.5, -6.5],
        scale: 0.55,
        color: colors.soft,
        rotation: [Math.PI / 3, Math.PI / 4, 0],
        arcAngle: 0,
      });
    }

    return nodes;
  }, [isMobile]);

  // Interactive feature nodes (clickable)
  const interactiveNodeIds = ['core-engine', 'component-system', 'learning-sphere', 'innovation-engine'];

  // Neural Motion Path - CatmullRomCurve3
  const neuralPath = useMemo(() => {
    const orderedNodes = [...featureNodes]
      .filter(node => interactiveNodeIds.includes(node.id))
      .sort((a, b) => a.arcAngle - b.arcAngle);

    const points = orderedNodes.map(
      node => new THREE.Vector3(...node.position)
    );

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
      .filter(child => {
        if (child instanceof THREE.Group) {
          return child.children.filter(c => c instanceof THREE.Mesh && c.userData.isInteractive);
        }
        return child instanceof THREE.Mesh && child.userData.isInteractive;
      })
      .flatMap(child => {
        if (child instanceof THREE.Group) {
          return child.children.filter(c => c instanceof THREE.Mesh && c.userData.isInteractive) as THREE.Mesh[];
        }
        return [child] as THREE.Mesh[];
      });

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
    const orbitGroup = orbitGroupRef.current;
    const neuralPathMesh = neuralPathRef.current;

    if (!camera || !group || !orbitGroup) return;

    // If reduced motion is preferred, keep static positions
    if (prefersReducedMotion) {
      camera.position.z = 7;
      camera.position.y = 0;
      orbitGroup.rotation.y = 0;
      if (neuralPathMesh) {
        (neuralPathMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.4;
      }
      return;
    }

    // Scroll-based damping when panel is open
    const motionDamping = selectedNodeId ? 0.4 : 1.0;

    // CAMERA: Mostly stable, minimal forward drift
    const targetCameraZ = 7 - progress * 1; // 7 → 6 (subtle)
    const targetCameraY = progress * 0.3; // 0 → 0.3 (minimal)

    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCameraZ, 0.08);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCameraY, 0.08);

    // Subtle camera tilt
    const targetCameraRotationX = -progress * 0.08;
    camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, targetCameraRotationX, 0.08);

    // Hover: Camera micro-tilt (disabled on mobile)
    if (!isMobile && hoveredNodeId && hoveredMesh) {
      const meshPos = new THREE.Vector3();
      hoveredMesh.getWorldPosition(meshPos);
      const screenPos = meshPos.project(camera);
      
      const tiltX = screenPos.y * 0.015;
      const tiltY = -screenPos.x * 0.015;
      
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

    // ORBITAL ROTATION: Scroll-driven (0.6π max = ~108 degrees)
    const rotationRange = 0.6 * Math.PI;
    const targetOrbitRotation = progress * rotationRange * motionDamping;
    orbitGroup.rotation.y = THREE.MathUtils.lerp(
      orbitGroup.rotation.y,
      targetOrbitRotation,
      0.08
    );

    // FOCUS DETECTION: Camera-space method (performance-safe)
    const focusThreshold = 0.3;
    let newFocusedNode: string | null = null;
    let closestZ = Infinity;

    orbitGroup.children.forEach((child) => {
      if (child instanceof THREE.Mesh && child.userData.isInteractive) {
        const worldPos = new THREE.Vector3();
        child.getWorldPosition(worldPos);

        // Transform to camera space
        const cameraSpacePos = worldPos.clone().sub(camera.position);
        cameraSpacePos.applyQuaternion(camera.quaternion.clone().invert());

        // Check if centered (abs(x) < threshold)
        if (Math.abs(cameraSpacePos.x) < focusThreshold) {
          // Among centered candidates, pick closest Z
          if (cameraSpacePos.z < closestZ) {
            closestZ = cameraSpacePos.z;
            newFocusedNode = child.userData.nodeId;
          }
        }
      }
    });

    // Only update React state if focused node changed
    if (newFocusedNode !== focusedNodeRef.current) {
      focusedNodeRef.current = newFocusedNode;
      onNodeFocus(newFocusedNode);
    }

    // Neural Path: Distance-based emissive enhancement
    if (neuralPathMesh && neuralPath) {
      const material = neuralPathMesh.material as THREE.MeshStandardMaterial;
      
      // Base intensity from scroll (250vh-420vh = 0.5-0.84)
      let baseIntensity = 0;
      if (progress >= 0.5 && progress <= 0.84) {
        const revealProgress = (progress - 0.5) / 0.34;
        baseIntensity = revealProgress * 0.4;
      } else if (progress > 0.84) {
        baseIntensity = 0.4;
      }

      // Focus: Boost only near focused node (distance-based)
      let targetIntensity = baseIntensity;
      if (focusedNodeId && !selectedNodeId) {
        const focusedNode = featureNodes.find(n => n.id === focusedNodeId);
        if (focusedNode) {
          // Add subtle boost (not whole path)
          targetIntensity = Math.min(0.6, baseIntensity + 0.15);
        }
      }

      // Selected: Stronger glow
      if (selectedNodeId) {
        targetIntensity = Math.min(0.7, baseIntensity + 0.3);
      }

      // Apply lerp
      material.emissiveIntensity = THREE.MathUtils.lerp(
        material.emissiveIntensity,
        targetIntensity,
        0.1
      );
    }

    // Individual node animations
    orbitGroup.children.forEach((child, index) => {
      if (child instanceof THREE.Mesh && child.userData.nodeId) {
        const nodeId = child.userData.nodeId;
        const isHovered = nodeId === hoveredNodeId;
        const isSelected = nodeId === selectedNodeId;
        const isFocused = nodeId === focusedNodeId;
        const isOtherFocused = focusedNodeId && nodeId !== focusedNodeId;

        // Rotation
        const baseRotationSpeed = 0.001 + (index * 0.0002);
        const targetRotationY = child.userData.initialRotation.y + (progress * Math.PI * 0.5);
        const targetRotationX = child.userData.initialRotation.x + (progress * Math.PI * 0.3);

        child.rotation.y = THREE.MathUtils.lerp(child.rotation.y, targetRotationY, 0.06);
        child.rotation.x = THREE.MathUtils.lerp(child.rotation.x, targetRotationX, 0.06);
        child.rotation.z += baseRotationSpeed * motionDamping;

        // Scale: Base breathing + focus effects
        const breatheAmount = Math.sin(state.clock.elapsedTime * 0.5 + index) * 0.05;
        let targetScale = child.userData.initialScale * (1 + breatheAmount + progress * 0.1);

        // Focus: Scale to 1.05
        if (isFocused) {
          targetScale *= 1.05;
        }

        // Hover: Additional emphasis
        if (isHovered) {
          targetScale *= 1.03;
        }

        // Selected: Slight emphasis
        if (isSelected) {
          targetScale *= 1.02;
        }

        const currentScale = child.scale.x;
        const newScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.06);
        child.scale.set(newScale, newScale, newScale);

        // Opacity: Gradual hierarchy (Focused: 1.0, Near: 0.85, Far: 0.65)
        const material = child.material as THREE.MeshStandardMaterial;
        let targetOpacity = 1;

        if (focusedNodeId) {
          if (isFocused) {
            targetOpacity = 1.0; // Focused: full opacity
          } else {
            // Calculate distance to focused node in arc
            const focusedNode = featureNodes.find(n => n.id === focusedNodeId);
            const currentNode = featureNodes.find(n => n.id === nodeId);
            if (focusedNode && currentNode && currentNode.arcAngle !== 0) {
              const angleDiff = Math.abs(focusedNode.arcAngle - currentNode.arcAngle);
              // Near nodes: 0.85, Far nodes: 0.65
              targetOpacity = angleDiff < Math.PI / 4 ? 0.85 : 0.65;
            } else {
              targetOpacity = 0.7; // Supporting nodes
            }
          }
        } else if (isOtherFocused) {
          targetOpacity = 0.7;
        }

        material.opacity = THREE.MathUtils.lerp(material.opacity, targetOpacity, 0.1);
        material.transparent = true;

        // Emissive: Boost on focus
        let targetEmissive = 0.1;
        if (isFocused) {
          targetEmissive = 0.3; // +0.2 boost
        }
        if (isHovered) {
          targetEmissive = Math.max(targetEmissive, 0.25);
        }
        if (isSelected) {
          targetEmissive = Math.max(targetEmissive, 0.2);
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
        position={[0, 0, 7]}
        fov={50}
      />

      {/* Lighting setup */}
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

      {/* Scene group */}
      <group ref={groupRef}>
        {/* Orbital Group - rotates with scroll */}
        <group ref={orbitGroupRef}>
          {/* Feature Nodes */}
          {featureNodes.map((node) => {
            const isInteractive = interactiveNodeIds.includes(node.id);

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
                  transparent={true}
                  opacity={1}
                />
              </mesh>
            );
          })}
        </group>

        {/* Neural Motion Path */}
        {neuralPath && (
          <mesh ref={neuralPathRef}>
            <tubeGeometry
              args={[
                neuralPath,
                isMobile ? 32 : 64,
                0.08,
                isMobile ? 8 : 12,
                false,
              ]}
            />
            <meshStandardMaterial
              color={colors.highlight}
              emissive={colors.highlight}
              emissiveIntensity={0}
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
