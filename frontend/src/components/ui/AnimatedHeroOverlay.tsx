import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface AnimatedHeroOverlayProps {
  scrollProgress: number;
  overlayContent?: React.ReactNode;
}

/**
 * Framer Motion UI overlay for 3D hero
 * Fades out as user scrolls based on scroll progress
 */
export const AnimatedHeroOverlay: React.FC<AnimatedHeroOverlayProps> = ({
  scrollProgress,
  overlayContent,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Delay initial fade-in for smooth entrance
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Calculate opacity based on scroll progress
  const opacity = Math.max(0, 1 - scrollProgress * 2);
  const shouldShow = opacity > 0.05;

  if (!shouldShow) return null;

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10"
      style={{ opacity }}
    >
      {/* Main content with stagger animations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="text-center space-y-6 px-4 pointer-events-auto"
      >
        {overlayContent || (
          <>
            {/* Default headline */}
            <motion.h1
              initial={{ opacity: 0, scale: 0.95 }}
              animate={isVisible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
              transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
              className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tight drop-shadow-2xl"
            >
              <span
                className="inline-block bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(to right, #ffffff, #e0e7ff, #c7d2fe)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                STEM
              </span>
            </motion.h1>

            {/* Subheadline with stagger */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
              className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto drop-shadow-lg"
            >
              Embark on a journey through worlds of creativity
            </motion.p>
          </>
        )}
      </motion.div>

      {/* Scroll indicator with bounce animation */}
      {scrollProgress < 0.1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="absolute bottom-12 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <motion.span
            className="text-white/70 text-sm font-medium"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            Scroll to explore
          </motion.span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <ChevronDown className="w-6 h-6 text-white/70" />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

