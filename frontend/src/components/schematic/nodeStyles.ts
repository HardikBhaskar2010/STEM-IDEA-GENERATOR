// Shared colors + style helpers for all schematic nodes
export const COLORS = {
  bg: '#050a0f',
  border: '#1a3a3a',
  borderActive: '#00e5ff',
  cyan: '#00e5ff',
  cyanDim: '#00e5ff44',
  text: '#94a3b8',
  textBright: '#e2e8f0',
  green: '#22c55e',
  red: '#ef4444',
  amber: '#f59e0b',
  purple: '#a855f7',
  pcbGreen: '#14532d',
  pcbGreenBorder: '#166534',
};

import type React from 'react';

export const nodeContainerStyle = (
  selected: boolean,
  borderColor = COLORS.border
): React.CSSProperties => ({
  background: COLORS.bg,
  border: `1.5px solid ${selected ? COLORS.borderActive : borderColor}`,
  borderRadius: 6,
  boxShadow: selected
    ? `0 0 0 2px ${COLORS.cyanDim}, 0 4px 24px #00000080`
    : '0 4px 16px #00000060',
  cursor: 'grab',
  userSelect: 'none',
});

// All handles exit horizontally: left = Position.Left, right = Position.Right
// React Flow injects positioning; this just styles the dot.
export const pinDotStyle = (color = COLORS.cyan): React.CSSProperties => ({
  width: 8,
  height: 8,
  background: color,
  border: `1.5px solid ${COLORS.bg}`,
  borderRadius: '50%',
});
