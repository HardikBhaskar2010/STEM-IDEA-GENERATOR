import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SoftCard } from './SoftCard';

export type EventType =
  | 'idea_generated'
  | 'ai_improved'
  | 'prototype_started'
  | 'experiment_logged'
  | 'component_viewed'
  | 'project_completed'
  | 'system_alert';

interface EventCardProps {
  type: EventType;
  title: string;
  timestamp: string;
  icon: LucideIcon;
  className?: string;
}

const eventTypeConfig: Record<EventType, { color: 'purple' | 'green' | 'blue' | 'orange' | 'red' | 'yellow' | 'teal'; bgClass: string }> = {
  idea_generated: { color: 'purple', bgClass: 'bg-[hsl(var(--accent-purple))]/10' },
  ai_improved: { color: 'blue', bgClass: 'bg-[hsl(var(--accent-blue))]/10' },
  prototype_started: { color: 'green', bgClass: 'bg-[hsl(var(--accent-green))]/10' },
  experiment_logged: { color: 'teal', bgClass: 'bg-[hsl(var(--accent-teal))]/10' },
  component_viewed: { color: 'orange', bgClass: 'bg-[hsl(var(--accent-orange))]/10' },
  project_completed: { color: 'green', bgClass: 'bg-[hsl(var(--accent-green))]/10' },
  system_alert: { color: 'red', bgClass: 'bg-[hsl(var(--accent-red))]/10' }
};

const accentColorMap = {
  purple: 'text-[hsl(var(--accent-purple))]',
  green: 'text-[hsl(var(--accent-green))]',
  blue: 'text-[hsl(var(--accent-blue))]',
  orange: 'text-[hsl(var(--accent-orange))]',
  red: 'text-[hsl(var(--accent-red))]',
  yellow: 'text-[hsl(var(--accent-yellow))]',
  teal: 'text-[hsl(var(--accent-teal))]'
};

export const EventCard: React.FC<EventCardProps> = ({
  type,
  title,
  timestamp,
  icon: Icon,
  className
}) => {
  const config = eventTypeConfig[type];
  const colorClass = accentColorMap[config.color];

  return (
    <SoftCard variant="hover" className={cn('p-4', className)} data-testid={`event-card-${type}`}>
      <div className="flex items-start gap-3">
        {/* Icon Bubble */}
        <div className={cn('flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center', config.bgClass)}>
          <Icon className={cn('w-5 h-5', colorClass)} />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground truncate">{title}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">{timestamp}</p>
        </div>
      </div>
    </SoftCard>
  );
};

export default EventCard;
