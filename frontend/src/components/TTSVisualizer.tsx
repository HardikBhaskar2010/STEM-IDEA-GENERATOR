import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface TTSVisualizerProps {
  isActive: boolean;
  className?: string;
  color?: string;
  lineCount?: number;
  height?: number;
}

export const TTSVisualizer: React.FC<TTSVisualizerProps> = ({
  isActive,
  className,
  color = '#3b82f6',
  lineCount = 4,
  height = 20
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const animate = () => {
      if (!canvasRef.current) return;
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (!isActive) {
        // Show static lines when not active
        const lineWidth = 2;
        const spacing = (canvas.width - (lineCount * lineWidth)) / (lineCount - 1);
        
        ctx.fillStyle = color + '40'; // 25% opacity
        
        for (let i = 0; i < lineCount; i++) {
          const x = i * (lineWidth + spacing) + lineWidth / 2;
          const lineHeight = 3;
          const y = (canvas.height - lineHeight) / 2;
          
          ctx.beginPath();
          ctx.roundRect(x - lineWidth / 2, y, lineWidth, lineHeight, lineWidth / 2);
          ctx.fill();
        }
        return;
      }
      
      // Animated lines when TTS is active
      const time = Date.now() * 0.005;
      const lineWidth = 2;
      const spacing = (canvas.width - (lineCount * lineWidth)) / (lineCount - 1);
      
      ctx.fillStyle = color;
      
      for (let i = 0; i < lineCount; i++) {
        // Create wave-like animation with different phases for each line
        const phase = i * 0.8;
        const amplitude = Math.sin(time + phase) * 0.5 + 0.5; // 0 to 1
        const lineHeight = 3 + amplitude * (canvas.height - 6);
        
        const x = i * (lineWidth + spacing) + lineWidth / 2;
        const y = (canvas.height - lineHeight) / 2;
        
        ctx.beginPath();
        ctx.roundRect(x - lineWidth / 2, y, lineWidth, lineHeight, lineWidth / 2);
        ctx.fill();
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, color, lineCount, height]);

  // Fallback for browsers that don't support roundRect
  useEffect(() => {
    if (typeof CanvasRenderingContext2D.prototype.roundRect === 'undefined') {
      CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
        this.beginPath();
        this.moveTo(x + radius, y);
        this.lineTo(x + width - radius, y);
        this.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.lineTo(x + width, y + height - radius);
        this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.lineTo(x + radius, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.lineTo(x, y + radius);
        this.quadraticCurveTo(x, y, x + radius, y);
        this.closePath();
      };
    }
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={40}
      height={height}
      className={cn(
        "transition-opacity duration-300",
        isActive ? "opacity-100" : "opacity-60",
        className
      )}
    />
  );
};

export default TTSVisualizer;