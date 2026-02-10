'use client';

import React, { useState } from 'react';
import { 
  Code, 
  Zap, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Sparkles,
  Play,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  has_generated_code?: boolean;
  code_generation_count?: number;
  last_code_generated_at?: string;
}

interface CodeGenerationButtonProps {
  project: Project;
  variant?: 'default' | 'compact' | 'icon' | 'floating';
  size?: 'sm' | 'md' | 'lg';
  isGenerating?: boolean;
  onGenerateCode: (project: Project) => void;
  onViewCode?: (project: Project) => void;
  className?: string;
  disabled?: boolean;
}

const CodeGenerationButton: React.FC<CodeGenerationButtonProps> = ({
  project,
  variant = 'default',
  size = 'md',
  isGenerating = false,
  onGenerateCode,
  onViewCode,
  className,
  disabled = false
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const hasGeneratedCode = project.has_generated_code;
  const generationCount = project.code_generation_count || 0;
  const lastGenerated = project.last_code_generated_at;

  // Button configurations for different variants
  const buttonConfigs = {
    default: {
      className: cn(
        "relative overflow-hidden transition-all duration-300 group",
        "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500",
        "text-white font-medium shadow-lg hover:shadow-xl",
        "border border-purple-500/30 hover:border-purple-400/50",
        size === 'sm' && "px-3 py-2 text-sm",
        size === 'md' && "px-4 py-2.5 text-sm",
        size === 'lg' && "px-6 py-3 text-base"
      ),
      showText: true,
      showIcon: true
    },
    compact: {
      className: cn(
        "relative overflow-hidden transition-all duration-300 group",
        "bg-black/40 backdrop-blur-xl border border-white/10 hover:border-purple-500/50",
        "text-white/80 hover:text-white font-medium",
        "hover:bg-gradient-to-r hover:from-purple-600/20 hover:to-pink-600/20",
        size === 'sm' && "px-2 py-1.5 text-xs",
        size === 'md' && "px-3 py-2 text-sm",
        size === 'lg' && "px-4 py-2.5 text-sm"
      ),
      showText: size !== 'sm',
      showIcon: true
    },
    icon: {
      className: cn(
        "relative overflow-hidden transition-all duration-300 group",
        "bg-black/40 backdrop-blur-xl border border-white/10 hover:border-purple-500/50",
        "text-white/80 hover:text-white",
        "hover:bg-gradient-to-r hover:from-purple-600/20 hover:to-pink-600/20",
        "rounded-full aspect-square",
        size === 'sm' && "w-8 h-8",
        size === 'md' && "w-10 h-10",
        size === 'lg' && "w-12 h-12"
      ),
      showText: false,
      showIcon: true
    },
    floating: {
      className: cn(
        "fixed bottom-6 right-6 z-50 rounded-full shadow-2xl",
        "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500",
        "text-white font-medium transition-all duration-300 group",
        "border border-purple-500/30 hover:border-purple-400/50",
        "hover:scale-105 active:scale-95",
        "w-14 h-14"
      ),
      showText: false,
      showIcon: true
    }
  };

  const config = buttonConfigs[variant];

  // Get appropriate icon based on state
  const getIcon = () => {
    if (isGenerating) {
      return <Loader2 className={cn("animate-spin", getIconSize())} />;
    }
    
    if (hasGeneratedCode) {
      return <CheckCircle className={cn("text-green-300", getIconSize())} />;
    }
    
    return <Sparkles className={cn("group-hover:animate-pulse", getIconSize())} />;
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm': return "w-3 h-3";
      case 'md': return "w-4 h-4";
      case 'lg': return "w-5 h-5";
      default: return "w-4 h-4";
    }
  };

  // Get button text based on state
  const getButtonText = () => {
    if (isGenerating) {
      return "Generating...";
    }
    
    if (hasGeneratedCode) {
      return generationCount > 1 ? "Regenerate Code" : "View Code";
    }
    
    return "Generate Code";
  };

  // Handle button click
  const handleClick = () => {
    if (disabled || isGenerating) return;
    
    if (hasGeneratedCode && onViewCode) {
      onViewCode(project);
    } else {
      onGenerateCode(project);
    }
  };

  // Tooltip content
  const getTooltipContent = () => {
    if (isGenerating) {
      return "AI is generating code for your project...";
    }
    
    if (hasGeneratedCode) {
      const lastGeneratedText = lastGenerated 
        ? `Last generated: ${new Date(lastGenerated).toLocaleDateString()}`
        : '';
      return (
        <div className="text-center">
          <div className="font-medium">Code Available</div>
          <div className="text-xs text-white/70 mt-1">
            {generationCount} generation{generationCount !== 1 ? 's' : ''}
          </div>
          {lastGeneratedText && (
            <div className="text-xs text-white/60 mt-1">{lastGeneratedText}</div>
          )}
        </div>
      );
    }
    
    return "Generate working code from your project idea using AI";
  };

  const ButtonContent = () => (
    <>
      {/* Background animation */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-400/0 via-purple-400/20 to-purple-400/0 
                      translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
      
      {/* Content */}
      <div className="relative flex items-center gap-2 justify-center">
        {config.showIcon && getIcon()}
        {config.showText && (
          <span className="whitespace-nowrap">{getButtonText()}</span>
        )}
        
        {/* Generation count badge for compact variant */}
        {variant === 'compact' && hasGeneratedCode && generationCount > 0 && (
          <Badge 
            variant="secondary" 
            className="ml-1 text-xs bg-purple-500/20 text-purple-300 border-purple-500/30"
          >
            {generationCount}
          </Badge>
        )}
      </div>
      
      {/* Floating variant pulse effect */}
      {variant === 'floating' && !hasGeneratedCode && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 
                        animate-ping opacity-20" />
      )}
    </>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleClick}
            disabled={disabled || isGenerating}
            className={cn(config.className, className)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <ButtonContent />
          </Button>
        </TooltipTrigger>
        <TooltipContent 
          side={variant === 'floating' ? 'left' : 'top'}
          className="bg-black/90 backdrop-blur-xl border-white/10 text-white"
        >
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default CodeGenerationButton;