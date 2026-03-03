import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, BookOpen, TrendingUp, Plus, Eye, Trash2, BarChart3, CheckCircle, Clock, Lightbulb, Activity, RefreshCw } from 'lucide-react';
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
import { MiniLineChart } from '@/components/dashboard/MiniLineChart';
import { WebGLDebug } from '@/components/WebGLDebug';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user: _user } = useAuth();
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0, planning: 0 });
  
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
      setStats(projectStats);
    }
    setIsLoading(false);
  };

  const handleDeleteProject = async (id: string) => {
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
  };

  const handleReviveProject = async (id: string, e: React.MouseEvent) => {
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
  };

  const filteredProjects = projects.filter(project => {
    if (activeTab === 'all') return true;
    if (activeTab === 'completed') return project.status === 'completed';
    if (activeTab === 'in-progress') return project.status === 'in-progress';
    if (activeTab === 'planning') return project.status === 'planning';
    if (activeTab === 'abandoned') return project.status === 'abandoned';
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'in-progress':
        return 'bg-sky-500/10 text-sky-500 border-sky-500/20';
      case 'planning':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default:
        return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  return (
    <Layout>
      <div className="relative min-h-screen p-8">
        {/* Ambient background glow */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="container mx-auto relative z-10">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <TrendingUp className="w-5 h-5" />
                <span className="text-sm font-bold uppercase tracking-widest">Workspace</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gradient">
                Command Center
              </h1>
              <p className="text-muted-foreground text-lg max-w-lg">
                Manage your synthesis modules and track your innovation progress.
              </p>
            </div>
            
            <Button 
              size="lg"
              onClick={() => navigate('/generator')}
              className="bg-gradient-primary text-white shadow-glow hover:shadow-glow-lg transition-all duration-300 rounded-xl h-14 px-8 text-lg font-bold"
            >
              <Plus className="w-6 h-6 mr-2" />
              New Synthesis
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <ProjectStatsCard 
              title="Total Projects" 
              value={stats.total} 
              icon={Zap}
              colorClass="text-primary"
              delay={0}
            />
            <ProjectStatsCard 
              title="Completion" 
              value={Math.round((stats.completed / (stats.total || 1)) * 100)} 
              icon={CheckCircle}
              colorClass="text-emerald-500"
              delay={100}
            />
            <ProjectStatsCard 
              title="In Progress" 
              value={stats.inProgress} 
              icon={Clock}
              colorClass="text-sky-500"
              delay={200}
            />
            <ProjectStatsCard 
              title="Planning" 
              value={stats.planning} 
              icon={Lightbulb}
              colorClass="text-amber-500"
              delay={300}
            />
          </div>

          {/* Main Charts Section */}
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {/* Large Chart - Projects Over Time */}
            <Card className="lg:col-span-2 glass-effect border-white/5 overflow-hidden" data-testid="projects-over-time-card">
              <CardHeader className="bg-white/5 pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Projects Over Time
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[300px]">
                  <ProjectsOverTimeChart type="area" />
                </div>
              </CardContent>
            </Card>

            {/* Activity Bar Chart */}
            <Card className="glass-effect border-white/5 overflow-hidden" data-testid="activity-chart-card">
              <CardHeader className="bg-white/5 pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-secondary" />
                  Daily Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[300px]">
                  <ActivityBarChart data={dailyActivityData} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Charts Section */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="glass-effect border-white/5 overflow-hidden">
                <CardHeader className="bg-white/5 pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Synthesis Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <ProjectStatusChart stats={stats} />
                </CardContent>
              </Card>

              <Card className="glass-effect border-white/5 overflow-hidden">
                <CardHeader className="bg-white/5 pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-secondary" />
                    Complexity Index
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <ProjectDifficultyChart projects={projects} />
                </CardContent>
              </Card>
            </div>

            {/* Recent Projects List */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-primary" />
                      Project Modules
                    </h3>
                    <TabsList className="bg-white/5 border border-white/10 rounded-xl p-1">
                      <TabsTrigger value="all" className="rounded-lg px-4 py-1.5 text-xs font-bold">ALL</TabsTrigger>
                      <TabsTrigger value="planning" className="rounded-lg px-4 py-1.5 text-xs font-bold">PLANNING</TabsTrigger>
                      <TabsTrigger value="in-progress" className="rounded-lg px-4 py-1.5 text-xs font-bold">ACTIVE</TabsTrigger>
                      <TabsTrigger value="completed" className="rounded-lg px-4 py-1.5 text-xs font-bold">DONE</TabsTrigger>
                      <TabsTrigger value="abandoned" className="rounded-lg px-4 py-1.5 text-xs font-bold">ABANDONED</TabsTrigger>
                    </TabsList>
                  </div>
                </Tabs>
              </div>

              {isLoading ? (
                <div className="grid gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse border border-white/5" />
                  ))}
                </div>
              ) : filteredProjects.length > 0 ? (
                <div className="grid gap-4">
                  {filteredProjects.map((project, index) => (
                    <Card key={project.id} className="glass-effect border-white/5 hover:border-primary/30 transition-all group overflow-hidden" enableAnimation={true} animationDelay={index * 50} enableHover={true}>
                      <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className={`${getStatusColor(project.status)} border px-2 py-0 font-bold uppercase text-[10px]`}>
                              {project.status}
                            </Badge>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(project.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <h4 className="text-xl font-bold group-hover:text-primary transition-colors">{project.title}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-1">{project.description}</p>
                          
                          <div className="pt-2">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase">Progress</span>
                              <span className="text-xs font-bold">{project.progress}%</span>
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                              <div className="h-full bg-gradient-primary" style={{ width: `${project.progress}%` }} />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          {project.status === 'abandoned' ? (
                            <Button 
                              variant="default" 
                              size="sm"
                              className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
                              onClick={(e) => handleReviveProject(project.id, e)}
                              data-testid={`revive-project-${project.id}`}
                            >
                              <RefreshCw className="w-4 h-4" />
                              Revive
                            </Button>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="rounded-xl hover:bg-primary/20 hover:text-primary transition-all"
                              onClick={() => navigate(`/project/${project.id}`)}
                              data-testid={`view-project-${project.id}`}
                            >
                              <Eye className="w-5 h-5" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive transition-all"
                            onClick={() => handleDeleteProject(project.id)}
                            data-testid={`delete-project-${project.id}`}
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="glass-effect border-dashed border-white/10 p-12 text-center rounded-3xl">
                  <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <Zap className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h4 className="text-lg font-bold mb-2 text-gradient">No Synthesis Modules</h4>
                  <p className="text-muted-foreground mb-8 max-w-xs mx-auto text-sm leading-relaxed">
                    You haven't initialized any projects in this category. Start your first synthesis to see them here.
                  </p>
                  <Button 
                    onClick={() => navigate('/generator')}
                    className="bg-white text-black hover:bg-white/90 rounded-xl px-8 font-bold"
                  >
                    Initialize Lab
                  </Button>
                </Card>
              )}
            </div>
          </div>

          {/* WebGL Debug Info - Development Only */}
          {import.meta.env.DEV && (
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
