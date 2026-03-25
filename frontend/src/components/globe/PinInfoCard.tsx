/**
 * PinInfoCard.tsx
 * Glassmorphism info card shown on pin click.
 * Design: dark glass, neon border tinted to pin accent, soft blur, no chunky shadows.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlobePin } from './globePins';

interface PinInfoCardProps {
  pin: GlobePin | null;
  onClose: () => void;
}

function formatCoords(lat: number, lng: number): string {
  const latStr = `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}`;
  const lngStr = `${Math.abs(lng).toFixed(1)}°${lng >= 0 ? 'E' : 'W'}`;
  return `${latStr} / ${lngStr}`;
}

export const PinInfoCard: React.FC<PinInfoCardProps> = ({ pin, onClose }) => {
  return (
    <AnimatePresence>
      {pin && (
        <motion.div
          key={pin.id}
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '320px',
            zIndex: 50,
            background: 'rgba(2, 6, 23, 0.82)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '20px',
            border: `1px solid ${pin.accent}40`,
            boxShadow: `0 0 40px ${pin.accent}18, 0 8px 32px rgba(0,0,0,0.5)`,
            padding: '16px',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              {/* Region pill */}
              <span style={{
                display: 'inline-block',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: pin.accent,
                background: `${pin.accent}18`,
                border: `1px solid ${pin.accent}35`,
                borderRadius: '999px',
                padding: '2px 8px',
                marginBottom: '6px',
              }}>
                {pin.region}
              </span>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>
                {pin.name}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                {pin.category}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.35)',
                fontSize: '18px',
                cursor: 'pointer',
                lineHeight: 1,
                padding: '2px 4px',
                borderRadius: '6px',
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
            >
              ×
            </button>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: `${pin.accent}25`, margin: '12px 0' }} />

          {/* Description */}
          <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.6 }}>
            {pin.description}
          </p>

          {/* Highlight chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
            {pin.highlights.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: pin.accent,
                  background: `${pin.accent}14`,
                  border: `1px solid ${pin.accent}30`,
                  borderRadius: '999px',
                  padding: '3px 10px',
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '14px',
            paddingTop: '10px',
            borderTop: `1px solid ${pin.accent}20`,
          }}>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
              {formatCoords(pin.lat, pin.lng)}
            </span>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: pin.accent,
                background: `${pin.accent}18`,
                border: `1px solid ${pin.accent}40`,
                borderRadius: '999px',
                padding: '4px 12px',
                cursor: 'pointer',
                letterSpacing: '0.04em',
              }}
            >
              View Hub →
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PinInfoCard;
