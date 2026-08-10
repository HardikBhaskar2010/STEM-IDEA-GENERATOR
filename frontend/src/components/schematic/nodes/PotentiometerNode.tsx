import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { PlacedComponent } from '@/store/useCircuitStore';
import { useCircuitStore } from '@/store/useCircuitStore';
import { COLORS, nodeContainerStyle, pinDotStyle } from '../nodeStyles';

// ─── Potentiometer Node — 80×80px ─────────────────────────────────────────────
// Zigzag body + wiper arrow. Drag thumb or click +/- to adjust.
// vcc = left, wiper = right-center, gnd = bottom-left via label

const W = 80;
const H = 80;

export const PotentiometerNode: React.FC<NodeProps> = ({ data, selected }) => {
  const comp = data as unknown as PlacedComponent;
  const potValue = comp.potValue ?? 512;
  const updateComponent = useCircuitStore((s) => s.updateComponent);

  const pct = potValue / 1023;
  const mid = H / 2 - 8;

  // Zigzag params
  const zigW = 44;
  const zigStart = (W - zigW) / 2;
  const peaks = 5;
  const segW = zigW / peaks;
  const amp = 7;

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

  // Wiper position on zigzag
  const wiperX = zigStart + pct * zigW;

  const handleStep = (delta: number) => {
    updateComponent(comp.id, { potValue: Math.max(0, Math.min(1023, potValue + delta)) });
  };

  return (
    <div style={{ ...nodeContainerStyle(selected ?? false, COLORS.purple), width: W, height: H, position: 'relative' }}>
      <svg width={W} height={H} style={{ display: 'block', pointerEvents: 'none' }}>
        {/* Wire stubs */}
        <line x1={0} y1={mid} x2={zigStart} y2={mid} stroke={COLORS.purple} strokeWidth={2} />
        <line x1={zigStart + zigW} y1={mid} x2={W} y2={mid} stroke={COLORS.purple} strokeWidth={2} />

        {/* Zigzag body */}
        <path d={zigPath} fill="none" stroke={COLORS.purple} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />

        {/* Wiper arrow */}
        <line x1={wiperX} y1={mid + 14} x2={wiperX} y2={mid + 4} stroke={COLORS.cyan} strokeWidth={1.5} />
        <polygon points={`${wiperX},${mid+4} ${wiperX-4},${mid+11} ${wiperX+4},${mid+11}`} fill={COLORS.cyan} />

        {/* Wiper output wire */}
        <line x1={wiperX} y1={mid + 14} x2={wiperX} y2={H - 4} stroke={COLORS.cyan} strokeWidth={1} strokeDasharray="2,2" />

        {/* Value label */}
        <text x={W/2} y={H - 4} textAnchor="middle" fontSize={7} fill={COLORS.text} fontFamily="monospace">
          {potValue}
        </text>

        {/* Pin labels */}
        <text x={4} y={mid - 10} fontSize={7} fill={COLORS.purple} fontFamily="monospace">VCC</text>
        <text x={W-28} y={mid - 10} fontSize={7} fill={COLORS.purple} fontFamily="monospace">GND</text>
      </svg>

      {/* Step buttons overlay */}
      <div style={{ position: 'absolute', bottom: 14, left: 6, right: 6, display: 'flex', justifyContent: 'space-between', pointerEvents: 'all' }}>
        <button onClick={() => handleStep(-50)} style={{ fontSize: 8, color: COLORS.text, background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}>−</button>
        <button onClick={() => handleStep(50)} style={{ fontSize: 8, color: COLORS.text, background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}>+</button>
      </div>

      {/* Handles */}
      <Handle id="vcc" type="target" position={Position.Left} style={{ ...pinDotStyle(COLORS.purple), top: mid }} />
      <Handle id="gnd" type="target" position={Position.Right} style={{ ...pinDotStyle(COLORS.purple), top: mid }} />
      <Handle id="wiper" type="source" position={Position.Right} style={{ ...pinDotStyle(COLORS.cyan), top: mid + 28 }} />
    </div>
  );
};
