import React, { useEffect, useRef } from 'react';
import anime from 'animejs';

const BackgroundEffects: React.FC = () => {
  const particlesRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Create floating particles
    if (particlesRef.current) {
      const particleCount = 50;
      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.cssText = `
          position: absolute;
          width: ${Math.random() * 3 + 1}px;
          height: ${Math.random() * 3 + 1}px;
          background: rgba(168, 85, 247, ${Math.random() * 0.8 + 0.2});
          border-radius: 50%;
          left: ${Math.random() * 100}%;
          top: ${Math.random() * 100}%;
          pointer-events: none;
        `;
        particlesRef.current.appendChild(particle);

        // Animate particles
        anime({
          targets: particle,
          translateY: [0, Math.random() * 100 - 50],
          translateX: [0, Math.random() * 100 - 50],
          opacity: [0.2, 1, 0.2],
          scale: [0.5, 1.5, 0.5],
          duration: Math.random() * 3000 + 2000,
          easing: 'easeInOutSine',
          loop: true,
          delay: Math.random() * 1000,
        });
      }
    }

    // Create glowing lines
    if (linesRef.current) {
      const lineCount = 8;
      for (let i = 0; i < lineCount; i++) {
        const line = document.createElement('div');
        const isHorizontal = i % 2 === 0;
        line.className = 'glow-line';
        line.style.cssText = `
          position: absolute;
          background: linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.5), transparent);
          ${isHorizontal ? 'width: 100%; height: 1px;' : 'height: 100%; width: 1px;'}
          ${isHorizontal ? `top: ${Math.random() * 100}%;` : `left: ${Math.random() * 100}%;`}
          pointer-events: none;
          filter: blur(1px);
        `;
        linesRef.current.appendChild(line);

        // Animate lines
        anime({
          targets: line,
          opacity: [0, 0.8, 0],
          duration: Math.random() * 4000 + 3000,
          easing: 'easeInOutQuad',
          loop: true,
          delay: Math.random() * 2000,
        });
      }
    }
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-[#0b0b1a] to-[#120022]" />
      
      {/* Starry effect */}
      <div className="absolute inset-0" style={{
        backgroundImage: `radial-gradient(2px 2px at 20% 30%, white, transparent),
                          radial-gradient(2px 2px at 60% 70%, white, transparent),
                          radial-gradient(1px 1px at 50% 50%, white, transparent),
                          radial-gradient(1px 1px at 80% 10%, white, transparent),
                          radial-gradient(2px 2px at 90% 60%, white, transparent),
                          radial-gradient(1px 1px at 33% 80%, white, transparent),
                          radial-gradient(1px 1px at 15% 55%, white, transparent)`,
        backgroundSize: '200% 200%',
        animation: 'twinkle 8s ease-in-out infinite',
      }} />
      
      {/* Floating particles */}
      <div ref={particlesRef} className="absolute inset-0" />
      
      {/* Glowing lines */}
      <div ref={linesRef} className="absolute inset-0" />
      
      {/* Large glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-purple-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
    </div>
  );
};

export default BackgroundEffects;