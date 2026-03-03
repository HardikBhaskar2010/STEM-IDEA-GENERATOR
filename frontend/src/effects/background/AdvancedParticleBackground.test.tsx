/**
 * Tests for AdvancedParticleBackground component
 * Focus: Reduced motion support
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { AdvancedParticleBackground } from './AdvancedParticleBackground';
import type { AdvancedParticleSettings } from './AdvancedParticleBackground';

describe('AdvancedParticleBackground - Reduced Motion Support', () => {
  let matchMediaMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock matchMedia
    matchMediaMock = vi.fn();
    window.matchMedia = matchMediaMock;

    // Mock canvas getContext
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      globalAlpha: 1,
      shadowBlur: 0,
      shadowColor: '',
      lineWidth: 1,
    });

    // Mock requestAnimationFrame
    global.requestAnimationFrame = vi.fn((cb) => {
      // Don't call the callback immediately to avoid infinite loop
      return 1;
    });

    // Mock cancelAnimationFrame
    global.cancelAnimationFrame = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const defaultSettings: AdvancedParticleSettings = {
    particleCount: 240,
    particleSpeed: 1,
    connectionDistance: 150,
    interactionMode: 'repulsion',
    interactionRadius: 200,
    interactionStrength: 0.5,
    enableGlow: true,
    glowIntensity: 0.6,
    blendMode: 'screen',
    enableDrift: true,
    adaptiveQuality: true,
    opacity: 1,
  };

  it('should respect prefers-reduced-motion: reduce', () => {
    // Mock prefers-reduced-motion: reduce
    matchMediaMock.mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    const { container } = render(
      <AdvancedParticleBackground
        settings={defaultSettings}
        isActive={true}
      />
    );

    // Verify canvas is rendered
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();

    // Note: We can't directly test the engine settings here without exposing them,
    // but we've verified the matchMedia check is called
    expect(matchMediaMock).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });

  it('should use normal settings when prefers-reduced-motion is not set', () => {
    // Mock prefers-reduced-motion: no-preference
    matchMediaMock.mockReturnValue({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    const { container } = render(
      <AdvancedParticleBackground
        settings={defaultSettings}
        isActive={true}
      />
    );

    // Verify canvas is rendered
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();

    // Verify matchMedia was called
    expect(matchMediaMock).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });

  it('should not render when isActive is false', () => {
    matchMediaMock.mockReturnValue({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    const { container } = render(
      <AdvancedParticleBackground
        settings={defaultSettings}
        isActive={false}
      />
    );

    // Verify canvas is not rendered
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeNull();
  });
});
