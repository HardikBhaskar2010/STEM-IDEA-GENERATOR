import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Zap, BookOpen, TrendingUp, Plus, Eye, Trash2, BarChart3, 
  CheckCircle, Clock, Lightbulb, Activity, RefreshCw, 
  Sparkles, Code, Beaker, FileText 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { projectService, type SavedProject } from '@/services/projectService';
import { toast } from '@/hooks/use-toast';
import { ProjectStatsCard } from '@/components/dashboard/ProjectStatsCard';
import { ProjectStatusChart } from '@/components/dashboard/ProjectStatusChart';
import { ProjectDifficultyChart } from '@/components/dashboard/ProjectDifficultyChart';
import { ProjectsOverTimeChart } from '@/components/dashboard/ProjectsOverTimeChart';
import { ActivityBarChart } from '@/components/dashboard/ActivityBarChart';
import { SoftCard, EventCard, EventPreviewCard, CalendarWidget } from '@/components/theme';
import { generateMockEvents, generateMockCalendarActivities } from '@/types/events';
import type { EventType } from '@/components/theme';
import { WebGLDebug } from '@/components/WebGLDebug';
import { useDebugMode } from '@/hooks/useDebugMode';
import { DebugPanel } from '@/components/debug/DebugPanel';

import { EnergyGrid } from '@/components/background/EnergyGrid';
import { ParticleStream } from '@/components/background/ParticleStream';
import { EnergyChart } from '@/components/command-bridge/EnergyChart';

// NOTE: This file was converted from escaped quotes - all " should be regular "


// Phase G: Helper function to group events by date
const groupEventsByDate = (events: any[]) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const groups: { [key: string]: any[] } = {};
  
  events.forEach(event => {
    const eventDate = new Date(event.timestamp);
    eventDate.setHours(0, 0, 0, 0);
    
    let groupKey: string;
    if (eventDate.getTime() === today.getTime()) {
      groupKey = 'Today';
    } else if (eventDate.getTime() === yesterday.getTime()) {
      groupKey = 'Yesterday';
    } else {
      groupKey = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(event);
  });
  
  return groups;
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user: _user } = useAuth();
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  // Split stats into separate state vars — prevents full re-render when only one changes
  const [totalProjects, setTotalProjects] = useState(0);
  const [completedProjects, setCompletedProjects] = useState(0);
  const [inProgressProjects, setInProgressProjects] = useState(0);
  const [planningProjects, setPlanningProjects] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string>();
  const isDebug = useDebugMode();
  // Stable stats object for consumers that need the full shape (memoized)
  const stats = useMemo(() => ({
    total: totalProjects,
    completed: completedProjects,
    inProgress: inProgressProjects,
    planning: planningProjects,
  }), [totalProjects, completedProjects, inProgressProjects, planningProjects]);
  
  // Mock event data
  const [recentEvents] = useState(generateMockEvents(10));
  const [calendarActivities] = useState(generateMockCalendarActivities());
  
  // Phase G: Group events by date
  const groupedEvents = useMemo(() => groupEventsByDate(recentEvents.slice(0, 8)), [recentEvents]);
  
  // Upcoming events
  const upcomingEvents = [
    { type: 'prototype_started' as EventType, title: 'Arduino Project Due', timeRange: 'Tomorrow, 2:00 PM', countdown: 'in 1 day', icon: Beaker },
    { type: 'project_completed' as EventType, title: 'Science Fair Submission', timeRange: 'Dec 20, 5:00 PM', countdown: 'in 5 days', icon: CheckCircle },
    { type: 'experiment_logged' as EventType, title: 'Lab Report Review', timeRange: 'Dec 22, 10:00 AM', countdown: 'in 7 days', icon: FileText },
  ];
  
  // Mock data for Daily Activity chart - Shows hourly activity throughout the day
  const dailyActivityData = [
    { time: '00:00', activity: 2 },
    { time: '01:00', activity: 1 },
    { time: '02:00', activity: 1 },
    { time: '03:00', activity: 0 },
    { time: '04:00', activity: 1 },
    { time: '05:00', activity: 2 },
    { time: '06:00', activity: 3 },
    { time: '07:00', activity: 5 },
    { time: '08:00', activity: 8 },
    { time: '09:00', activity: 12 },
    { time: '10:00', activity: 15 },
    { time: '11:00', activity: 14 },
    { time: '12:00', activity: 18 },
    { time: '13:00', activity: 16 },
    { time: '14:00', activity: 14 },
    { time: '15:00', activity: 13 },
    { time: '16:00', activity: 12 },
    { time: '17:00', activity: 10 },
    { time: '18:00', activity: 8 },
    { time: '19:00', activity: 6 },
    { time: '20:00', activity: 5 },
    { time: '21:00', activity: 4 },
    { time: '22:00', activity: 3 },
    { time: '23:00', activity: 2 },
  ];
  
  // Icon mapping for event types
  const eventIconMap: Record<EventType, typeof Sparkles> = {
    idea_generated: Sparkles,
    ai_improved: Zap,
    prototype_started: Code,
    experiment_logged: Beaker,
    component_viewed: Eye,
    project_completed: CheckCircle,
    system_alert: Activity
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    const userProjects = await projectService.getProjects();
    
    // Ensure backward compatibility - add completed_steps if missing
    const projectsWithCompletedSteps = userProjects.map(p => ({
      ...p,
      completed_steps: p.completed_steps || []
    }));
    
    setProjects(projectsWithCompletedSteps);

    const projectStats = await projectService.getProjectStats();
    if (projectStats) {
      setTotalProjects(projectStats.total);
      setCompletedProjects(projectStats.completed);
      setInProgressProjects(projectStats.inProgress);
      setPlanningProjects(projectStats.planning);
    }
    setIsLoading(false);
  };

  const handleDeleteProject = useCallback(async (id: string) => {
    const success = await projectService.deleteProject(id);
    if (success) {
      toast({
        title: 'Project deleted',
        description: 'The project has been removed',
      });
      await loadProjects();
    } else {
      toast({
        title: 'Error',
        description: 'Failed to delete project',
        variant: 'destructive',
      });
    }
  }, []);

  const handleReviveProject = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = await projectService.reviveProject(id);
    if (updated) {
      toast({
        title: 'Project revived',
        description: `Project status updated to "${updated.status}"`,
      });
      await loadProjects();
    } else {
      toast({
        title: 'Error',
        description: 'Failed to revive project',
        variant: 'destructive',
      });
    }
  }, []);

  const filteredProjects = projects.filter(project => {
    if (activeTab === 'all') {return true;}
    if (activeTab === 'completed') {return project.status === 'completed';}
    if (activeTab === 'in-progress') {return project.status === 'in-progress';}
    if (activeTab === 'planning') {return project.status === 'planning';}
    if (activeTab === 'abandoned') {return project.status === 'abandoned';}
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-[hsl(var(--accent-green))]/10 text-[hsl(var(--accent-green))] border-[hsl(var(--accent-green))]/20';
      case 'in-progress':
        return 'bg-[hsl(var(--accent-blue))]/10 text-[hsl(var(--accent-blue))] border-[hsl(var(--accent-blue))]/20';
      case 'planning':
        return 'bg-[hsl(var(--accent-orange))]/10 text-[hsl(var(--accent-orange))] border-[hsl(var(--accent-orange))]/20';
      case 'abandoned':
        return 'bg-muted/50 text-muted-foreground border-border';
      default:
        return 'bg-muted/50 text-muted-foreground border-border';
    }
  };

  return (
    <Layout>
      <div className="opacity-20 pointer-events-none fixed inset-0 z-0">
        <EnergyGrid />
        <ParticleStream />
      </div>
      <div className="min-h-screen bg-transparent p-4 md:p-8">
        <div className="container mx-auto max-w-7xl relative z-10">
          {/* Header Section - Phase E: Increased margin */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Dashboard</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                Activity Feed
              </h1>
              <p className="text-muted-foreground text-sm max-w-lg">
                Track your projects, experiments, and progress all in one place.
              </p>
            </div>
            
            <Button 
              size="lg"
              onClick={() => navigate('/veronica-ai')}
              className="rounded-lg shadow-sm hover:shadow-md transition-all duration-150 hover:scale-[1.02]"
              data-testid="new-project-button"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Project
            </Button>
          </div>

          {/* Stats Grid - Phase E: Increased gap and margin */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <ProjectStatsCard 
              title="Total Projects" 
              value={stats.total} 
              icon={Zap}
              colorClass="text-foreground"
              delay={0}
            />
            <ProjectStatsCard 
              title="Completion" 
              value={Math.round((stats.completed / (stats.total || 1)) * 100)} 
              icon={CheckCircle}
              colorClass="text-[hsl(var(--accent-green))]"
              delay={100}
            />
            <ProjectStatsCard 
              title="In Progress" 
              value={stats.inProgress} 
              icon={Clock}
              colorClass="text-[hsl(var(--accent-blue))]"
              delay={200}
            />
            <ProjectStatsCard 
              title="Planning" 
              value={stats.planning} 
              icon={Lightbulb}
              colorClass="text-[hsl(var(--accent-orange))]"
              delay={300}
            />
          </div>

          {/* Main Content Grid: Activity Timeline + Right Panel - Priority 5: Enhanced spacing */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left: Activity Timeline + Charts - Priority 5: Optimized spacing */}
            <div className="lg:col-span-2 space-y-8">
              {/* Recent Activity Timeline - Phase G: Grouped by date */}
              <SoftCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Recent Activity
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">Your latest actions and updates</p>
                  </div>
                </div>
                
                {/* Priority 4 & 5: Activity feed with enhanced date headers and spacing */}
                <div className="space-y-6">
                  {Object.entries(groupedEvents).map(([dateLabel, events]) => (
                    <div key={dateLabel}>
                      {/* Priority 4: Enhanced date header with stronger typography */}
                      <div className="mb-4">
                        <h3 className="text-xs uppercase font-semibold text-muted-foreground/80 tracking-wider">
                          {dateLabel}
                        </h3>
                        <div className="mt-1.5 h-px bg-border/50" />
                      </div>
                      {/* Priority 5: Refined spacing between EventCards (14px / space-y-3.5) */}
                      <div className="space-y-3.5">
                        {events.map((event) => {
                          const Icon = eventIconMap[event.type];
                          const timeAgo = new Date(event.timestamp).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          });
                          
                          return (
                            <EventCard
                              key={event.id}
                              type={event.type}
                              title={event.title}
                              timestamp={timeAgo}
                              icon={Icon}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </SoftCard>

              {/* Charts Section - Phase E: Increased gap */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Projects Over Time */}
                <EnergyChart title="Projects Over Time" className="border-border">
                  <div className="h-[200px]">
                    <ProjectsOverTimeChart type="area" />
                  </div>
                </EnergyChart>

                {/* Activity Bar Chart */}
                <EnergyChart title="Daily Activity" className="border-border">
                  <div className="h-[200px]">
                    <ActivityBarChart data={dailyActivityData} />
                  </div>
                </EnergyChart>
              </div>

              {/* Projects Section */}
              <SoftCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        Your Projects
                      </h3>
                      <TabsList className="bg-muted border border-border rounded-lg p-1">
                        <TabsTrigger value="all" className="rounded-md px-3 py-1.5 text-xs font-medium">All</TabsTrigger>
                        <TabsTrigger value="planning" className="rounded-md px-3 py-1.5 text-xs font-medium">Planning</TabsTrigger>
                        <TabsTrigger value="in-progress" className="rounded-md px-3 py-1.5 text-xs font-medium">Active</TabsTrigger>
                        <TabsTrigger value="completed" className="rounded-md px-3 py-1.5 text-xs font-medium">Done</TabsTrigger>
                        <TabsTrigger value="abandoned" className="rounded-md px-3 py-1.5 text-xs font-medium">Archived</TabsTrigger>
                      </TabsList>
                    </div>
                  </Tabs>
                </div>

                {isLoading ? (
                  <div className="grid gap-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : filteredProjects.length > 0 ? (
                  <div className="grid gap-3">
                    {filteredProjects.map((project) => (
                      <SoftCard key={project.id} variant="hover" className="p-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`${getStatusColor(project.status)} border text-xs`}>
                                {project.status}
                              </Badge>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(project.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <h4 className="font-semibold text-sm">{project.title}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-1">{project.description}</p>
                            
                            <div className="pt-1">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-medium text-muted-foreground">Progress</span>
                                <span className="text-xs font-semibold">{project.progress}%</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                <div className="h-full bg-foreground" style={{ width: `${project.progress}%` }} />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            {project.status === 'abandoned' ? (
                              <Button 
                                variant="default" 
                                size="sm"
                                className="rounded-lg transition-transform duration-150 hover:scale-[1.02]"
                                onClick={(e) => handleReviveProject(project.id, e)}
                                data-testid={`revive-project-${project.id}`}
                              >
                                <RefreshCw className="w-4 h-4 mr-1" />
                                Revive
                              </Button>
                            ) : (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="rounded-lg transition-transform duration-150 hover:scale-105"
                                onClick={() => navigate(`/project/${project.id}`)}
                                data-testid={`view-project-${project.id}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="rounded-lg text-destructive hover:bg-destructive/10 transition-transform duration-150 hover:scale-105"
                              onClick={() => handleDeleteProject(project.id)}
                              data-testid={`delete-project-${project.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </SoftCard>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h4 className="font-semibold mb-2">No Projects Found</h4>
                    <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                      You haven't created any projects in this category yet.
                    </p>
                    <Button 
                      onClick={() => navigate('/veronica-ai')}
                      className="rounded-lg transition-transform duration-150 hover:scale-[1.02]"
                    >
                      Create Your First Project
                    </Button>
                  </div>
                )}
              </SoftCard>
            </div>

            {/* Right Panel: Calendar + Upcoming Events + Charts - Phase E: Increased spacing */}
            <div className="space-y-6">
              {/* Calendar Widget */}
              <CalendarWidget
                activities={calendarActivities}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
              />

              {/* Upcoming Events */}
              <SoftCard className="p-6">
                <h3 className="text-lg font-semibold mb-4">Upcoming</h3>
                {/* Priority 5: Consistent spacing (14px / space-y-3.5) */}
                <div className="space-y-3.5">
                  {upcomingEvents.map((event, idx) => (
                    <EventPreviewCard
                      key={idx}
                      type={event.type}
                      title={event.title}
                      timeRange={event.timeRange}
                      countdown={event.countdown}
                      icon={event.icon}
                    />
                  ))}
                </div>
              </SoftCard>

              {/* Stats Charts - Priority 5: Consistent spacing */}
              <EnergyChart title="Project Distribution" className="border-border">
                <ProjectStatusChart stats={stats} />
              </EnergyChart>

              <EnergyChart title="Complexity" className="border-border">
                <ProjectDifficultyChart projects={projects} />
              </EnergyChart>
            </div>
          </div>

          {/* Debug Panel — only when ?debug=true */}
          {isDebug && (
            <div className="mt-8">
              <DebugPanel />
            </div>
          )}

          {/* WebGL Debug Info - Development Only */}
          {import.meta.env.DEV && !isDebug && (
            <div className="mt-8">
              <WebGLDebug />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};


export default Dashboard;

