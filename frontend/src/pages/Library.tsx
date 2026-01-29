import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Clock, Star, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Layout from '@/components/layout/Layout';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { projectService, type SavedProject } from '@/services/projectService';
import { formatDistanceToNow } from 'date-fns';

const Library: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Load projects from Supabase
  useEffect(() => {
    loadProjects();
  }, [user]);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const userProjects = await projectService.getProjects();
      setProjects(userProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({
        title: 'Error',
        description: 'Failed to load projects',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-500';
      case 'in-progress': return 'bg-blue-500/10 text-blue-500';
      case 'planning': return 'bg-orange-500/10 text-orange-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-gradient-primary';
      case 'Intermediate': return 'bg-gradient-secondary';
      case 'Advanced': return 'bg-gradient-accent';
      default: return 'bg-gradient-primary';
    }
  };

  const handleDeleteProject = async (id: string) => {
    const success = await projectService.deleteProject(id);
    if (success) {
      toast({
        title: 'Project Deleted',
        description: 'The project has been removed from your library.',
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

  const handleToggleStar = async (id: string, currentStarred: boolean) => {
    const result = await projectService.toggleStarProject(id, !currentStarred);
    if (result) {
      await loadProjects();
    }
  };

  const filteredProjects = projects.filter(project => {
    if (activeTab === 'all') {
      return true;
    }
    if (activeTab === 'starred') {
      return project.starred;
    }
    return project.status === activeTab;
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-gradient-to-b from-primary/5 via-background to-background pt-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto py-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
              <div className="space-y-2">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gradient">
                  Archive
                </h1>
                <p className="text-muted-foreground text-lg max-w-lg">
                  A curated collection of your STEM explorations and prototypes.
                </p>
              </div>
              <Button 
                size="lg"
                className="w-full md:w-auto bg-gradient-primary text-white shadow-glow hover:shadow-glow-lg transition-all duration-300 rounded-full px-8 h-14"
                ripple={true}
                onClick={() => navigate('/generator')}
              >
                <Plus className="w-5 h-5 mr-2" />
                <span className="font-semibold">New Entry</span>
              </Button>
            </div>
            
            {/* Actions Bar */}
            <div className="mb-10 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-muted/50 p-1 rounded-xl w-full sm:w-auto">
                  <TabsList className="bg-transparent border-none flex w-full sm:w-auto">
                    <TabsTrigger value="all" className="rounded-lg px-6 flex-1 sm:flex-none">All Files</TabsTrigger>
                    <TabsTrigger value="starred" className="rounded-lg px-6 flex-1 sm:flex-none">Favorites</TabsTrigger>
                    <TabsTrigger value="in-progress" className="rounded-lg px-6 flex-1 sm:flex-none">Active</TabsTrigger>
                    <TabsTrigger value="completed" className="rounded-lg px-6 flex-1 sm:flex-none">Finished</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            {/* Projects Grid */}
            {filteredProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredProjects.map((project, index) => (
                  <Card 
                    key={project.id}
                    className="group relative overflow-hidden glass-effect border-primary/5 hover:border-primary/20 transition-all duration-500 shadow-sm hover:shadow-xl"
                    enableAnimation={true}
                    enableHover={true}
                    animationDelay={index * 50}
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <CardHeader className="p-8 pb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`${getStatusColor(project.status)} border px-2 py-0 font-medium capitalize`}>
                              {project.status.replace('-', ' ')}
                            </Badge>
                            <Badge variant="secondary" className="bg-secondary/50 text-secondary-foreground text-[10px] uppercase tracking-widest px-2">
                              {project.difficulty}
                            </Badge>
                          </div>
                          <CardTitle className="text-2xl font-black group-hover:text-primary transition-colors leading-tight">
                            {project.title}
                          </CardTitle>
                          <CardDescription className="text-sm line-clamp-2 leading-relaxed font-medium text-muted-foreground/80">
                            {project.description}
                          </CardDescription>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleToggleStar(project.id, project.starred)}
                          className={`rounded-full h-12 w-12 transition-transform active:scale-90 ${project.starred ? 'text-amber-500 bg-amber-500/10' : 'text-muted-foreground hover:bg-primary/5'}`}
                        >
                          <Star className={`w-5 h-5 ${project.starred ? 'fill-amber-500' : ''}`} />
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="p-8 pt-4 space-y-6">
                      {/* Progress Section */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">System Status</span>
                          <span className="text-xs font-black">{project.progress || 0}% Complete</span>
                        </div>
                        <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-primary transition-all duration-1000 ease-out`}
                            style={{ width: `${project.progress || 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Details Meta */}
                      <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-primary/60" />
                            {project.updated_at ? formatDistanceToNow(new Date(project.updated_at), { addSuffix: true }) : 'Recently'}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 pt-2">
                        <Button 
                          size="lg" 
                          variant="secondary" 
                          className="flex-1 rounded-xl bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all duration-300 font-bold border-none"
                          onClick={() => navigate(`/project/${project.id}`)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Open
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleDeleteProject(project.id)}
                          className="rounded-xl h-12 w-12 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-300"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : !isLoading && (
              <Card className="glass-effect border-dashed border-primary/20 py-24 text-center">
                <CardContent className="space-y-6">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full scale-150" />
                    <BookOpen className="w-20 h-20 text-primary/30 relative" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-foreground">Archive Empty</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                      {activeTab === 'all' 
                        ? "Your laboratory records are empty. Time to initialize a new project."
                        : `No entries found in the ${activeTab} category.`
                      }
                    </p>
                  </div>
                  {activeTab === 'all' && (
                    <Button 
                      size="lg"
                      className="bg-gradient-primary text-white rounded-full px-10 h-14 shadow-glow"
                      ripple={true}
                      onClick={() => navigate('/generator')}
                    >
                      <Plus className="mr-2 h-5 w-5" />
                      Initialize First Project
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Library;
