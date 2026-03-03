import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FocusedNodeData {
  id: string;
  title: string;
  color: string;
}

interface FocusedNodeOverlayProps {
  focusedNode: FocusedNodeData | null;
}

/**
 * Subtle text reveal overlay for focused nodes
 * Staged transitions: fade out previous (200ms) → fade in new (400ms)
 * No background box, no CTA - premium minimalism
 */
export const FocusedNodeOverlay: React.FC<FocusedNodeOverlayProps> = ({ focusedNode }) => {
  const [displayNode, setDisplayNode] = useState<FocusedNodeData | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (focusedNode) {
      if (displayNode && displayNode.id !== focusedNode.id) {
        // Staged transition: fade out first
        setIsExiting(true);
        setTimeout(() => {
          setDisplayNode(focusedNode);
          setIsExiting(false);
        }, 200); // Match exit duration
      } else {
        setDisplayNode(focusedNode);
      }
    } else {
      // Fade out when no focus
      setIsExiting(true);
      setTimeout(() => {
        setDisplayNode(null);
        setIsExiting(false);
      }, 200);
    }
  }, [focusedNode]);

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-32 pointer-events-none z-20">
      <AnimatePresence mode="wait">
        {displayNode && !isExiting && (
          <motion.div
            key={displayNode.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="flex flex-col items-center gap-3"
          >
            {/* Title */}
            <h3
              className="text-3xl md:text-4xl font-bold tracking-tight text-center drop-shadow-lg"
              style={{ color: displayNode.color }}
            >
              {displayNode.title}
            </h3>

            {/* Expanding underline */}
            <motion.div
              className="h-px rounded-full"
              style={{
                background: `linear-gradient(to right, transparent, ${displayNode.color}, transparent)`,
              }}
              initial={{ width: 0 }}
              animate={{ width: '200px' }}
              exit={{ width: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
