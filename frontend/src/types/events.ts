import type { EventType } from '@/components/theme/EventCard';

export interface ActivityEvent {
  id: string;
  type: EventType;
  title: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface DayActivity {
  date: string;
  events: Array<{ type: EventType; count: number }>;
}

// Mock data generator for development
export const generateMockEvents = (count: number = 20): ActivityEvent[] => {
  const eventTypes: EventType[] = [
    'idea_generated',
    'ai_improved',
    'prototype_started',
    'experiment_logged',
    'component_viewed',
    'project_completed',
    'system_alert'
  ];

  const titles: Record<EventType, string[]> = {
    idea_generated: ['New STEM idea created', 'Brainstorm session completed', 'Innovation concept logged'],
    ai_improved: ['AI enhanced your prototype', 'Smart suggestions applied', 'Code optimized by AI'],
    prototype_started: ['Started building prototype', 'New experiment initiated', 'Development phase begun'],
    experiment_logged: ['Experiment results recorded', 'Test data collected', 'Lab notes updated'],
    component_viewed: ['Component library accessed', 'Reference material viewed', 'Documentation checked'],
    project_completed: ['Project milestone reached', 'Build successfully completed', 'Achievement unlocked'],
    system_alert: ['System notification', 'Important update', 'Action required']
  };

  const events: ActivityEvent[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const titleOptions = titles[type];
    const title = titleOptions[Math.floor(Math.random() * titleOptions.length)];
    
    // Generate timestamps within last 30 days
    const daysAgo = Math.floor(Math.random() * 30);
    const hoursAgo = Math.floor(Math.random() * 24);
    const timestamp = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - hoursAgo * 60 * 60 * 1000);

    events.push({
      id: `event-${i}`,
      type,
      title,
      timestamp: timestamp.toISOString(),
      metadata: {}
    });
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const generateMockCalendarActivities = (): DayActivity[] => {
  const activities: DayActivity[] = [];
  const now = new Date();
  const eventTypes: EventType[] = [
    'idea_generated',
    'ai_improved',
    'prototype_started',
    'experiment_logged',
    'component_viewed',
    'project_completed'
  ];

  // Generate activities for last 30 days
  for (let i = 0; i < 30; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Random number of event types per day (0-4)
    const numEventTypes = Math.floor(Math.random() * 5);
    
    if (numEventTypes > 0) {
      const dayEvents: Array<{ type: EventType; count: number }> = [];
      
      for (let j = 0; j < numEventTypes; j++) {
        const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const count = Math.floor(Math.random() * 5) + 1;
        
        // Avoid duplicates
        if (!dayEvents.find(e => e.type === type)) {
          dayEvents.push({ type, count });
        }
      }
      
      activities.push({
        date: dateStr,
        events: dayEvents
      });
    }
  }

  return activities;
};

export default { generateMockEvents, generateMockCalendarActivities };
