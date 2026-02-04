import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Project {
  difficulty: string;
}

interface ProjectDifficultyChartProps {
  projects: Project[];
}

const COLORS = {
  Beginner: '#8b5cf6',
  Intermediate: '#a78bfa',
  Advanced: '#c084fc',
  Expert: '#e9d5ff',
};

export const ProjectDifficultyChart: React.FC<ProjectDifficultyChartProps> = ({ projects }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const difficultyCount = projects.reduce((acc, project) => {
    const difficulty = project.difficulty || 'Beginner';
    acc[difficulty] = (acc[difficulty] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data = [
    { name: 'Beginner', count: difficultyCount['Beginner'] || 0 },
    { name: 'Intermediate', count: difficultyCount['Intermediate'] || 0 },
    { name: 'Advanced', count: difficultyCount['Advanced'] || 0 },
    { name: 'Expert', count: difficultyCount['Expert'] || 0 },
  ];

  const hasData = data.some(item => item.count > 0);

  if (!hasData) {
    return (
      <Card className="glass-effect border-border/50">
        <CardHeader>
          <CardTitle>Projects by Difficulty</CardTitle>
          <CardDescription>Distribution of project difficulty levels</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">No projects yet</p>
        </CardContent>
      </Card>
    );
  }

  const handleMouseEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const handleMouseLeave = () => {
    setActiveIndex(null);
  };

  return (
    <Card className="glass-effect border-border/50 animate-fade-in transition-all duration-300 hover:shadow-lg" style={{ animationDelay: '300ms' }}>
      <CardHeader>
        <CardTitle>Projects by Difficulty</CardTitle>
        <CardDescription>Distribution of project difficulty levels</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart 
            data={data}
            onMouseMove={(state) => {
              if (state.isTooltipActive) {
                setActiveIndex(state.activeTooltipIndex ?? null);
              } else {
                setActiveIndex(null);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.1)" />
            <XAxis 
              dataKey="name" 
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                border: '1px solid rgba(139, 92, 246, 0.5)',
                borderRadius: '8px',
                padding: '8px 12px'
              }}
              cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }}
            />
            <Bar 
              dataKey="count" 
              fill="#8b5cf6"
              radius={[8, 8, 0, 0]}
              animationBegin={300}
              animationDuration={1200}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[entry.name as keyof typeof COLORS]}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.6}
                  style={{
                    filter: activeIndex === index ? 'drop-shadow(0 4px 8px currentColor)' : 'none',
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
