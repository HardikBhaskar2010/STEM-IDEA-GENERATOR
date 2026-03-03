import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ActivityBarChartProps {
  data?: Array<{ time: string; activity: number }>;
}

export const ActivityBarChart: React.FC<ActivityBarChartProps> = ({ data }) => {
  // Use provided data or empty array if no data
  const chartData = data || [];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/95 border border-primary/50 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold text-white">{payload[0].payload.time}</p>
          <p className="text-xs text-primary">
            Activity: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.1)" />
        <XAxis 
          dataKey="time" 
          stroke="#6b7280"
          style={{ fontSize: '11px' }}
        />
        <YAxis 
          stroke="#6b7280"
          style={{ fontSize: '11px' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar 
          dataKey="activity" 
          fill="#8b5cf6"
          radius={[4, 4, 0, 0]}
          animationBegin={200}
          animationDuration={1200}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};
