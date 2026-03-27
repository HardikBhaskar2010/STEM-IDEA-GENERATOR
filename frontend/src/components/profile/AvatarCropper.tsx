/**
 * AvatarCropper.tsx
 *
 * A zero-dependency circular avatar cropper modal built with canvas.
 * Shows the full image, lets the user pan + zoom, and exports a
 * 400×400 circular crop as a PNG Blob ready for upload.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

// ─── types ────────────────────────────────────────────────────────────────────

interface AvatarCropperProps {
  /** The raw File selected by the user */
  file: File;
  /** Called with the cropped Blob when the user clicks "Save" */
  onConfirm: (blob: Blob) => void;
  /** Called when the user clicks "Cancel" */
  onCancel: () => void;
}

interface Transform {
  x: number;   // canvas-space translation of image centre
  y: number;
  scale: number;
}

// ─── constants ────────────────────────────────────────────────────────────────

const CANVAS_SIZE  = 480;  // canvas px
const CIRCLE_R     = 200;  // crop circle radius in canvas px
const OUTPUT_SIZE  = 400;  // exported PNG side length

// ─── helpers ──────────────────────────────────────────────────────────────────

function clampTransform(
  t:    Transform,
  iw:   number,
  ih:   number,
): Transform {
  // Prevent the image from leaving the crop circle exposed on any side
  const hw = (iw * t.scale) / 2;
  const hh = (ih * t.scale) / 2;
  const cx = CANVAS_SIZE / 2;
  const cy = CANVAS_SIZE / 2;

  const minX = cx + CIRCLE_R - hw;
  const maxX = cx - CIRCLE_R + hw;
  const minY = cy + CIRCLE_R - hh;
  const maxY = cy - CIRCLE_R + hh;

  return {
    x:     Math.min(maxX, Math.max(minX, t.x)),
    y:     Math.min(maxY, Math.max(minY, t.y)),
    scale: t.scale,
  };
}

// ─── component ────────────────────────────────────────────────────────────────

const AvatarCropper: React.FC<AvatarCropperProps> = ({ file, onConfirm, onCancel }) => {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const imgRef     = useRef<HTMLImageElement | null>(null);
  const [transform, setTransform] = useState<Transform>({ x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // ── Load image ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      // Fit image so its shortest side fills the circle
      const minSide = Math.min(img.naturalWidth, img.naturalHeight);
      const initScale = (CIRCLE_R * 2) / minSide;
      const t: Transform = {
        x:     CANVAS_SIZE / 2,
        y:     CANVAS_SIZE / 2,
        scale: initScale,
      };
      setTransform(clampTransform(t, img.naturalWidth, img.naturalHeight));
      setIsReady(true);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // ── Render loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isReady) return;
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d')!;
    const cx  = CANVAS_SIZE / 2;
    const cy  = CANVAS_SIZE / 2;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw full image (dimmed)
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.translate(transform.x, transform.y);
    ctx.drawImage(
      img,
      (-img.naturalWidth  * transform.scale) / 2,
      (-img.naturalHeight * transform.scale) / 2,
      img.naturalWidth  * transform.scale,
      img.naturalHeight * transform.scale,
    );
    ctx.restore();

    // Clip to circle and draw bright image inside
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, CIRCLE_R, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(transform.x, transform.y);
    ctx.globalAlpha = 1;
    ctx.drawImage(
      img,
      (-img.naturalWidth  * transform.scale) / 2,
      (-img.naturalHeight * transform.scale) / 2,
      img.naturalWidth  * transform.scale,
      img.naturalHeight * transform.scale,
    );
    ctx.restore();

    // Circular border ring
    ctx.beginPath();
    ctx.arc(cx, cy, CIRCLE_R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(99,102,241,0.9)';
    ctx.lineWidth   = 3;
    ctx.stroke();

    // Corner handles at 45°
    const handleAngles = [45, 135, 225, 315].map(a => (a * Math.PI) / 180);
    handleAngles.forEach(a => {
      const hx = cx + CIRCLE_R * Math.cos(a);
      const hy = cy + CIRCLE_R * Math.sin(a);
      ctx.beginPath();
      ctx.arc(hx, hy, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#6366f1';
      ctx.fill();
    });
  }, [transform, isReady]);

  // ── Pointer interactions ─────────────────────────────────────────────────────
  const getCanvasPos = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    const src = 'touches' in e ? (e as React.TouchEvent).touches[0] : (e as React.PointerEvent);
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top)  * scaleY,
    };
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    lastPos.current = getCanvasPos(e);
  }, [getCanvasPos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !lastPos.current) return;
    const pos = getCanvasPos(e);
    const dx  = pos.x - lastPos.current.x;
    const dy  = pos.y - lastPos.current.y;
    lastPos.current = pos;
    const img = imgRef.current;
    if (!img) return;
    setTransform(prev => clampTransform({ ...prev, x: prev.x + dx, y: prev.y + dy }, img.naturalWidth, img.naturalHeight));
  }, [isDragging, getCanvasPos]);

  const onPointerUp = useCallback(() => {
    setIsDragging(false);
    lastPos.current = null;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const img = imgRef.current;
    if (!img) return;
    const delta = e.deltaY < 0 ? 1.08 : 0.93;
    const minScale = (CIRCLE_R * 2) / Math.min(img.naturalWidth, img.naturalHeight);
    setTransform(prev => {
      const s = Math.max(minScale, prev.scale * delta);
      return clampTransform({ ...prev, scale: s }, img.naturalWidth, img.naturalHeight);
    });
  }, []);

  // ── Zoom slider ─────────────────────────────────────────────────────────────
  const onZoomSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const img = imgRef.current;
    if (!img) return;
    const minScale = (CIRCLE_R * 2) / Math.min(img.naturalWidth, img.naturalHeight);
    const maxScale = minScale * 4;
    const t = parseFloat(e.target.value) / 100;
    const s = minScale + (maxScale - minScale) * t;
    setTransform(prev => clampTransform({ ...prev, scale: s }, img.naturalWidth, img.naturalHeight));
  }, []);

  const currentZoomPct = useCallback((): number => {
    const img = imgRef.current;
    if (!img) return 0;
    const minScale = (CIRCLE_R * 2) / Math.min(img.naturalWidth, img.naturalHeight);
    const maxScale = minScale * 4;
    return ((transform.scale - minScale) / (maxScale - minScale)) * 100;
  }, [transform.scale]);

  // ── Export ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;

    const out  = document.createElement('canvas');
    out.width  = OUTPUT_SIZE;
    out.height = OUTPUT_SIZE;
    const ctx  = out.getContext('2d')!;
    const half = OUTPUT_SIZE / 2;

    // Map canvas crop circle → output canvas
    const ratio = OUTPUT_SIZE / (CIRCLE_R * 2);

    // Clip circle
    ctx.beginPath();
    ctx.arc(half, half, half, 0, Math.PI * 2);
    ctx.clip();

    // Image offset relative to circle centre in canvas-space
    const imgOffX = transform.x - CANVAS_SIZE / 2;
    const imgOffY = transform.y - CANVAS_SIZE / 2;

    ctx.drawImage(
      img,
      // destination in output canvas (scaled from canvas-space to output-space)
      half + imgOffX * ratio - (img.naturalWidth  * transform.scale * ratio) / 2,
      half + imgOffY * ratio - (img.naturalHeight * transform.scale * ratio) / 2,
      img.naturalWidth  * transform.scale * ratio,
      img.naturalHeight * transform.scale * ratio,
    );

    out.toBlob(blob => {
      if (blob) onConfirm(blob);
    }, 'image/png', 0.95);
  }, [transform, onConfirm]);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="avatar-cropper-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="avatar-cropper-modal">
        {/* Header */}
        <div className="avatar-cropper-header">
          <h3>Crop Profile Picture</h3>
          <p>Drag to reposition · Scroll or pinch to zoom</p>
        </div>

        {/* Canvas */}
        <div className="avatar-cropper-canvas-wrap">
          {!isReady && (
            <div className="avatar-cropper-loading">
              <div className="avatar-cropper-spinner" />
            </div>
          )}
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="avatar-cropper-canvas"
            style={{ cursor: isDragging ? 'grabbing' : 'grab', opacity: isReady ? 1 : 0 }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onWheel={onWheel}
          />
        </div>

        {/* Zoom slider */}
        <div className="avatar-cropper-zoom">
          <span className="avatar-cropper-zoom-icon">🔍−</span>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={Math.round(currentZoomPct())}
            onChange={onZoomSlider}
            className="avatar-cropper-slider"
          />
          <span className="avatar-cropper-zoom-icon">🔍+</span>
        </div>

        {/* Actions */}
        <div className="avatar-cropper-actions">
          <button className="avatar-cropper-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="avatar-cropper-btn-save" onClick={handleSave} disabled={!isReady}>
            <span>✓</span> Save Photo
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarCropper;
