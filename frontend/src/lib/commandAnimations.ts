/**
 * Command Bridge Animation Presets
 * Reusable anime.js animation configurations
 */

import anime from 'animejs';

export const TIMING = {
  microInteraction: 200,    // Button hover, clicks
  cardAnimation: 400,       // Card entrance, state change
  energyFlow: 2000,         // Energy line drawing
  particleLoop: 6000,       // Background particle movement
  glowPulse: 3000,         // Glow breathing effect
  letterReveal: 50,        // Per-letter animation
  numberCount: 1500,       // Number counter animation
};

export const EASING = {
  snap: 'cubicBezier(0.68, -0.55, 0.265, 1.55)',  // Spring effect
  smooth: 'easeOutExpo',                           // Smooth deceleration
  flow: 'easeInOutSine',                          // Sine wave
  linear: 'linear',                                // Constant speed
  bounce: 'easeOutBounce',                        // Bounce effect
};

/**
 * Floating animation preset
 */
export const floatingAnimation = (
  target: string | HTMLElement,
  distance: number = 4,
  duration: number = 3000
) => {
  return anime({
    targets: target,
    translateY: [-distance, distance],
    easing: EASING.flow,
    duration,
    loop: true,
    direction: 'alternate',
  });
};

/**
 * Scale pulse animation
 */
export const scalePulse = (
  target: string | HTMLElement,
  scale: number = 1.05,
  duration: number = 1000
) => {
  return anime({
    targets: target,
    scale: [1, scale, 1],
    easing: EASING.flow,
    duration,
    loop: true,
  });
};

/**
 * Fade in animation
 */
export const fadeIn = (
  target: string | HTMLElement,
  duration: number = TIMING.cardAnimation,
  delay: number = 0
) => {
  return anime({
    targets: target,
    opacity: [0, 1],
    easing: EASING.smooth,
    duration,
    delay,
  });
};

/**
 * Slide in from direction
 */
export const slideIn = (
  target: string | HTMLElement,
  direction: 'left' | 'right' | 'top' | 'bottom' = 'bottom',
  distance: number = 50,
  duration: number = TIMING.cardAnimation,
  delay: number = 0
) => {
  const transforms: Record<string, any> = {
    left: { translateX: [-distance, 0] },
    right: { translateX: [distance, 0] },
    top: { translateY: [-distance, 0] },
    bottom: { translateY: [distance, 0] },
  };

  return anime({
    targets: target,
    ...transforms[direction],
    opacity: [0, 1],
    easing: EASING.smooth,
    duration,
    delay,
  });
};

/**
 * Rotate animation
 */
export const rotate = (
  target: string | HTMLElement,
  degrees: number = 360,
  duration: number = TIMING.particleLoop,
  loop: boolean = true
) => {
  return anime({
    targets: target,
    rotate: degrees,
    easing: EASING.linear,
    duration,
    loop,
  });
};

/**
 * Number counter animation
 */
export const countNumber = (
  target: HTMLElement,
  from: number,
  to: number,
  duration: number = TIMING.numberCount,
  onUpdate?: (value: number) => void
) => {
  const obj = { value: from };

  return anime({
    targets: obj,
    value: to,
    round: 1,
    easing: EASING.smooth,
    duration,
    update: () => {
      if (target) {
        target.textContent = Math.round(obj.value).toString();
      }
      if (onUpdate) {
        onUpdate(obj.value);
      }
    },
  });
};

/**
 * Letter-by-letter text reveal
 */
export const revealText = (
  target: string | HTMLElement,
  duration: number = TIMING.letterReveal,
  stagger: number = TIMING.letterReveal
) => {
  const element = typeof target === 'string' 
    ? document.querySelector<HTMLElement>(target)
    : target;

  if (!element) return null;

  // Wrap each letter in a span
  const text = element.textContent || '';
  element.innerHTML = text
    .split('')
    .map((char) => `<span class="letter" style="display:inline-block;opacity:0">${char === ' ' ? '&nbsp;' : char}</span>`)
    .join('');

  return anime({
    targets: element.querySelectorAll('.letter'),
    opacity: [0, 1],
    translateY: [20, 0],
    easing: EASING.smooth,
    duration,
    delay: anime.stagger(stagger),
  });
};

/**
 * Glow intensity animation
 */
export const glowPulse = (
  target: string | HTMLElement,
  intensity: { min: number; max: number } = { min: 0.3, max: 0.8 },
  duration: number = TIMING.glowPulse
) => {
  return anime({
    targets: target,
    opacity: [intensity.min, intensity.max],
    easing: EASING.flow,
    duration,
    loop: true,
    direction: 'alternate',
  });
};

/**
 * Draw SVG path animation
 */
export const drawPath = (
  target: SVGPathElement | string,
  duration: number = TIMING.energyFlow,
  delay: number = 0
) => {
  const path = typeof target === 'string'
    ? document.querySelector<SVGPathElement>(target)
    : target;

  if (!path) return null;

  const length = path.getTotalLength();
  path.style.strokeDasharray = `${length}`;
  path.style.strokeDashoffset = `${length}`;

  return anime({
    targets: path,
    strokeDashoffset: [length, 0],
    easing: EASING.smooth,
    duration,
    delay,
  });
};

/**
 * Staggered children animation
 */
export const staggerChildren = (
  parent: string | HTMLElement,
  childSelector: string,
  animation: any,
  stagger: number = 100
) => {
  const container = typeof parent === 'string'
    ? document.querySelector<HTMLElement>(parent)
    : parent;

  if (!container) return null;

  const children = container.querySelectorAll(childSelector);

  return anime({
    targets: children,
    ...animation,
    delay: anime.stagger(stagger),
  });
};

/**
 * Click spark effect
 */
export const clickSpark = (
  x: number,
  y: number,
  color: string = 'hsl(270, 100%, 65%)'
) => {
  // Create spark element
  const spark = document.createElement('div');
  spark.style.position = 'fixed';
  spark.style.left = `${x}px`;
  spark.style.top = `${y}px`;
  spark.style.width = '20px';
  spark.style.height = '20px';
  spark.style.borderRadius = '50%';
  spark.style.background = color;
  spark.style.pointerEvents = 'none';
  spark.style.zIndex = '9999';
  spark.style.boxShadow = `0 0 20px ${color}`;
  document.body.appendChild(spark);

  // Animate and remove
  anime({
    targets: spark,
    scale: [0, 2],
    opacity: [1, 0],
    easing: EASING.smooth,
    duration: 600,
    complete: () => {
      document.body.removeChild(spark);
    },
  });
};

/**
 * Sequential animation timeline
 */
export const createTimeline = () => {
  return anime.timeline({
    easing: EASING.smooth,
  });
};
