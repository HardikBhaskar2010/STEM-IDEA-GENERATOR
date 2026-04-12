import React, { useRef, useMemo, useState, useEffect, useCallback, startTransition } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { FocusedNodeOverlay } from './ui/FocusedNodeOverlay';

interface ScrollDrivenHeroProps {
  overlayContent?: React.ReactNode;
}

// Feature node metadata for focused overlays
const FEATURE_NODE_METADATA: Record<string, { title: string; color: string }> = {
  'core-engine': { title: 'AI Idea Generation', color: '#8B5CF6' },
  'component-system': { title: '500+ Components', color: '#3B82F6' },
  'learning-sphere': { title: 'Learn By Doing', color: '#EC4899' },
  'innovation-engine': { title: 'Innovation Engine', color: '#A78BFA' },
};

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

  // 🔥 FIX W-3: Track pointer position to throttle raycasting
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const pointerMovedRef = useRef(false);
  
  // 🔥 FIX W-2: Pool Vector3 instances outside useFrame to avoid per-frame allocations
  const tempVec3 = useRef(new THREE.Vector3());
  const camSpaceVec = useRef(new THREE.Vector3());
  const tempQuat = useRef(new THREE.Quaternion());

  const isMobile = viewport.width < 768;

  const colors = {
    primary: '#8B5CF6',
    secondary: '#3B82F6',
    accent: '#EC4899',
    highlight: '#A78BFA',
    soft: '#C4B5FD',
  };

  // Phase 1: Increased radius for better spatial separation
  const orbitRadius = isMobile ? 2.8 : 3.2;
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
      // Phase 1: Increased Y variation for better spatial separation
      const y = Math.sin(index * 0.6) * 0.4 + (index % 2 === 0 ? 0.15 : -0.15);

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
  }, [isMobile, orbitRadius, arcSpread]);

  const neuralPath = useMemo(() => {
    const ordered = [...featureNodes].sort((a, b) => a.arcAngle - b.arcAngle);
    const points = ordered.map(n => new THREE.Vector3(...n.position));
    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.3);
  }, [featureNodes]);

  // ------------------------
  // Hover Detection (smoothed)
  // ------------------------
 // Hover Detection (smoothed) with raycasting throttle
  // ------------------------
  // 🔥 FIX W-3: Track pointer movement to avoid unnecessary raycasting
  useFrame(() => {
    if (!groupRef.current || prefersReducedMotion) return;

    // Check if pointer actually moved
    const dx = pointer.x - lastPointerRef.current.x;
    const dy = pointer.y - lastPointerRef.current.y;
    const pointerMoved = Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001;
    
    if (pointerMoved) {
      lastPointerRef.current.x = pointer.x;
      lastPointerRef.current.y = pointer.y;
      pointerMovedRef.current = true;
    }

    // Only raycast if pointer moved
    if (!pointerMovedRef.current) return;
    pointerMovedRef.current = false;

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
    const progress = scrollProgressRef.current; // 0-1 for 500vh
    const orbitGroup = orbitGroupRef.current;
    const camera = cameraRef.current;
    if (!orbitGroup || !camera) return;

    if (prefersReducedMotion) return;

    // Convert progress to vh units for phase-based mapping
    const scrollVh = progress * 500;

    // Floating motion (subtle)
    groupRef.current!.position.y =
      Math.sin(state.clock.elapsedTime * 0.3) * 0.1;

    // Camera movement (subtle throughout entire scroll)
    const targetZ = 7 - progress * 1;
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.08);

    // ORBITAL ROTATION: Only active during 80vh-420vh
    // Phase 1: Fixed rotation range to 0.8π (144°) per V3 spec
    const rotationRange = 0.8 * Math.PI; // ~144 degrees (V3 spec)
    const rotationStartVh = 80;
    const rotationEndVh = 420;
    
    let rotationProgress = 0;
    if (scrollVh >= rotationStartVh && scrollVh <= rotationEndVh) {
      rotationProgress = (scrollVh - rotationStartVh) / (rotationEndVh - rotationStartVh);
    } else if (scrollVh > rotationEndVh) {
      rotationProgress = 1;
    }
    
    const targetRotation = rotationProgress * rotationRange;
    orbitGroup.rotation.y = THREE.MathUtils.lerp(
      orbitGroup.rotation.y,
      targetRotation,
      0.08
    );

    // Focus detection
    let newFocus: string | null = null;
    let closest = Infinity;

    orbitGroup.children.forEach(child => {
      if (child instanceof THREE.Mesh && child.userData.isInteractive) {
        // Reuse pooled Vector3 and Quaternion — no per-frame GC pressure
        child.getWorldPosition(tempVec3.current);
        camSpaceVec.current.copy(tempVec3.current).sub(camera.position);
        camera.getWorldQuaternion(tempQuat.current);
        camSpaceVec.current.applyQuaternion(tempQuat.current.invert());

        if (Math.abs(camSpaceVec.current.x) < 0.3 && camSpaceVec.current.z < closest) {
          closest = camSpaceVec.current.z;
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

      // Phase 3: Focus hierarchy - scale to 1.08 max
      if (isFocused) targetScale *= 1.08;
      if (isHovered) targetScale *= 1.04;

      const newScale = THREE.MathUtils.lerp(child.scale.x, targetScale, 0.08);
      child.scale.set(newScale, newScale, newScale);

      // Phase 1: Depth exaggeration - focused forward, non-focused slightly back
      const baseZ = child.userData.initialPositionZ ?? child.position.z;
      if (!child.userData.initialPositionZ)
        child.userData.initialPositionZ = child.position.z;

      const targetZ = isFocused
        ? baseZ + 0.8  // Phase 1: Increased from 0.6 to 0.8 for stronger forward presence
        : focusedNodeId ? baseZ - 0.2 : baseZ;  // Phase 1: Non-focused slightly back

      child.position.z = THREE.MathUtils.lerp(
        child.position.z,
        targetZ,
        0.08
      );

      const material = child.material as THREE.MeshStandardMaterial;
      
      // Phase 3: Stronger opacity separation for clear hierarchy
      let targetOpacity = 1.0;
      if (focusedNodeId) {
        if (isFocused) {
          targetOpacity = 1.0; // Focused: full opacity
        } else {
          targetOpacity = 0.6; // Phase 3: Non-focused reduced to 0.6 for clearer separation
        }
      }
      
      material.opacity = THREE.MathUtils.lerp(
        material.opacity,
        targetOpacity,
        0.08
      );
      material.transparent = true;
      
      // Phase 3: Stronger emissive contrast for focus hierarchy
      material.emissiveIntensity = THREE.MathUtils.lerp(
        material.emissiveIntensity,
        isFocused ? 0.35 : 0.1,
        0.08
      );
    });

    // Neural path glow: Progressive reveal 250vh-420vh (V3 spec)
    if (neuralPathRef.current) {
      const mat = neuralPathRef.current.material as THREE.MeshStandardMaterial;
      
      const glowStartVh = 250;
      const glowEndVh = 420;
      
      let baseIntensity = 0;
      if (scrollVh >= glowStartVh && scrollVh <= glowEndVh) {
        const glowProgress = (scrollVh - glowStartVh) / (glowEndVh - glowStartVh);
        baseIntensity = glowProgress * 0.4; // 0 → 0.4
      } else if (scrollVh > glowEndVh) {
        baseIntensity = 0.4; // Fully revealed
      }
      
      // Add subtle pulse on top of base intensity
      const pulse = Math.sin(state.clock.elapsedTime * 1.5) * 0.05;
      const targetIntensity = baseIntensity + pulse;

      mat.emissiveIntensity = THREE.MathUtils.lerp(
        mat.emissiveIntensity,
        targetIntensity,
        0.08
      );
    }
  });

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 0, 7]} fov={50} />

      <ambientLight intensity={0.4} color={colors.soft} />
      <directionalLight position={[5, 5, 5]} intensity={0.9} />
      <pointLight position={[-5, 3, -2]} intensity={0.6} color={colors.accent} />
      {/* Phase 1: Additional point light for depth-based lighting difference */}
      <pointLight position={[0, 0, 2]} intensity={0.3} color={colors.primary} distance={8} />

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

      <fog attach="fog" args={['#000000', 4, 16]} />
    </>
  );
};

const ScrollDrivenHero: React.FC<ScrollDrivenHeroProps> = ({ overlayContent }) => {
  const heroRef = useRef<HTMLElement>(null);
  const scrollProgressRef = useRef(0);
  const scrollVhRef = useRef(0); // ref-only — avoids scroll-thrash re-renders
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  // scrollVh re-render is intentionally throttled to 0.5vh resolution for the overlay fade only
  const [scrollVh, setScrollVh] = useState(0);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updateMotionPreference();

    mediaQuery.addEventListener('change', updateMotionPreference);

    return () => {
      mediaQuery.removeEventListener('change', updateMotionPreference);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      const scrolledVh = -rect.top / window.innerHeight;
      // Progress normalized to 0-1 for 500vh
      const progress = Math.min(Math.max(scrolledVh / 5, 0), 1);
      scrollProgressRef.current = progress;
      scrollVhRef.current = scrolledVh;
      
      // Only trigger re-render when overlay opacity would visibly change (throttled)
      const newScrollVh = Math.round(scrolledVh * 10) / 10;
      setScrollVh(prev => Math.abs(newScrollVh - prev) > 0.5 ? newScrollVh : prev);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  // Phase 2: Hero overlay opacity - fade out 0-40vh with ease-out curve
  // Using ease-out: 1 - (1 - t)^2 for smooth, elegant fade
  const fadeEndVh = 40;
  const t = Math.min(scrollVh / fadeEndVh, 1); // Clamp to 0-1
  const easedT = 1 - (1 - t) * (1 - t); // Ease-out curve
  const heroOverlayOpacity = Math.max(0, 1 - easedT);
  
  // Only log in dev and only during the fade phase
  if (import.meta.env.DEV && scrollVh < 50) {
    // Avoid useEffect for logging — no-op in prod
  }
  
  // Get focused node data for overlay
  const focusedNodeData = focusedNodeId && FEATURE_NODE_METADATA[focusedNodeId]
    ? {
        id: focusedNodeId,
        title: FEATURE_NODE_METADATA[focusedNodeId].title,
        color: FEATURE_NODE_METADATA[focusedNodeId].color,
      }
    : null;

  // Stabilize callbacks to prevent child re-renders
  const handleNodeHover = useCallback((id: string | null) => setHoveredNodeId(id), []);
  const handleNodeClick = useCallback((id: string | null) => {
    startTransition(() => {
      setSelectedNodeId(id);
    });
  }, []);
  const handleNodeFocus = useCallback((id: string | null) => setFocusedNodeId(id), []);

  return (
    <section ref={heroRef} className="relative h-[500vh] bg-black" aria-label="STEM 3D hero">
      <div className="fixed top-0 left-0 h-screen w-full overflow-hidden">
        {/* Canvas layer - z-0 (background) */}
        <Canvas
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: false }}
          className="absolute inset-0 z-0"
        >
          <color attach="background" args={['#000000']} />
          <ThreeHeroScene
            scrollProgressRef={scrollProgressRef}
            prefersReducedMotion={prefersReducedMotion}
            hoveredNodeId={hoveredNodeId}
            selectedNodeId={selectedNodeId}
            focusedNodeId={focusedNodeId}
            onNodeHover={handleNodeHover}
            onNodeClick={handleNodeClick}
            onNodeFocus={handleNodeFocus}
          />
        </Canvas>

        {/* Hero overlay layer - z-10 (foreground) - fades out 0-40vh */}
        <div 
          className="absolute inset-0 z-10 flex h-full items-center justify-center px-6 pointer-events-none"
          style={{ opacity: heroOverlayOpacity, transition: 'opacity 0.1s linear' }}
        >
          <div className="pointer-events-auto" style={{ opacity: 1 }}>{overlayContent}</div>
        </div>
        
        {/* Focused node overlay - z-20 (top layer) - appears during rotation phase */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          <FocusedNodeOverlay focusedNode={focusedNodeData} />
        </div>
        
        {/* Phase 4: Stronger vignette to frame center and reduce clutter */}
        <div 
          className="absolute inset-0 z-5 pointer-events-none"
          aria-hidden="true"
          style={{
            background: 'radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.7) 100%)'
          }}
        />
      </div>
    </section>
  );
};

export default ScrollDrivenHero;



