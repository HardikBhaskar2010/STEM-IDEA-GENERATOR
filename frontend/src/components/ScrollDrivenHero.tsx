import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { useScrollProgress } from '@/hooks/useScrollProgress';
import { ThreeHeroScene } from './ThreeHeroScene';
import { AnimatedHeroOverlay } from './ui/AnimatedHeroOverlay';

interface ScrollDrivenHeroProps {
  overlayContent?: React.ReactNode;
}

/**
 * Scroll-driven 3D hero section
 * 300vh container with fixed 100vh canvas
 * Performance-optimized with ref-based scroll tracking
 */
export const ScrollDrivenHero: React.FC<ScrollDrivenHeroProps> = ({
  overlayContent,
}) => {
  const { scrollProgressRef, containerRef, prefersReducedMotion } = useScrollProgress();
  const [displayProgress, setDisplayProgress] = useState(0);

  // Update display progress for UI overlay (throttled)
  useEffect(() => {
    let rafId: number;
    
    const updateDisplayProgress = () => {
      setDisplayProgress(scrollProgressRef.current);
      rafId = requestAnimationFrame(updateDisplayProgress);
    };

    // Update at 30fps for UI (smooth enough, saves performance)
    const interval = setInterval(() => {
      setDisplayProgress(scrollProgressRef.current);
    }, 33); // ~30fps

    return () => {
      clearInterval(interval);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [scrollProgressRef]);

  return (
    <>
      {/* Scrollable container - 300vh height */}
      <div
        ref={containerRef}
        className="relative w-full bg-black"
        style={{ height: '300vh' }}
        data-testid="scroll-driven-hero-container"
      >
        {/* Fixed canvas container - stays in viewport */}
        <div className="fixed top-0 left-0 w-full h-screen overflow-hidden z-0">
          {/* 3D Canvas */}
          <Canvas
            className="w-full h-full"
            dpr={[1, 2]}
            gl={{
              antialias: true,
              alpha: false,
              powerPreference: 'high-performance',
            }}
            data-testid="three-canvas"
          >
            <color attach="background" args={['#000000']} />
            <ThreeHeroScene
              scrollProgressRef={scrollProgressRef}
              prefersReducedMotion={prefersReducedMotion}
            />
          </Canvas>

          {/* UI Overlay with Framer Motion animations */}
          <AnimatedHeroOverlay
            scrollProgress={displayProgress}
            overlayContent={overlayContent}
          />

          {/* Vignette effect */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.5) 100%)',
            }}
          />
        </div>
      </div>

      {/* Gradient transition to next section */}
      <div
        className="relative w-full h-32 -mt-32 z-10"
        style={{
          background: 'linear-gradient(to bottom, transparent, hsl(var(--background)))',
        }}
      />
    </>
  );
};

export default ScrollDrivenHero;

