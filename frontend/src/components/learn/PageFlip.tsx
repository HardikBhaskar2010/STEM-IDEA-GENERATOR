import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface PageFlipProps {
  children: React.ReactNode;
  direction: 'next' | 'prev' | null;
  className?: string;
}

const PageFlip: React.FC<PageFlipProps> = ({ children, direction, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (direction && !isFlipping) {
      setIsFlipping(true);
      const timer = setTimeout(() => {
        setIsFlipping(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [direction, isFlipping]);

  return (
    <div 
      ref={containerRef} 
      className={cn(
        "perspective-2000 w-full transition-all duration-300",
        isFlipping && direction === 'next' && "animate-page-flip-next",
        isFlipping && direction === 'prev' && "animate-page-flip-prev",
        className
      )}
    >
      <div className="relative transform-style-3d w-full h-full">
        {children}
      </div>
    </div>
  );
};

export default PageFlip;