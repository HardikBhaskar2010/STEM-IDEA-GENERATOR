import React from 'react';
import { HelpCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTutorial } from '@/contexts/TutorialContext';

const TutorialButton: React.FC = () => {
  const { startWelcomeTour, resetTutorials } = useTutorial();

  const handleRestartWelcomeTour = () => {
    startWelcomeTour();
  };

  const handleResetAll = () => {
    if (confirm('Are you sure you want to reset all tutorials? You\'ll see all tutorial guides again.')) {
      resetTutorials();
      // Refresh the page to restart tutorials
      window.location.reload();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-primary/10"
          data-testid="tutorial-menu-btn"
        >
          <HelpCircle className="w-5 h-5 text-primary" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-gradient">Tutorial Options</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleRestartWelcomeTour} data-testid="restart-welcome-tour">
          <HelpCircle className="mr-2 w-4 h-4" />
          Restart Welcome Tour
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleResetAll} className="text-destructive" data-testid="reset-all-tutorials">
          <RotateCcw className="mr-2 w-4 h-4" />
          Reset All Tutorials
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default TutorialButton;
