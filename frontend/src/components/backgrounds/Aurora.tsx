/**
 * Aurora Background Wrapper
 * 
 * Northern lights effect with flowing color bands
 * Category: Atmospheric
 * Performance: Medium (40 FPS)
 * 
 * Validates: Requirements 1.1, 7.1, 7.2, 7.4, 17.1, 17.3
 */

import React, { useEffect, useRef } from 'react';

/**
 * Aurora background component with flowing lights
 */
const AuroraComponent = ({ settings = {}, theme = 'dark', isActive = true }) => {
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
    
    let time = 0;
    let animationId;
    
    const animate = () => {
      time += 0.01;
      
      // Dark background
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw aurora waves
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        
        for (let x = 0; x < canvas.width; x += 10) {
          const y = canvas.height / 2 + 
                    Math.sin(x * 0.01 + time + i) * 100 +
                    Math.sin(x * 0.005 + time * 0.5) * 50;
          ctx.lineTo(x, y);
        }
        
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();
        
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        if (i === 0) {
          gradient.addColorStop(0, 'rgba(0, 255, 150, 0.3)');
          gradient.addColorStop(1, 'rgba(0, 255, 150, 0)');
        } else if (i === 1) {
          gradient.addColorStop(0, 'rgba(100, 150, 255, 0.2)');
          gradient.addColorStop(1, 'rgba(100, 150, 255, 0)');
        } else {
          gradient.addColorStop(0, 'rgba(200, 100, 255, 0.15)');
          gradient.addColorStop(1, 'rgba(200, 100, 255, 0)');
        }
        
        ctx.fillStyle = gradient;
        ctx.fill();
      }
      
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

export const Aurora = AuroraComponent;
export default Aurora;
