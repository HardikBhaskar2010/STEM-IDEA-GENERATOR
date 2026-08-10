import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { PlacedComponent } from '@/store/useCircuitStore';
import { COLORS, nodeContainerStyle, pinDotStyle } from '../nodeStyles';

// ─── Buzzer Node — 60×60px ────────────────────────────────────────────────────
// Piezo circle with cross-hatch. pos = left, neg = right.

const W = 60;
const H = 60;
const R = 20;
const CX = W / 2;
const CY = H / 2;

export const BuzzerNode: React.FC<NodeProps> = ({ data, selected }) => {
  const comp = data as unknown as PlacedComponent;
  const isOn = comp.isOn ?? false;

  return (
    <div style={{ ...nodeContainerStyle(selected ?? false, isOn ? COLORS.amber : COLORS.border), width: W, height: H, position: 'relative' }}>
      <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
        {/* Wire stubs */}
        <line x1={0} y1={CY} x2={CX - R} y2={CY} stroke={COLORS.amber} strokeWidth={2} />
        <line x1={CX + R} y1={CY} x2={W} y2={CY} stroke={COLORS.amber} strokeWidth={2} />

        {/* Piezo body circle */}
        <circle cx={CX} cy={CY} r={R} fill={isOn ? COLORS.amber + '22' : COLORS.bg} stroke={isOn ? COLORS.amber : COLORS.text} strokeWidth={1.5} />

        {/* Cross-hatch lines */}
        {[-8, -4, 0, 4, 8].map((offset) => (
          <line
            key={offset}
            x1={CX + offset} y1={CY - Math.sqrt(R*R - offset*offset)}
            x2={CX + offset} y2={CY + Math.sqrt(R*R - Math.min(offset*offset, R*R))}
            stroke={isOn ? COLORS.amber : COLORS.text}
            strokeWidth={0.8}
            opacity={0.5}
          />
        ))}

        {/* Sound waves when on */}
        {isOn && (
          <>
            <path d={`M ${CX+R+4} ${CY-8} Q ${CX+R+12} ${CY} ${CX+R+4} ${CY+8}`} fill="none" stroke={COLORS.amber} strokeWidth={1.5} opacity={0.7} />
            <path d={`M ${CX+R+8} ${CY-14} Q ${CX+R+20} ${CY} ${CX+R+8} ${CY+14}`} fill="none" stroke={COLORS.amber} strokeWidth={1} opacity={0.4} />
          </>
        )}

        {/* +/- labels */}
        <text x={CX - R + 4} y={CY - R - 3} fontSize={8} fill={COLORS.text} textAnchor="middle" fontFamily="monospace">+</text>
        <text x={CX + R - 4} y={CY - R - 3} fontSize={8} fill={COLORS.text} textAnchor="middle" fontFamily="monospace">−</text>

        <text x={CX} y={H - 4} textAnchor="middle" fontSize={7} fill={isOn ? COLORS.amber : COLORS.text} fontFamily="monospace">
          {comp.label || 'BUZZER'}
        </text>
      </svg>

      <Handle id="pos" type="target" position={Position.Left} style={{ ...pinDotStyle(COLORS.amber), top: CY }} />
      <Handle id="neg" type="source" position={Position.Right} style={{ ...pinDotStyle(COLORS.amber), top: CY }} />
    </div>
  );
};
