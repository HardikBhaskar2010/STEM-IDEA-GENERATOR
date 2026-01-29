import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CounterAnimation } from '@/components/ui/counter-animation';
import { LucideIcon } from 'lucide-react';

interface ProjectStatsCardProps {
  title: string;
  value: number;
  icon?: LucideIcon;
  colorClass: string;
  delay?: number;
}

export const ProjectStatsCard: React.FC<ProjectStatsCardProps> = ({
  title,
  value,
  icon: Icon,
  colorClass,
  delay = 0,
}) => {
  return (
    <Card 
      className="glass-effect border-border/50 animate-fade-in transition-all duration-300 hover:shadow-lg hover:scale-105"
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="pt-6">
        <div className="text-center">
          {Icon && (
            <div className="flex justify-center mb-2 transition-transform duration-300 hover:scale-110">
              <Icon className={`w-8 h-8 ${colorClass}`} />
            </div>
          )}
          <p className={`text-3xl font-bold ${colorClass}`}>
            <CounterAnimation end={value} duration={2000} />
          </p>
          <p className="text-sm text-muted-foreground mt-1">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
};
