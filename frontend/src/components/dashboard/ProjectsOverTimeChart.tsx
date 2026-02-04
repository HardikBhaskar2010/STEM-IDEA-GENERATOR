import React from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ProjectsOverTimeChartProps {
  data?: Array<{ date: string; projects: number }>;
  type?: 'line' | 'area';
}

// Generate mock data for last 12 months
const generateMockData = () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonth = new Date().getMonth();
  const data = [];
  
  for (let i = 11; i >= 0; i--) {
    const monthIndex = (currentMonth - i + 12) % 12;
    const projects = Math.floor(Math.random() * 15) + 5; // Random between 5-20
    data.push({
      date: months[monthIndex],
      projects: projects,
    });
  }
  
  return data;
};

export const ProjectsOverTimeChart: React.FC<ProjectsOverTimeChartProps> = ({ 
  data, 
  type = 'area' 
}) => {
  const chartData = data || generateMockData();

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/95 border border-primary/50 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold text-white">{payload[0].payload.date}</p>
          <p className="text-xs text-primary">
            {payload[0].value} projects
          </p>
        </div>
      );
    }
    return null;
  };

  if (type === 'area') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorProjects" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.1)" />
          <XAxis 
            dataKey="date" 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="projects" 
            stroke="#8b5cf6" 
            strokeWidth={2}
            fill="url(#colorProjects)"
            animationBegin={0}
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.1)" />
        <XAxis 
          dataKey="date" 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line 
          type="monotone" 
          dataKey="projects" 
          stroke="#8b5cf6" 
          strokeWidth={3}
          dot={{ fill: '#8b5cf6', r: 4 }}
          activeDot={{ r: 6, fill: '#a78bfa' }}
          animationBegin={0}
          animationDuration={1500}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
