import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Check, ArrowRight, Code, Sparkles, Target, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface FeatureNodeData {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  stat: string;
  accentColor: string;
  // Enhanced technical data
  tagline?: string;
  technicalSpecs?: {
    label: string;
    value: string;
    icon?: React.ReactNode;
  }[];
  capabilities?: string[];
  metrics?: {
    label: string;
    value: string;
    subtext?: string;
  }[];
  useCases?: string[];
  techStack?: string[];
}

interface FeaturePanelProps {
  feature: FeatureNodeData | null;
  onClose: () => void;
  isMobile?: boolean;
}

/**
 * Enhanced Feature Panel Component
 * Premium UI/UX with comprehensive technical information
 * Desktop: Slides in from right (side panel)
 * Mobile: Slides up from bottom (bottom sheet)
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

  // Staggered animation for list items
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.2,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.3 }
    }
  };

  return (
    <AnimatePresence mode=\"wait\">
      {feature && (
        <>
          {/* Backdrop - Click to close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className=\"fixed inset-0 bg-black/60 backdrop-blur-md z-40\"
            onClick={onClose}
            data-testid=\"feature-panel-backdrop\"
          />

          {/* Panel Content */}
          <motion.div
            key={feature.id}
            variants={isMobile ? mobileVariants : desktopVariants}
            initial=\"hidden\"
            animate=\"visible\"
            exit=\"exit\"
            className={`fixed z-50 bg-background border-l ${
              isMobile 
                ? 'bottom-0 left-0 right-0 rounded-t-3xl border-t max-h-[85vh]' 
                : 'top-0 right-0 h-full w-full max-w-lg shadow-2xl'
            }`}
            style={{
              borderColor: feature.accentColor,
              boxShadow: isMobile 
                ? `0 -8px 32px ${feature.accentColor}25`
                : `0 0 64px ${feature.accentColor}25, inset 0 0 0 1px ${feature.accentColor}15`,
            }}
            data-testid=\"feature-panel\"
          >
            {/* Gradient Overlay */}
            <div 
              className=\"absolute inset-0 opacity-5 pointer-events-none rounded-t-3xl\"
              style={{
                background: `linear-gradient(135deg, ${feature.accentColor} 0%, transparent 100%)`,
              }}
            />

            {/* Close Button */}
            <div className=\"absolute top-4 right-4 z-10\">
              <Button
                variant=\"ghost\"
                size=\"icon\"
                onClick={onClose}
                className=\"rounded-full hover:bg-muted/80 backdrop-blur-sm transition-all hover:scale-110\"
                data-testid=\"feature-panel-close\"
              >
                <X className=\"w-5 h-5\" />
              </Button>
            </div>

            {/* Content Container */}
            <div className=\"flex flex-col h-full overflow-y-auto p-8 pt-12 space-y-6\">
              
              {/* Hero Section */}
              <div className=\"space-y-4\">
                {/* Icon with enhanced glow */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.4, type: 'spring' }}
                  className=\"flex items-center justify-center w-24 h-24 rounded-3xl relative\"
                  style={{
                    backgroundColor: `${feature.accentColor}15`,
                    boxShadow: `0 0 40px ${feature.accentColor}35, 0 0 80px ${feature.accentColor}20`,
                  }}
                >
                  <div 
                    className=\"absolute inset-0 rounded-3xl blur-xl opacity-50\"
                    style={{ backgroundColor: feature.accentColor }}
                  />
                  <div className=\"relative z-10\" style={{ color: feature.accentColor }}>
                    {feature.icon}
                  </div>
                </motion.div>

                {/* Tagline */}
                {feature.tagline && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.3 }}
                    className=\"inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold\"
                    style={{
                      backgroundColor: `${feature.accentColor}10`,
                      color: feature.accentColor,
                      border: `1px solid ${feature.accentColor}20`,
                    }}
                  >
                    <Sparkles className=\"w-3 h-3\" />
                    {feature.tagline}
                  </motion.div>
                )}

                {/* Title */}
                <motion.h2
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.18, duration: 0.3 }}
                  className=\"text-4xl font-bold leading-tight\"
                  style={{ color: feature.accentColor }}
                >
                  {feature.title}
                </motion.h2>

                {/* Description */}
                <motion.p
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.22, duration: 0.3 }}
                  className=\"text-base text-muted-foreground leading-relaxed\"
                >
                  {feature.description}
                </motion.p>
              </div>

              {/* Technical Specifications */}
              {feature.technicalSpecs && feature.technicalSpecs.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.26, duration: 0.3 }}
                  className=\"space-y-3\"
                >
                  <div className=\"flex items-center gap-2 text-sm font-semibold text-foreground/80\">
                    <Code className=\"w-4 h-4\" />
                    <span>Technical Specifications</span>
                  </div>
                  <div className=\"grid grid-cols-2 gap-3\">
                    {feature.technicalSpecs.map((spec, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + idx * 0.05, duration: 0.3 }}
                        className=\"p-3 rounded-xl border backdrop-blur-sm\"
                        style={{
                          backgroundColor: `${feature.accentColor}08`,
                          borderColor: `${feature.accentColor}20`,
                        }}
                      >
                        <div className=\"flex items-start gap-2\">
                          {spec.icon && (
                            <div className=\"mt-0.5\" style={{ color: feature.accentColor }}>
                              {spec.icon}
                            </div>
                          )}
                          <div className=\"flex-1 min-w-0\">
                            <div className=\"text-xs text-muted-foreground mb-1\">{spec.label}</div>
                            <div className=\"text-sm font-semibold text-foreground truncate\">
                              {spec.value}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Key Capabilities */}
              {feature.capabilities && feature.capabilities.length > 0 && (
                <motion.div
                  variants={containerVariants}
                  initial=\"hidden\"
                  animate=\"visible\"
                  className=\"space-y-3\"
                >
                  <div className=\"flex items-center gap-2 text-sm font-semibold text-foreground/80\">
                    <Target className=\"w-4 h-4\" />
                    <span>Key Capabilities</span>
                  </div>
                  <div className=\"space-y-2\">
                    {feature.capabilities.map((capability, idx) => (
                      <motion.div
                        key={idx}
                        variants={itemVariants}
                        className=\"flex items-start gap-3 p-3 rounded-lg transition-all hover:bg-muted/50\"
                        style={{
                          backgroundColor: `${feature.accentColor}05`,
                        }}
                      >
                        <div 
                          className=\"flex items-center justify-center w-5 h-5 rounded-full mt-0.5 flex-shrink-0\"
                          style={{
                            backgroundColor: `${feature.accentColor}20`,
                          }}
                        >
                          <Check className=\"w-3 h-3\" style={{ color: feature.accentColor }} />
                        </div>
                        <span className=\"text-sm text-foreground/90 leading-relaxed\">
                          {capability}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Performance Metrics */}
              {feature.metrics && feature.metrics.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.3 }}
                  className=\"space-y-3\"
                >
                  <div className=\"flex items-center gap-2 text-sm font-semibold text-foreground/80\">
                    <TrendingUp className=\"w-4 h-4\" />
                    <span>Performance Metrics</span>
                  </div>
                  <div className=\"grid grid-cols-2 gap-3\">
                    {feature.metrics.map((metric, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.38 + idx * 0.05, duration: 0.3 }}
                        className=\"p-4 rounded-xl border\"
                        style={{
                          backgroundColor: `${feature.accentColor}10`,
                          borderColor: `${feature.accentColor}30`,
                          boxShadow: `0 4px 12px ${feature.accentColor}15`,
                        }}
                      >
                        <div className=\"text-2xl font-bold mb-1\" style={{ color: feature.accentColor }}>
                          {metric.value}
                        </div>
                        <div className=\"text-xs text-muted-foreground font-medium\">
                          {metric.label}
                        </div>
                        {metric.subtext && (
                          <div className=\"text-xs text-muted-foreground/70 mt-1\">
                            {metric.subtext}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Use Cases */}
              {feature.useCases && feature.useCases.length > 0 && (
                <motion.div
                  variants={containerVariants}
                  initial=\"hidden\"
                  animate=\"visible\"
                  className=\"space-y-3\"
                >
                  <div className=\"flex items-center gap-2 text-sm font-semibold text-foreground/80\">
                    <Zap className=\"w-4 h-4\" />
                    <span>Use Cases</span>
                  </div>
                  <div className=\"space-y-2\">
                    {feature.useCases.map((useCase, idx) => (
                      <motion.div
                        key={idx}
                        variants={itemVariants}
                        className=\"flex items-center gap-3 p-3 rounded-lg transition-all hover:bg-muted/50 group cursor-pointer\"
                        style={{
                          backgroundColor: `${feature.accentColor}05`,
                        }}
                      >
                        <ArrowRight 
                          className=\"w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-1\" 
                          style={{ color: feature.accentColor }} 
                        />
                        <span className=\"text-sm text-foreground/90\">
                          {useCase}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Tech Stack */}
              {feature.techStack && feature.techStack.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.42, duration: 0.3 }}
                  className=\"space-y-3\"
                >
                  <div className=\"flex items-center gap-2 text-sm font-semibold text-foreground/80\">
                    <Code className=\"w-4 h-4\" />
                    <span>Technology Stack</span>
                  </div>
                  <div className=\"flex flex-wrap gap-2\">
                    {feature.techStack.map((tech, idx) => (
                      <motion.span
                        key={idx}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.45 + idx * 0.03, duration: 0.2 }}
                        className=\"px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105\"
                        style={{
                          backgroundColor: `${feature.accentColor}15`,
                          color: feature.accentColor,
                          border: `1px solid ${feature.accentColor}30`,
                        }}
                      >
                        {tech}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Primary Stat (Original) */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.48, duration: 0.3 }}
                className=\"flex items-center justify-between gap-3 px-5 py-4 rounded-xl border\"
                style={{
                  backgroundColor: `${feature.accentColor}12`,
                  borderColor: `${feature.accentColor}35`,
                  boxShadow: `0 4px 16px ${feature.accentColor}20`,
                }}
              >
                <div className=\"flex items-center gap-3\">
                  <div className=\"text-3xl\">📊</div>
                  <div>
                    <div className=\"text-sm font-semibold\" style={{ color: feature.accentColor }}>
                      {feature.stat}
                    </div>
                    <div className=\"text-xs text-muted-foreground\">
                      Platform Metric
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Spacer for mobile */}
              {isMobile && <div className=\"h-6\" />}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
