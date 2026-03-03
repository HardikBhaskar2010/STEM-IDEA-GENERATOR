import React, { useEffect, useState } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTutorial } from '@/contexts/TutorialContext';

interface TourStep {
  title: string;
  description: string;
  target?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const tourSteps: TourStep[] = [
  {
    title: '🚀 Welcome to STEM Project Generator!',
    description: 'Get ready to discover amazing electronics projects and bring your ideas to life! Let\'s take a quick tour.',
    position: 'center',
  },
  {
    title: '🤖 AI Project Generator',
    description: 'Generate personalized STEM project ideas based on your skill level, interests, and budget. Perfect for beginners to experts!',
    target: '[data-tutorial="generator"]',
    position: 'bottom',
  },
  {
    title: '🔧 Component Database',
    description: 'Browse 500+ electronic components with detailed specs, pricing, and availability. Find everything you need for your projects!',
    target: '[data-tutorial="components"]',
    position: 'bottom',
  },
  {
    title: '📚 Project Library',
    description: 'Save, organize, and track all your projects in one place. Monitor progress and never lose track of your work!',
    target: '[data-tutorial="library"]',
    position: 'bottom',
  },
  {
    title: '👤 Your Profile',
    description: 'Track achievements, manage your projects, and customize your experience. This is your personal maker dashboard!',
    target: '[data-tutorial="profile"]',
    position: 'bottom',
  },
  {
    title: '🎉 You\'re All Set!',
    description: 'Start exploring and building amazing projects. Each page has its own tutorial that will guide you through the features!',
    position: 'center',
  },
];

const WelcomeTour: React.FC = () => {
  const { tutorialState, completeWelcomeTour, skipWelcomeTour, setCurrentStep } = useTutorial();
  const [spotlightPosition, setSpotlightPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  const currentStep = tutorialState.currentStep;
  const step = tourSteps[currentStep];

  useEffect(() => {
    if (!tutorialState.isActive || tutorialState.hasSeenWelcome) return;

    const updatePositions = () => {
      if (step.target) {
        const element = document.querySelector(step.target);
        if (element) {
          const rect = element.getBoundingClientRect();
          setSpotlightPosition({
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
          });

          // Calculate tooltip position
          const tooltipTop = step.position === 'bottom' 
            ? rect.bottom + 20 
            : step.position === 'top'
            ? rect.top - 200
            : rect.top + rect.height / 2;
          
          const tooltipLeft = rect.left + rect.width / 2;
          
          setTooltipPosition({ top: tooltipTop, left: tooltipLeft });
        }
      }
    };

    updatePositions();
    window.addEventListener('resize', updatePositions);
    window.addEventListener('scroll', updatePositions);

    return () => {
      window.removeEventListener('resize', updatePositions);
      window.removeEventListener('scroll', updatePositions);
    };
  }, [currentStep, step, tutorialState.isActive, tutorialState.hasSeenWelcome]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeWelcomeTour();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    skipWelcomeTour();
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Escape') handleSkip();
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === 'ArrowLeft') handlePrevious();
  };

  useEffect(() => {
    if (tutorialState.isActive && !tutorialState.hasSeenWelcome) {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [tutorialState.isActive, tutorialState.hasSeenWelcome, currentStep]);

  if (!tutorialState.isActive || tutorialState.hasSeenWelcome) {
    return null;
  }

  const isCenterPosition = !step.target || step.position === 'center';

  return (
    <>
      {/* Overlay backdrop */}
      <div className="fixed inset-0 bg-black/80 z-[100] animate-fade-in" />

      {/* Spotlight highlight */}
      {step.target && !isCenterPosition && (
        <div
          className="fixed z-[101] transition-all duration-500 ease-out"
          style={{
            top: `${spotlightPosition.top}px`,
            left: `${spotlightPosition.left}px`,
            width: `${spotlightPosition.width}px`,
            height: `${spotlightPosition.height}px`,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.8), 0 0 30px rgba(139, 92, 246, 0.5)',
            borderRadius: '12px',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Tutorial tooltip */}
      <div
        className={`fixed z-[102] animate-scale-in ${
          isCenterPosition
            ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
            : ''
        }`}
        style={!isCenterPosition ? {
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
          transform: 'translateX(-50%)',
        } : {}}
      >
        <div className="relative max-w-md w-full mx-4">
          {/* Arrow pointer for non-center positions */}
          {!isCenterPosition && step.position === 'bottom' && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[12px] border-b-card" />
          )}
          
          <div className="glass-effect rounded-2xl shadow-glow border-2 border-primary/30 p-6 backdrop-blur-xl bg-card/95">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary animate-glow-pulse" />
                <h3 className="text-xl font-bold text-gradient">{step.title}</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSkip}
                className="hover:bg-destructive/10 hover:text-destructive"
                data-testid="tutorial-close-btn"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Description */}
            <p className="text-muted-foreground mb-6 leading-relaxed">{step.description}</p>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {tourSteps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentStep
                      ? 'w-8 bg-gradient-primary'
                      : index < currentStep
                      ? 'w-2 bg-primary/60'
                      : 'w-2 bg-muted'
                  }`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={handleSkip}
                className="flex-1"
                data-testid="tutorial-skip-btn"
              >
                Skip Tutorial
              </Button>
              
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePrevious}
                    data-testid="tutorial-previous-btn"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                )}
                <Button
                  className="bg-gradient-primary text-white shadow-glow"
                  onClick={handleNext}
                  data-testid="tutorial-next-btn"
                >
                  {currentStep === tourSteps.length - 1 ? (
                    'Get Started'
                  ) : (
                    <>
                      Next
                      <ChevronRight className="ml-2 w-5 h-5" />
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Keyboard hints */}
            <div className="mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground text-center">
              <kbd className="px-2 py-1 bg-muted rounded">←</kbd> Previous •{' '}
              <kbd className="px-2 py-1 bg-muted rounded">→</kbd> Next •{' '}
              <kbd className="px-2 py-1 bg-muted rounded">ESC</kbd> Skip
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default WelcomeTour;
