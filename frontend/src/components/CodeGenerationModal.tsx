'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Code, 
  Cpu, 
  Smartphone, 
  Monitor, 
  Zap, 
  Settings, 
  BookOpen, 
  Sparkles,
  ChevronRight,
  Info,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  title: string;
  description: string;
  components?: string[];
  skills?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  category?: string;
}

interface GenerationParams {
  platform: 'arduino' | 'raspberry_pi' | 'web' | 'mobile';
  complexityLevel: 'beginner' | 'intermediate' | 'advanced';
  includeComments: boolean;
  includeTests: boolean;
  customRequirements?: string;
}

interface CodeGenerationModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onGenerationStart: (params: GenerationParams) => void;
  isGenerating?: boolean;
}

const CodeGenerationModal: React.FC<CodeGenerationModalProps> = ({
  project,
  isOpen,
  onClose,
  onGenerationStart,
  isGenerating = false
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<GenerationParams['platform']>('web');
  const [complexityLevel, setComplexityLevel] = useState<GenerationParams['complexityLevel']>(
    project.difficulty || 'beginner'
  );
  const [includeComments, setIncludeComments] = useState(true);
  const [includeTests, setIncludeTests] = useState(false);
  const [customRequirements, setCustomRequirements] = useState('');
  const [currentStep, setCurrentStep] = useState<'platform' | 'options' | 'review'>('platform');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPlatform('web');
      setComplexityLevel(project.difficulty || 'beginner');
      setIncludeComments(true);
      setIncludeTests(false);
      setCustomRequirements('');
      setCurrentStep('platform');
    }
  }, [isOpen, project.difficulty]);

  // Platform configurations
  const platforms = [
    {
      id: 'web' as const,
      name: 'Web Application',
      description: 'HTML, CSS, JavaScript for browsers',
      icon: Monitor,
      color: 'from-blue-500 to-cyan-500',
      features: ['Responsive Design', 'Interactive UI', 'Live Preview', 'Modern Frameworks'],
      recommended: project.category === 'web' || project.category === 'software'
    },
    {
      id: 'arduino' as const,
      name: 'Arduino',
      description: 'C++ code for Arduino microcontrollers',
      icon: Cpu,
      color: 'from-green-500 to-emerald-500',
      features: ['Hardware Control', 'Sensor Integration', 'Real-time Processing', 'IoT Ready'],
      recommended: project.category === 'hardware' || project.category === 'robotics'
    },
    {
      id: 'raspberry_pi' as const,
      name: 'Raspberry Pi',
      description: 'Python code for Raspberry Pi computers',
      icon: Code,
      color: 'from-red-500 to-pink-500',
      features: ['GPIO Control', 'Computer Vision', 'Machine Learning', 'Linux Integration'],
      recommended: project.category === 'ai' || project.category === 'computer-vision'
    },
    {
      id: 'mobile' as const,
      name: 'Mobile App',
      description: 'Flutter/Dart for iOS and Android',
      icon: Smartphone,
      color: 'from-purple-500 to-violet-500',
      features: ['Cross-platform', 'Native Performance', 'Touch Interface', 'App Store Ready'],
      recommended: project.category === 'mobile' || project.category === 'app'
    }
  ];

  const complexityLevels = [
    {
      id: 'beginner' as const,
      name: 'Beginner',
      description: 'Simple, well-commented code with basic functionality',
      features: ['Extensive Comments', 'Simple Structure', 'Educational Focus', 'Easy to Understand']
    },
    {
      id: 'intermediate' as const,
      name: 'Intermediate',
      description: 'Balanced code with moderate complexity and features',
      features: ['Modular Design', 'Error Handling', 'Best Practices', 'Some Advanced Features']
    },
    {
      id: 'advanced' as const,
      name: 'Advanced',
      description: 'Production-ready code with optimization and advanced features',
      features: ['Optimized Performance', 'Advanced Patterns', 'Scalable Architecture', 'Professional Quality']
    }
  ];

  // Handle generation start
  const handleStartGeneration = () => {
    const params: GenerationParams = {
      platform: selectedPlatform,
      complexityLevel,
      includeComments,
      includeTests,
      customRequirements: customRequirements.trim() || undefined
    };
    
    onGenerationStart(params);
  };

  // Render platform selection step
  const renderPlatformStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-white mb-2">Choose Your Platform</h3>
        <p className="text-white/60">Select the target platform for your generated code</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {platforms.map((platform) => {
          const Icon = platform.icon;
          const isSelected = selectedPlatform === platform.id;
          const isRecommended = platform.recommended;

          return (
            <Card
              key={platform.id}
              className={cn(
                "relative cursor-pointer transition-all duration-300 border-2",
                "bg-black/40 backdrop-blur-xl hover:bg-black/60",
                isSelected 
                  ? "border-purple-500 bg-gradient-to-br from-purple-500/10 to-pink-500/10" 
                  : "border-white/10 hover:border-white/20"
              )}
              onClick={() => setSelectedPlatform(platform.id)}
            >
              {isRecommended && (
                <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs">
                  Recommended
                </Badge>
              )}
              
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg bg-gradient-to-r",
                    platform.color
                  )}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-lg">{platform.name}</CardTitle>
                    <p className="text-white/60 text-sm">{platform.description}</p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {platform.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-white/70">
                      <CheckCircle className="w-3 h-3 text-green-400" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => setCurrentStep('options')}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white"
        >
          Next: Configure Options
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // Render options step
  const renderOptionsStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-white mb-2">Configure Generation</h3>
        <p className="text-white/60">Customize how your code will be generated</p>
      </div>

      {/* Complexity Level */}
      <div className="space-y-3">
        <Label className="text-white font-medium">Code Complexity</Label>
        <div className="grid grid-cols-1 gap-3">
          {complexityLevels.map((level) => (
            <Card
              key={level.id}
              className={cn(
                "cursor-pointer transition-all duration-300 border",
                "bg-black/40 backdrop-blur-xl hover:bg-black/60",
                complexityLevel === level.id
                  ? "border-purple-500 bg-gradient-to-r from-purple-500/10 to-pink-500/10"
                  : "border-white/10 hover:border-white/20"
              )}
              onClick={() => setComplexityLevel(level.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 mt-0.5 transition-colors",
                    complexityLevel === level.id
                      ? "border-purple-500 bg-purple-500"
                      : "border-white/30"
                  )} />
                  <div className="flex-1">
                    <h4 className="text-white font-medium">{level.name}</h4>
                    <p className="text-white/60 text-sm mb-2">{level.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {level.features.map((feature, index) => (
                        <Badge key={index} variant="secondary" className="text-xs bg-white/10 text-white/70">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Separator className="bg-white/10" />

      {/* Additional Options */}
      <div className="space-y-4">
        <Label className="text-white font-medium">Additional Options</Label>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <div>
                <Label className="text-white text-sm">Include Comments</Label>
                <p className="text-white/60 text-xs">Add explanatory comments to help understand the code</p>
              </div>
            </div>
            <Switch
              checked={includeComments}
              onCheckedChange={setIncludeComments}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <div>
                <Label className="text-white text-sm">Include Tests</Label>
                <p className="text-white/60 text-xs">Generate basic test files for the code</p>
              </div>
            </div>
            <Switch
              checked={includeTests}
              onCheckedChange={setIncludeTests}
            />
          </div>
        </div>
      </div>

      <Separator className="bg-white/10" />

      {/* Custom Requirements */}
      <div className="space-y-3">
        <Label className="text-white font-medium">Custom Requirements (Optional)</Label>
        <Textarea
          placeholder="Add any specific requirements or features you'd like included in the generated code..."
          value={customRequirements}
          onChange={(e) => setCustomRequirements(e.target.value)}
          className="bg-black/40 border-white/10 text-white placeholder:text-white/40 resize-none"
          rows={3}
        />
      </div>

      <div className="flex justify-between">
        <Button
          variant="ghost"
          onClick={() => setCurrentStep('platform')}
          className="text-white/60 hover:text-white hover:bg-white/10"
        >
          Back
        </Button>
        <Button
          onClick={() => setCurrentStep('review')}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white"
        >
          Next: Review
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // Render review step
  const renderReviewStep = () => {
    const selectedPlatformConfig = platforms.find(p => p.id === selectedPlatform);
    const selectedComplexityConfig = complexityLevels.find(c => c.id === complexityLevel);

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-white mb-2">Review & Generate</h3>
          <p className="text-white/60">Review your settings and start code generation</p>
        </div>

        {/* Project Summary */}
        <Card className="bg-black/40 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Project: {project.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-white/70 text-sm">{project.description}</p>
            {project.components && project.components.length > 0 && (
              <div>
                <Label className="text-white/80 text-xs">Components:</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {project.components.map((component, index) => (
                    <Badge key={index} variant="secondary" className="text-xs bg-blue-500/20 text-blue-300">
                      {component}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generation Settings */}
        <Card className="bg-black/40 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-400" />
              Generation Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white/80 text-xs">Platform</Label>
                <div className="flex items-center gap-2 mt-1">
                  {selectedPlatformConfig && React.createElement(selectedPlatformConfig.icon, { 
                    className: "w-4 h-4 text-purple-400" 
                  })}
                  <span className="text-white text-sm">{selectedPlatformConfig?.name}</span>
                </div>
              </div>
              <div>
                <Label className="text-white/80 text-xs">Complexity</Label>
                <div className="text-white text-sm mt-1">{selectedComplexityConfig?.name}</div>
              </div>
            </div>
            
            <div className="flex gap-4">
              {includeComments && (
                <Badge variant="secondary" className="bg-green-500/20 text-green-300">
                  ✓ Comments
                </Badge>
              )}
              {includeTests && (
                <Badge variant="secondary" className="bg-green-500/20 text-green-300">
                  ✓ Tests
                </Badge>
              )}
            </div>

            {customRequirements && (
              <div>
                <Label className="text-white/80 text-xs">Custom Requirements</Label>
                <p className="text-white/70 text-sm mt-1 p-2 bg-white/5 rounded border border-white/10">
                  {customRequirements}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep('options')}
            className="text-white/60 hover:text-white hover:bg-white/10"
            disabled={isGenerating}
          >
            Back
          </Button>
          <Button
            onClick={handleStartGeneration}
            disabled={isGenerating}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white"
          >
            {isGenerating ? (
              <>
                <Zap className="w-4 h-4 mr-2 animate-pulse" />
                Generating Code...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Code
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-black/95 backdrop-blur-xl border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            AI Code Generation
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Transform your project idea into working code with AI assistance
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6">
          {/* Step indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-4">
              {['platform', 'options', 'review'].map((step, index) => (
                <React.Fragment key={step}>
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
                    currentStep === step || (index < ['platform', 'options', 'review'].indexOf(currentStep))
                      ? "border-purple-500 bg-purple-500 text-white"
                      : "border-white/30 text-white/60"
                  )}>
                    {index + 1}
                  </div>
                  {index < 2 && (
                    <div className={cn(
                      "w-12 h-0.5 transition-colors",
                      index < ['platform', 'options', 'review'].indexOf(currentStep)
                        ? "bg-purple-500"
                        : "bg-white/30"
                    )} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Step content */}
          {currentStep === 'platform' && renderPlatformStep()}
          {currentStep === 'options' && renderOptionsStep()}
          {currentStep === 'review' && renderReviewStep()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CodeGenerationModal;