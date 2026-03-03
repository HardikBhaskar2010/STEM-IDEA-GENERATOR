import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  type?: 'info' | 'help' | 'warning';
  side?: 'top' | 'right' | 'bottom' | 'left';
  showIcon?: boolean;
  className?: string;
  contentClassName?: string;
}

const EnhancedTooltip: React.FC<EnhancedTooltipProps> = ({
  children,
  content,
  type = 'info',
  side = 'top',
  showIcon = false,
  className,
  contentClassName,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'help':
        return <HelpCircle className="w-4 h-4 text-muted-foreground" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getContentStyles = () => {
    switch (type) {
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100';
      case 'help':
        return 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100';
      default:
        return '';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('inline-flex items-center gap-1', className)}>
            {children}
            {showIcon && getIcon()}
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side={side}
          className={cn(
            'max-w-xs p-3',
            getContentStyles(),
            contentClassName
          )}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Specialized help tooltip component
export const HelpTooltip: React.FC<{
  content: React.ReactNode;
  className?: string;
}> = ({ content, className }) => (
  <EnhancedTooltip
    content={content}
    type="help"
    showIcon={true}
    className={cn('cursor-help', className)}
  >
    <span className="sr-only">Help</span>
  </EnhancedTooltip>
);

export default EnhancedTooltip;