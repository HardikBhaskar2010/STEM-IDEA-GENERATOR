import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface ProjectStatusChartProps {
  stats: {
    completed: number;
    inProgress: number;
    planning: number;
  };
}

const COLORS = {
  completed: '#10b981', // green
  inProgress: '#3b82f6', // blue
  planning: '#f59e0b', // orange
};

export const ProjectStatusChart: React.FC<ProjectStatusChartProps> = ({ stats }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const data = [
    { name: 'Completed', value: stats.completed, color: COLORS.completed },
    { name: 'In Progress', value: stats.inProgress, color: COLORS.inProgress },
    { name: 'Planning', value: stats.planning, color: COLORS.planning },
  ].filter(item => item.value > 0);

  if (data.length === 0) {
    return (
      <Card className="glass-effect border-border/50">
        <CardHeader>
          <CardTitle>Project Status Distribution</CardTitle>
          <CardDescription>Overview of your project statuses</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">No projects yet</p>
        </CardContent>
      </Card>
    );
  }

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  return (
    <Card className="glass-effect border-border/50 animate-fade-in transition-all duration-300 hover:shadow-lg" style={{ animationDelay: '200ms' }}>
      <CardHeader>
        <CardTitle>Project Status Distribution</CardTitle>
        <CardDescription>Overview of your project statuses</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry) => `${entry.name}: ${entry.value}`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              animationBegin={200}
              animationDuration={1200}
              animationEasing="ease-out"
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.6}
                  style={{
                    filter: activeIndex === index ? 'drop-shadow(0 0 8px currentColor)' : 'none',
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                border: '1px solid rgba(139, 92, 246, 0.5)',
                borderRadius: '8px',
                padding: '8px 12px'
              }}
            />
            <Legend 
              wrapperStyle={{ 
                paddingTop: '20px'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
