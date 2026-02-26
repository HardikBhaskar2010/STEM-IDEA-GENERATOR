import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface FeatureNodeData {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  stat: string;
  accentColor: string;
}

interface FeaturePanelProps {
  feature: FeatureNodeData | null;
  onClose: () => void;
  isMobile?: boolean;
}

/**
 * Feature Panel Component
 * Desktop: Slides in from right (side panel)
 * Mobile: Slides up from bottom (bottom sheet)
 * Confident + Informative: Title + Description + Icon + Stats
 */
export const FeaturePanel: React.FC<FeaturePanelProps> = ({
  feature,
  onClose,
  isMobile = false,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!feature) return null;

  // Desktop: Side panel from right
  const desktopVariants = {
    hidden: { x: '100%', opacity: 0 },
    visible: { 
      x: 0, 
      opacity: 1,
      transition: { 
        type: 'spring', 
        damping: 25, 
        stiffness: 200 
      }
    },
    exit: { 
      x: '100%', 
      opacity: 0,
      transition: { duration: 0.2 }
    },
  };

  // Mobile: Bottom sheet
  const mobileVariants = {
    hidden: { y: '100%', opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { 
        type: 'spring', 
        damping: 25, 
        stiffness: 200 
      }
    },
    exit: { 
      y: '100%', 
      opacity: 0,
      transition: { duration: 0.2 }
    },
  };

  return (
    <AnimatePresence mode="wait">
      {feature && (
        <>
          {/* Backdrop - Click to close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
            data-testid="feature-panel-backdrop"
          />

          {/* Panel Content */}
          <motion.div
            key={feature.id}
            variants={isMobile ? mobileVariants : desktopVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`fixed z-50 bg-background border-l ${
              isMobile 
                ? 'bottom-0 left-0 right-0 rounded-t-3xl border-t max-h-[70vh]' 
                : 'top-0 right-0 h-full w-full max-w-md shadow-2xl'
            }`}
            style={{
              borderColor: feature.accentColor,
              boxShadow: isMobile 
                ? `0 -4px 24px ${feature.accentColor}20`
                : `0 0 48px ${feature.accentColor}20`,
            }}
            data-testid="feature-panel"
          >
            {/* Close Button */}
            <div className="absolute top-4 right-4 z-10">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full hover:bg-muted"
                data-testid="feature-panel-close"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content Container */}
            <div className="flex flex-col h-full overflow-y-auto p-8 pt-12">
              {/* Icon with accent color glow */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="flex items-center justify-center w-20 h-20 mb-6 rounded-2xl"
                style={{
                  backgroundColor: `${feature.accentColor}20`,
                  boxShadow: `0 0 32px ${feature.accentColor}30`,
                }}
              >
                <div style={{ color: feature.accentColor }}>
                  {feature.icon}
                </div>
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.3 }}
                className="text-3xl font-bold mb-4"
                style={{ color: feature.accentColor }}
              >
                {feature.title}
              </motion.h2>

              {/* Description */}
              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="text-lg text-muted-foreground mb-6 leading-relaxed"
              >
                {feature.description}
              </motion.p>

              {/* Stats - Credibility Anchor */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.3 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border"
                style={{
                  backgroundColor: `${feature.accentColor}10`,
                  borderColor: `${feature.accentColor}30`,
                }}
              >
                <div className="text-2xl">📊</div>
                <div className="text-sm font-medium" style={{ color: feature.accentColor }}>
                  {feature.stat}
                </div>
              </motion.div>

              {/* Spacer for mobile */}
              {isMobile && <div className="h-8" />}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};


