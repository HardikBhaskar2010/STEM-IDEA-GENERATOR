import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { PlacedComponent } from '@/store/useCircuitStore';
import { COLORS, nodeContainerStyle, pinDotStyle } from '../nodeStyles';

// ─── Arduino Uno node ─────────────────────────────────────────────────────────
// Width: 200px  Height: 320px  (fits on 40px grid as 5×8 cells)
// Digital pins D0-D13 on right side, 16px spacing starting y=32
// Analog  pins A0-A5  on right side below digital
// Power   pins 5V/GND on left side

const W = 200;
const H = 320;
const PIN_SPACING = 16;

const DIGITAL_PINS = ['D13','D12','D11','D10','D9','D8','D7','D6','D5','D4','D3','D2','D1','D0'];
const ANALOG_PINS  = ['A0','A1','A2','A3','A4','A5'];
const POWER_LEFT   = ['5V','GND'];

export const ArduinoNode: React.FC<NodeProps> = ({ data, selected }) => {
  const comp = data as unknown as PlacedComponent;

  return (
    <div style={{ ...nodeContainerStyle(selected ?? false, COLORS.pcbGreenBorder), width: W, height: H }}>
      {/* PCB body */}
      <svg width={W} height={H} style={{ display: 'block' }}>
        {/* Board fill */}
        <rect x={2} y={2} width={W-4} height={H-4} rx={4} fill={COLORS.pcbGreen} stroke={COLORS.pcbGreenBorder} strokeWidth={1.5} />

        {/* Logo */}
        <text x={W/2} y={H/2 - 14} textAnchor="middle" fill="#166534" fontSize={28} fontWeight="bold" opacity={0.4}>
          Uno
        </text>
        <text x={W/2} y={H/2 + 10} textAnchor="middle" fill="#16a34a" fontSize={9} letterSpacing={3} opacity={0.6}>
          ARDUINO
        </text>

        {/* USB port */}
        <rect x={8} y={H-50} width={28} height={22} rx={2} fill="#374151" stroke="#4b5563" strokeWidth={1} />
        <text x={22} y={H-35} textAnchor="middle" fill="#6b7280" fontSize={6}>USB</text>

        {/* Power jack */}
        <circle cx={22} cy={H-20} r={8} fill="#1f2937" stroke="#374151" strokeWidth={1} />

        {/* Digital pin labels — right side */}
        {DIGITAL_PINS.map((pin, i) => (
          <text key={pin} x={W-14} y={32 + i * PIN_SPACING + 4} textAnchor="end" fill="#86efac" fontSize={7} fontFamily="monospace">
            {pin}
          </text>
        ))}

        {/* Analog pin labels — right side below digital */}
        {ANALOG_PINS.map((pin, i) => (
          <text key={pin} x={W-14} y={32 + DIGITAL_PINS.length * PIN_SPACING + i * PIN_SPACING + 4} textAnchor="end" fill="#67e8f9" fontSize={7} fontFamily="monospace">
            {pin}
          </text>
        ))}

        {/* Power pin labels — left side */}
        {POWER_LEFT.map((pin, i) => (
          <text key={pin} x={16} y={32 + i * PIN_SPACING + 4} textAnchor="start" fill="#fbbf24" fontSize={7} fontFamily="monospace">
            {pin}
          </text>
        ))}
      </svg>

      {/* ── React Flow Handles ── */}
      {/* Digital right side — exit RIGHT */}
      {DIGITAL_PINS.map((pin, i) => (
        <Handle
          key={`${comp.id}-${pin.toLowerCase()}`}
          id={`${pin.toLowerCase()}`}
          type="source"
          position={Position.Right}
          style={{ ...pinDotStyle(COLORS.green), top: 32 + i * PIN_SPACING }}
          title={pin}
        />
      ))}

      {/* Analog right side — exit RIGHT */}
      {ANALOG_PINS.map((pin, i) => (
        <Handle
          key={`${comp.id}-${pin.toLowerCase()}`}
          id={`${pin.toLowerCase()}`}
          type="source"
          position={Position.Right}
          style={{ ...pinDotStyle(COLORS.cyan), top: 32 + DIGITAL_PINS.length * PIN_SPACING + i * PIN_SPACING }}
          title={pin}
        />
      ))}

      {/* Power left side — exit LEFT */}
      {POWER_LEFT.map((pin, i) => (
        <Handle
          key={`${comp.id}-${pin.toLowerCase()}`}
          id={`${pin.toLowerCase()}`}
          type="source"
          position={Position.Left}
          style={{ ...pinDotStyle(COLORS.amber), top: 32 + i * PIN_SPACING }}
          title={pin}
        />
      ))}

      {/* Component label */}
      <div style={{ position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center', fontSize: 9, color: COLORS.text, fontFamily: 'monospace', pointerEvents: 'none' }}>
        {comp.label || 'Arduino Uno'}
      </div>
    </div>
  );
};
