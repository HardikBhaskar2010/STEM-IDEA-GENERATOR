// GuidanceButton Component
// Requirements: 1.1, 1.2

import React, { useState } from 'react';
import { MessageCircle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import type { GuidanceButtonProps } from '@/types/aiGuidance';
import { aiGuidanceService } from '@/services/aiGuidanceService';

/**
 * GuidanceButton component that triggers the AI chat interface
 * Integrates with project details screen to provide contextual AI assistance
 * 
 * Requirements: 1.1, 1.2
 */
const GuidanceButton: React.FC<GuidanceButtonProps> = ({
  projectId,
  onGuidanceOpen,
  disabled = false,
  variant = 'primary'
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  /**
   * Handle button click to open AI guidance chat
   * Requirements: 1.2, 1.4
   */
  const handleClick = async () => {
    if (disabled || isLoading) {return;}

    setIsLoading(true);
    setHasError(false);

    try {
      // Validate project ID
      if (!projectId || projectId.trim() === '') {
        throw new Error('Invalid project ID');
      }

      // Check if AI guidance service is available
      const isServiceAvailable = await aiGuidanceService.healthCheck();
      if (!isServiceAvailable) {
        throw new Error('AI guidance service is currently unavailable');
      }

      // Get project data from localStorage and sync to backend
      const { projectService } = await import('@/services/projectService');
      const projectData = await projectService.getProjectById(projectId);
      
      if (!projectData) {
        throw new Error('Project not found in local storage');
      }

      // Sync project to backend database
      try {
        await aiGuidanceService.syncProject(projectData);
      } catch (syncError) {
        console.warn('Project sync failed, but continuing with AI guidance:', syncError);
        // Continue even if sync fails - the AI guidance might still work with cached data
      }

      // Initialize chat session and get project context
      const sessionData = await aiGuidanceService.initializeChatSession(projectId);
      
      // Call the parent handler to open the chat interface
      onGuidanceOpen(projectId);

      // Show success toast
      toast({
        title: 'AI Guidance Ready',
        description: 'Chat interface opened with project context loaded.',
      });

    } catch (error) {
      setHasError(true);
      
      // Handle different error types
      let errorMessage = 'Failed to open AI guidance';
      if (error instanceof Error) {
        if (error.message.includes('unavailable')) {
          errorMessage = 'AI guidance is temporarily unavailable. Please try again later.';
        } else if (error.message.includes('Invalid project')) {
          errorMessage = 'Invalid project. Please refresh the page and try again.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network connection error. Please check your internet connection.';
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });

      console.error('GuidanceButton error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get button variant based on props and state
   */
  const getButtonVariant = () => {
    if (hasError) {return 'destructive';}
    if (variant === 'secondary') {return 'secondary';}
    if (variant === 'outline') {return 'outline';}
    return 'default'; // primary
  };

  /**
   * Get button icon based on state
   */
  const getButtonIcon = () => {
    if (isLoading) {
      return <Loader2 className="w-4 h-4 animate-spin" />;
    }
    if (hasError) {
      return <AlertCircle className="w-4 h-4" />;
    }
    return <MessageCircle className="w-4 h-4" />;
  };

  /**
   * Get button text based on state
   */
  const getButtonText = () => {
    if (isLoading) {return 'Opening Guidance...';}
    if (hasError) {return 'Try Again';}
    return 'Guidance For Steps';
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isLoading}
      variant={getButtonVariant()}
      size="default"
      className={`
        gap-2 min-w-[140px] sm:min-w-[160px] transition-all duration-200
        text-sm sm:text-base px-3 sm:px-4 py-2 sm:py-2
        ${variant === 'primary' ? 'bg-gradient-primary text-white hover:bg-gradient-primary/90' : ''}
        ${hasError ? 'animate-pulse' : ''}
      `}
      animationType={isLoading ? 'none' : 'click'}
      enableHover={!isLoading && !disabled}
      ripple={!isLoading}
      data-testid="guidance-button"
      aria-label={`Open AI guidance for project ${projectId}`}
    >
      {getButtonIcon()}
      <span className="hidden sm:inline">{getButtonText()}</span>
      <span className="sm:hidden">Guidance</span>
    </Button>
  );
};

export default GuidanceButton;