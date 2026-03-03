/**
 * Energy Path Utilities
 * SVG path animation helpers for creating energy flow effects
 */

import anime from 'animejs';

export interface EnergyPathOptions {
  duration?: number;
  easing?: string;
  loop?: boolean;
  direction?: 'normal' | 'reverse' | 'alternate';
  delay?: number;
  strokeColor?: string;
  strokeWidth?: number;
  glowIntensity?: number;
}

export interface PathPoint {
  x: number;
  y: number;
}

/**
 * Generate SVG path string from array of points
 */
export const generatePathString = (points: PathPoint[]): string => {
  if (points.length === 0) return '';
  
  const [start, ...rest] = points;
  let path = `M ${start.x} ${start.y}`;
  
  // Use smooth curves for organic energy flow
  for (let i = 0; i < rest.length; i++) {
    const point = rest[i];
    const prevPoint = i > 0 ? rest[i - 1] : start;
    
    // Calculate control points for smooth curves
    const controlX = (prevPoint.x + point.x) / 2;
    const controlY = (prevPoint.y + point.y) / 2;
    
    path += ` Q ${controlX} ${controlY}, ${point.x} ${point.y}`;
  }
  
  return path;
};

/**
 * Create energy flow animation on SVG path
 */
export const animateEnergyPath = (
  pathElement: SVGPathElement | string,
  options: EnergyPathOptions = {}
) => {
  const {
    duration = 2000,
    easing = 'easeInOutSine',
    loop = true,
    direction = 'alternate',
    delay = 0,
  } = options;

  const path = typeof pathElement === 'string' 
    ? document.querySelector<SVGPathElement>(pathElement)
    : pathElement;

  if (!path) {
    console.warn('Energy path element not found');
    return null;
  }

  // Set up dash array for stroke animation
  const pathLength = path.getTotalLength();
  path.style.strokeDasharray = `${pathLength}`;
  path.style.strokeDashoffset = `${pathLength}`;

  // Animate the stroke
  return anime({
    targets: path,
    strokeDashoffset: [pathLength, 0],
    easing,
    duration,
    loop,
    direction,
    delay,
  });
};

/**
 * Get point at specific position along path (0-1)
 */
export const getPointAtPosition = (
  pathElement: SVGPathElement,
  position: number
): { x: number; y: number } => {
  const length = pathElement.getTotalLength();
  const point = pathElement.getPointAtLength(position * length);
  return { x: point.x, y: point.y };
};

/**
 * Animate particle following path
 */
export const animateParticleOnPath = (
  particleElement: HTMLElement | string,
  pathElement: SVGPathElement | string,
  options: EnergyPathOptions = {}
) => {
  const {
    duration = 4000,
    easing = 'linear',
    loop = true,
    delay = 0,
  } = options;

  const particle = typeof particleElement === 'string'
    ? document.querySelector<HTMLElement>(particleElement)
    : particleElement;

  const path = typeof pathElement === 'string'
    ? document.querySelector<SVGPathElement>(pathElement)
    : pathElement;

  if (!particle || !path) {
    console.warn('Particle or path element not found');
    return null;
  }

  // Create path follower animation
  return anime({
    targets: particle,
    translateX: anime.path(path)('x'),
    translateY: anime.path(path)('y'),
    easing,
    duration,
    loop,
    delay,
  });
};

/**
 * Create connection path between two elements
 */
export const createConnectionPath = (
  element1: HTMLElement,
  element2: HTMLElement,
  curvature: number = 0.3
): string => {
  const rect1 = element1.getBoundingClientRect();
  const rect2 = element2.getBoundingClientRect();

  const x1 = rect1.left + rect1.width / 2;
  const y1 = rect1.top + rect1.height / 2;
  const x2 = rect2.left + rect2.width / 2;
  const y2 = rect2.top + rect2.height / 2;

  // Calculate control point for curve
  const dx = x2 - x1;
  const dy = y2 - y1;
  const controlX = x1 + dx / 2;
  const controlY = y1 + dy / 2 - Math.abs(dx) * curvature;

  return `M ${x1} ${y1} Q ${controlX} ${controlY}, ${x2} ${y2}`;
};

/**
 * Generate random energy path between bounds
 */
export const generateRandomEnergyPath = (
  width: number,
  height: number,
  segments: number = 5
): PathPoint[] => {
  const points: PathPoint[] = [];
  
  // Start point
  points.push({ x: 0, y: height / 2 });
  
  // Generate intermediate points
  for (let i = 1; i < segments; i++) {
    points.push({
      x: (width / segments) * i + (Math.random() - 0.5) * 50,
      y: Math.random() * height,
    });
  }
  
  // End point
  points.push({ x: width, y: height / 2 });
  
  return points;
};

/**
 * Apply glow filter to path
 */
export const applyEnergyGlow = (
  pathElement: SVGPathElement,
  color: string = 'hsl(270, 100%, 65%)',
  intensity: number = 8
): void => {
  pathElement.style.filter = `drop-shadow(0 0 ${intensity}px ${color})`;
};
