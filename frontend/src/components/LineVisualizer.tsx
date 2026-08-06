import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface LineVisualizerProps {
  isListening: boolean;
  audioStream?: MediaStream | null;
  className?: string;
  color?: string;
  lineCount?: number;
  height?: number;
}

export const LineVisualizer: React.FC<LineVisualizerProps> = ({
  isListening,
  audioStream,
  className,
  color = '#3b82f6',
  lineCount = 5,
  height = 32
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode>();
  const dataArrayRef = useRef<Uint8Array>();
  const [isActive, setIsActive] = useState(false);

  // Initialize audio analysis
  useEffect(() => {
    if (isListening && audioStream) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(audioStream);
        
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        analyserRef.current = analyser;
        dataArrayRef.current = dataArray;
        setIsActive(true);
        
        return () => {
          source.disconnect();
          audioContext.close();
          setIsActive(false);
        };
      } catch (error) {
        console.warn('Audio analysis not supported:', error);
        setIsActive(false);
      }
    } else {
      setIsActive(false);
    }
  }, [isListening, audioStream]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      if (!canvasRef.current || !analyserRef.current || !dataArrayRef.current) {return;}
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {return;}

      const analyser = analyserRef.current;
      const dataArray = dataArrayRef.current;
      
      analyser.getByteFrequencyData(dataArray);
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw vertical lines
      const lineWidth = 3;
      const spacing = (canvas.width - (lineCount * lineWidth)) / (lineCount - 1);
      
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      
      for (let i = 0; i < lineCount; i++) {
        const dataIndex = Math.floor((i / lineCount) * dataArray.length);
        const amplitude = dataArray[dataIndex] / 255;
        
        // Add some base animation even without audio
        const baseHeight = isListening ? 4 : 2;
        const maxHeight = canvas.height - 4;
        const lineHeight = Math.max(baseHeight, amplitude * maxHeight);
        
        const x = i * (lineWidth + spacing) + lineWidth / 2;
        const y = (canvas.height - lineHeight) / 2;
        
        // Draw rounded rectangle (line)
        ctx.beginPath();
        ctx.roundRect(x - lineWidth / 2, y, lineWidth, lineHeight, lineWidth / 2);
        ctx.fill();
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };

    if (isActive || isListening) {
      animate();
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, isListening, color, lineCount, height]);

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
      width={60}
      height={height}
      className={cn(
        "transition-opacity duration-300",
        isListening ? "opacity-100" : "opacity-60",
        className
      )}
    />
  );
};

export default LineVisualizer;