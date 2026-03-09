import React from 'react';
import { LucideIcon, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SoftCard } from './SoftCard';
import { EventType } from './EventCard';
import { Button } from '@/components/ui/button';

interface EventPreviewCardProps {
  type: EventType;
  title: string;
  timeRange: string;
  countdown?: string;
  icon: LucideIcon;
  className?: string;
  onAction?: () => void;
}

const eventTypeBgMap: Record<EventType, string> = {
  idea_generated: 'bg-gradient-to-br from-[hsl(var(--accent-purple))]/5 to-transparent',
  ai_improved: 'bg-gradient-to-br from-[hsl(var(--accent-blue))]/5 to-transparent',
  prototype_started: 'bg-gradient-to-br from-[hsl(var(--accent-green))]/5 to-transparent',
  experiment_logged: 'bg-gradient-to-br from-[hsl(var(--accent-teal))]/5 to-transparent',
  component_viewed: 'bg-gradient-to-br from-[hsl(var(--accent-orange))]/5 to-transparent',
  project_completed: 'bg-gradient-to-br from-[hsl(var(--accent-green))]/5 to-transparent',
  system_alert: 'bg-gradient-to-br from-[hsl(var(--accent-red))]/5 to-transparent'
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

const eventTypeColorMap: Record<EventType, keyof typeof accentColorMap> = {
  idea_generated: 'purple',
  ai_improved: 'blue',
  prototype_started: 'green',
  experiment_logged: 'teal',
  component_viewed: 'orange',
  project_completed: 'green',
  system_alert: 'red'
};

export const EventPreviewCard: React.FC<EventPreviewCardProps> = ({
  type,
  title,
  timeRange,
  countdown,
  icon: Icon,
  className,
  onAction
}) => {
  const bgClass = eventTypeBgMap[type];
  const colorClass = accentColorMap[eventTypeColorMap[type]];

  return (
    <SoftCard 
      variant="hover" 
      className={cn('p-4 relative overflow-hidden', className)}
      data-testid={`event-preview-${type}`}
    >
      {/* Background Tint */}
      <div className={cn('absolute inset-0', bgClass)} />
      
      {/* Content */}
      <div className="relative space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <Icon className={cn('w-4 h-4 flex-shrink-0', colorClass)} />
            <h4 className="text-sm font-semibold text-foreground truncate">{title}</h4>
          </div>
          {onAction && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 -mr-1" 
              onClick={onAction}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{timeRange}</span>
          {countdown && (
            <span className={cn('font-medium', colorClass)}>{countdown}</span>
          )}
        </div>
      </div>
    </SoftCard>
  );
};

export default EventPreviewCard;
