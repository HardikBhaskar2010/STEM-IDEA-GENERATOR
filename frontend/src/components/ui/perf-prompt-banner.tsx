import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Zap } from 'lucide-react';
import { usePerf } from '@/contexts/PerfContext';

export const PerfPromptBanner: React.FC = () => {
  const { shouldPrompt, setLowPerf, dismissPrompt } = usePerf();

  if (!shouldPrompt) return null;

  return (
    <div 
      className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl mx-auto px-4 animate-slide-in-from-top"
      data-testid="perf-prompt-banner"
    >
      <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 backdrop-blur-lg border border-yellow-500/30 rounded-lg shadow-xl p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-yellow-400" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground mb-1">
              Low Performance Mode Recommended
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              We detected your device might benefit from reduced animations and effects. Would you like to enable Low Performance Mode for a smoother experience?
            </p>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setLowPerf(true);
                  dismissPrompt();
                }}
                className="bg-yellow-500 hover:bg-yellow-600 text-black h-8 text-xs"
                data-testid="enable-low-perf-btn"
              >
                <Zap className="w-3 h-3 mr-1" />
                Enable
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={dismissPrompt}
                className="h-8 text-xs"
                data-testid="dismiss-perf-prompt-btn"
              >
                Not Now
              </Button>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={dismissPrompt}
            className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
            aria-label="Dismiss prompt"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};
