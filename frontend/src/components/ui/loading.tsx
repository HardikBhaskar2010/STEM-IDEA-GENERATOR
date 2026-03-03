import React from 'react';
import { Loader2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  text = 'Loading...',
  className,
  fullScreen = false,
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const containerClasses = fullScreen
    ? 'fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center'
    : 'flex items-center justify-center p-8';

  return (
    <div className={cn(containerClasses, className)}>
      <div className="flex flex-col items-center space-y-6">
        {/* App logo */}
        <div className="flex flex-col items-center space-y-4">
          <div className="p-4 bg-gradient-primary rounded-xl shadow-glow animate-glow-pulse">
            <Zap className={cn(sizeClasses[size], 'text-white')} />
          </div>
          
          {/* Separate loading spinner */}
          <div className="flex items-center justify-center">
            <Loader2 
              className={cn(
                'animate-spin text-primary',
                size === 'sm' ? 'w-5 h-5' : size === 'md' ? 'w-6 h-6' : 'w-8 h-8'
              )} 
            />
          </div>
        </div>
        
        {/* Loading text */}
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">{text}</p>
          <div className="flex items-center justify-center space-x-1 mt-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

// Page loading component specifically for route transitions
export const PageLoading: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-8">
        {/* App logo with subtle animation */}
        <div className="relative">
          <div className="p-6 bg-gradient-primary rounded-2xl shadow-glow">
            <Zap className="w-16 h-16 text-white" />
          </div>
          
          {/* Rotating border effect */}
          <div className="absolute inset-0 rounded-2xl border-2 border-primary/30 animate-spin" 
               style={{ animationDuration: '3s' }} />
        </div>
        
        {/* Loading text with dots */}
        <div className="text-center space-y-3">
          <p className="text-lg font-medium text-foreground">Loading page...</p>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Loading;