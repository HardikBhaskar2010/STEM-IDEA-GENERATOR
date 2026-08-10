import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { PlacedComponent } from '@/store/useCircuitStore';
import { COLORS, nodeContainerStyle, pinDotStyle } from '../nodeStyles';

// ─── Breadboard Node — STUB for Phase 5 ─────────────────────────────────────
// Full tie-point grid is deferred. This stub just renders a placeholder.

const W = 240;
const H = 120;

export const BreadboardNode: React.FC<NodeProps> = ({ data, selected }) => {
  const comp = data as unknown as PlacedComponent;

  return (
    <div style={{ ...nodeContainerStyle(selected ?? false, '#5a4a00'), width: W, height: H, position: 'relative' }}>
      <svg width={W} height={H} style={{ display: 'block' }}>
        <rect x={2} y={2} width={W-4} height={H-4} rx={4} fill="#1a1400" stroke="#5a4a00" strokeWidth={1} />

        {/* Tie-point grid preview */}
        {Array.from({ length: 10 }, (_, col) =>
          Array.from({ length: 5 }, (_, row) => (
            <circle key={`${col}-${row}`}
              cx={20 + col * 20} cy={30 + row * 12}
              r={2.5} fill="#3a3000" stroke="#5a4a00" strokeWidth={0.8}
            />
          ))
        )}
        {Array.from({ length: 10 }, (_, col) =>
          Array.from({ length: 5 }, (_, row) => (
            <circle key={`b-${col}-${row}`}
              cx={20 + col * 20} cy={H - 30 - row * 12}
              r={2.5} fill="#3a3000" stroke="#5a4a00" strokeWidth={0.8}
            />
          ))
        )}

        <text x={W/2} y={H/2 + 4} textAnchor="middle" fontSize={9} fill="#5a4a00" fontFamily="monospace" letterSpacing={2}>
          BREADBOARD (Phase 5)
        </text>

        <text x={W/2} y={H - 6} textAnchor="middle" fontSize={7} fill="#3a3000" fontFamily="monospace">
          {comp.label || '400-point'}
        </text>
      </svg>
    </div>
  );
};
