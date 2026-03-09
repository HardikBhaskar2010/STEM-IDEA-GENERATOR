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
      className="glass-effect border-border/50 animate-fade-in transition-all duration-300 hover:shadow-[0px_2px_4px_rgba(0,0,0,0.06),0px_12px_32px_rgba(0,0,0,0.1)] hover:scale-[1.02]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="pt-6">
        {/* Phase B: Visual hierarchy - ICON → BIG NUMBER → LABEL */}
        <div className="text-center space-y-2">
          {/* ICON: Slightly larger with hover effect */}
          {Icon && (
            <div className="flex justify-center mb-2">
              <Icon className={`w-8 h-8 ${colorClass} transition-transform duration-150 hover:scale-110`} />
            </div>
          )}
          
          {/* BIG NUMBER: Primary focus */}
          <p className={`text-4xl font-bold ${colorClass}`}>
            <CounterAnimation end={value} duration={2000} />
          </p>
          
          {/* LABEL: Smaller, secondary */}
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
};
