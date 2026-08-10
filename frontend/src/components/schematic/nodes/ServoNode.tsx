import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { PlacedComponent } from '@/store/useCircuitStore';
import { COLORS, nodeContainerStyle, pinDotStyle } from '../nodeStyles';

// ─── Servo Node — 100×80px ────────────────────────────────────────────────────
// Box body with 3-wire tail and animated sweep arc.
// signal = left, vcc = top-left, gnd = bottom-left (all exit left)

const W = 100;
const H = 80;

export const ServoNode: React.FC<NodeProps> = ({ data, selected }) => {
  const comp = data as unknown as PlacedComponent;
  const angle = comp.servoAngle ?? 90;
  // Convert 0-180° servo angle to SVG arc
  const rad = ((-angle + 90) * Math.PI) / 180;
  const armLen = 22;
  const pivotX = W - 24;
  const pivotY = H / 2;
  const armX = pivotX + Math.cos(rad) * armLen;
  const armY = pivotY - Math.sin(rad) * armLen;

  return (
    <div style={{ ...nodeContainerStyle(selected ?? false, '#1e3a5f'), width: W, height: H, position: 'relative' }}>
      <svg width={W} height={H} style={{ display: 'block' }}>
        {/* Body */}
        <rect x={12} y={8} width={W - 36} height={H - 16} rx={4} fill="#0f2744" stroke="#1e3a5f" strokeWidth={1.5} />

        {/* Label */}
        <text x={(12 + W - 36) / 2 + 6} y={H / 2 + 4} textAnchor="middle" fontSize={8} fill={COLORS.text} fontFamily="monospace">
          SERVO
        </text>

        {/* Output gear circle */}
        <circle cx={pivotX} cy={pivotY} r={18} fill="#0a1a2e" stroke="#1e3a5f" strokeWidth={1} />
        <circle cx={pivotX} cy={pivotY} r={3} fill={COLORS.cyan} />

        {/* Sweep arc (0-180°) */}
        <path
          d={`M ${pivotX - 16} ${pivotY} A 16 16 0 0 1 ${pivotX + 16} ${pivotY}`}
          fill="none"
          stroke={COLORS.cyan}
          strokeWidth={1}
          opacity={0.3}
          strokeDasharray="2,2"
        />

        {/* Arm */}
        <line x1={pivotX} y1={pivotY} x2={armX} y2={armY} stroke={COLORS.cyan} strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={armX} cy={armY} r={3} fill={COLORS.cyan} />

        {/* Angle label */}
        <text x={pivotX} y={H - 4} textAnchor="middle" fontSize={7} fill={COLORS.cyan} fontFamily="monospace">{angle}°</text>

        {/* Wire tails */}
        <line x1={0} y1={H/2 - 10} x2={14} y2={H/2 - 10} stroke="#f59e0b" strokeWidth={2} />
        <line x1={0} y1={H/2}      x2={14} y2={H/2}      stroke="#ef4444" strokeWidth={2} />
        <line x1={0} y1={H/2 + 10} x2={14} y2={H/2 + 10} stroke="#1f2937" strokeWidth={2} />
        <text x={16} y={H/2 - 6} fontSize={6} fill="#f59e0b" fontFamily="monospace">SIG</text>
        <text x={16} y={H/2 + 4} fontSize={6} fill="#ef4444" fontFamily="monospace">5V</text>
        <text x={16} y={H/2 + 14} fontSize={6} fill={COLORS.text} fontFamily="monospace">GND</text>
      </svg>

      {/* Handles — all exit left */}
      <Handle id="signal" type="target" position={Position.Left} style={{ ...pinDotStyle('#f59e0b'), top: H/2 - 10 }} />
      <Handle id="vcc"    type="target" position={Position.Left} style={{ ...pinDotStyle(COLORS.red),  top: H/2 }} />
      <Handle id="gnd"    type="target" position={Position.Left} style={{ ...pinDotStyle(COLORS.text), top: H/2 + 10 }} />
    </div>
  );
};
