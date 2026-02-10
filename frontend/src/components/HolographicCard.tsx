'use client';

import React, { useRef, useState, useEffect } from 'react';
import { usePreferences } from '@/contexts/PreferencesContext';

interface HolographicCardProps {
  children: React.ReactNode;
  className?: string;
  intensity?: 'low' | 'medium' | 'high' | 'ultra';
  enableTilt?: boolean;
  enableParticles?: boolean;
  glowColor?: string;
}

export const HolographicCard: React.FC<HolographicCardProps> = ({
  children,
  className = '',
  intensity = 'medium',
  enableTilt = true,
  enableParticles = true,
  glowColor
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [isHovering, setIsHovering] = useState(false);
  const { colorTheme } = usePreferences();
  const animationFrameRef = useRef<number>();

  const intensityMap = {
    low: { tilt: 2, shine: 0.15, particles: 8 },
    medium: { tilt: 3, shine: 0.25, particles: 12 },
    high: { tilt: 5, shine: 0.35, particles: 18 },
    ultra: { tilt: 8, shine: 0.5, particles: 25 }
  };

  const config = intensityMap[intensity];

  // Get theme color
  const getThemeColor = () => {
    const themeColors: Record<string, string> = {
      'allblack': '#a3a3a3',
      'purplefusion': '#a855f7',
      'pinkblossom': '#ec4899',
      'oceanblue': '#3b82f6',
      'matrixgreen': '#10b981',
      'cyberred': '#ef4444',
      'sunsetorange': '#f97316'
    };
    return glowColor || themeColors[colorTheme] || '#a855f7';
  };

  const themeColor = getThemeColor();

  // Particle system
  useEffect(() => {
    if (!enableParticles || !canvasRef.current || !isHovering) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateCanvasSize = () => {
      if (cardRef.current) {
        canvas.width = cardRef.current.offsetWidth;
        canvas.height = cardRef.current.offsetHeight;
      }
    };
    updateCanvasSize();

    interface Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
      hue: number;
    }

    // Create particles
    const particles: Particle[] = [];
    for (let i = 0; i < config.particles; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 2,
        speedY: (Math.random() - 0.5) * 2,
        opacity: Math.random() * 0.5 + 0.2,
        hue: Math.random() * 60 - 30 // Variation in hue
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        // Update position
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Draw particle with glow (reduced intensity)
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size * 2
        );
        gradient.addColorStop(0, `${themeColor}${Math.floor(particle.opacity * 0.5 * 255).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw core (reduced opacity)
        ctx.fillStyle = `${themeColor}${Math.floor((particle.opacity * 0.4) * 255).toString(16).padStart(2, '0')}`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isHovering, enableParticles, config.particles, themeColor]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enableTilt || !cardRef.current) return;

    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -config.tilt;
    const rotateY = ((x - centerX) / centerX) * config.tilt;
    
    setRotation({ x: rotateX, y: rotateY });
    setMousePos({ x: x / rect.width, y: y / rect.height });
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setRotation({ x: 0, y: 0 });
    setMousePos({ x: 0.5, y: 0.5 });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative ${className}`}
      style={{
        transform: enableTilt
          ? `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`
          : 'none',
        transition: isHovering ? 'transform 0.1s ease-out' : 'transform 0.5s ease-out',
        transformStyle: 'preserve-3d'
      }}
    >
      {/* Particle Canvas */}
      {enableParticles && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 rounded-2xl pointer-events-none z-10"
          style={{ opacity: isHovering ? 1 : 0, transition: 'opacity 0.3s ease-out' }}
        />
      )}

      {/* Enhanced holographic shine effect */}
      <div
        className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none z-20"
        style={{
          opacity: isHovering ? config.shine * 0.6 : 0,
          transition: 'opacity 0.3s ease-out',
          background: `
            radial-gradient(
              circle at ${mousePos.x * 100}% ${mousePos.y * 100}%,
              ${themeColor}33 0%,
              ${themeColor}26 20%,
              ${themeColor}1a 40%,
              transparent 70%
            )
          `,
          mixBlendMode: 'screen'
        }}
      />

      {/* Prismatic rainbow gradient */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none z-20"
        style={{
          opacity: isHovering ? 0.2 : 0,
          transition: 'opacity 0.3s ease-out',
          background: `
            conic-gradient(
              from ${rotation.y * 2 + 135}deg at ${mousePos.x * 100}% ${mousePos.y * 100}%,
              rgba(168, 85, 247, 0.3),
              rgba(236, 72, 153, 0.3),
              rgba(59, 130, 246, 0.3),
              rgba(16, 185, 129, 0.3),
              rgba(245, 158, 11, 0.3),
              rgba(239, 68, 68, 0.3),
              rgba(168, 85, 247, 0.3)
            )
          `,
          mixBlendMode: 'color-dodge'
        }}
      />

      {/* Animated border gradient */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none z-20"
        style={{
          opacity: isHovering ? 0.4 : 0,
          transition: 'opacity 0.3s ease-out',
          background: `
            linear-gradient(
              ${rotation.y * 3 + 135}deg,
              ${themeColor}66,
              rgba(236, 72, 153, 0.4),
              rgba(59, 130, 246, 0.4),
              ${themeColor}66
            )
          `,
          padding: '1px',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude'
        }}
      />

      {/* Multiple prismatic light spots */}
      {isHovering && (
        <>
          <div
            className="absolute w-32 h-32 rounded-full blur-3xl pointer-events-none z-10"
            style={{
              top: `${mousePos.y * 100}%`,
              left: `${mousePos.x * 100}%`,
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(circle, ${themeColor}33, transparent)`,
              opacity: 0.4,
              transition: 'all 0.1s ease-out',
              animation: 'pulse 2s ease-in-out infinite'
            }}
          />
          <div
            className="absolute w-24 h-24 rounded-full blur-2xl pointer-events-none z-10"
            style={{
              top: `${(1 - mousePos.y) * 80 + 10}%`,
              left: `${(1 - mousePos.x) * 80 + 10}%`,
              transform: 'translate(-50%, -50%)',
              background: 'radial-gradient(circle, rgba(236, 72, 153, 0.2), transparent)',
              opacity: 0.3,
              transition: 'all 0.15s ease-out'
            }}
          />
          <div
            className="absolute w-20 h-20 rounded-full blur-xl pointer-events-none z-10"
            style={{
              top: `${mousePos.y * 60 + 20}%`,
              left: `${(1 - mousePos.x) * 60 + 20}%`,
              transform: 'translate(-50%, -50%)',
              background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15), transparent)',
              opacity: 0.25,
              transition: 'all 0.2s ease-out'
            }}
          />
        </>
      )}

      {/* Content */}
      <div 
        className="relative z-30"
        style={{
          transform: 'translateZ(30px)'
        }}
      >
        {children}
      </div>

      {/* Enhanced ambient glow */}
      <div
        className="absolute -inset-2 rounded-2xl blur-2xl -z-10 transition-opacity duration-300"
        style={{
          opacity: isHovering ? 0.3 : 0,
          background: `linear-gradient(135deg, ${themeColor}40, rgba(236, 72, 153, 0.25), rgba(59, 130, 246, 0.25))`,
          animation: isHovering ? 'pulse 3s ease-in-out infinite' : 'none'
        }}
      />
    </div>
  );
};