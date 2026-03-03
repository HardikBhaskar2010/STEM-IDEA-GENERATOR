/**
 * Unit tests for BackgroundLayer component
 * 
 * Tests rendering logic, loading states, error states, and CSS positioning.
 * Requirements: 4.1, 4.2, 4.3, 4.4, 10.1, 10.3, 16.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BackgroundLayer } from './BackgroundLayer';
import { BackgroundManager } from '@/lib/backgrounds/BackgroundManager';

// Mock the BackgroundManager
vi.mock('@/lib/backgrounds/BackgroundManager', () => {
  const mockManager = {
    getInstance: vi.fn(),
    loadBackground: vi.fn(),
    getCurrentBackground: vi.fn(),
    applyThemeVariant: vi.fn(),
    onLoadingStateChange: vi.fn(),
  };

  return {
    BackgroundManager: {
      getInstance: () => mockManager,
    },
  };
});

describe('BackgroundLayer', () => {
  let mockManager: any;

  beforeEach(() => {
    mockManager = BackgroundManager.getInstance();
    vi.clearAllMocks();
    
    // Default mock implementations
    mockManager.onLoadingStateChange.mockReturnValue(() => {});
    mockManager.loadBackground.mockResolvedValue(undefined);
    mockManager.getCurrentBackground.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render nothing when backgroundId is null', () => {
      const { container } = render(
        <BackgroundLayer
          backgroundId={null}
          settings={{}}
          theme="dark"
          isActive={true}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render with correct CSS positioning classes', () => {
      render(
        <BackgroundLayer
          backgroundId="liquid-ether"
          settings={{}}
          theme="dark"
          isActive={true}
        />
      );

      const layer = screen.getByTestId('background-layer');
      expect(layer).toHaveClass('fixed', 'inset-0', '-z-10', 'pointer-events-none');
    });

    it('should render background component when loaded', async () => {
      const MockBackground = ({ settings, theme, isActive }: any) => (
        <div data-testid="mock-background">
          Mock Background - {theme} - {isActive ? 'active' : 'inactive'}
        </div>
      );

      mockManager.getCurrentBackground.mockReturnValue(MockBackground);
      
      // Mock loading state change to 'loaded'
      mockManager.onLoadingStateChange.mockImplementation((callback: any) => {
        setTimeout(() => callback('loaded'), 0);
        return () => {};
      });

      render(
        <BackgroundLayer
          backgroundId="liquid-ether"
          settings={{ intensity: 0.5 }}
          theme="dark"
          isActive={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('mock-background')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should display loading spinner when loading', async () => {
      mockManager.onLoadingStateChange.mockImplementation((callback: any) => {
        setTimeout(() => callback('loading'), 0);
        return () => {};
      });

      render(
        <BackgroundLayer
          backgroundId="liquid-ether"
          settings={{}}
          theme="dark"
          isActive={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('background-loading-spinner')).toBeInTheDocument();
        expect(screen.getByText('Loading background...')).toBeInTheDocument();
      });
    });

    it('should call loadBackground when backgroundId changes', async () => {
      const { rerender } = render(
        <BackgroundLayer
          backgroundId="liquid-ether"
          settings={{}}
          theme="dark"
          isActive={true}
        />
      );

      await waitFor(() => {
        expect(mockManager.loadBackground).toHaveBeenCalledWith('liquid-ether');
      });

      // Change background
      rerender(
        <BackgroundLayer
          backgroundId="prism"
          settings={{}}
          theme="dark"
          isActive={true}
        />
      );

      await waitFor(() => {
        expect(mockManager.loadBackground).toHaveBeenCalledWith('prism');
      });
    });

    it('should not call loadBackground when backgroundId is null', () => {
      render(
        <BackgroundLayer
          backgroundId={null}
          settings={{}}
          theme="dark"
          isActive={true}
        />
      );

      expect(mockManager.loadBackground).not.toHaveBeenCalled();
    });
  });

  describe('Error States', () => {
    it('should display error fallback when loading fails', async () => {
      const testError = new Error('Failed to load background');
      mockManager.loadBackground.mockRejectedValue(testError);
      
      mockManager.onLoadingStateChange.mockImplementation((callback: any) => {
        setTimeout(() => callback('error'), 0);
        return () => {};
      });

      render(
        <BackgroundLayer
          backgroundId="liquid-ether"
          settings={{}}
          theme="dark"
          isActive={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('background-error-fallback')).toBeInTheDocument();
        expect(screen.getByText('Background effect unavailable')).toBeInTheDocument();
      });
    });

    it('should display error message in error state', async () => {
      const testError = new Error('Network error');
      mockManager.loadBackground.mockRejectedValue(testError);
      
      mockManager.onLoadingStateChange.mockImplementation((callback: any) => {
        setTimeout(() => callback('error'), 0);
        return () => {};
      });

      render(
        <BackgroundLayer
          backgroundId="liquid-ether"
          settings={{}}
          theme="dark"
          isActive={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should clear error when backgroundId changes to null', async () => {
      const testError = new Error('Failed to load');
      mockManager.loadBackground.mockRejectedValue(testError);
      
      mockManager.onLoadingStateChange.mockImplementation((callback: any) => {
        setTimeout(() => callback('error'), 0);
        return () => {};
      });

      const { rerender } = render(
        <BackgroundLayer
          backgroundId="liquid-ether"
          settings={{}}
          theme="dark"
          isActive={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('background-error-fallback')).toBeInTheDocument();
      });

      // Change to null
      rerender(
        <BackgroundLayer
          backgroundId={null}
          settings={{}}
          theme="dark"
          isActive={true}
        />
      );

      expect(screen.queryByTestId('background-error-fallback')).not.toBeInTheDocument();
    });
  });

  describe('Theme Integration', () => {
    it('should call applyThemeVariant when theme changes', async () => {
      const { rerender } = render(
        <BackgroundLayer
          backgroundId="liquid-ether"
          settings={{}}
          theme="dark"
          isActive={true}
        />
      );

      await waitFor(() => {
        expect(mockManager.applyThemeVariant).toHaveBeenCalledWith('dark');
      });

      // Change theme
      rerender(
        <BackgroundLayer
          backgroundId="liquid-ether"
          settings={{}}
          theme="light"
          isActive={true}
        />
      );

      await waitFor(() => {
        expect(mockManager.applyThemeVariant).toHaveBeenCalledWith('light');
      });
    });

    it('should pass theme prop to background component', async () => {
      const MockBackground = ({ theme }: any) => (
        <div data-testid="mock-background" data-theme={theme}>
          Theme: {theme}
        </div>
      );

      mockManager.getCurrentBackground.mockReturnValue(MockBackground);
      
      mockManager.onLoadingStateChange.mockImplementation((callback: any) => {
        setTimeout(() => callback('loaded'), 0);
        return () => {};
      });

      render(
        <BackgroundLayer
          backgroundId="liquid-ether"
          settings={{}}
          theme="light"
          isActive={true}
        />
      );

      await waitFor(() => {
        const bg = screen.getByTestId('mock-background');
        expect(bg).toHaveAttribute('data-theme', 'light');
      });
    });
  });

  describe('Settings and Props', () => {
    it('should pass settings to background component', async () => {
      const MockBackground = ({ settings }: any) => (
        <div data-testid="mock-background">
          Intensity: {settings.intensity}
        </div>
      );

      mockManager.getCurrentBackground.mockReturnValue(MockBackground);
      
      mockManager.onLoadingStateChange.mockImplementation((callback: any) => {
        setTimeout(() => callback('loaded'), 0);
        return () => {};
      });

      render(
        <BackgroundLayer
          backgroundId="liquid-ether"
          settings={{ intensity: 0.8 }}
          theme="dark"
          isActive={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Intensity: 0.8')).toBeInTheDocument();
      });
    });

    it('should pass isActive prop to background component', async () => {
      const MockBackground = ({ isActive }: any) => (
        <div data-testid="mock-background">
          Active: {isActive ? 'yes' : 'no'}
        </div>
      );

      mockManager.getCurrentBackground.mockReturnValue(MockBackground);
      
      mockManager.onLoadingStateChange.mockImplementation((callback: any) => {
        setTimeout(() => callback('loaded'), 0);
        return () => {};
      });

      render(
        <BackgroundLayer
          backgroundId="liquid-ether"
          settings={{}}
          theme="dark"
          isActive={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Active: no')).toBeInTheDocument();
      });
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe from loading state changes on unmount', () => {
      const unsubscribe = vi.fn();
      mockManager.onLoadingStateChange.mockReturnValue(unsubscribe);

      const { unmount } = render(
        <BackgroundLayer
          backgroundId="liquid-ether"
          settings={{}}
          theme="dark"
          isActive={true}
        />
      );

      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });
  });
});
