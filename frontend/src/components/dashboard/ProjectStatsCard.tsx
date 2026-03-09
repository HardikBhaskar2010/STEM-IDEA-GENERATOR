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
      className="glass-effect border-border/50 animate-fade-in transition-all duration-300 hover:shadow-[0px_2px_4px_rgba(0,0,0,0.06),0px_14px_36px_rgba(0,0,0,0.12)] hover:scale-[1.02] hover:-translate-y-1"
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="pt-6">
        {/* Priority 4: Enhanced visual hierarchy - ICON → BIG NUMBER → LABEL */}
        <div className="text-center space-y-3">
          {/* ICON: Larger size (28-32px) with hover effect */}
          {Icon && (
            <div className="flex justify-center mb-3">
              <Icon className={`w-8 h-8 ${colorClass} transition-transform duration-150 hover:scale-110`} />
            </div>
          )}
          
          {/* BIG NUMBER: Primary focus - Larger, bolder */}
          <p className={`text-5xl font-bold tracking-tight ${colorClass}`}>
            <CounterAnimation end={value} duration={2000} />
          </p>
          
          {/* LABEL: Smaller, subdued - Secondary information */}
          <p className="text-sm text-muted-foreground/70 font-medium">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
};


