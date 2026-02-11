import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Zap, Loader2, Save, Target, Clock, ChevronDown, ChevronUp, Sparkles, Code, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import Layout from '@/components/layout/Layout';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { HelpTooltip } from '@/components/ui/enhanced-tooltip';
import { toast } from '@/hooks/use-toast';
import { generateProject, healthCheck, type ProjectParams } from '@/services/apiService';
import { projectService } from '@/services/projectService';
import { useNavigate } from 'react-router-dom';
import { CapsuleAnimation } from '@/components/ui/capsule-animation';
import { BackgroundCanvas3D } from '@/components/three/BackgroundCanvas3D';
import { NeuralNetworkVisualizer } from '@/components/NeuralNetworkVisualizer';
import { HolographicCard } from '@/components/HolographicCard';
import CodeGenerationModal from '@/components/CodeGenerationModal';
import { useCompetition } from '@/contexts/CompetitionContext';
import { CompetitionSubmissionModal } from '@/components/competition/CompetitionSubmissionModal';
import { SuccessAnimation } from '@/components/competition/SuccessAnimation';

const Generator: React.FC = () => {
  const navigate = useNavigate();
  const { isCompetitionMode } = useCompetition();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSynthesized, setIsSynthesized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);
  const [showCodeGenModal, setShowCodeGenModal] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [successAnimationType, setSuccessAnimationType] = useState<'submission' | 'levelup'>('submission');
  const [successPoints, setSuccessPoints] = useState(10);
  const [successNewLevel, setSuccessNewLevel] = useState<string | undefined>(undefined);
  const [generatedProject, setGeneratedProject] = useState<{
    title: string;
    description: string;
    difficulty: string;
    estimatedTime: string;
    estimatedCost: string;
    components: string[];
    skills: string[];
    steps: string[];
  } | null>(null);
  const [formData, setFormData] = useState<ProjectParams>({
    projectType: '',
    skillLevel: '',
    interests: '',
    budget: '',
    duration: ''
  });

  // Selected type display
  const projectTypeDisplay = useMemo(() => {
    return formData.projectType.toUpperCase();
  }, [formData.projectType]);

  // Check backend connection on mount and load pre-filled data if available
  useEffect(() => {
    const checkBackend = async () => {
      try {
        await healthCheck();
        setBackendStatus('connected');
        console.log('✅ Backend connected successfully');
      } catch (error) {
        setBackendStatus('disconnected');
        console.error('❌ Backend connection failed:', error);
      }
    };
    
    // Check for pre-filled form data from voice/chat navigation
    const prefilledData = sessionStorage.getItem('generatorFormData');
    console.log('🔍 Generator - Raw sessionStorage data:', prefilledData);
    if (prefilledData) {
      try {
        const parsedData = JSON.parse(prefilledData);
        console.log('🔍 Generator - Parsed data:', parsedData);
        console.log('🔍 Generator - Current formData before merge:', formData);
        setFormData(prev => {
          const newFormData = { ...prev, ...parsedData };
          console.log('🔍 Generator - New formData after merge:', newFormData);
          return newFormData;
        });
        sessionStorage.removeItem('generatorFormData'); // Clear after loading
        
        toast({
          title: '✨ Form Pre-filled',
          description: 'Your project details have been filled in from your conversation!',
        });
      } catch (error) {
        console.error('Error parsing pre-filled data:', error);
      }
    } else {
      console.log('🔍 Generator - No pre-filled data found in sessionStorage');
    }
    
    // Diagnostic log for the Project Lab AI Engine
    if (typeof window !== 'undefined') {
      console.log('💎 STEM Project Lab AI Engine: OPERATIONAL ✨ (Powered by Backend AI)');
    }
    
    checkBackend();
  }, []);

  // Animation refs
  const formCardRef = useScrollAnimation<HTMLDivElement>({ animation: 'fadeIn', delay: 100 });
  const resultCardRef = useScrollAnimation<HTMLDivElement>({ animation: 'fadeIn', delay: 200 });

  const handleGenerate = useCallback(async () => {
    // Validate form
    if (!formData.projectType || !formData.skillLevel) {
      toast({
        title: "Missing Information",
        description: "Please select both project type and skill level.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setIsSynthesized(false);
    
    try {
      // Use standard generation (streaming not implemented for project generation)
      const project = await generateProject(formData);
      
      setGeneratedProject(project);
      setIsSynthesized(true);
      toast({
        title: "Project Generated!",
        description: "Your personalized STEM project is ready.",
      });
    } catch (error) {
      console.error('Generation failed:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Unable to generate project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [formData]);

  const handleSaveProject = useCallback(async () => {
    if (!generatedProject) {
      toast({
        title: "Error",
        description: "No project to save",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Save to Supabase using projectService
      const savedProject = await projectService.saveProject({
        title: generatedProject.title,
        description: generatedProject.description,
        project_type: formData.projectType,
        difficulty: generatedProject.difficulty,
        estimated_time: generatedProject.estimatedTime,
        estimated_cost: generatedProject.estimatedCost,
        components: generatedProject.components,
        skills: generatedProject.skills,
        steps: generatedProject.steps,
        generated_from_params: formData as unknown as Record<string, string>,
      });

      if (savedProject) {
        setSavedProjectId(savedProject.id);
        toast({
          title: "Project Saved!",
          description: "Your project has been added to your library.",
        });
        
        // Navigate to library to see the saved project
        navigate('/library');
      } else {
        throw new Error('Failed to save project');
      }
    } catch (error) {
      console.error('Error saving project:', error);
      toast({
        title: "Error",
        description: "Failed to save project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [generatedProject, formData, navigate]);

  const handleGenerateWithVeronica = useCallback(async () => {
    if (!generatedProject) {
      toast({
        title: "Error",
        description: "No project to generate code for",
        variant: "destructive",
      });
      return;
    }

    // First, save the project if not already saved
    if (!savedProjectId) {
      setIsSaving(true);
      try {
        const savedProject = await projectService.saveProject({
          title: generatedProject.title,
          description: generatedProject.description,
          project_type: formData.projectType,
          difficulty: generatedProject.difficulty,
          estimated_time: generatedProject.estimatedTime,
          estimated_cost: generatedProject.estimatedCost,
          components: generatedProject.components,
          skills: generatedProject.skills,
          steps: generatedProject.steps,
          generated_from_params: formData as unknown as Record<string, string>,
        });

        if (savedProject) {
          setSavedProjectId(savedProject.id);
          toast({
            title: "✨ Project Saved!",
            description: "Opening Veronica AI workspace...",
          });
          
          // Small delay to show the toast
          setTimeout(() => {
            navigate(`/code-generator?project=${savedProject.id}`);
          }, 1000);
        } else {
          throw new Error('Failed to save project');
        }
      } catch (error) {
        console.error('Error saving project:', error);
        toast({
          title: "Error",
          description: "Failed to save project. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    } else {
      // Project already saved, just navigate
      navigate(`/code-generator?project=${savedProjectId}`);
    }
  }, [generatedProject, savedProjectId, formData, navigate]);

  return (
    <Layout>
      <div className="relative bg-gradient-to-b from-primary/5 via-background to-background pt-16">
        {/* 3D Particle Background */}
        <BackgroundCanvas3D density="high" className="opacity-60" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-6xl mx-auto py-12 mb-16">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
              <div className="space-y-2">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gradient">
                  Project Lab
                </h1>
                <div className="flex items-center gap-3 text-muted-foreground text-lg">
                  <p>Design your next STEM masterpiece with AI.</p>
                  {backendStatus === 'connected' ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-2 py-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                      Live
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 px-2 py-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5" />
                      Offline
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-8 items-start">
              {/* Input Form */}
              <div className="lg:col-span-5">
                <Card 
                  ref={formCardRef.ref}
                  className="glass-effect border-primary/5 shadow-sm overflow-hidden"
                  data-tutorial="project-form"
                >
                  <div className="bg-primary/5 p-6 border-b border-primary/10">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      Specifications
                    </h3>
                  </div>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="projectType" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Domain</Label>
                          <HelpTooltip content="Choose the type of project you want to build." />
                        </div>
                        <Select 
                          value={formData.projectType} 
                          onValueChange={(value) => setFormData({...formData, projectType: value})}
                        >
                          <SelectTrigger id="projectType" className="rounded-xl border-primary/10 bg-background/50 h-12">
                            <SelectValue placeholder="Select type..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="robotics">Robotics & Mechatronics</SelectItem>
                            <SelectItem value="iot">Internet of Things</SelectItem>
                            <SelectItem value="electronics">Analog/Digital Electronics</SelectItem>
                            <SelectItem value="automation">Smart Automation</SelectItem>
                            <SelectItem value="sensors">Data & Monitoring</SelectItem>
                            <SelectItem value="web-development">Web Development</SelectItem>
                            <SelectItem value="mobile-apps">Mobile Applications</SelectItem>
                            <SelectItem value="desktop-software">Desktop Software</SelectItem>
                            <SelectItem value="game-development">Game Development</SelectItem>
                            <SelectItem value="ai-ml">AI & Machine Learning</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="skillLevel" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Expertise</Label>
                          <HelpTooltip content="Your current skill level." />
                        </div>
                        <Select 
                          value={formData.skillLevel} 
                          onValueChange={(value) => setFormData({...formData, skillLevel: value})}
                        >
                          <SelectTrigger id="skillLevel" className="rounded-xl border-primary/10 bg-background/50 h-12">
                            <SelectValue placeholder="Select level..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="beginner">Beginner (Curious)</SelectItem>
                            <SelectItem value="intermediate">Intermediate (Maker)</SelectItem>
                            <SelectItem value="advanced">Advanced (Engineer)</SelectItem>
                            <SelectItem value="expert">Expert (Innovator)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="interests" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">The Vision</Label>
                          <HelpTooltip content="What's your goal?" />
                        </div>
                        <Textarea
                          id="interests"
                          placeholder="What problem are we solving? e.g. An automated plant watering system for my dorm room..."
                          value={formData.interests}
                          onChange={(e) => setFormData({...formData, interests: e.target.value})}
                          className="min-h-[120px] rounded-xl border-primary/10 bg-background/50 resize-none p-4"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="budget" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Budget</Label>
                          <Input
                            id="budget"
                            placeholder="e.g. $50"
                            value={formData.budget}
                            onChange={(e) => setFormData({...formData, budget: e.target.value})}
                            className="rounded-xl border-primary/10 bg-background/50 h-12"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="duration" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Timeline</Label>
                          <Input
                            id="duration"
                            placeholder="e.g. 1 week"
                            value={formData.duration}
                            onChange={(e) => setFormData({...formData, duration: e.target.value})}
                            className="rounded-xl border-primary/10 bg-background/50 h-12"
                          />
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="w-full bg-gradient-primary text-white shadow-glow hover:shadow-glow-lg transition-all duration-300 rounded-xl h-14 text-lg font-bold"
                      ripple={true}
                      data-tutorial="generate-button"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                          Synthesizing...
                        </>
                      ) : (
                        <>
                          <Zap className="mr-2 h-6 w-6" />
                          Generate Architecture
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-7">
                <div ref={resultCardRef.ref} className="pb-8 space-y-6">
                  {/* Neural Network Visualizer - Shows when AI is thinking */}
                  <NeuralNetworkVisualizer 
                    isActive={isGenerating}
                    message="AI Generating Project..."
                    className="mb-6"
                  />
                  
                  {/* Traditional Project Display */}
                  <CapsuleAnimation isOpen={isSynthesized && generatedProject !== null}>
                    {generatedProject && (
                      <HolographicCard intensity="low" enableTilt={true}>
                        <Card className="glass-effect border-primary/10 shadow-md overflow-hidden">
                          <div className="bg-gradient-to-r from-primary/10 to-transparent p-8 border-b border-primary/10">
                            <div className="flex justify-between items-start">
                              <div className="space-y-2">
                                <Badge className="bg-primary/20 text-primary border-primary/20 hover:bg-primary/30 rounded-lg px-3 mb-2">
                                  {projectTypeDisplay}
                                </Badge>
                                <h2 className="text-3xl font-black text-gradient leading-tight">
                                  {generatedProject.title}
                                </h2>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => setIsExpanded(!isExpanded)}
                                  variant="outline"
                                  size="icon"
                                  className="rounded-xl border-primary/20"
                                >
                                  {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                </Button>
                                <Button
                                  onClick={handleSaveProject}
                                  disabled={isSaving}
                                  size="lg"
                                  className="bg-primary text-white rounded-xl h-12 px-6 shadow-sm hover:shadow-md transition-all"
                                  data-tutorial="save-button"
                                >
                                  {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
                                  {isSaving ? 'Saving...' : 'Save Lab'}
                                </Button>
                              </div>
                            </div>
                          </div>

                        {isExpanded && (
                          <CardContent className="p-8 space-y-10">
                            <div className="space-y-4">
                              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground border-l-2 border-primary pl-3">Executive Summary</h4>
                              <p className="text-lg leading-relaxed text-foreground/80">
                                {generatedProject.description}
                              </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Difficulty</span>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="bg-sky-500/10 text-sky-500 border-sky-500/20 px-2.5 py-1 text-sm font-bold uppercase">
                                    {generatedProject.difficulty}
                                  </Badge>
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Timeline</span>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-primary" />
                                  <span className="text-sm font-bold">{generatedProject.estimatedTime}</span>
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Budget</span>
                                <div className="flex items-center gap-2">
                                  <Zap className="w-4 h-4 text-amber-500" />
                                  <span className="text-sm font-bold">{generatedProject.estimatedCost}</span>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                              <div className="space-y-4 mb-6">
                                <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground border-l-2 border-primary pl-3">BOM (Bill of Materials)</h4>
                                <div className="flex flex-wrap gap-2">
                                  {generatedProject.components.map((component: string, index: number) => (
                                    <Badge 
                                      key={index}
                                      variant="outline"
                                      className="rounded-lg py-1.5 px-3 border-primary/10 bg-primary/5 text-primary-foreground/90 font-medium"
                                    >
                                      {component}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-4 mb-6">
                                <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground border-l-2 border-secondary pl-3">Learning Outcomes</h4>
                                <div className="flex flex-wrap gap-2">
                                  {generatedProject.skills.map((skill: string, index: number) => (
                                    <Badge 
                                      key={index}
                                      className="rounded-lg py-1.5 px-3 bg-secondary/10 text-secondary hover:bg-secondary/20 border-none font-medium"
                                    >
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-6 pt-4">
                              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground border-l-2 border-accent pl-3">Implementation Roadmap</h4>
                              <div className="space-y-4">
                                {generatedProject.steps.map((step: string, index: number) => (
                                  <div key={index} className="flex gap-4 group">
                                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-muted group-hover:bg-primary/20 group-hover:text-primary transition-colors flex items-center justify-center text-xs font-black">
                                      {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <div className="space-y-1">
                                      <p className="text-sm leading-relaxed text-foreground/90 group-hover:text-foreground transition-colors">
                                        {step}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Generate with Veronica Button */}
                            <div className="pt-8 border-t border-primary/10">
                              <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 rounded-2xl p-6 border border-purple-500/20">
                                <div className="flex items-start gap-4">
                                  <div className="flex-shrink-0 p-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600">
                                    <Sparkles className="w-6 h-6 text-white" />
                                  </div>
                                  <div className="flex-1">
                                    <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                      Ready to Build This Project?
                                      <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-none">
                                        AI Powered
                                      </Badge>
                                    </h3>
                                    <p className="text-sm text-white/70 mb-4">
                                      Let Veronica AI generate complete, production-ready code for your project. Get a full-stack application with proper structure, best practices, and documentation.
                                    </p>
                                    <Button
                                      onClick={handleGenerateWithVeronica}
                                      disabled={isSaving}
                                      size="lg"
                                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl h-12 px-8 shadow-lg hover:shadow-xl transition-all"
                                    >
                                      {isSaving ? (
                                        <>
                                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                          Preparing Workspace...
                                        </>
                                      ) : (
                                        <>
                                          <Code className="h-5 w-5 mr-2" />
                                          Generate with Veronica AI
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    </HolographicCard>
                    )}
                  </CapsuleAnimation>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Generator;
