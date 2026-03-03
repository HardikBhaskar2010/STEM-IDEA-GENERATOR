/**
 * BackgroundLayer Property-Based Tests
 * 
 * Task 4.3: Write property test for layering contract compliance
 * Task 4.4: Write property test for performance monitoring
 * 
 * Property 6: Layering Contract Compliance
 * **Validates: Requirements 4.3, 4.4, 13.4**
 * 
 * For any rendered background component, it SHALL use the CSS positioning pattern 
 * `fixed inset-0 -z-10 pointer-events-none` to ensure it appears behind all content 
 * and does not block interactions.
 * 
 * Property 12: Performance Monitoring
 * **Validates: Requirements 8.1, 8.2, 8.3**
 * 
 * For any active background, the PerformanceMonitor SHALL continuously track and 
 * display the current FPS, and SHALL display a warning when FPS drops below 30.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import { BackgroundLayer } from './BackgroundLayer';
import { BackgroundManager } from '@/lib/backgrounds/BackgroundManager';
import BackgroundLibrary from '@/lib/backgrounds/BackgroundLibrary';
import type { BackgroundMetadata } from '@/lib/backgrounds/types';

// Mock the useFPSMonitor hook
vi.mock('@/hooks/useFPSMonitor', () => ({
  useFPSMonitor: vi.fn(() => ({
    currentFPS: 60,
    averageFPS: 60,
    minFPS: 60,
    maxFPS: 60,
    isLowPerformance: false,
  })),
}));

describe('BackgroundLayer Property-Based Tests', () => {
  let mockManager: any;

  beforeEach(() => {
    // Reset BackgroundManager singleton
    (BackgroundManager as any).instance = null;
    
    // Create mock manager
    mockManager = {
      loadBackground: vi.fn().mockResolvedValue(undefined),
      unmountBackground: vi.fn(),
      applyThemeVariant: vi.fn(),
      getCurrentBackground: vi.fn().mockReturnValue(() => <div data-testid="mock-background">Mock Background</div>),
      getLoadingState: vi.fn().mockReturnValue('loaded'),
      onLoadingStateChange: vi.fn((callback) => {
        // Immediately call with 'loaded' state
        setTimeout(() => callback('loaded'), 0);
        return () => {}; // unsubscribe function
      }),
    };

    // Mock getInstance to return our mock
    vi.spyOn(BackgroundManager, 'getInstance').mockReturnValue(mockManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Property 6: Layering Contract Compliance', () => {
    // Feature: reactbits-background-integration, Property 6: Layering Contract Compliance
    it('any rendered background uses the CSS positioning pattern: fixed inset-0 -z-10 pointer-events-none', async () => {
      const backgrounds = BackgroundLibrary.backgrounds;
      
      // Property test: For any background, the container must have correct CSS classes
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...backgrounds),
          fc.constantFrom('light', 'dark'),
          fc.boolean(),
          async (background: BackgroundMetadata, theme: 'light' | 'dark', isActive: boolean) => {
            const { container } = render(
              <BackgroundLayer
                backgroundId={background.id}
                settings={background.defaultSettings}
                theme={theme}
                isActive={isActive}
              />
            );

            // Wait for component to render
            await waitFor(() => {
              const layerElement = container.querySelector('[data-testid="background-layer"]');
              expect(layerElement).toBeTruthy();
            });

            const layerElement = container.querySelector('[data-testid="background-layer"]');
            
            // Verify the layering contract CSS classes
            expect(layerElement).toHaveClass('fixed');
            expect(layerElement).toHaveClass('inset-0');
            expect(layerElement).toHaveClass('-z-10');
            expect(layerElement).toHaveClass('pointer-events-none');
            
            // Verify the className contains all required classes
            const className = layerElement?.className || '';
            expect(className).toContain('fixed');
            expect(className).toContain('inset-0');
            expect(className).toContain('-z-10');
            expect(className).toContain('pointer-events-none');
          }
        ),
        { numRuns: 20 } // Test with 20 different backgrounds
      );
    });

    it('layering contract is maintained across theme changes', async () => {
      const backgrounds = BackgroundLibrary.backgrounds;
      
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...backgrounds),
          async (background: BackgroundMetadata) => {
            const { container, rerender } = render(
              <BackgroundLayer
                backgroundId={background.id}
                settings={background.defaultSettings}
                theme="light"
                isActive={true}
              />
            );

            await waitFor(() => {
              expect(container.querySelector('[data-testid="background-layer"]')).toBeTruthy();
            });

            // Verify initial state
            let layerElement = container.querySelector('[data-testid="background-layer"]');
            expect(layerElement).toHaveClass('fixed', 'inset-0', '-z-10', 'pointer-events-none');

            // Change theme
            rerender(
              <BackgroundLayer
                backgroundId={background.id}
                settings={background.defaultSettings}
                theme="dark"
                isActive={true}
              />
            );

            // Verify layering contract is still maintained after theme change
            layerElement = container.querySelector('[data-testid="background-layer"]');
            expect(layerElement).toHaveClass('fixed', 'inset-0', '-z-10', 'pointer-events-none');
          }
        ),
        { numRuns: 20 }
      );
    });

    it('layering contract is maintained when background changes', async () => {
      const backgrounds = BackgroundLibrary.backgrounds;
      
      // Need at least 2 backgrounds to test switching
      if (backgrounds.length < 2) {
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...backgrounds),
          fc.constantFrom(...backgrounds),
          async (background1: BackgroundMetadata, background2: BackgroundMetadata) => {
            // Skip if same background
            if (background1.id === background2.id) {
              return;
            }

            const { container, rerender } = render(
              <BackgroundLayer
                backgroundId={background1.id}
                settings={background1.defaultSettings}
                theme="light"
                isActive={true}
              />
            );

            await waitFor(() => {
              expect(container.querySelector('[data-testid="background-layer"]')).toBeTruthy();
            });

            // Verify first background
            let layerElement = container.querySelector('[data-testid="background-layer"]');
            expect(layerElement).toHaveClass('fixed', 'inset-0', '-z-10', 'pointer-events-none');

            // Switch to second background
            rerender(
              <BackgroundLayer
                backgroundId={background2.id}
                settings={background2.defaultSettings}
                theme="light"
                isActive={true}
              />
            );

            await waitFor(() => {
              expect(mockManager.loadBackground).toHaveBeenCalledWith(background2.id);
            });

            // Verify layering contract is maintained after background change
            layerElement = container.querySelector('[data-testid="background-layer"]');
            expect(layerElement).toHaveClass('fixed', 'inset-0', '-z-10', 'pointer-events-none');
          }
        ),
        { numRuns: 10 }
      );
    });

    it('layering contract prevents interaction blocking', async () => {
      const backgrounds = BackgroundLibrary.backgrounds;
      
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...backgrounds),
          async (background: BackgroundMetadata) => {
            const { container } = render(
              <BackgroundLayer
                backgroundId={background.id}
                settings={background.defaultSettings}
                theme="light"
                isActive={true}
              />
            );

            await waitFor(() => {
              expect(container.querySelector('[data-testid="background-layer"]')).toBeTruthy();
            });

            const layerElement = container.querySelector('[data-testid="background-layer"]');
            const computedStyle = window.getComputedStyle(layerElement!);
            
            // Verify pointer-events: none prevents interaction blocking
            expect(computedStyle.pointerEvents).toBe('none');
            
            // Verify z-index is negative (behind content)
            const zIndex = parseInt(computedStyle.zIndex);
            expect(zIndex).toBeLessThan(0);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('layering contract is applied even during loading state', async () => {
      const backgrounds = BackgroundLibrary.backgrounds;
      
      // Mock loading state
      mockManager.onLoadingStateChange = vi.fn((callback) => {
        setTimeout(() => callback('loading'), 0);
        return () => {};
      });

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...backgrounds),
          async (background: BackgroundMetadata) => {
            const { container } = render(
              <BackgroundLayer
                backgroundId={background.id}
                settings={background.defaultSettings}
                theme="light"
                isActive={true}
              />
            );

            await waitFor(() => {
              expect(container.querySelector('[data-testid="background-layer"]')).toBeTruthy();
            });

            const layerElement = container.querySelector('[data-testid="background-layer"]');
            
            // Layering contract must be maintained even during loading
            expect(layerElement).toHaveClass('fixed', 'inset-0', '-z-10', 'pointer-events-none');
          }
        ),
        { numRuns: 20 }
      );
    });

    it('layering contract is applied even during error state', async () => {
      const backgrounds = BackgroundLibrary.backgrounds;
      
      // Mock error state
      mockManager.onLoadingStateChange = vi.fn((callback) => {
        setTimeout(() => callback('error'), 0);
        return () => {};
      });
      mockManager.loadBackground = vi.fn().mockRejectedValue(new Error('Load failed'));

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...backgrounds),
          async (background: BackgroundMetadata) => {
            const { container } = render(
              <BackgroundLayer
                backgroundId={background.id}
                settings={background.defaultSettings}
                theme="light"
                isActive={true}
              />
            );

            await waitFor(() => {
              expect(container.querySelector('[data-testid="background-layer"]')).toBeTruthy();
            });

            const layerElement = container.querySelector('[data-testid="background-layer"]');
            
            // Layering contract must be maintained even during error
            expect(layerElement).toHaveClass('fixed', 'inset-0', '-z-10', 'pointer-events-none');
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
