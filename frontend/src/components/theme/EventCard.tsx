import React from 'react';
import type { LucideIcon } from 'lucide-react';
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

const eventTypeConfig: Record<EventType, { color: 'purple' | 'green' | 'blue' | 'orange' | 'red' | 'yellow' | 'teal'; bgClass: string; borderColor: string; tintBg: string }> = {
  idea_generated: { 
    color: 'purple', 
    bgClass: 'bg-[hsl(var(--accent-purple))]/10',
    borderColor: 'hsl(var(--accent-purple))',
    tintBg: 'bg-[hsl(var(--accent-purple))]/6'
  },
  ai_improved: { 
    color: 'blue', 
    bgClass: 'bg-[hsl(var(--accent-blue))]/10',
    borderColor: 'hsl(var(--accent-blue))',
    tintBg: 'bg-[hsl(var(--accent-blue))]/6'
  },
  prototype_started: { 
    color: 'green', 
    bgClass: 'bg-[hsl(var(--accent-green))]/10',
    borderColor: 'hsl(var(--accent-green))',
    tintBg: 'bg-[hsl(var(--accent-green))]/6'
  },
  experiment_logged: { 
    color: 'teal', 
    bgClass: 'bg-[hsl(var(--accent-teal))]/10',
    borderColor: 'hsl(var(--accent-teal))',
    tintBg: 'bg-[hsl(var(--accent-teal))]/6'
  },
  component_viewed: { 
    color: 'orange', 
    bgClass: 'bg-[hsl(var(--accent-orange))]/10',
    borderColor: 'hsl(var(--accent-orange))',
    tintBg: 'bg-[hsl(var(--accent-orange))]/6'
  },
  project_completed: { 
    color: 'green', 
    bgClass: 'bg-[hsl(var(--accent-green))]/10',
    borderColor: 'hsl(var(--accent-green))',
    tintBg: 'bg-[hsl(var(--accent-green))]/6'
  },
  system_alert: { 
    color: 'red', 
    bgClass: 'bg-[hsl(var(--accent-red))]/10',
    borderColor: 'hsl(var(--accent-red))',
    tintBg: 'bg-[hsl(var(--accent-red))]/6'
  }
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
    <div 
      className={cn('relative overflow-hidden rounded-xl', className)} 
      data-testid={`event-card-${type}`}
    >
      {/* Phase C: Subtle tinted background */}
      <div className={cn('absolute inset-0', config.tintBg)} />
      
      <SoftCard 
        variant="hover" 
        className="p-4 relative transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0px_2px_4px_rgba(0,0,0,0.06),0px_14px_36px_rgba(0,0,0,0.12)]"
        style={{
          // Priority 2: Enhanced 4px accent border for stronger visual anchoring
          borderLeft: `4px solid ${config.borderColor}`,
          borderTopLeftRadius: '0.5rem'
        }}
      >
        <div className="flex items-start gap-3">
          {/* Priority 3: Icon with consistent micro-interaction */}
          <div className={cn(
            'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
            'transition-transform duration-120 hover:scale-110',
            config.bgClass
          )}>
            <Icon className={cn('w-5 h-5', colorClass)} />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-foreground truncate">{title}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{timestamp}</p>
          </div>
        </div>
      </SoftCard>
    </div>
  );
};

export default EventCard;


