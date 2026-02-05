import React, { useState } from 'react';
import { 
  Eye, 
  RefreshCw, 
  Clock, 
  Code, 
  Trash2,
  Calendar,
  CheckCircle,
  Zap,
  Download,
  History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import CodeGenerationButton from './CodeGenerationButton';

interface SavedProject {
  id: string;
  title: string;
  description: string;
  status: 'planning' | 'in_progress' | 'completed' | 'abandoned';
  progress: number;
  created_at: string;
  updated_at?: string;
  // New code generation fields
  has_generated_code?: boolean;
  code_generation_count?: number;
  last_code_generated_at?: string;
  generated_code_platform?: 'arduino' | 'raspberry_pi' | 'web' | 'mobile';
}

interface EnhancedProjectCardProps {
  project: SavedProject;
  index: number;
  onViewProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onReviveProject?: (projectId: string, e: React.MouseEvent) => void;
  onGenerateCode: (project: SavedProject) => void;
  onViewCode?: (project: SavedProject) => void;
  isGeneratingCode?: boolean;
  className?: string;
}

const EnhancedProjectCard: React.FC<EnhancedProjectCardProps> = ({
  project,
  index,
  onViewProject,
  onDeleteProject,
  onReviveProject,
  onGenerateCode,
  onViewCode,
  isGeneratingCode = false,
  className
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Status color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-emerald-400 bg-emerald-400/10';
      case 'in_progress': return 'text-blue-400 bg-blue-400/10';
      case 'planning': return 'text-yellow-400 bg-yellow-400/10';
      case 'abandoned': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  // Platform icon mapping
  const getPlatformIcon = (platform?: string) => {
    switch (platform) {
      case 'arduino': return '🔧';
      case 'raspberry_pi': return '🍓';
      case 'web': return '🌐';
      case 'mobile': return '📱';
      default: return '💻';
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Calculate days since last code generation
  const getDaysSinceCodeGeneration = () => {
    if (!project.last_code_generated_at) return null;
    const days = Math.floor(
      (Date.now() - new Date(project.last_code_generated_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  return (
    <TooltipProvider>
      <Card 
        className={cn(
          "glass-effect border-white/5 hover:border-primary/30 transition-all group overflow-hidden",
          "relative",
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Code generation status indicator */}
        {project.has_generated_code && (
          <div className="absolute top-3 right-3 z-10">
            <Tooltip>
              <TooltipTrigger>
                <Badge 
                  variant="secondary" 
                  className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border-purple-500/30 text-xs"
                >
                  <Code className="w-3 h-3 mr-1" />
                  {project.code_generation_count || 1}
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="bg-black/90 backdrop-blur-xl border-white/10 text-white">
                <div className="text-center">
                  <div className="font-medium">Code Generated</div>
                  <div className="text-xs text-white/70 mt-1">
                    {project.code_generation_count} generation{project.code_generation_count !== 1 ? 's' : ''}
                  </div>
                  {project.generated_code_platform && (
                    <div className="text-xs text-white/60 mt-1">
                      Platform: {project.generated_code_platform}
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex-1 space-y-3">
            {/* Status and date row */}
            <div className="flex items-center gap-3">
              <Badge 
                variant="outline" 
                className={`${getStatusColor(project.status)} border px-2 py-0 font-bold uppercase text-[10px]`}
              >
                {project.status}
              </Badge>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(project.created_at)}
              </span>
              
              {/* Code generation timestamp */}
              {project.has_generated_code && project.last_code_generated_at && (
                <Tooltip>
                  <TooltipTrigger>
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {getDaysSinceCodeGeneration() === 0 ? 'Today' : `${getDaysSinceCodeGeneration()}d ago`}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="bg-black/90 backdrop-blur-xl border-white/10 text-white">
                    Code generated: {formatDate(project.last_code_generated_at)}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Title and description */}
            <h4 className="text-xl font-bold group-hover:text-primary transition-colors">
              {project.title}
            </h4>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {project.description}
            </p>
            
            {/* Progress bar */}
            <div className="pt-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Progress</span>
                <span className="text-xs font-bold">{project.progress}%</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                <div 
                  className="h-full bg-gradient-primary transition-all duration-300" 
                  style={{ width: `${project.progress}%` }} 
                />
              </div>
            </div>

            {/* Code generation info */}
            {project.has_generated_code && (
              <div className="flex items-center gap-2 pt-1">
                <div className="flex items-center gap-1 text-xs text-purple-300">
                  {getPlatformIcon(project.generated_code_platform)}
                  <span className="capitalize">{project.generated_code_platform || 'Code'}</span>
                </div>
                {project.code_generation_count && project.code_generation_count > 1 && (
                  <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-400">
                    <History className="w-3 h-3 mr-1" />
                    {project.code_generation_count} versions
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Code generation button */}
            <CodeGenerationButton
              project={project}
              variant="compact"
              size="sm"
              isGenerating={isGeneratingCode}
              onGenerateCode={onGenerateCode}
              onViewCode={onViewCode}
            />

            {/* View/Revive button */}
            {project.status === 'abandoned' ? (
              onReviveProject && (
                <Button 
                  variant="default" 
                  size="sm"
                  className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
                  onClick={(e) => onReviveProject(project.id, e)}
                >
                  <RefreshCw className="w-4 h-4" />
                  Revive
                </Button>
              )
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="rounded-xl hover:bg-primary/20 hover:text-primary transition-all"
                    onClick={() => onViewProject(project.id)}
                  >
                    <Eye className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-black/90 backdrop-blur-xl border-white/10 text-white">
                  View Project Details
                </TooltipContent>
              </Tooltip>
            )}

            {/* Delete button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive transition-all"
                  onClick={() => onDeleteProject(project.id)}
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-black/90 backdrop-blur-xl border-white/10 text-white">
                Delete Project
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Hover effect overlay */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-pink-500/0 opacity-0 transition-opacity duration-300 pointer-events-none",
          isHovered && "opacity-100"
        )} />
      </Card>
    </TooltipProvider>
  );
};

export default EnhancedProjectCard;