'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useThreeD } from '@/contexts/ThreeDContext';
import { usePreferences } from '@/contexts/PreferencesContext';

interface ParticleFieldProps {
  count?: number;
  color?: string;
  size?: number;
  speed?: number;
}

// Create circular particle texture
const createCircleTexture = () => {
  if (typeof document === 'undefined') {
    const data = new Uint8Array([255, 255, 255, 255]);
    const fallbackTexture = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
    fallbackTexture.needsUpdate = true;
    return fallbackTexture;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    // Create radial gradient for glow effect
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
  }
  
  return new THREE.CanvasTexture(canvas);
};

// Theme color mapping
const getThemeColor = (theme: string): string => {
  const themeColors: Record<string, string> = {
    allblack: '#a3a3a3',
    purple: '#a855f7',
    pink: '#ec4899',
    blue: '#3b82f6',
    green: '#10b981',
    red: '#ef4444',
    orange: '#f97316'
  };
  return themeColors[theme] || '#a855f7';
};

export const ParticleField: React.FC<ParticleFieldProps> = ({
  count,
  color,
  size = 0.15, // Increased from 0.05 for higher intensity
  speed = 1.5 // Increased from 0.5 for faster movement
}) => {
  const { particleCount, animationComplexity, capability } = useThreeD();
  const { colorTheme } = usePreferences();
  const points = useRef<THREE.Points>(null);
  const material = useRef<THREE.PointsMaterial>(null);
  
  // Higher particle count for high-end devices
  const actualCount = count || (capability === 'high' ? 5000 : particleCount);
  
  // Use theme color if no color is provided
  const themeColor = color || getThemeColor(colorTheme);

  const [positions, velocities, circleTexture] = useMemo(() => {
    const positions = new Float32Array(actualCount * 3);
    const velocities = new Float32Array(actualCount * 3);

    for (let i = 0; i < actualCount; i++) {
      // Random positions in a sphere
      const radius = Math.random() * 15 + 5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // Random velocities - increased for faster movement
      velocities[i * 3] = (Math.random() - 0.5) * 0.04;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.04;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.04;
    }

    return [positions, velocities, createCircleTexture()];
  }, [actualCount]);

  // Update color when theme changes
  useEffect(() => {
    if (material.current) {
      material.current.color.set(themeColor);
    }
  }, [themeColor]);

  useFrame((state) => {
    if (!points.current || animationComplexity === 'minimal') return;

    const time = state.clock.getElapsedTime();
    const positions = points.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < actualCount; i++) {
      // Wave motion with increased speed
      positions[i * 3] += velocities[i * 3] * speed;
      positions[i * 3 + 1] += velocities[i * 3 + 1] * speed + Math.sin(time + i * 0.1) * 0.004;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * speed;

      // Boundary check - reset particles that go too far
      const distance = Math.sqrt(
        positions[i * 3] ** 2 +
        positions[i * 3 + 1] ** 2 +
        positions[i * 3 + 2] ** 2
      );

      if (distance > 25) {
        // Reset to center with small radius
        const resetRadius = Math.random() * 2 + 1;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i * 3] = resetRadius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = resetRadius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = resetRadius * Math.cos(phi);
      }
    }

    points.current.geometry.attributes.position.needsUpdate = true;
    
    // Rotate particle field faster for more dynamic effect
    if (animationComplexity === 'full') {
      points.current.rotation.y = time * 0.1;
    }
    
    // Pulse effect for glow intensity
    if (material.current && capability === 'high') {
      material.current.opacity = 0.7 + Math.sin(time * 0.5) * 0.1;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={actualCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={material}
        size={size}
        color={themeColor}
        map={circleTexture}
        transparent
        opacity={0.7} // Increased from 0.6 for more intensity
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};
