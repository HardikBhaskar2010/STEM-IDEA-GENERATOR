import React from 'react';
import { CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { LivingCard } from '@/components/command-bridge/LivingCard';
import { NumberCounter } from '@/components/animations/NumberCounter';

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
    <LivingCard 
      floating 
      glowPulse 
      variant="energy"
      className="border-border/50 animate-fade-in transition-all duration-300 hover:shadow-[0px_0px_15px_rgba(168,85,247,0.3)] hover:scale-[1.02] hover:-translate-y-1 group"
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="pt-6">
        {/* Priority 4: Enhanced visual hierarchy - ICON → BIG NUMBER → LABEL */}
        <div className="text-center space-y-3">
          {/* ICON: Larger size (28-32px) with hover effect */}
          {Icon && (
            <div className="flex justify-center mb-3">
              <Icon className={`w-8 h-8 ${colorClass} transition-transform duration-150 group-hover:scale-110`} />
            </div>
          )}
          
          {/* BIG NUMBER: Primary focus - Larger, bolder */}
          <p className={`text-5xl font-bold tracking-tight ${colorClass}`}>
            <NumberCounter to={value} duration={2000} />
          </p>
          
          {/* LABEL: Smaller, subdued - Secondary information */}
          <p className="text-sm text-muted-foreground/70 font-medium">{title}</p>
        </div>
      </CardContent>
    </LivingCard>
  );
};


