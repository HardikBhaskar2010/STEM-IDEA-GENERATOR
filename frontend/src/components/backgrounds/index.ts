/**
 * Reactbits Background Components Index
 * 
 * Central export point for all wrapped reactbits background components.
 * Each component is wrapped with standardized interface for theme adaptation,
 * animation controls, and error handling.
 * 
 * Validates: Requirements 1.1, 7.1, 7.2, 7.4, 17.1, 17.3
 */

// Fluid Category
export { LiquidEther } from './LiquidEther';
export { Silk } from './Silk';
export { Plasma } from './Plasma';

// Geometric Category
export { Prism } from './Prism';
export { FloatingLines } from './FloatingLines';
export { GridScan } from './GridScan';
export { Beams } from './Beams';

// Particle Category
export { PixelBlast } from './PixelBlast';
export { Particles } from './Particles';
export { PixelSnow } from './PixelSnow';

// Gradient Category
export { ColorBends } from './ColorBends';
export { GradientBlinds } from './GradientBlinds';
export { Grainient } from './Grainient';
export { PrismaticBurst } from './PrismaticBurst';
export { Dither } from './Dither';

// Atmospheric Category
export { DarkVeil } from './DarkVeil';
export { LightPillar } from './LightPillar';
export { LightRays } from './LightRays';
export { Aurora } from './Aurora';
export { Lightning } from './Lightning';
export { Galaxy } from './Galaxy';

/**
 * Map of background IDs to their components for dynamic imports
 */
export const backgroundComponents = {
  // Fluid
  'liquid-ether': () => import('./LiquidEther'),
  'silk': () => import('./Silk'),
  'plasma': () => import('./Plasma'),
  
  // Geometric
  'prism': () => import('./Prism'),
  'floating-lines': () => import('./FloatingLines'),
  'grid-scan': () => import('./GridScan'),
  'beams': () => import('./Beams'),
  
  // Particle
  'pixel-blast': () => import('./PixelBlast'),
  'particles': () => import('./Particles'),
  'pixel-snow': () => import('./PixelSnow'),
  
  // Gradient
  'color-bends': () => import('./ColorBends'),
  'gradient-blinds': () => import('./GradientBlinds'),
  'grainient': () => import('./Grainient'),
  'prismatic-burst': () => import('./PrismaticBurst'),
  'dither': () => import('./Dither'),
  
  // Atmospheric
  'dark-veil': () => import('./DarkVeil'),
  'light-pillar': () => import('./LightPillar'),
  'light-rays': () => import('./LightRays'),
  'aurora': () => import('./Aurora'),
  'lightning': () => import('./Lightning'),
  'galaxy': () => import('./Galaxy'),
} as const;

/**
 * Type for background component IDs
 */
export type BackgroundComponentId = keyof typeof backgroundComponents;

/**
 * Helper function to dynamically load a background component
 * 
 * @param id - Background component ID
 * @returns Promise resolving to the background component module
 */
export async function loadBackgroundComponent(id: BackgroundComponentId) {
  const loader = backgroundComponents[id];
  if (!loader) {
    throw new Error(`Background component "${id}" not found`);
  }
  return loader();
}
