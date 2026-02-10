'use client';

import React, { Suspense } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimationProvider } from '@/contexts/AnimationContext';
import { PreferencesProvider } from '@/contexts/PreferencesContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { PerfProvider } from '@/contexts/PerfContext';
import { ThreeDProvider } from '@/contexts/ThreeDContext';
import { TTSProvider } from '@/contexts/TTSContext';
import { CodeGenerationProvider } from '@/contexts/CodeGenerationContext';
import { PageLoading } from '@/components/ui/loading';
import ErrorBoundary from '@/components/ui/error-boundary';
import { PerfPromptBanner } from '@/components/ui/perf-prompt-banner';
import { CommandPalette } from '@/components/CommandPalette';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PreferencesProvider>
            <PerfProvider>
              <ThreeDProvider>
                <AnimationProvider>
                  <TTSProvider>
                    <CodeGenerationProvider>
                      <TooltipProvider>
                        {/* Vercel Analytics */}
                        <SpeedInsights />
                        <Analytics />

                        {/* Toast notifications */}
                        <Toaster />
                        <Sonner />

                        {/* Command Palette (CMD+K) */}
                        <CommandPalette />
                        <PerfPromptBanner />

                        <Suspense fallback={<PageLoading />}>
                          {children}
                        </Suspense>
                      </TooltipProvider>
                    </CodeGenerationProvider>
                  </TTSProvider>
                </AnimationProvider>
              </ThreeDProvider>
            </PerfProvider>
          </PreferencesProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
