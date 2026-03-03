/**
 * Particles Background Wrapper
 * 
 * Classic particle system with interconnected nodes
 * Category: Particle
 * Performance: Medium (45 FPS)
 * 
 * Validates: Requirements 1.1, 7.1, 7.2, 7.4, 17.1, 17.3
 */

import React, { useEffect, useRef } from 'react';

/**
 * Particles background component with connected nodes
 */
const ParticlesComponent = ({ settings = {}, theme = 'dark', isActive = true }) => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    if (!isActive || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Create particles
    const particles = Array.from({ length: 100 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      radius: Math.random() * 3 + 1,
    }));
    
    let animationId;
    const animate = () => {
      // Clear with dark background
      ctx.fillStyle = theme === 'dark' ? '#0a0a0a' : '#f5f5f5';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw particles
      particles.forEach((p, i) => {
        // Move particle
        p.x += p.vx;
        p.y += p.vy;
        
        // Bounce off edges
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        
        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = theme === 'dark' ? 'rgba(100, 150, 255, 0.8)' : 'rgba(50, 100, 200, 0.8)';
        ctx.fill();
        
        // Draw connections
        particles.slice(i + 1).forEach(p2 => {
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 150) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = theme === 'dark' 
              ? `rgba(100, 150, 255, ${1 - distance / 150})`
              : `rgba(50, 100, 200, ${1 - distance / 150})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });
      });
      
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, [isActive, theme]);
  
  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  );
};

export const Particles = ParticlesComponent;
export default Particles;
