import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { PlacedComponent } from '@/store/useCircuitStore';
import { COLORS, nodeContainerStyle, pinDotStyle } from '../nodeStyles';

// ─── Resistor Node — 80×40px ──────────────────────────────────────────────────
// ANSI zigzag symbol. pin1 = left, pin2 = right.

const W = 80;
const H = 40;

export const ResistorNode: React.FC<NodeProps> = ({ data, selected }) => {
  const comp = data as unknown as PlacedComponent;

  // Zigzag path: 5 peaks centred vertically
  const mid = H / 2;
  const zigW = 36;
  const zigStart = (W - zigW) / 2;
  const zigEnd = zigStart + zigW;
  const peaks = 5;
  const segW = zigW / peaks;
  const amp = 8;

  const zigPath = (() => {
    let d = `M ${zigStart} ${mid}`;
    for (let i = 0; i < peaks; i++) {
      const x1 = zigStart + i * segW + segW / 4;
      const x2 = zigStart + i * segW + (3 * segW) / 4;
      const x3 = zigStart + (i + 1) * segW;
      d += ` L ${x1} ${mid - amp} L ${x2} ${mid + amp} L ${x3} ${mid}`;
    }
    return d;
  })();

  return (
    <div style={{ ...nodeContainerStyle(selected ?? false), width: W, height: H, position: 'relative' }}>
      <svg width={W} height={H} style={{ display: 'block' }}>
        {/* Wire stubs */}
        <line x1={0} y1={mid} x2={zigStart} y2={mid} stroke={COLORS.amber} strokeWidth={2} />
        <line x1={zigEnd} y1={mid} x2={W} y2={mid} stroke={COLORS.amber} strokeWidth={2} />

        {/* Zigzag body */}
        <path d={zigPath} fill="none" stroke={COLORS.amber} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />

        {/* Label */}
        <text x={W/2} y={H-4} textAnchor="middle" fontSize={7} fill={COLORS.text} fontFamily="monospace">
          {comp.label || '220Ω'}
        </text>
      </svg>

      {/* Handles */}
      <Handle id="pin1" type="target" position={Position.Left} style={{ ...pinDotStyle(COLORS.amber), top: mid }} />
      <Handle id="pin2" type="source" position={Position.Right} style={{ ...pinDotStyle(COLORS.amber), top: mid }} />
    </div>
  );
};
