/**
 * Error Boundary for Background Rendering
 * 
 * This component catches errors during background rendering and provides
 * graceful fallback behavior to prevent the entire application from crashing.
 * 
 * Validates: Requirements 16.1, 16.2
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface BackgroundErrorBoundaryProps {
  backgroundId: string;
  onError: () => void;
  children: ReactNode;
}

interface BackgroundErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component that catches rendering errors in background effects
 * and displays a safe fallback UI while notifying the parent component.
 */
export class BackgroundErrorBoundary extends Component<
  BackgroundErrorBoundaryProps,
  BackgroundErrorBoundaryState
> {
  constructor(props: BackgroundErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): BackgroundErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Background render error:', error, errorInfo);

    // Log error with structured data for debugging
    this.logError(error, errorInfo);

    // Notify parent component to revert to safe state
    this.props.onError();
  }

  private logError(error: Error, errorInfo: ErrorInfo): void {
    const errorLog = {
      timestamp: new Date(),
      category: 'render' as const,
      backgroundId: this.props.backgroundId,
      errorMessage: error.message,
      errorStack: error.stack,
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
    };

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('Background Error Log:', errorLog);
    }

    // In production, this would be sent to an error tracking service
    // errorTrackingService.log(errorLog);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Render safe fallback UI
      return (
        <div className="absolute inset-0 bg-background">
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">Background effect unavailable</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default BackgroundErrorBoundary;
