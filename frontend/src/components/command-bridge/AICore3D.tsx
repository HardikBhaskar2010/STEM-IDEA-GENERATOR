/**
 * AICore3D Component
 * 3D AI core/orb using Three.js and React Three Fiber
 * Features: Rotating geometry, glow effects, mouse interaction
 */

import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { usePerf } from '@/contexts/PerfContext';

interface CoreOrbProps {
  color?: string;
  mousePosition?: { x: number; y: number };
}

const CoreOrb: React.FC<CoreOrbProps> = ({ 
  color = '#a855f7', 
  mousePosition = { x: 0, y: 0 } 
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Rotate and react to mouse
  useFrame((state) => {
    if (!meshRef.current) return;

    // Smooth rotation
    meshRef.current.rotation.x += 0.001;
    meshRef.current.rotation.y += 0.002;

    // Follow mouse with damping
    const targetX = mousePosition.x * 0.2;
    const targetY = -mousePosition.y * 0.2;
    
    meshRef.current.rotation.x += (targetY - meshRef.current.rotation.x) * 0.05;
    meshRef.current.rotation.y += (targetX - meshRef.current.rotation.y) * 0.05;

    // Breathing scale effect
    const scale = 1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    meshRef.current.scale.set(scale, scale, scale);
  });

  return (
    <Sphere
      ref={meshRef}
      args={[1, 64, 64]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <MeshDistortMaterial
        color={color}
        attach="material"
        distort={0.4}
        speed={2}
        roughness={0.2}
        metalness={0.8}
        emissive={color}
        emissiveIntensity={hovered ? 0.8 : 0.4}
      />
    </Sphere>
  );
};

interface ParticleRingProps {
  count?: number;
  radius?: number;
  color?: string;
}

const ParticleRing: React.FC<ParticleRingProps> = ({ 
  count = 30, 
  radius = 2,
  color = '#a855f7'
}) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += 0.005;
    groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
  });

  const particles = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const z = Math.sin(angle * 2) * 0.5;

    return { x, y, z, key: i };
  });

  return (
    <group ref={groupRef}>
      {particles.map((particle) => (
        <mesh key={particle.key} position={[particle.x, particle.y, particle.z]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
    </group>
  );
};

export interface AICore3DProps {
  className?: string;
  coreColor?: string;
  particleColor?: string;
  size?: 'small' | 'medium' | 'large';
  enableParticles?: boolean;
  enableControls?: boolean;
}

export const AICore3D: React.FC<AICore3DProps> = ({
  className = '',
  coreColor = '#a855f7',
  particleColor = '#a855f7',
  size = 'medium',
  enableParticles = true,
  enableControls = false,
}) => {
  const { mode } = usePerf();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Don't render in low performance mode
  if (mode === 'low') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div
          className="rounded-full bg-gradient-to-br from-primary to-purple-700"
          style={{
            width: size === 'small' ? '80px' : size === 'medium' ? '120px' : '160px',
            height: size === 'small' ? '80px' : size === 'medium' ? '120px' : '160px',
            boxShadow: `0 0 40px ${coreColor}`,
          }}
        />
      </div>
    );
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    setMousePosition({ x, y });
  };

  const sizeMap = {
    small: 200,
    medium: 300,
    large: 400,
  };

  return (
    <div
      className={`relative ${className}`}
      style={{ width: `${sizeMap[size]}px`, height: `${sizeMap[size]}px` }}
      onMouseMove={handleMouseMove}
    >
      <Canvas
        camera={{ position: [0, 0, 4], fov: 50 }}
        gl={{ antialias: mode === 'high', alpha: true }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color={coreColor} />

        {/* Main AI Core */}
        <CoreOrb color={coreColor} mousePosition={mousePosition} />

        {/* Particle Ring (only in high mode) */}
        {enableParticles && mode === 'high' && (
          <ParticleRing count={30} radius={2} color={particleColor} />
        )}

        {/* Optional controls */}
        {enableControls && <OrbitControls enableZoom={false} enablePan={false} />}
      </Canvas>

      {/* Glow overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${coreColor}20 0%, transparent 70%)`,
        }}
      />
    </div>
  );
};
