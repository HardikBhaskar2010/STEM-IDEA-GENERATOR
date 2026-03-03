/**
 * Liquid Ether Background - Simplified Fluid Animation
 * 
 * Smooth, flowing liquid animation with ethereal gradients
 * Category: Fluid
 * Performance: Medium (45 FPS)
 */

import React, { useEffect, useRef } from 'react';

interface LiquidEtherProps {
  settings?: any;
  theme?: 'light' | 'dark';
  isActive?: boolean;
  colors?: string[];
}

const defaultColors = ['#5227FF', '#FF9FFC', '#B19EEF'];

const LiquidEther = ({ 
  settings = {}, 
  theme = 'dark', 
  isActive = true,
  colors = defaultColors
}: LiquidEtherProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!isActive || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Create fluid blobs
    const blobs: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
    }> = [];
    
    for (let i = 0; i < 5; i++) {
      blobs.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 150 + 100,
        color: colors[i % colors.length]
      });
    }
    
    let time = 0;
    let animationId: number;
    
    const animate = () => {
      time += 0.01;
      
      // Create gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, theme === 'dark' ? '#0a0a1a' : '#f0f0f5');
      gradient.addColorStop(1, theme === 'dark' ? '#1a0a2e' : '#e0e0f0');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Apply blur effect
      ctx.filter = 'blur(40px)';
      
      // Draw and update blobs
      blobs.forEach((blob, i) => {
        // Move blob
        blob.x += blob.vx + Math.sin(time + i) * 0.5;
        blob.y += blob.vy + Math.cos(time + i) * 0.5;
        
        // Bounce off edges
        if (blob.x < -blob.radius || blob.x > canvas.width + blob.radius) blob.vx *= -1;
        if (blob.y < -blob.radius || blob.y > canvas.height + blob.radius) blob.vy *= -1;
        
        // Keep in bounds
        blob.x = Math.max(-blob.radius, Math.min(canvas.width + blob.radius, blob.x));
        blob.y = Math.max(-blob.radius, Math.min(canvas.height + blob.radius, blob.y));
        
        // Draw blob with gradient
        const blobGradient = ctx.createRadialGradient(
          blob.x, blob.y, 0,
          blob.x, blob.y, blob.radius
        );
        blobGradient.addColorStop(0, blob.color + 'CC');
        blobGradient.addColorStop(0.5, blob.color + '66');
        blobGradient.addColorStop(1, blob.color + '00');
        
        ctx.fillStyle = blobGradient;
        ctx.beginPath();
        ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      
      ctx.filter = 'none';
      
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, [isActive, theme, colors]);
  
  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  );
};

export default LiquidEther;
export { LiquidEther };
