import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { format, subDays, parseISO } from 'date-fns';

interface Project {
  created_at: string;
}

interface ProjectProgressChartProps {
  projects: Project[];
}

export const ProjectProgressChart: React.FC<ProjectProgressChartProps> = ({ projects }) => {
  // Group projects by date (last 30 days)
  const getLast30Days = () => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      days.push(format(subDays(new Date(), i), 'MMM dd'));
    }
    return days;
  };

  const last30Days = getLast30Days();
  
  const projectsByDate = projects.reduce((acc, project) => {
    try {
      const date = format(parseISO(project.created_at), 'MMM dd');
      acc[date] = (acc[date] || 0) + 1;
    } catch (e) {
      // Skip invalid dates
    }
    return acc;
  }, {} as Record<string, number>);

  const data = last30Days.map(day => ({
    date: day,
    projects: projectsByDate[day] || 0,
  }));

  const hasData = data.some(item => item.projects > 0);

  if (!hasData) {
    return (
      <Card className="glass-effect border-border/50">
        <CardHeader>
          <CardTitle>Project Activity Timeline</CardTitle>
          <CardDescription>Projects created over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">No projects in the last 30 days</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-effect border-border/50 animate-fade-in transition-all duration-300 hover:shadow-lg" style={{ animationDelay: '400ms' }}>
      <CardHeader>
        <CardTitle>Project Activity Timeline</CardTitle>
        <CardDescription>Projects created over the last 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorProjects" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.1)" />
            <XAxis 
              dataKey="date" 
              stroke="#9ca3af"
              style={{ fontSize: '10px' }}
              interval="preserveStartEnd"
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
              animationDuration={200}
            />
            <Area 
              type="monotone" 
              dataKey="projects" 
              stroke="#8b5cf6" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorProjects)"
              animationBegin={400}
              animationDuration={1500}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
