/**
 * EarthScene.tsx
 * Replaced with WireGlobe — a fully procedural, data-driven globe system.
 * ❌ Removed: GLB model, heavy textures, baked lighting, static planet.glb
 * ✅ Added: GeoJSON-style dots, grid lines, starfield, pins, pulse waves, arc trails, interaction
 */

import { motion } from 'framer-motion';
import { WireGlobe } from '@/components/globe';

const EarthScene = () => {
  return (
    <section 
      className="relative py-16 w-full globe-section"
      style={{
        background: `
          radial-gradient(circle at 50% 45%, rgba(56,189,248,0.12), transparent 60%),
          linear-gradient(to bottom, rgba(15,23,42,0.3) 0%, #020617 30%, #000000 100%)
        `
      }}
    >
      {/* Top blur divider for cinematic fade */}
      <div 
        className="absolute top-[-80px] left-0 right-0 h-[160px] pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(99,102,241,0.25), transparent)',
          filter: 'blur(40px)',
          zIndex: 0
        }}
      />

      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="text-center mb-6 px-4"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/50 bg-background/30 backdrop-blur-md mb-6 text-sm text-foreground/70">
          🌍 Connected Nodes of Discovery
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold font-display mb-4">
          <span className="text-gradient-primary">Global Innovation</span> Network
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto text-base leading-relaxed">
          Tap any glowing node to explore projects, tools, and innovation zones.
        </p>
      </motion.div>

      {/* Globe */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        <WireGlobe
          height="750px"
          rotationSpeed={0.055}
          showGrid={true}
          showStars
          enableInteraction
        />
      </motion.div>
    </section>
  );
};

export default EarthScene;
