import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { PlacedComponent } from '@/store/useCircuitStore';
import { useCircuitStore } from '@/store/useCircuitStore';
import { COLORS, nodeContainerStyle, pinDotStyle } from '../nodeStyles';

// ─── Button Node — 80×60px ────────────────────────────────────────────────────
// SPST momentary switch symbol. leg1 = left, leg2 = right.
// Clicking toggles buttonState in the store.

const W = 80;
const H = 60;

export const ButtonNode: React.FC<NodeProps> = ({ data, selected }) => {
  const comp = data as unknown as PlacedComponent;
  const isPressed = comp.buttonState ?? false;
  const updateComponent = useCircuitStore((s) => s.updateComponent);
  const mid = H / 2;

  const handlePress = () => {
    updateComponent(comp.id, { buttonState: !isPressed });
  };

  return (
    <div
      style={{ ...nodeContainerStyle(selected ?? false, isPressed ? COLORS.cyan : COLORS.border), width: W, height: H, position: 'relative', cursor: 'pointer' }}
      onClick={handlePress}
      title="Click to toggle"
    >
      <svg width={W} height={H} style={{ display: 'block', pointerEvents: 'none' }}>
        {/* Left wire stub */}
        <line x1={0} y1={mid} x2={22} y2={mid} stroke={COLORS.red} strokeWidth={2} />

        {/* Left contact dot */}
        <circle cx={22} cy={mid} r={3} fill={COLORS.red} />

        {/* Right contact dot */}
        <circle cx={W-22} cy={mid} r={3} fill={COLORS.red} />

        {/* Right wire stub */}
        <line x1={W-22} y1={mid} x2={W} y2={mid} stroke={COLORS.red} strokeWidth={2} />

        {/* Switch actuator line */}
        {isPressed ? (
          /* Closed: bridge between contacts */
          <line x1={22} y1={mid} x2={W-22} y2={mid} stroke={COLORS.cyan} strokeWidth={2} />
        ) : (
          /* Open: angled gap */
          <line x1={22} y1={mid} x2={W-22} y2={mid - 12} stroke={COLORS.red} strokeWidth={2} />
        )}

        {/* Button circle (press indicator) */}
        <circle cx={W/2} cy={mid - (isPressed ? 0 : 1)} r={7} fill={isPressed ? COLORS.cyan + '33' : 'none'} stroke={isPressed ? COLORS.cyan : COLORS.text} strokeWidth={1} />

        <text x={W/2} y={H-4} textAnchor="middle" fontSize={7} fill={isPressed ? COLORS.cyan : COLORS.text} fontFamily="monospace">
          {isPressed ? 'CLOSED' : comp.label || 'BTN'}
        </text>
      </svg>

      <Handle id="leg1" type="target" position={Position.Left} style={{ ...pinDotStyle(COLORS.red), top: mid }} />
      <Handle id="leg2" type="source" position={Position.Right} style={{ ...pinDotStyle(COLORS.red), top: mid }} />
    </div>
  );
};
