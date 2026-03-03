/**
 * Effects Index - Import all effects to register them
 * 
 * 🔥 FIX M-10: Deferred registration strategy
 * Effects are now loaded lazily when needed, not at app startup
 */

// Flag to track if effects have been registered
let effectsRegistered = false;

/**
 * Load and register all effects
 * Call this when MotionStudio loads or when a preset needs effects
 */
export async function loadAllEffects() {
  // Only load once
  if (effectsRegistered) return;
  
  console.log('🎨 Loading effects registry...');
  
  // Text Effects - All 8 effects ✅
  await import('./text/ShinyText');
  await import('./text/MetallicShimmer');
  await import('./text/Typewriter');
  await import('./text/FadeSlide');
  await import('./text/Glitch');
  await import('./text/MaskReveal');
  await import('./text/BlurReveal');
  await import('./text/GradientText');

  // Cursor Effects - All 6 effects ✅
  await import('./cursor/DotTrail');
  await import('./cursor/MagneticHover');
  await import('./cursor/SparkRipple');
  await import('./cursor/BlobCursor');
  await import('./cursor/GlowRing');
  await import('./cursor/PixelTrail');

  // Background Effects - All 7 effects ✅
  await import('./background/AnimatedGradient');
  await import('./background/StaticGradient');
  await import('./background/ParticleBackground');
  await import('./background/NoiseTexture');
  await import('./background/VideoBackground');
  await import('./background/FrameSequence');
  await import('./background/R3FScene');

  // UI Effects - All 5 effects ✅
  await import('./ui/ButtonHover');
  await import('./ui/CardEntrance');
  await import('./ui/SectionReveal');
  await import('./ui/PageTransition');
  await import('./ui/LoadingState');
  
  effectsRegistered = true;
  console.log('✅ Effects registry loaded');
}

export { effectsRegistry } from './core/EffectsRegistry';



