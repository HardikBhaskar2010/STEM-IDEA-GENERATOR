import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  type EdgeProps,
} from '@xyflow/react';
import { useCircuitStore } from '@/store/useCircuitStore';

// ─── WireEdge — animated step wire with live/idle color ──────────────────────
// Uses React Flow getStraightPath with a custom SVG overlay for the marching-
// ants animation when isSimulating is true.

interface WireData {
  isLive?: boolean;
  connectionId?: string;
}

const LIVE_COLOR   = '#00e5ff';
const IDLE_COLOR   = '#1e3a4a';
const LIVE_GLOW    = '0 0 6px #00e5ff80';

// CSS for marching ants injected once
const WIRE_STYLE_ID = 'wire-edge-keyframes';
function ensureKeyframes() {
  if (typeof document !== 'undefined' && !document.getElementById(WIRE_STYLE_ID)) {
    const style = document.createElement('style');
    style.id = WIRE_STYLE_ID;
    style.textContent = `
      @keyframes marchingAnts {
        to { stroke-dashoffset: -24; }
      }
    `;
    document.head.appendChild(style);
  }
}

export const WireEdge: React.FC<EdgeProps> = ({
  id,
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  data,
  selected,
}) => {
  ensureKeyframes();

  const isSimulating = useCircuitStore((s) => s.isSimulating);
  const wireData = (data ?? {}) as WireData;
  const isLive = wireData.isLive ?? false;

  // Use step path for Manhattan right-angle routing
  // We build it manually to enforce horizontal exits.
  // Step: go horizontally from source, then vertically, then horizontally to target.
  const midX = (sourceX + targetX) / 2;
  const pathD = `M ${sourceX} ${sourceY} L ${midX} ${sourceY} L ${midX} ${targetY} L ${targetX} ${targetY}`;

  const strokeColor  = isLive ? LIVE_COLOR : IDLE_COLOR;
  const strokeWidth  = selected ? 2.5 : 1.8;
  const filter       = isLive ? LIVE_GLOW : 'none';

  return (
    <>
      {/* Shadow/glow pass */}
      {isLive && (
        <path
          d={pathD}
          fill="none"
          stroke={LIVE_COLOR}
          strokeWidth={strokeWidth + 4}
          strokeOpacity={0.15}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Main wire */}
      <path
        id={id}
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: isLive ? `drop-shadow(${LIVE_GLOW})` : 'none' }}
      />

      {/* Marching ants overlay when simulating + live */}
      {isSimulating && isLive && (
        <path
          d={pathD}
          fill="none"
          stroke="#ffffff"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="6 18"
          style={{
            animation: 'marchingAnts 0.6s linear infinite',
            opacity: 0.5,
          }}
        />
      )}

      {/* Selected highlight */}
      {selected && (
        <path
          d={pathD}
          fill="none"
          stroke={LIVE_COLOR}
          strokeWidth={strokeWidth + 2}
          strokeOpacity={0.2}
          strokeLinecap="round"
        />
      )}
    </>
  );
};
