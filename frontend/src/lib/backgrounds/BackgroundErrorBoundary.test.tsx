/**
 * Unit tests for BackgroundErrorBoundary
 * 
 * Tests error catching, fallback rendering, and error logging behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BackgroundErrorBoundary } from './BackgroundErrorBoundary';

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Normal content</div>;
};

describe('BackgroundErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Suppress console.error in tests
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders children when no error occurs', () => {
    const onError = vi.fn();
    
    render(
      <BackgroundErrorBoundary backgroundId="test-bg" onError={onError}>
        <div>Test content</div>
      </BackgroundErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
    expect(onError).not.toHaveBeenCalled();
  });

  it('catches errors and displays fallback UI', () => {
    const onError = vi.fn();
    
    render(
      <BackgroundErrorBoundary backgroundId="test-bg" onError={onError}>
        <ThrowError shouldThrow={true} />
      </BackgroundErrorBoundary>
    );

    expect(screen.getByText('Background effect unavailable')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('logs error information to console', () => {
    const onError = vi.fn();
    
    render(
      <BackgroundErrorBoundary backgroundId="test-bg" onError={onError}>
        <ThrowError shouldThrow={true} />
      </BackgroundErrorBoundary>
    );

    expect(consoleErrorSpy).toHaveBeenCalled();
    // Check that error was logged with background ID
    const errorCalls = consoleErrorSpy.mock.calls;
    const hasBackgroundId = errorCalls.some(call => 
      JSON.stringify(call).includes('test-bg')
    );
    expect(hasBackgroundId).toBe(true);
  });

  it('renders fallback with correct styling', () => {
    const onError = vi.fn();
    
    const { container } = render(
      <BackgroundErrorBoundary backgroundId="test-bg" onError={onError}>
        <ThrowError shouldThrow={true} />
      </BackgroundErrorBoundary>
    );

    const fallback = container.querySelector('.absolute.inset-0.bg-background');
    expect(fallback).toBeInTheDocument();
  });

  it('includes backgroundId in error context', () => {
    const onError = vi.fn();
    const backgroundId = 'liquid-ether';
    
    render(
      <BackgroundErrorBoundary backgroundId={backgroundId} onError={onError}>
        <ThrowError shouldThrow={true} />
      </BackgroundErrorBoundary>
    );

    // Verify error was logged with correct background ID
    expect(consoleErrorSpy).toHaveBeenCalled();
    const errorLog = consoleErrorSpy.mock.calls.find(call => 
      call[0] === 'Background Error Log:'
    );
    
    if (errorLog && errorLog[1]) {
      expect(errorLog[1]).toHaveProperty('backgroundId', backgroundId);
    }
  });
});
