import React, { useEffect, useRef } from 'react';
import anime from 'animejs';
import { usePerformanceAnimations } from '@/hooks/usePerformanceAnimations';

export const ParticleStream: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { shouldAnimate, isHighPerf } = usePerformanceAnimations();

  useEffect(() => {
    if (!shouldAnimate || !isHighPerf || !containerRef.current) {return;}

    const container = containerRef.current;
    const particles: HTMLDivElement[] = [];
    const numParticles = 20;

    for (let i = 0; i < numParticles; i++) {
      const particle = document.createElement('div');
      particle.className = 'absolute w-1 h-1 bg-purple-500 rounded-full shadow-[0_0_8px_2px_rgba(168,85,247,0.8)] opacity-0';
      container.appendChild(particle);
      particles.push(particle);
    }

    const anim = anime({
      targets: particles,
      translateX: () => anime.random(-50, window.innerWidth + 50),
      translateY: () => [window.innerHeight + 50, -50],
      opacity: [
        { value: [0, 1], duration: 500 },
        { value: 1, duration: () => anime.random(2000, 4000) },
        { value: 0, duration: 500 }
      ],
      scale: () => anime.random(0.5, 2),
      duration: () => anime.random(5000, 10000),
      delay: anime.stagger(200),
      easing: 'linear',
      loop: true,
    });

    return () => {
      anim.pause();
      particles.forEach(p => p.remove());
    };
  }, [shouldAnimate, isHighPerf]);

  if (!shouldAnimate || !isHighPerf) {return null;}

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden"
    />
  );
};
