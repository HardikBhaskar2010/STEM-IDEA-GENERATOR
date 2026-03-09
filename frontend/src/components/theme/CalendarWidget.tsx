import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SoftCard } from './SoftCard';
import { Button } from '@/components/ui/button';
import { EventType } from './EventCard';

interface DayActivity {
  date: string;
  events: Array<{ type: EventType; count: number }>;
}

interface CalendarWidgetProps {
  activities: DayActivity[];
  selectedDate?: string;
  onDateSelect?: (date: string) => void;
  className?: string;
}

const eventColorMap: Record<EventType, string> = {
  idea_generated: 'bg-[hsl(var(--accent-purple))]',
  ai_improved: 'bg-[hsl(var(--accent-blue))]',
  prototype_started: 'bg-[hsl(var(--accent-green))]',
  experiment_logged: 'bg-[hsl(var(--accent-teal))]',
  component_viewed: 'bg-[hsl(var(--accent-orange))]',
  project_completed: 'bg-[hsl(var(--accent-green))]',
  system_alert: 'bg-[hsl(var(--accent-red))]'
};

const eventLabelMap: Record<EventType, string> = {
  idea_generated: 'Ideas',
  ai_improved: 'AI Improved',
  prototype_started: 'Prototypes',
  experiment_logged: 'Experiments',
  component_viewed: 'Views',
  project_completed: 'Completed',
  system_alert: 'Alerts'
};

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({
  activities,
  selectedDate,
  onDateSelect,
  className
}) => {
  const [currentMonth] = useState(new Date());
  
  // Generate calendar days for current month
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1);
    return date.toISOString().split('T')[0];
  });

  const getActivityForDate = (date: string) => {
    return activities.find(a => a.date === date);
  };

  // Get unique event types from all activities for legend
  const uniqueEventTypes = Array.from(
    new Set(activities.flatMap(a => a.events.map(e => e.type)))
  );

  return (
    <SoftCard className={cn('p-4', className)} data-testid="calendar-widget">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
          <div key={idx} className="text-center text-xs font-medium text-muted-foreground py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for days before month starts */}
        {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
          <div key={`empty-${idx}`} />
        ))}
        
        {/* Actual days */}
        {days.map((date) => {
          const activity = getActivityForDate(date);
          const isSelected = date === selectedDate;
          const dayNumber = new Date(date).getDate();
          
          return (
            <button
              key={date}
              onClick={() => onDateSelect?.(date)}
              className={cn(
                'aspect-square rounded-lg text-xs font-medium transition-all',
                'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring',
                isSelected && 'bg-primary text-primary-foreground',
                !isSelected && 'text-foreground'
              )}
              data-testid={`calendar-day-${date}`}
            >
              <div className="flex flex-col items-center justify-center h-full gap-0.5">
                <span>{dayNumber}</span>
                {activity && activity.events.length > 0 && (
                  <div className="flex gap-0.5">
                    {activity.events.slice(0, 3).map((event, idx) => (
                      <div
                        key={idx}
                        className={cn('w-1 h-1 rounded-full', eventColorMap[event.type])}
                      />
                    ))}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      {uniqueEventTypes.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground mb-2">Activity Types</p>
          <div className="flex flex-wrap gap-2">
            {uniqueEventTypes.map((type) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className={cn('w-2 h-2 rounded-full', eventColorMap[type])} />
                <span className="text-xs text-muted-foreground">{eventLabelMap[type]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </SoftCard>
  );
};

export default CalendarWidget;
