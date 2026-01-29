import React, { useEffect, useState } from 'react';
import { X, ChevronRight, ChevronLeft, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTutorial } from '@/contexts/TutorialContext';

interface TutorialStep {
  title: string;
  description: string;
  target?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface PageTutorialProps {
  pageName: string;
  steps: TutorialStep[];
}

const PageTutorial: React.FC<PageTutorialProps> = ({ pageName, steps }) => {
  const { tutorialState, completePageTutorial, isPageTutorialComplete, setCurrentStep } = useTutorial();
  const [isActive, setIsActive] = useState(false);
  const [spotlightPosition, setSpotlightPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  const currentStep = tutorialState.currentStep;
  const step = steps[currentStep];

  useEffect(() => {
    // Start tutorial if user hasn't seen it for this page
    const hasCompleted = isPageTutorialComplete(pageName);
    if (!hasCompleted && !isActive) {
      // Delay to ensure page elements are rendered
      const timer = setTimeout(() => {
        setIsActive(true);
        setCurrentStep(0);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [pageName, isPageTutorialComplete, isActive]);

  useEffect(() => {
    if (!isActive || !step) return;

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

          // Calculate tooltip position based on target position
          let tooltipTop = rect.top + rect.height / 2;
          let tooltipLeft = rect.left + rect.width / 2;

          if (step.position === 'bottom') {
            tooltipTop = rect.bottom + 20;
          } else if (step.position === 'top') {
            tooltipTop = rect.top - 200;
          } else if (step.position === 'right') {
            tooltipTop = rect.top + rect.height / 2;
            tooltipLeft = rect.right + 20;
          } else if (step.position === 'left') {
            tooltipTop = rect.top + rect.height / 2;
            tooltipLeft = rect.left - 20;
          }

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
  }, [currentStep, step, isActive]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    completePageTutorial(pageName);
    setIsActive(false);
  };

  const handleSkip = () => {
    completePageTutorial(pageName);
    setIsActive(false);
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isActive) return;
      if (e.key === 'Escape') handleSkip();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrevious();
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isActive, currentStep]);

  if (!isActive || !step) {
    return null;
  }

  return (
    <>
      {/* Overlay backdrop */}
      <div className="fixed inset-0 bg-black/70 z-[100] animate-fade-in" />

      {/* Spotlight highlight */}
      {step.target && (
        <div
          className="fixed z-[101] transition-all duration-500 ease-out"
          style={{
            top: `${spotlightPosition.top}px`,
            left: `${spotlightPosition.left}px`,
            width: `${spotlightPosition.width}px`,
            height: `${spotlightPosition.height}px`,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7), 0 0 30px rgba(139, 92, 246, 0.5)',
            borderRadius: '12px',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Tutorial tooltip */}
      <div
        className="fixed z-[102] animate-scale-in"
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
          transform: step.position === 'right' ? 'translateY(-50%)' : 
                     step.position === 'left' ? 'translate(-100%, -50%)' : 
                     'translateX(-50%)',
        }}
      >
        <div className="relative max-w-sm w-full mx-4">
          {/* Arrow pointer */}
          {step.position === 'bottom' && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[12px] border-b-card" />
          )}
          {step.position === 'top' && (
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[12px] border-t-card" />
          )}

          <div className="glass-effect rounded-xl shadow-glow border-2 border-primary/30 p-5 backdrop-blur-xl bg-card/95">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-primary" />
                <h4 className="text-lg font-semibold text-foreground">{step.title}</h4>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSkip}
                className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                data-testid="page-tutorial-close-btn"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground mb-4">{step.description}</p>

            {/* Progress */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === currentStep
                        ? 'w-6 bg-primary'
                        : index < currentStep
                        ? 'w-1.5 bg-primary/60'
                        : 'w-1.5 bg-muted'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                {currentStep + 1} / {steps.length}
              </span>
            </div>

            {/* Navigation */}
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  className="flex-1"
                  data-testid="page-tutorial-previous-btn"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
              <Button
                className="flex-1 bg-gradient-primary text-white"
                size="sm"
                onClick={handleNext}
                data-testid="page-tutorial-next-btn"
              >
                {currentStep === steps.length - 1 ? (
                  'Got it!'
                ) : (
                  <>
                    Next
                    <ChevronRight className="ml-1 w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PageTutorial;
