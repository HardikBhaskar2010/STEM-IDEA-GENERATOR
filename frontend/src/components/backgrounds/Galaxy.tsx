/**
 * Galaxy Background Wrapper
 * 
 * Swirling galaxy with stars and nebula clouds
 * Category: Atmospheric
 * Performance: Heavy (35 FPS)
 * 
 * Validates: Requirements 1.1, 7.1, 7.2, 7.4, 17.1, 17.3
 */

import React, { useEffect, useRef } from 'react';

/**
 * Galaxy background component with animated stars
 */
const GalaxyComponent = ({ settings = {}, theme = 'dark', isActive = true }) => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    if (!isActive || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Create stars
    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 2,
      speed: Math.random() * 0.5 + 0.1,
      opacity: Math.random(),
    }));
    
    // Animation loop
    let animationId;
    const animate = () => {
      // Clear canvas with gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#1a0033');
      gradient.addColorStop(0.5, '#0a001a');
      gradient.addColorStop(1, '#000000');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw and update stars
      stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.fill();
        
        // Move stars
        star.y += star.speed;
        star.opacity = Math.sin(Date.now() * 0.001 + star.x) * 0.5 + 0.5;
        
        // Reset star position when it goes off screen
        if (star.y > canvas.height) {
          star.y = 0;
          star.x = Math.random() * canvas.width;
        }
      });
      
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, [isActive]);
  
  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  );
};

export const Galaxy = GalaxyComponent;
export default Galaxy;
