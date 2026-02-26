import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { useScrollProgress } from '@/hooks/useScrollProgress';
import { ThreeHeroScene } from './ThreeHeroScene';
import { AnimatedHeroOverlay } from './ui/AnimatedHeroOverlay';
import { FeaturePanel, type FeatureNodeData } from './ui/FeaturePanel';
import { Zap, Rocket, Sparkles, Brain } from 'lucide-react';

// Feature node metadata (credibility anchored)
const FEATURE_NODES: Record<string, FeatureNodeData> = {
  'core-engine': {
    id: 'core-engine',
    title: 'AI Idea Generation',
    description: 'Generate structured STEM ideas instantly with our AI-powered engine. Transform curiosity into actionable projects.',
    icon: <Brain className="w-10 h-10" />,
    stat: '500+ idea patterns trained',
    accentColor: '#8B5CF6',
  },
  'component-system': {
    id: 'component-system',
    title: '500+ Components',
    description: 'Access a vast library of reusable building blocks. Pre-built, tested, and ready to integrate into your projects.',
    icon: <Rocket className="w-10 h-10" />,
    stat: '500+ components available',
    accentColor: '#3B82F6',
  },
  'learning-sphere': {
    id: 'learning-sphere',
    title: 'Learn By Doing',
    description: 'Hands-on tutorials and challenges that make learning fun and engaging. Build real projects while mastering new skills.',
    icon: <Sparkles className="w-10 h-10" />,
    stat: 'Interactive learning paths',
    accentColor: '#EC4899',
  },
  'innovation-engine': {
    id: 'innovation-engine',
    title: 'Innovation Engine',
    description: 'Turn ideas into reality with our comprehensive toolset. From concept to creation in one seamless platform.',
    icon: <Zap className="w-10 h-10" />,
    stat: 'End-to-end creation flow',
    accentColor: '#A78BFA',
  },
};

interface ScrollDrivenHeroProps {
  overlayContent?: React.ReactNode;
}

/**
 * Scroll-driven 3D hero section
 * 500vh container with fixed 100vh canvas
 * Timeline: 0-80vh (Atmosphere) → 80-250vh (Node Approach) → 250-420vh (Neural Path Reveal) → 420-500vh (Feature Focus)
 * Performance-optimized with ref-based scroll tracking
 */
export const ScrollDrivenHero: React.FC<ScrollDrivenHeroProps> = ({
  overlayContent,
}) => {
  const { scrollProgressRef, containerRef, prefersReducedMotion } = useScrollProgress();
  const [displayProgress, setDisplayProgress] = useState(0);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

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

  // Detect mobile for responsive behavior
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Get selected feature data
  const selectedFeature = selectedNodeId ? FEATURE_NODES[selectedNodeId] : null;

  return (
    <>
      {/* Scrollable container - 500vh height (extended for Luna V2) */}
      <div
        ref={containerRef}
        className="relative w-full bg-black"
        style={{ height: '500vh' }}
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
              hoveredNodeId={hoveredNodeId}
              selectedNodeId={selectedNodeId}
              onNodeHover={setHoveredNodeId}
              onNodeClick={setSelectedNodeId}
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

      {/* Feature Panel - Slides in from right (desktop) or bottom (mobile) */}
      <FeaturePanel 
        feature={selectedFeature}
        onClose={() => setSelectedNodeId(null)}
        isMobile={isMobile}
      />

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



