/**
 * Unit tests for ReactbitsBackground wrapper utilities
 * 
 * Tests theme adaptation, wrapper HOC, and base component behavior.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  applyThemeAdaptation,
  withReactbitsWrapper,
  ReactbitsBackgroundBase,
} from './ReactbitsBackgroundWrapper';

// Mock background component
const MockBackground = ({ color, paused, speed }: any) => (
  <div data-testid="mock-background">
    <span data-testid="color">{color}</span>
    <span data-testid="paused">{String(paused)}</span>
    <span data-testid="speed">{speed}</span>
  </div>
);

describe('applyThemeAdaptation', () => {
  it('returns empty object for backgrounds with native theme support', () => {
    const result = applyThemeAdaptation(true, 'light');
    expect(result).toEqual({});
  });

  it('applies light theme adaptations for backgrounds without native support', () => {
    const result = applyThemeAdaptation(false, 'light');
    expect(result).toEqual({
      opacity: 0.7,
      filter: 'brightness(1.2)',
    });
  });

  it('applies dark theme adaptations for backgrounds without native support', () => {
    const result = applyThemeAdaptation(false, 'dark');
    expect(result).toEqual({
      opacity: 1.0,
    });
  });
});

describe('withReactbitsWrapper', () => {
  it('wraps component with error boundary and theme styles', () => {
    const WrappedComponent = withReactbitsWrapper(
      MockBackground,
      'test-bg',
      false
    );

    const { container } = render(
      <WrappedComponent
        settings={{ color: 'blue' }}
        theme="light"
        isActive={true}
      />
    );

    // Check that wrapper div exists with correct attributes
    const wrapper = container.querySelector('[data-background-id="test-bg"]');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toHaveAttribute('data-background-active', 'true');
  });

  it('passes settings to wrapped component', () => {
    const WrappedComponent = withReactbitsWrapper(
      MockBackground,
      'test-bg',
      false
    );

    render(
      <WrappedComponent
        settings={{ color: 'red' }}
        theme="dark"
        isActive={true}
      />
    );

    expect(screen.getByTestId('color')).toHaveTextContent('red');
  });

  it('passes animation controls when provided', () => {
    const WrappedComponent = withReactbitsWrapper(
      MockBackground,
      'test-bg',
      false
    );

    render(
      <WrappedComponent
        settings={{ color: 'green' }}
        theme="dark"
        isActive={true}
        isPaused={true}
        animationSpeed={0.5}
      />
    );

    expect(screen.getByTestId('paused')).toHaveTextContent('true');
    expect(screen.getByTestId('speed')).toHaveTextContent('0.5');
  });

  it('uses default values for optional props', () => {
    const WrappedComponent = withReactbitsWrapper(
      MockBackground,
      'test-bg',
      false
    );

    render(
      <WrappedComponent
        settings={{ color: 'yellow' }}
        theme="light"
        isActive={true}
      />
    );

    // Default isPaused is false, default animationSpeed is 1.0
    expect(screen.getByTestId('paused')).toHaveTextContent('false');
    expect(screen.getByTestId('speed')).toHaveTextContent('1');
  });

  it('applies theme styles for backgrounds without native support', () => {
    const WrappedComponent = withReactbitsWrapper(
      MockBackground,
      'test-bg',
      false // No native theme support
    );

    const { container } = render(
      <WrappedComponent
        settings={{ color: 'purple' }}
        theme="light"
        isActive={true}
      />
    );

    const wrapper = container.querySelector('[data-background-id="test-bg"]');
    expect(wrapper).toHaveStyle({ opacity: '0.7' });
  });

  it('does not apply theme styles for backgrounds with native support', () => {
    const WrappedComponent = withReactbitsWrapper(
      MockBackground,
      'test-bg',
      true // Has native theme support
    );

    const { container } = render(
      <WrappedComponent
        settings={{ color: 'orange' }}
        theme="light"
        isActive={true}
      />
    );

    const wrapper = container.querySelector('[data-background-id="test-bg"]');
    // Should not have opacity or filter styles
    expect(wrapper).not.toHaveStyle({ opacity: '0.7' });
  });
});

describe('ReactbitsBackgroundBase', () => {
  it('renders children with wrapper structure', () => {
    render(
      <ReactbitsBackgroundBase
        backgroundId="test-bg"
        theme="dark"
        isActive={true}
        settings={{}}
      >
        <div data-testid="child-content">Child content</div>
      </ReactbitsBackgroundBase>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('applies theme adaptations based on supportsTheme prop', () => {
    const { container } = render(
      <ReactbitsBackgroundBase
        backgroundId="test-bg"
        supportsTheme={false}
        theme="light"
        isActive={true}
        settings={{}}
      >
        <div>Content</div>
      </ReactbitsBackgroundBase>
    );

    const wrapper = container.querySelector('[data-background-id="test-bg"]');
    expect(wrapper).toHaveStyle({ opacity: '0.7' });
  });

  it('sets correct data attributes', () => {
    const { container } = render(
      <ReactbitsBackgroundBase
        backgroundId="aurora"
        theme="dark"
        isActive={false}
        settings={{}}
      >
        <div>Content</div>
      </ReactbitsBackgroundBase>
    );

    const wrapper = container.querySelector('[data-background-id="aurora"]');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toHaveAttribute('data-background-active', 'false');
  });
});
