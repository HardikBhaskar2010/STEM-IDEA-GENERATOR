import { useState, useEffect, useRef, useCallback } from 'react';

interface UseScrollFrameAnimationProps {
  totalFrames: number;
  framePathPattern: (index: number) => string;
  scrollMultiplier?: number;
}

interface UseScrollFrameAnimationReturn {
  currentFrame: number;
  scrollProgress: number;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  isLoading: boolean;
  loadProgress: number;
  isFirstFrameReady: boolean;
}

export const useScrollFrameAnimation = ({
  totalFrames,
  framePathPattern,
  scrollMultiplier = 2,
}: UseScrollFrameAnimationProps): UseScrollFrameAnimationReturn => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstFrameReady, setIsFirstFrameReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const rafRef = useRef<number>();
  const lastScrollTime = useRef<number>(0);

  // Improved progressive loading: 1 frame → 5 frames → rest
  useEffect(() => {
    const images: HTMLImageElement[] = [];
    let loadedCount = 0;

    const loadImage = (index: number): Promise<void> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = framePathPattern(index);
        
        img.onload = () => {
          images[index] = img;
          loadedCount++;
          setLoadProgress((loadedCount / totalFrames) * 100);
          
          // Mark first frame as ready immediately
          if (index === 0) {
            setIsFirstFrameReady(true);
          }
          
          resolve();
        };
        
        img.onerror = () => {
          console.warn(`Failed to load frame ${index}`);
          // Create a placeholder for missing frames
          images[index] = images[Math.max(0, index - 1)] || new Image();
          loadedCount++;
          setLoadProgress((loadedCount / totalFrames) * 100);
          resolve();
        };
      });
    };

    // Phase 1: Load first frame immediately (critical for no blank canvas)
    loadImage(0).then(() => {
      imagesRef.current = images;
      
      // Phase 2: Load first 5 frames quickly for smooth start
      const priorityFrames = Array.from({ length: Math.min(5, totalFrames) }, (_, i) => i + 1);
      
      Promise.all(priorityFrames.map(loadImage)).then(() => {
        setIsLoading(false);
        
        // Phase 3: Load remaining frames progressively in background
        const remainingFrames = Array.from(
          { length: totalFrames - priorityFrames.length - 1 },
          (_, i) => i + priorityFrames.length + 1
        );
        
        // Load in chunks to avoid blocking
        const chunkSize = 10;
        const loadChunk = (startIdx: number) => {
          const chunk = remainingFrames.slice(startIdx, startIdx + chunkSize);
          if (chunk.length === 0) {
            console.log('✅ All frames loaded');
            return;
          }
          
          Promise.all(chunk.map(loadImage)).then(() => {
            setTimeout(() => loadChunk(startIdx + chunkSize), 100);
          });
        };
        
        loadChunk(0);
      });
    });

    return () => {
      images.forEach(img => {
        img.src = '';
      });
    };
  }, [totalFrames, framePathPattern]);

  // Render frame on canvas
  const renderFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: false });
    const img = imagesRef.current[frameIndex];

    if (!canvas || !ctx || !img || !img.complete) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fill with black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate dimensions to maintain aspect ratio and cover canvas
    const canvasAspect = canvas.width / canvas.height;
    const imageAspect = img.width / img.height;

    let drawWidth = canvas.width;
    let drawHeight = canvas.height;
    let offsetX = 0;
    let offsetY = 0;

    if (canvasAspect > imageAspect) {
      // Canvas is wider - fit to width
      drawHeight = canvas.width / imageAspect;
      offsetY = (canvas.height - drawHeight) / 2;
    } else {
      // Canvas is taller - fit to height
      drawWidth = canvas.height * imageAspect;
      offsetX = (canvas.width - drawWidth) / 2;
    }

    // Draw image centered and covering canvas
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  }, []);

  // Handle scroll with throttling
  const handleScroll = useCallback(() => {
    const now = performance.now();
    
    // Throttle to ~60fps (16ms)
    if (now - lastScrollTime.current < 16) {
      return;
    }
    
    lastScrollTime.current = now;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const containerHeight = container.offsetHeight;
    const viewportHeight = window.innerHeight;

    // Calculate scroll progress (0 to 1)
    const scrollStart = -rect.top;
    const scrollRange = containerHeight - viewportHeight;
    const progress = Math.max(0, Math.min(1, scrollStart / scrollRange));

    setScrollProgress(progress);

    // Calculate frame index
    const frameIndex = Math.min(
      Math.floor(progress * (totalFrames - 1)),
      totalFrames - 1
    );

    if (frameIndex !== currentFrame) {
      setCurrentFrame(frameIndex);
      
      // Use RAF for smooth rendering
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      
      rafRef.current = requestAnimationFrame(() => {
        renderFrame(frameIndex);
      });
    }
  }, [currentFrame, totalFrames, renderFrame]);

  // Setup scroll listener
  useEffect(() => {
    if (!isFirstFrameReady) return;

    // Initial render
    renderFrame(0);

    // Add scroll listener
    const throttledScroll = () => {
      handleScroll();
    };

    window.addEventListener('scroll', throttledScroll, { passive: true });
    window.addEventListener('resize', throttledScroll, { passive: true });

    // Initial check
    throttledScroll();

    return () => {
      window.removeEventListener('scroll', throttledScroll);
      window.removeEventListener('resize', throttledScroll);
      
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isFirstFrameReady, handleScroll, renderFrame]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      // Set canvas size to match display size
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      
      // Re-render current frame
      if (isFirstFrameReady) {
        renderFrame(currentFrame);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [currentFrame, renderFrame, isFirstFrameReady]);

  return {
    currentFrame,
    scrollProgress,
    canvasRef,
    containerRef,
    isLoading,
    loadProgress,
    isFirstFrameReady,
  };
};


