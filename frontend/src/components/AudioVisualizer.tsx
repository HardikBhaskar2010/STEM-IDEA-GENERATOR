'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface AudioVisualizerProps {
  isListening: boolean;
  audioStream?: MediaStream | null;
  className?: string;
  variant?: 'wave' | 'bars' | 'circle';
  color?: string;
  sensitivity?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isListening,
  audioStream,
  className,
  variant = 'wave',
  color = '#3b82f6',
  sensitivity = 1
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
  const animate = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current || !dataArrayRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    
    analyser.getByteFrequencyData(dataArray);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate average volume
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    const normalizedVolume = (average / 255) * sensitivity;
    
    // Set drawing style
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const time = Date.now() * 0.001;
    
    if (variant === 'wave') {
      drawWave(ctx, dataArray, canvas.width, canvas.height, normalizedVolume, time);
    } else if (variant === 'bars') {
      drawBars(ctx, dataArray, canvas.width, canvas.height, normalizedVolume);
    } else if (variant === 'circle') {
      drawCircle(ctx, dataArray, centerX, centerY, normalizedVolume, time);
    }
    
    animationRef.current = requestAnimationFrame(animate);
  }, [color, sensitivity, variant]);

  // Start/stop animation
  useEffect(() => {
    if (isActive) {
      animate();
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      // Draw idle state
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (isListening) {
            drawIdleState(ctx, canvas.width, canvas.height, color);
          }
        }
      }
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, isListening, animate, color]);

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={40}
      className={cn(
        "transition-opacity duration-300",
        isListening ? "opacity-100" : "opacity-0",
        className
      )}
      style={{ 
        filter: isActive ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.3))' : 'none'
      }}
    />
  );
};

// Wave visualization
function drawWave(
  ctx: CanvasRenderingContext2D, 
  dataArray: Uint8Array, 
  width: number, 
  height: number, 
  volume: number,
  time: number
) {
  ctx.beginPath();
  
  const sliceWidth = width / dataArray.length;
  let x = 0;
  
  for (let i = 0; i < dataArray.length; i++) {
    const v = (dataArray[i] / 255) * (height / 2) * volume;
    const y = height / 2 + Math.sin(time * 2 + i * 0.1) * v * 0.5;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    
    x += sliceWidth;
  }
  
  ctx.stroke();
  
  // Add a second wave with phase offset
  ctx.beginPath();
  x = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const v = (dataArray[i] / 255) * (height / 2) * volume * 0.7;
    const y = height / 2 + Math.sin(time * 1.5 + i * 0.15 + Math.PI) * v * 0.3;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    
    x += sliceWidth;
  }
  
  ctx.globalAlpha = 0.6;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// Bar visualization
function drawBars(
  ctx: CanvasRenderingContext2D, 
  dataArray: Uint8Array, 
  width: number, 
  height: number, 
  volume: number
) {
  const barCount = Math.min(dataArray.length / 4, 20);
  const barWidth = width / barCount;
  
  for (let i = 0; i < barCount; i++) {
    const barHeight = (dataArray[i * 4] / 255) * height * volume;
    const x = i * barWidth;
    const y = height - barHeight;
    
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fillRect(x, y, barWidth - 1, barHeight);
  }
}

// Circle visualization
function drawCircle(
  ctx: CanvasRenderingContext2D, 
  dataArray: Uint8Array, 
  centerX: number, 
  centerY: number, 
  volume: number,
  time: number
) {
  const baseRadius = 15;
  const maxRadius = 25;
  
  ctx.beginPath();
  
  const points = 32;
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const dataIndex = Math.floor((i / points) * dataArray.length);
    const amplitude = (dataArray[dataIndex] / 255) * volume;
    
    const radius = baseRadius + amplitude * (maxRadius - baseRadius) + 
                  Math.sin(time * 3 + angle * 4) * 2 * volume;
    
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  
  ctx.closePath();
  ctx.stroke();
}

// Idle state animation
function drawIdleState(
  ctx: CanvasRenderingContext2D, 
  width: number, 
  height: number, 
  color: string
) {
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.3;
  
  const centerY = height / 2;
  const time = Date.now() * 0.002;
  
  ctx.beginPath();
  for (let x = 0; x < width; x++) {
    const y = centerY + Math.sin(time + x * 0.02) * 3;
    if (x === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  
  ctx.globalAlpha = 1;
}

export default AudioVisualizer;