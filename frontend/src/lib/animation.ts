import anime, { type AnimeParams } from 'animejs';

// Animation configuration types
export interface AnimationConfig {
  duration: number;
  easing: string;
  delay?: number;
  stagger?: number;
  reducedMotion?: boolean;
}

export interface AnimationOptions extends Partial<AnimeParams> {
  reducedMotion?: boolean;
}

// Default animation configurations
export const DEFAULT_ANIMATION_CONFIG: AnimationConfig = {
  duration: 600,
  easing: 'easeOutCubic',
  delay: 0,
  stagger: 100,
  reducedMotion: false,
};

// Easing presets for consistent animations
export const EASING_PRESETS = {
  smooth: 'easeOutCubic',
  bounce: 'easeOutElastic(1, .8)',
  spring: 'spring(1, 80, 10, 0)',
  sharp: 'easeOutExpo',
  gentle: 'easeOutQuart',
} as const;

// Animation duration presets
export const DURATION_PRESETS = {
  fast: 200,
  normal: 400,
  slow: 600,
  slower: 800,
} as const;

// Check if user prefers reduced motion
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Create animation with reduced motion support
export const createAnimation = (options: AnimationOptions): anime.AnimeInstance => {
  const shouldReduceMotion = options.reducedMotion ?? prefersReducedMotion();
  
  if (shouldReduceMotion) {
    // For reduced motion, use instant transitions or very fast animations
    return anime({
      ...options,
      duration: 0,
      easing: 'linear',
    });
  }

  return anime(options);
};

// Common animation presets
export const ANIMATION_PRESETS = {
  fadeIn: (target: string | Element, options?: AnimationOptions) =>
    createAnimation({
      targets: target,
      opacity: [0, 1],
      duration: DURATION_PRESETS.normal,
      easing: EASING_PRESETS.smooth,
      ...options,
    }),

  fadeOut: (target: string | Element, options?: AnimationOptions) =>
    createAnimation({
      targets: target,
      opacity: [1, 0],
      duration: DURATION_PRESETS.normal,
      easing: EASING_PRESETS.smooth,
      ...options,
    }),

  slideUp: (target: string | Element, options?: AnimationOptions) =>
    createAnimation({
      targets: target,
      translateY: [30, 0],
      opacity: [0, 1],
      duration: DURATION_PRESETS.normal,
      easing: EASING_PRESETS.smooth,
      ...options,
    }),

  slideDown: (target: string | Element, options?: AnimationOptions) =>
    createAnimation({
      targets: target,
      translateY: [-30, 0],
      opacity: [0, 1],
      duration: DURATION_PRESETS.normal,
      easing: EASING_PRESETS.smooth,
      ...options,
    }),

  scaleIn: (target: string | Element, options?: AnimationOptions) =>
    createAnimation({
      targets: target,
      scale: [0.8, 1],
      opacity: [0, 1],
      duration: DURATION_PRESETS.normal,
      easing: EASING_PRESETS.spring,
      ...options,
    }),

  scaleOut: (target: string | Element, options?: AnimationOptions) =>
    createAnimation({
      targets: target,
      scale: [1, 0.8],
      opacity: [1, 0],
      duration: DURATION_PRESETS.fast,
      easing: EASING_PRESETS.sharp,
      ...options,
    }),

  bounce: (target: string | Element, options?: AnimationOptions) =>
    createAnimation({
      targets: target,
      scale: [1, 1.1, 1],
      duration: DURATION_PRESETS.normal,
      easing: EASING_PRESETS.bounce,
      ...options,
    }),

  shake: (target: string | Element, options?: AnimationOptions) =>
    createAnimation({
      targets: target,
      translateX: [-10, 10, -10, 10, 0],
      duration: DURATION_PRESETS.normal,
      easing: EASING_PRESETS.sharp,
      ...options,
    }),
};

// Stagger animation helper
export const staggerAnimation = (
  targets: string | Element[],
  animationFn: (target: Element, index: number) => anime.AnimeInstance,
  staggerDelay = 100
): anime.AnimeInstance[] => {
  const elements = typeof targets === 'string' 
    ? Array.from(document.querySelectorAll(targets))
    : targets;

  return elements.map((element, index) => {
    const animation = animationFn(element, index);
    animation.delay = (animation.delay || 0) + (index * staggerDelay);
    return animation;
  });
};

// Performance monitoring for animations
export const monitorAnimationPerformance = (animation: anime.AnimeInstance): void => {
  if (process.env.NODE_ENV === 'development') {
    let frameCount = 0;
    let startTime = performance.now();
    let lastFrameTime = startTime;

    const checkPerformance = () => {
      frameCount++;
      const currentTime = performance.now();
      const frameTime = currentTime - lastFrameTime;
      const elapsed = currentTime - startTime;
      
      // Check for frame drops (>16.67ms = below 60fps)
      if (frameTime > 20) {
        // eslint-disable-next-line no-console
        console.warn(`Frame drop detected: ${frameTime.toFixed(2)}ms`);
      }
      
      if (elapsed >= 1000) {
        const fps = Math.round((frameCount * 1000) / elapsed);
        if (fps < 50) {
          // eslint-disable-next-line no-console
          console.warn(`Animation performance warning: ${fps} FPS`);
        }
        frameCount = 0;
        startTime = currentTime;
      }
      
      lastFrameTime = currentTime;
      
      if (!animation.completed) {
        requestAnimationFrame(checkPerformance);
      }
    };

    requestAnimationFrame(checkPerformance);
  }
};

// Preload critical animations
export const preloadAnimations = (): void => {
  // Preload common easing functions
  const preloadTargets = document.createElement('div');
  preloadTargets.style.position = 'absolute';
  preloadTargets.style.top = '-9999px';
  preloadTargets.style.opacity = '0';
  document.body.appendChild(preloadTargets);

  // Run quick animations to warm up the engine
  anime({
    targets: preloadTargets,
    translateX: [0, 1, 0],
    scale: [1, 1.01, 1],
    opacity: [0, 0.01, 0],
    duration: 1,
    easing: 'easeOutCubic',
    complete: () => {
      document.body.removeChild(preloadTargets);
    }
  });

};