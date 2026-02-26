import React, { useEffect, useState } from 'react';
import { useScrollFrameAnimation } from '@/hooks/useScrollFrameAnimation';

interface ScrollCinematicHeroProps {
  totalFrames?: number;
  frameBasePath?: string;
  scrollMultiplier?: number;
  overlayContent?: React.ReactNode;
  onAnimationComplete?: () => void;
}

const ScrollCinematicHero: React.FC<ScrollCinematicHeroProps> = ({
  totalFrames = 120,
  frameBasePath = '/frames/ezgif-frame-',
  scrollMultiplier = 2,
  overlayContent,
  onAnimationComplete,
}) => {
  const [showContent, setShowContent] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);

  // Generate frame path based on index
  const framePathPattern = (index: number) => {
    const frameNumber = String(index + 1).padStart(3, '0');
    return `${frameBasePath}${frameNumber}.webp`;
  };

  const {
    currentFrame,
    scrollProgress,
    canvasRef,
    containerRef,
    isLoading,
    loadProgress,
    isFirstFrameReady,
  } = useScrollFrameAnimation({
    totalFrames,
    framePathPattern,
    scrollMultiplier,
  });

  // Fade in first frame smoothly
  useEffect(() => {
    if (isFirstFrameReady && !fadeIn) {
      // Small delay for smooth fade-in
      setTimeout(() => setFadeIn(true), 100);
    }
  }, [isFirstFrameReady, fadeIn]);

  // Show overlay content after initial load
  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => setShowContent(true), 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Trigger completion callback
  useEffect(() => {
    if (scrollProgress >= 0.98 && onAnimationComplete) {
      onAnimationComplete();
    }
  }, [scrollProgress, onAnimationComplete]);

  return (
    <>
      {/* Hero Container - Scrollable height */}
      <div
        ref={containerRef}
        className="relative w-full"
        style={{
          height: `${scrollMultiplier * 100}vh`,
          backgroundColor: '#000',
        }}
        data-testid="cinematic-hero-container"
      >
        {/* Fixed Canvas Container - STAYS IN VIEWPORT */}
        <div
          className="fixed top-0 left-0 w-full h-screen overflow-hidden z-0"
          style={{
            backgroundColor: '#000',
            position: 'fixed',
          }}
        >
          {/* Pre-loading state with animated pulse */}
          {!isFirstFrameReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-black">
              {/* Animated loading pulse */}
              <div className="relative">
                <div className="w-20 h-20 border-4 border-white/20 rounded-full animate-ping absolute"></div>
                <div className="w-20 h-20 border-4 border-t-white border-r-white/50 border-b-white/30 border-l-white/10 rounded-full animate-spin"></div>
              </div>
              <div className="text-white/80 text-lg font-medium mt-8 animate-pulse">
                Preparing Experience
              </div>
              <div className="text-white/50 text-sm mt-2">
                {Math.round(loadProgress)}%
              </div>
            </div>
          )}

          {/* Canvas Element with smooth fade-in */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full transition-opacity duration-700"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: fadeIn ? 1 : 0,
            }}
            data-testid="cinematic-canvas"
          />

          {/* Overlay Content - Fades out on scroll */}
          {!isLoading && showContent && fadeIn && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 transition-opacity duration-500"
              style={{
                opacity: Math.max(0, 1 - scrollProgress * 2),
              }}
            >
              <div className="text-center space-y-6 px-4 pointer-events-auto">
                {overlayContent || (
                  <>
                    <h1 className="text-6xl md:text-8xl font-black text-white tracking-tight drop-shadow-2xl">
                      <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-200 to-purple-200">
                        Welcome
                      </span>
                    </h1>
                    <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto drop-shadow-lg">
                      Scroll to explore the world
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Scroll Progress Indicator */}
          {!isLoading && fadeIn && (
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
              <div
                className="flex flex-col items-center space-y-2 transition-opacity duration-500"
                style={{
                  opacity: scrollProgress < 0.1 ? 1 : 0,
                }}
              >
                <div className="text-white/70 text-sm font-medium">
                  Scroll to continue
                </div>
                <div className="animate-bounce">
                  <svg
                    className="w-6 h-6 text-white/70"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Debug Info (development only) */}
          {process.env.NODE_ENV === 'development' && fadeIn && (
            <div className="absolute top-4 right-4 bg-black/80 text-white text-xs p-3 rounded-lg font-mono z-50 backdrop-blur-sm">
              <div>Frame: {currentFrame + 1}/{totalFrames}</div>
              <div>Progress: {(scrollProgress * 100).toFixed(1)}%</div>
              <div>FPS Target: 60</div>
              <div className="mt-1 text-green-400">
                {isLoading ? '⏳ Loading...' : '✓ Ready'}
              </div>
            </div>
          )}

          {/* Vignette Effect */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-700"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)',
              opacity: fadeIn ? 1 : 0,
            }}
          />
        </div>
      </div>

      {/* Gradient Transition to Next Section */}
      <div
        className="relative w-full h-32 -mt-32 z-10"
        style={{
          background: 'linear-gradient(to bottom, transparent, hsl(var(--background)))',
        }}
      />
    </>
  );
};

export default ScrollCinematicHero;


