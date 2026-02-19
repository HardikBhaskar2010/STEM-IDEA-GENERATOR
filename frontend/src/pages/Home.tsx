import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Cpu, BookOpen, ArrowRight, Sparkles, Rocket, Brain, LogOut, Plus, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';
import { projectService, type SavedProject } from '@/services/projectService';
import { toast } from '@/hooks/use-toast';
import { HeroScene3D } from '@/components/three/HeroScene3D';
import { BackgroundCanvas3D } from '@/components/three/BackgroundCanvas3D';
import { LivingCard } from '@/components/command-bridge';
import { NumberCounter, FloatingMotion } from '@/components/animations';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { mode, isLoading: authLoading } = useAuth();

  // Dashboard state
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0, planning: 0 });

  // Animation refs for hero section (Landing view)
  const heroIconRef = useScrollAnimation<HTMLDivElement>({ animation: 'fadeIn', delay: 0 });
  const heroTitleRef = useScrollAnimation<HTMLHeadingElement>({ animation: 'fadeIn', delay: 200 });
  const heroDescRef = useScrollAnimation<HTMLParagraphElement>({ animation: 'fadeIn', delay: 400 });
  const heroButtonsRef = useScrollAnimation<HTMLDivElement>({ animation: 'fadeIn', delay: 600 });

  // Redirect unauthenticated users to login - REMOVED FOR SOFT-LOCK
  // Everyone can access home now (auto-guest mode)
  // useEffect(() => {
  //   if (!authLoading && mode === 'unauthenticated') {
  //     navigate('/login');
  //   }
  // }, [authLoading, mode, navigate]);

  // Determine which view to show
  const showDashboard = mode === 'authenticated';
  const showLanding = mode === 'guest';

  // Load projects for dashboard view
  useEffect(() => {
    if (showDashboard) {
      loadProjects();
    }
  }, [showDashboard]);

  const loadProjects = async () => {
    setIsLoadingProjects(true);
    const userProjects = await projectService.getProjects();
    setProjects(userProjects);

    const projectStats = await projectService.getProjectStats();
    if (projectStats) {
      setStats(projectStats);
    }
    setIsLoadingProjects(false);
  };

  const handleLogout = async () => {
    const { error } = await authService.signOut();
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to sign out',
        variant: 'destructive',
      });
      return;
    }
    // Stay on home page after logout
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

  const filteredProjects = projects.filter(project => {
    if (activeTab === 'all') return true;
    if (activeTab === 'completed') return project.status === 'completed';
    if (activeTab === 'in-progress') return project.status === 'in-progress';
    if (activeTab === 'planning') return project.status === 'planning';
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-500';
      case 'in-progress':
        return 'bg-blue-500/10 text-blue-500';
      case 'planning':
        return 'bg-orange-500/10 text-orange-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Ideas',
      description: 'Generate innovative STEM project ideas tailored to your skill level',
      color: 'bg-gradient-primary',
      link: '/generator'
    },
    {
      icon: Cpu,
      title: 'Component Database',
      description: 'Browse 500+ electronic components with detailed specifications',
      color: 'bg-gradient-secondary',
      link: '/components'
    },
    {
      icon: BookOpen,
      title: 'Project Library',
      description: 'Save, organize, and track your projects in one place',
      color: 'bg-gradient-accent',
      link: '/library'
    }
  ];

  // Loading state
  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin">
            <Zap className="w-8 h-8 text-primary" />
          </div>
        </div>
      </Layout>
    );
  }

  // DASHBOARD VIEW - For authenticated users only
  if (showDashboard) {
    return (
      <Layout>
        <div className="bg-gradient-to-b from-primary/5 via-background to-background pt-16">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto py-12">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div className="space-y-2">
                  <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gradient">
                    Workspace
                  </h1>
                  <p className="text-muted-foreground text-lg max-w-lg">
                    Welcome back! Here's an overview of your STEM innovation projects.
                  </p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <Button
                    size="lg"
                    className="flex-1 md:flex-none bg-gradient-primary text-white shadow-glow hover:shadow-glow-lg transition-all duration-300 rounded-full px-8 h-14"
                    onClick={() => navigate('/generator')}
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    <span className="font-semibold">New Project</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="rounded-full h-12 w-12 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Sign Out"
                  >
                    <LogOut className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                <Card className="glass-effect border-primary/10 shadow-sm hover:shadow-md transition-all duration-300">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-primary">{stats.total}</p>
                      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mt-1">Total</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-effect border-emerald-500/10 shadow-sm hover:shadow-md transition-all duration-300">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-emerald-500">{stats.completed}</p>
                      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mt-1">Completed</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-effect border-sky-500/10 shadow-sm hover:shadow-md transition-all duration-300">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-sky-500">{stats.inProgress}</p>
                      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mt-1">Active</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-effect border-amber-500/10 shadow-sm hover:shadow-md transition-all duration-300">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-amber-500">{stats.planning}</p>
                      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mt-1">Planning</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Projects List */}
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-primary" />
                    Recent Projects
                  </h2>
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-muted/50 p-1 rounded-xl">
                    <TabsList className="bg-transparent border-none">
                      <TabsTrigger value="all" className="rounded-lg">All</TabsTrigger>
                      <TabsTrigger value="planning" className="rounded-lg">Planning</TabsTrigger>
                      <TabsTrigger value="in-progress" className="rounded-lg">Active</TabsTrigger>
                      <TabsTrigger value="completed" className="rounded-lg">Done</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {isLoadingProjects ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="animate-spin-slow">
                      <Zap className="w-12 h-12 text-primary" />
                    </div>
                    <p className="text-muted-foreground animate-pulse">Loading your projects...</p>
                  </div>
                ) : filteredProjects.length > 0 ? (
                  <div className="space-y-4">
                    {filteredProjects.map((project, index) => (
                      <Card
                        key={project.id}
                        className="group relative overflow-hidden glass-effect border-primary/5 hover:border-primary/20 transition-all duration-300 shadow-sm hover:shadow-md"
                        enableAnimation={true}
                        enableHover={true}
                        animationDelay={index * 50}
                      >
                        <div className="p-6">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className={`${getStatusColor(project.status)} border px-2 py-0 font-medium capitalize`}>
                                  {project.status.replace('-', ' ')}
                                </Badge>
                                <Badge variant="secondary" className="bg-secondary/50 text-secondary-foreground text-xs uppercase tracking-wider">
                                  {project.difficulty}
                                </Badge>
                              </div>
                              
                              <div>
                                <h3 className="text-xl font-bold group-hover:text-primary transition-colors mb-1">{project.title}</h3>
                                <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
                                  {project.description}
                                </p>
                              </div>

                              <div className="pt-2">
                                <div className="flex justify-between items-center mb-1.5">
                                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-tight">Progress</span>
                                  <span className="text-xs font-bold">{project.progress}%</span>
                                </div>
                                <div className="w-full bg-muted/30 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-primary transition-all duration-700 ease-out"
                                    style={{ width: `${project.progress}%` }}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2">
                              <Button
                                size="icon"
                                variant="secondary"
                                className="rounded-xl bg-primary/5 hover:bg-primary text-primary hover:text-white transition-all duration-300"
                                onClick={() => navigate(`/project/${project.id}`)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteProject(project.id)}
                                className="rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-300"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="glass-effect border-dashed border-primary/20 py-16">
                    <CardContent className="text-center space-y-4">
                      <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Plus className="w-8 h-8 text-primary/40" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-semibold">No projects yet</h3>
                        <p className="text-muted-foreground">Start by generating your first STEM project idea.</p>
                      </div>
                      <Button
                        size="lg"
                        className="bg-gradient-primary text-white rounded-full px-8 mt-4"
                        onClick={() => navigate('/generator')}
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Get Started
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // LANDING VIEW - For unauthenticated and guest users
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Three.js 3D Background */}
        <HeroScene3D className="opacity-70" />
        
        {/* Animated background elements (fallback/enhancement) */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div ref={heroIconRef.ref} className="flex justify-center mb-8">
              <div className="p-4 bg-gradient-primary rounded-2xl shadow-glow animate-glow-pulse">
                <Rocket className="w-16 h-16 text-white" />
              </div>
            </div>

            <h1 ref={heroTitleRef.ref} className="text-5xl md:text-7xl font-bold mb-6">
              <span className="text-gradient">STEM Project</span>
              <br />
              <span className="text-foreground">Generator</span>
            </h1>

            <p ref={heroDescRef.ref} className="text-xl md:text-2xl text-muted-foreground mb-8">
              Transform your ideas into reality with AI-powered project suggestions
              and a comprehensive component database
            </p>

            <div ref={heroButtonsRef.ref} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/generator">
                <Button
                  size="lg"
                  className="bg-gradient-primary text-white shadow-glow"
                  ripple={true}
                >
                  <Sparkles className="mr-2 w-5 h-5" />
                  Start Generating
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to="/components">
                <Button size="lg" variant="outline">
                  Browse Components
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 relative">
        {/* Subtle 3D background */}
        <BackgroundCanvas3D density="low" className="opacity-30" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-gradient-secondary">
              Everything You Need
            </h2>
            <p className="text-xl text-muted-foreground">
              Powerful tools to bring your electronics projects to life
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Link to={feature.link} className="block">
                  <Card
                    key={index}
                    className="group border-border/50 glass-effect cursor-pointer"
                    enableAnimation={true}
                    enableHover={true}
                    animationDelay={index * 100}
                  >
                  <CardHeader>
                    <div className={`w-16 h-16 ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:animate-glow-pulse`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl">{feature.title}</CardTitle>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" className="group/btn w-full">
                      Explore
                      <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                    </Button>
                  </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10" />
        <div className="container mx-auto px-4 relative z-10">
          <Card
            className="max-w-4xl mx-auto glass-effect border-primary/20 shadow-glow"
            enableAnimation={true}
          >
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gradient">
                Ready to Build Something Amazing?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Join thousands of makers and innovators creating the future
              </p>
              <Link to="/generator">
                <Button
                  size="lg"
                  className="bg-gradient-primary text-white shadow-glow"
                  ripple={true}
                >
                  <Zap className="mr-2 w-5 h-5" />
                  Get Started Now
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
};

export default Home;