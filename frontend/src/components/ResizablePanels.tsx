import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ResizablePanelsProps {
  direction?: 'horizontal' | 'vertical';
  minSize?: number;
  defaultSize?: string | number;
  children: [ReactNode, ReactNode];
  className?: string;
}

const ResizablePanels: React.FC<ResizablePanelsProps> = ({
  direction = 'vertical',
  minSize = 200,
  defaultSize = '50%',
  children,
  className
}) => {
  const [size, setSize] = useState<number>(
    typeof defaultSize === 'string' && defaultSize.endsWith('%')
      ? parseInt(defaultSize)
      : typeof defaultSize === 'number'
      ? defaultSize
      : 50
  );
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();

      let newSize: number;
      if (direction === 'vertical') {
        const mouseX = e.clientX - rect.left;
        newSize = (mouseX / rect.width) * 100;
      } else {
        const mouseY = e.clientY - rect.top;
        newSize = (mouseY / rect.height) * 100;
      }

      // Apply min/max constraints
      const minPercent = (minSize / (direction === 'vertical' ? rect.width : rect.height)) * 100;
      const maxPercent = 100 - minPercent;

      newSize = Math.max(minPercent, Math.min(maxPercent, newSize));
      setSize(newSize);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, direction, minSize]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex',
        direction === 'vertical' ? 'flex-row' : 'flex-col',
        className
      )}
      style={{ width: '100%', height: '100%' }}
    >
      {/* First panel */}
      <div
        style={{
          [direction === 'vertical' ? 'width' : 'height']: `${size}%`,
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {children[0]}
      </div>

      {/* Resizer */}
      <div
        className={cn(
          'resizer group bg-white/10 hover:bg-purple-500/30 transition-colors',
          direction === 'vertical' ? 'cursor-col-resize w-1 hover:w-1' : 'cursor-row-resize h-1 hover:h-1',
          isDragging && 'bg-purple-500/50'
        )}
        onMouseDown={handleMouseDown}
        style={{
          userSelect: 'none',
          position: 'relative',
          zIndex: 10
        }}
      >
        <div className={cn(
          'absolute inset-0 transition-opacity',
          direction === 'vertical' ? 'left-1/2 -translate-x-1/2 w-1' : 'top-1/2 -translate-y-1/2 h-1',
          'group-hover:bg-purple-500/20'
        )} />
      </div>

      {/* Second panel */}
      <div
        style={{
          [direction === 'vertical' ? 'width' : 'height']: `${100 - size}%`,
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {children[1]}
      </div>
    </div>
  );
};

export default ResizablePanels;
