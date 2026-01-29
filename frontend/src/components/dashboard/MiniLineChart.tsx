import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface MiniLineChartProps {
  data?: number[];
  color?: string;
}

export const MiniLineChart: React.FC<MiniLineChartProps> = ({ 
  data, 
  color = '#8b5cf6' 
}) => {
  // Generate mock data if not provided
  const chartData = data 
    ? data.map((value, index) => ({ index, value }))
    : Array.from({ length: 12 }, (_, i) => ({ 
        index: i, 
        value: Math.floor(Math.random() * 100) + 20 
      }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData}>
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke={color} 
          strokeWidth={2}
          dot={false}
          animationDuration={1000}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
