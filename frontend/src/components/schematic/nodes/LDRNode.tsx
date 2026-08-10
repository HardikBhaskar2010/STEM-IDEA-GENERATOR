import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { PlacedComponent } from '@/store/useCircuitStore';
import { COLORS, nodeContainerStyle, pinDotStyle } from '../nodeStyles';

// ─── LDR Node — 80×60px ───────────────────────────────────────────────────────
// Photoresistor symbol: zigzag inside a circle with light arrows.
// pin1 = left, pin2 = right

const W = 80;
const H = 60;
const CX = W / 2;
const CY = H / 2 - 2;
const R = 18;

export const LDRNode: React.FC<NodeProps> = ({ data, selected }) => {
  const comp = data as unknown as PlacedComponent;
  const ldrValue = comp.ldrValue ?? 512;
  const brightness = ldrValue / 1023;

  // Mini zigzag inside circle
  const zigH = 10;
  const zigW = 24;
  const zStart = CX - zigW / 2;
  const peaks = 4;
  const segW = zigW / peaks;

  const zigPath = (() => {
    let d = `M ${zStart} ${CY}`;
    for (let i = 0; i < peaks; i++) {
      const x1 = zStart + i * segW + segW / 4;
      const x2 = zStart + i * segW + (3 * segW) / 4;
      const x3 = zStart + (i + 1) * segW;
      d += ` L ${x1} ${CY - zigH/2} L ${x2} ${CY + zigH/2} L ${x3} ${CY}`;
    }
    return d;
  })();

  const lightColor = `hsl(45, 100%, ${40 + brightness * 40}%)`;

  return (
    <div style={{ ...nodeContainerStyle(selected ?? false, '#3b2700'), width: W, height: H, position: 'relative' }}>
      <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
        {/* Wire stubs */}
        <line x1={0} y1={CY} x2={CX - R} y2={CY} stroke={lightColor} strokeWidth={2} />
        <line x1={CX + R} y1={CY} x2={W} y2={CY} stroke={lightColor} strokeWidth={2} />

        {/* Outer circle */}
        <circle cx={CX} cy={CY} r={R} fill={COLORS.bg} stroke={lightColor} strokeWidth={1.5} />

        {/* Zigzag symbol inside */}
        <path d={zigPath} fill="none" stroke={lightColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />

        {/* Light arrows (↘ direction) */}
        <line x1={CX - 6} y1={CY - R - 8} x2={CX - 2} y2={CY - R - 2} stroke={lightColor} strokeWidth={1.2} />
        <polygon points={`${CX-2},${CY-R-2} ${CX-7},${CY-R-3} ${CX-3},${CY-R-7}`} fill={lightColor} />
        <line x1={CX + 2} y1={CY - R - 10} x2={CX + 6} y2={CY - R - 4} stroke={lightColor} strokeWidth={1.2} />
        <polygon points={`${CX+6},${CY-R-4} ${CX+1},${CY-R-5} ${CX+5},${CY-R-9}`} fill={lightColor} />

        {/* Value label */}
        <text x={CX} y={H - 4} textAnchor="middle" fontSize={7} fill={COLORS.text} fontFamily="monospace">
          {comp.label || 'LDR'} {ldrValue}
        </text>
      </svg>

      <Handle id="pin1" type="target" position={Position.Left}  style={{ ...pinDotStyle(lightColor), top: CY }} />
      <Handle id="pin2" type="source" position={Position.Right} style={{ ...pinDotStyle(lightColor), top: CY }} />
    </div>
  );
};
