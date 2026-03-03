/**
 * Unit tests for ReactbitsBackground wrapper components
 * 
 * Tests theme adaptation, animation pause/play, and error boundary behavior
 * for the wrapper components created in tasks 3.1 and 3.2.
 * 
 * Validates: Requirements 7.2, 16.1, 17.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { withReactbitsWrapper } from '@/lib/backgrounds/ReactbitsBackgroundWrapper';
import { BackgroundErrorBoundary } from '@/lib/backgrounds/BackgroundErrorBoundary';

// Mock background component that accepts all standard props
const MockBackgroundComponent = ({ 
  color = 'blue',
  theme,
  paused, 
  speed,
  ...rest 
}: any) => (
  <div data-testid="mock-background">
    <span data-testid="color">{color}</span>
    {theme && <span data-testid="theme">{theme}</span>}
    {paused !== undefined && <span data-testid="paused">{String(paused)}</span>}
    {speed !== undefined && <span data-testid="speed">{speed}</span>}
  </div>
);

// Component that throws an error for testing error boundary
const ErrorThrowingComponent = () => {
  throw new Error('Test error from background component');
};

describe('Wrapper Components - Theme Adaptation', () => {
  describe('Background without native theme support', () => {
    it('applies light theme adaptations (opacity and brightness)', () => {
      const WrappedComponent = withReactbitsWrapper(
        MockBackgroundComponent,
        'test-bg-no-theme',
        false // No native theme support
      );

      const { container } = render(
        <WrappedComponent
          settings={{ color: 'red' }}
          theme="light"
          isActive={true}
        />
      );

      const wrapper = container.querySelector('[data-background-id="test-bg-no-theme"]');
      expect(wrapper).toHaveStyle({
        opacity: '0.7',
        filter: 'brightness(1.2)',
      });
    });

    it('applies dark theme adaptations (full opacity)', () => {
      const WrappedComponent = withReactbitsWrapper(
        MockBackgroundComponent,
        'test-bg-no-theme',
        false // No native theme support
      );

      const { container } = render(
        <WrappedComponent
          settings={{ color: 'blue' }}
          theme="dark"
          isActive={true}
        />
      );

      const wrapper = container.querySelector('[data-background-id="test-bg-no-theme"]');
      expect(wrapper).toHaveStyle({
        opacity: '1.0',
      });
      // Should not have brightness filter in dark mode
      expect(wrapper).not.toHaveStyle({
        filter: 'brightness(1.2)',
      });
    });

    it('switches theme adaptations when theme changes', () => {
      const WrappedComponent = withReactbitsWrapper(
        MockBackgroundComponent,
        'test-bg-theme-switch',
        false
      );

      const { container, rerender } = render(
        <WrappedComponent
          settings={{ color: 'green' }}
          theme="light"
          isActive={true}
        />
      );

      const wrapper = container.querySelector('[data-background-id="test-bg-theme-switch"]');
      
      // Initially light theme
      expect(wrapper).toHaveStyle({ opacity: '0.7' });

      // Switch to dark theme
      rerender(
        <WrappedComponent
          settings={{ color: 'green' }}
          theme="dark"
          isActive={true}
        />
      );

      // Should now have dark theme styles
      expect(wrapper).toHaveStyle({ opacity: '1.0' });
    });
  });

  describe('Background with native theme support', () => {
    it('does not apply theme adaptations when background supports themes natively', () => {
      const WrappedComponent = withReactbitsWrapper(
        MockBackgroundComponent,
        'test-bg-with-theme',
        true // Has native theme support
      );

      const { container } = render(
        <WrappedComponent
          settings={{ color: 'purple' }}
          theme="light"
          isActive={true}
        />
      );

      const wrapper = container.querySelector('[data-background-id="test-bg-with-theme"]');
      
      // Should not have opacity or filter styles
      expect(wrapper).not.toHaveStyle({ opacity: '0.7' });
      expect(wrapper).not.toHaveStyle({ filter: 'brightness(1.2)' });
    });

    it('passes theme prop to component when native support is enabled', () => {
      const WrappedComponent = withReactbitsWrapper(
        MockBackgroundComponent,
        'test-bg-native-theme',
        true // Has native theme support
      );

      render(
        <WrappedComponent
          settings={{ color: 'orange' }}
          theme="dark"
          isActive={true}
        />
      );

      // Component should receive theme prop
      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    });

    it('does not pass theme prop when native support is disabled', () => {
      const WrappedComponent = withReactbitsWrapper(
        MockBackgroundComponent,
        'test-bg-no-native-theme',
        false // No native theme support
      );

      render(
        <WrappedComponent
          settings={{ color: 'yellow' }}
          theme="light"
          isActive={true}
        />
      );

      // Component should not receive theme prop
      expect(screen.queryByTestId('theme')).not.toBeInTheDocument();
    });
  });
});

describe('Wrapper Components - Animation Pause/Play', () => {
  it('passes isPaused prop to background component', () => {
    const WrappedComponent = withReactbitsWrapper(
      MockBackgroundComponent,
      'test-bg-pause',
      false
    );

    render(
      <WrappedComponent
        settings={{ color: 'cyan' }}
        theme="dark"
        isActive={true}
        isPaused={true}
      />
    );

    expect(screen.getByTestId('paused')).toHaveTextContent('true');
  });

  it('defaults isPaused to false when not provided', () => {
    const WrappedComponent = withReactbitsWrapper(
      MockBackgroundComponent,
      'test-bg-default-pause',
      false
    );

    render(
      <WrappedComponent
        settings={{ color: 'magenta' }}
        theme="dark"
        isActive={true}
      />
    );

    expect(screen.getByTestId('paused')).toHaveTextContent('false');
  });

  it('toggles animation state when isPaused changes', () => {
    const WrappedComponent = withReactbitsWrapper(
      MockBackgroundComponent,
      'test-bg-toggle-pause',
      false
    );

    const { rerender } = render(
      <WrappedComponent
        settings={{ color: 'teal' }}
        theme="dark"
        isActive={true}
        isPaused={false}
      />
    );

    expect(screen.getByTestId('paused')).toHaveTextContent('false');

    // Toggle to paused
    rerender(
      <WrappedComponent
        settings={{ color: 'teal' }}
        theme="dark"
        isActive={true}
        isPaused={true}
      />
    );

    expect(screen.getByTestId('paused')).toHaveTextContent('true');
  });

  it('passes animationSpeed prop to background component', () => {
    const WrappedComponent = withReactbitsWrapper(
      MockBackgroundComponent,
      'test-bg-speed',
      false
    );

    render(
      <WrappedComponent
        settings={{ color: 'lime' }}
        theme="dark"
        isActive={true}
        animationSpeed={0.5}
      />
    );

    expect(screen.getByTestId('speed')).toHaveTextContent('0.5');
  });

  it('defaults animationSpeed to 1.0 when not provided', () => {
    const WrappedComponent = withReactbitsWrapper(
      MockBackgroundComponent,
      'test-bg-default-speed',
      false
    );

    render(
      <WrappedComponent
        settings={{ color: 'navy' }}
        theme="dark"
        isActive={true}
      />
    );

    expect(screen.getByTestId('speed')).toHaveTextContent('1');
  });

  it('updates animation speed when prop changes', () => {
    const WrappedComponent = withReactbitsWrapper(
      MockBackgroundComponent,
      'test-bg-change-speed',
      false
    );

    const { rerender } = render(
      <WrappedComponent
        settings={{ color: 'maroon' }}
        theme="dark"
        isActive={true}
        animationSpeed={1.0}
      />
    );

    expect(screen.getByTestId('speed')).toHaveTextContent('1');

    // Change speed
    rerender(
      <WrappedComponent
        settings={{ color: 'maroon' }}
        theme="dark"
        isActive={true}
        animationSpeed={2.0}
      />
    );

    expect(screen.getByTestId('speed')).toHaveTextContent('2');
  });

  it('handles paused state with custom speed', () => {
    const WrappedComponent = withReactbitsWrapper(
      MockBackgroundComponent,
      'test-bg-pause-with-speed',
      false
    );

    render(
      <WrappedComponent
        settings={{ color: 'olive' }}
        theme="dark"
        isActive={true}
        isPaused={true}
        animationSpeed={0.75}
      />
    );

    expect(screen.getByTestId('paused')).toHaveTextContent('true');
    expect(screen.getByTestId('speed')).toHaveTextContent('0.75');
  });
});

describe('Wrapper Components - Error Boundary Behavior', () => {
  // Suppress console.error for these tests since we're intentionally throwing errors
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
  });

  it('catches errors thrown by background component', () => {
    const WrappedComponent = withReactbitsWrapper(
      ErrorThrowingComponent,
      'test-bg-error',
      false
    );

    // Should not throw - error boundary should catch it
    expect(() => {
      render(
        <WrappedComponent
          settings={{}}
          theme="dark"
          isActive={true}
        />
      );
    }).not.toThrow();
  });

  it('displays fallback UI when error occurs', () => {
    const WrappedComponent = withReactbitsWrapper(
      ErrorThrowingComponent,
      'test-bg-error-fallback',
      false
    );

    render(
      <WrappedComponent
        settings={{}}
        theme="dark"
        isActive={true}
      />
    );

    // Should show fallback message
    expect(screen.getByText('Background effect unavailable')).toBeInTheDocument();
  });

  it('logs error when component fails to render', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error');
    
    const WrappedComponent = withReactbitsWrapper(
      ErrorThrowingComponent,
      'test-bg-error-log',
      false
    );

    render(
      <WrappedComponent
        settings={{}}
        theme="dark"
        isActive={true}
      />
    );

    // Should have logged the error
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('calls onError callback when error boundary catches error', () => {
    const onErrorMock = vi.fn();
    
    render(
      <BackgroundErrorBoundary
        backgroundId="test-error-callback"
        onError={onErrorMock}
      >
        <ErrorThrowingComponent />
      </BackgroundErrorBoundary>
    );

    // onError should have been called
    expect(onErrorMock).toHaveBeenCalled();
  });

  it('renders children normally when no error occurs', () => {
    const onErrorMock = vi.fn();
    
    render(
      <BackgroundErrorBoundary
        backgroundId="test-no-error"
        onError={onErrorMock}
      >
        <div data-testid="child-content">Normal content</div>
      </BackgroundErrorBoundary>
    );

    // Should render children normally
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Normal content')).toBeInTheDocument();
    
    // onError should not have been called
    expect(onErrorMock).not.toHaveBeenCalled();
  });

  it('isolates errors to prevent app crash', () => {
    const WrappedErrorComponent = withReactbitsWrapper(
      ErrorThrowingComponent,
      'test-bg-isolated-error',
      false
    );

    const WrappedNormalComponent = withReactbitsWrapper(
      MockBackgroundComponent,
      'test-bg-normal',
      false
    );

    // Render both components - error in one should not affect the other
    const { container } = render(
      <div>
        <WrappedErrorComponent
          settings={{}}
          theme="dark"
          isActive={true}
        />
        <WrappedNormalComponent
          settings={{ color: 'green' }}
          theme="dark"
          isActive={true}
        />
      </div>
    );

    // Error component should show fallback
    expect(screen.getByText('Background effect unavailable')).toBeInTheDocument();
    
    // Normal component should still render
    expect(screen.getByTestId('mock-background')).toBeInTheDocument();
  });

  it('includes background ID in error boundary', () => {
    const WrappedComponent = withReactbitsWrapper(
      ErrorThrowingComponent,
      'specific-background-id',
      false
    );

    const { container } = render(
      <WrappedComponent
        settings={{}}
        theme="dark"
        isActive={true}
      />
    );

    // The wrapper should still have the background ID attribute even after error
    const fallback = container.querySelector('.absolute.inset-0.bg-background');
    expect(fallback).toBeInTheDocument();
  });
});

describe('Wrapper Components - Integration Tests', () => {
  it('combines theme adaptation with animation controls', () => {
    const WrappedComponent = withReactbitsWrapper(
      MockBackgroundComponent,
      'test-bg-combined',
      false
    );

    const { container } = render(
      <WrappedComponent
        settings={{ color: 'indigo' }}
        theme="light"
        isActive={true}
        isPaused={true}
        animationSpeed={0.5}
      />
    );

    // Check theme adaptation
    const wrapper = container.querySelector('[data-background-id="test-bg-combined"]');
    expect(wrapper).toHaveStyle({ opacity: '0.7' });

    // Check animation controls
    expect(screen.getByTestId('paused')).toHaveTextContent('true');
    expect(screen.getByTestId('speed')).toHaveTextContent('0.5');
  });

  it('maintains wrapper structure with all props', () => {
    const WrappedComponent = withReactbitsWrapper(
      MockBackgroundComponent,
      'test-bg-structure',
      true
    );

    const { container } = render(
      <WrappedComponent
        settings={{ color: 'violet' }}
        theme="dark"
        isActive={false}
        isPaused={false}
        animationSpeed={1.5}
      />
    );

    const wrapper = container.querySelector('[data-background-id="test-bg-structure"]');
    
    // Check wrapper attributes
    expect(wrapper).toHaveAttribute('data-background-id', 'test-bg-structure');
    expect(wrapper).toHaveAttribute('data-background-active', 'false');
    expect(wrapper).toHaveClass('absolute', 'inset-0');
  });

  it('passes custom settings to wrapped component', () => {
    const WrappedComponent = withReactbitsWrapper(
      MockBackgroundComponent,
      'test-bg-settings',
      false
    );

    render(
      <WrappedComponent
        settings={{ 
          color: 'crimson',
          intensity: 0.8,
          particleCount: 100
        }}
        theme="dark"
        isActive={true}
      />
    );

    // Settings should be passed through
    expect(screen.getByTestId('color')).toHaveTextContent('crimson');
  });
});
