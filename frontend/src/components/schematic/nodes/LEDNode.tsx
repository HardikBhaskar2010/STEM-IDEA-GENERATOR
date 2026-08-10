import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { PlacedComponent } from '@/store/useCircuitStore';
import { useCircuitStore } from '@/store/useCircuitStore';
import { COLORS, nodeContainerStyle, pinDotStyle } from '../nodeStyles';

// ─── LED Node — 40×60px (1×1.5 grid cells at 40px) ──────────────────────────
// Symbol: diode triangle + bar. Anode = left, Cathode = right.

const W = 80;
const H = 60;

export const LEDNode: React.FC<NodeProps> = ({ data, selected }) => {
  const comp = data as unknown as PlacedComponent;
  const isOn = comp.isOn ?? false;
  const color = comp.color ?? '#ff3333';
  const glowId = `led-glow-${comp.id}`;

  return (
    <div style={{ ...nodeContainerStyle(selected ?? false, isOn ? color : COLORS.border), width: W, height: H, position: 'relative' }}>
      <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation={isOn ? 6 : 0} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Wire stubs */}
        <line x1={0} y1={H/2} x2={18} y2={H/2} stroke={isOn ? color : COLORS.border} strokeWidth={2} />
        <line x1={W-18} y1={H/2} x2={W} y2={H/2} stroke={isOn ? color : COLORS.border} strokeWidth={2} />

        {/* Diode triangle */}
        <polygon
          points={`${18},${H/2-14} ${18},${H/2+14} ${W-22},${H/2}`}
          fill={isOn ? color : 'none'}
          stroke={isOn ? color : COLORS.text}
          strokeWidth={1.5}
          filter={isOn ? `url(#${glowId})` : undefined}
        />

        {/* Cathode bar */}
        <line x1={W-22} y1={H/2-14} x2={W-22} y2={H/2+14} stroke={isOn ? color : COLORS.text} strokeWidth={2} />

        {/* Light rays when on */}
        {isOn && (
          <>
            <line x1={W-10} y1={H/2-18} x2={W+2} y2={H/2-26} stroke={color} strokeWidth={1.5} opacity={0.7} />
            <line x1={W-4} y1={H/2-10} x2={W+8} y2={H/2-16} stroke={color} strokeWidth={1.5} opacity={0.7} />
          </>
        )}

        {/* Pin labels */}
        <text x={6} y={H-6} fontSize={7} fill={COLORS.text} fontFamily="monospace">A</text>
        <text x={W-14} y={H-6} fontSize={7} fill={COLORS.text} fontFamily="monospace">K</text>
      </svg>

      {/* Label */}
      <div style={{ position: 'absolute', top: 2, left: 0, right: 0, textAlign: 'center', fontSize: 8, color: isOn ? color : COLORS.text, fontFamily: 'monospace', pointerEvents: 'none' }}>
        {comp.label || 'LED'}
      </div>

      {/* Handles — horizontal exits */}
      <Handle id="anode" type="target" position={Position.Left} style={{ ...pinDotStyle(isOn ? color : COLORS.cyan), top: H / 2 }} />
      <Handle id="cathode" type="source" position={Position.Right} style={{ ...pinDotStyle(isOn ? color : COLORS.cyan), top: H / 2 }} />
    </div>
  );
};
