/**
 * Background Effects Module - Barrel Export
 * 
 * Exports all background effects for easy importing
 */

export { AnimatedGradient } from './AnimatedGradient';
export { StaticGradient } from './StaticGradient';
export { ParticleBackground } from './ParticleBackground';
export { NoiseTexture } from './NoiseTexture';
export { VideoBackground } from './VideoBackground';
export { FrameSequence } from './FrameSequence';
export { R3FScene } from './R3FScene';
export { AdvancedParticleBackground } from './AdvancedParticleBackground';

// Import effects for auto-registration
import './AnimatedGradient';
import './StaticGradient';
import './ParticleBackground';
import './NoiseTexture';
import './VideoBackground';
import './FrameSequence';
import './R3FScene';
import './AdvancedParticleBackground';
