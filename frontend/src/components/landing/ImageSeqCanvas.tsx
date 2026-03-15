/**
 * ImageSeqCanvas.tsx — Canvas-based image-sequence scrubber.
 *
 * Receives a flat array of image URLs (WebP recommended) and a `scrollProgress`
 * value (0 → 1). It paints the corresponding frame on a <canvas> element.
 *
 * Progressive loading strategy:
 *  1. Preload first frame immediately.
 *  2. Preload remaining frames in idle time (requestIdleCallback).
 *  3. Show a loading shimmer until enough frames are ready.
 *
 * WebP conversion tip (see README-integration.md for full notes):
 *   ffmpeg -i input.mp4 -vf fps=24,scale=1920:-1 frames/frame_%04d.jpg
 *   for f in frames/*.jpg; do cwebp -q 75 "$f" -o "${f%.jpg}.webp"; done
 *
 * Props:
 *   frames        — ordered array of image URLs
 *   scrollProgress— 0→1 scrub value (e.g. from useScrollProgress hook)
 *   className     — extra tailwind classes
 *   width/height  — canvas logical size (default 1920×1080)
 */

import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
} from 'react';

export interface ImageSeqCanvasProps {
  frames: string[];
  /** 0 → 1. Can be a raw number or a ref updated externally. */
  scrollProgress: number;
  className?: string;
  width?: number;
  height?: number;
  /** Minimum frames loaded before showing canvas (default: 3) */
  readyThreshold?: number;
}

export const ImageSeqCanvas: React.FC<ImageSeqCanvasProps> = ({
  frames,
  scrollProgress,
  className = '',
  width = 1920,
  height = 1080,
  readyThreshold = 3,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<(HTMLImageElement | null)[]>(
    Array(frames.length).fill(null)
  );
  const [loadedCount, setLoadedCount] = useState(0);
  const lastFrameRef = useRef(-1);

  // ─── Load frames ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (frames.length === 0) return;

    let cancelled = false;

    const loadFrame = (index: number): Promise<void> =>
      new Promise((resolve) => {
        if (imagesRef.current[index]) { resolve(); return; }
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
          if (!cancelled) {
            imagesRef.current[index] = img;
            setLoadedCount((c) => c + 1);
          }
          resolve();
        };
        img.onerror = () => resolve(); // skip broken frames gracefully
        img.src = frames[index];
      });

    // Load first frame immediately so something shows fast.
    loadFrame(0);

    // Load rest in idle batches.
    const loadRest = async () => {
      for (let i = 1; i < frames.length; i++) {
        if (cancelled) break;
        await loadFrame(i);
        // Yield to browser between frames to avoid jank.
        await new Promise<void>((r) => {
          if ('requestIdleCallback' in window) {
            requestIdleCallback(() => r());
          } else {
            setTimeout(r, 0);
          }
        });
      }
    };

    loadRest();
    return () => { cancelled = true; };
  }, [frames]);

  // ─── Draw frame ──────────────────────────────────────────────────────────
  const drawFrame = useCallback((progress: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const totalFrames = frames.length;
    if (totalFrames === 0) return;

    // Clamp and derive index
    const clamped = Math.max(0, Math.min(1, progress));
    const frameIndex = Math.round(clamped * (totalFrames - 1));
    if (frameIndex === lastFrameRef.current) return; // no-op if same frame
    lastFrameRef.current = frameIndex;

    const img = imagesRef.current[frameIndex];
    if (!img) return; // not loaded yet — hold last drawn frame

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }, [frames]);

  // ─── React to scrollProgress ─────────────────────────────────────────────
  useEffect(() => {
    drawFrame(scrollProgress);
  }, [scrollProgress, drawFrame]);

  const isReady = loadedCount >= Math.min(readyThreshold, frames.length);

  return (
    <div className={`relative ${className}`} aria-label="Animated sequence">
      {/* Loading shimmer */}
      {!isReady && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[#0d0d14] animate-pulse rounded-lg"
          style={{
            background:
              'linear-gradient(90deg, #0d0d14 25%, #1a1a2e 50%, #0d0d14 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
          }}
        />
      )}

      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={`w-full h-full object-cover transition-opacity duration-500 ${
          isReady ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ display: 'block' }}
        aria-hidden="true"
      />

      {/* Overlay gradient to blend edges with the dark background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-lg pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, transparent 60%, rgba(13,13,20,0.9) 100%)',
        }}
      />
    </div>
  );
};

export default ImageSeqCanvas;
