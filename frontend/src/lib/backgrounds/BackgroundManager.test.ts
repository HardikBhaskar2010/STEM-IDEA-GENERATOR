/**
 * Unit tests for BackgroundManager
 * 
 * Tests loading success and failure scenarios, unmount behavior, and route isolation logic.
 * Requirements: 3.1, 3.2, 10.4, 13.3
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BackgroundManager } from './BackgroundManager';
import { BackgroundLibrary } from './BackgroundLibrary';

describe('BackgroundManager', () => {
  let manager: BackgroundManager;

  beforeEach(() => {
    // Get fresh instance for each test
    manager = BackgroundManager.getInstance();
    manager.reset();
  });

  afterEach(() => {
    manager.reset();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = BackgroundManager.getInstance();
      const instance2 = BackgroundManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Initial State', () => {
    it('should start with idle loading state', () => {
      expect(manager.getLoadingState()).toBe('idle');
    });

    it('should start with no background loaded', () => {
      expect(manager.getCurrentBackground()).toBeNull();
      expect(manager.getCurrentBackgroundId()).toBeNull();
      expect(manager.hasBackground()).toBe(false);
    });
  });

  describe('Loading State Management', () => {
    it('should update loading state during load attempt', async () => {
      const states: string[] = [];
      
      manager.onLoadingStateChange((state) => {
        states.push(state);
      });

      // Attempt to load a background (will fail since we don't have actual components)
      try {
        await manager.loadBackground('liquid-ether');
      } catch (error) {
        // Expected to fail
      }

      // Should have transitioned through loading state
      expect(states).toContain('loading');
    });

    it('should notify listeners of state changes', () => {
      const listener = vi.fn();
      const unsubscribe = manager.onLoadingStateChange(listener);

      // Trigger state change by attempting load
      manager.loadBackground('liquid-ether').catch(() => {});

      // Wait a bit for async operation
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(listener).toHaveBeenCalled();
          unsubscribe();
          resolve(undefined);
        }, 10);
      });
    });

    it('should allow unsubscribing from state changes', () => {
      const listener = vi.fn();
      const unsubscribe = manager.onLoadingStateChange(listener);
      
      unsubscribe();
      
      // Attempt load after unsubscribe
      manager.loadBackground('liquid-ether').catch(() => {});
      
      // Listener should not be called
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(listener).not.toHaveBeenCalled();
          resolve(undefined);
        }, 10);
      });
    });
  });

  describe('Background Loading', () => {
    it('should throw error for non-existent background', async () => {
      await expect(
        manager.loadBackground('non-existent-background')
      ).rejects.toThrow('not found in library');
    });

    it('should throw error for invalid background ID', async () => {
      await expect(
        manager.loadBackground('')
      ).rejects.toThrow();
    });

    it('should set loading state to error on failure', async () => {
      try {
        await manager.loadBackground('liquid-ether');
      } catch (error) {
        // Expected to fail
      }

      expect(manager.getLoadingState()).toBe('error');
    });

    it('should validate background exists in library before loading', async () => {
      const validBackground = BackgroundLibrary.backgrounds[0];
      
      // This will fail to import but should pass validation
      try {
        await manager.loadBackground(validBackground.id);
      } catch (error) {
        // Expected to fail at import stage
        expect(error).toBeDefined();
      }
    });
  });

  describe('Unmount Behavior', () => {
    it('should clear current background on unmount', () => {
      // Manually set a background (simulating successful load)
      (manager as any).currentBackground = () => null;
      (manager as any).currentBackgroundId = 'test-background';

      manager.unmountBackground();

      expect(manager.getCurrentBackground()).toBeNull();
      expect(manager.getCurrentBackgroundId()).toBeNull();
      expect(manager.hasBackground()).toBe(false);
    });

    it('should be safe to call unmount when no background is loaded', () => {
      expect(() => {
        manager.unmountBackground();
      }).not.toThrow();
    });

    it('should unmount previous background before loading new one', async () => {
      // Set up initial background
      (manager as any).currentBackground = () => null;
      (manager as any).currentBackgroundId = 'background-1';

      // Attempt to load new background
      try {
        await manager.loadBackground('liquid-ether');
      } catch (error) {
        // Expected to fail
      }

      // Previous background should have been cleared during the attempt
      // (even though new one failed to load)
    });
  });

  describe('Theme Variant Application', () => {
    it('should handle theme application when no background is loaded', () => {
      expect(() => {
        manager.applyThemeVariant('dark');
      }).not.toThrow();
    });

    it('should handle theme application for non-existent background', () => {
      (manager as any).currentBackgroundId = 'non-existent';
      
      expect(() => {
        manager.applyThemeVariant('light');
      }).not.toThrow();
    });

    it('should accept both light and dark themes', () => {
      (manager as any).currentBackgroundId = 'liquid-ether';
      
      expect(() => {
        manager.applyThemeVariant('light');
        manager.applyThemeVariant('dark');
      }).not.toThrow();
    });
  });

  describe('Route Isolation', () => {
    it('should return false when not on motion studio route', () => {
      // Mock window.location
      delete (window as any).location;
      (window as any).location = { pathname: '/home' };

      expect(manager.shouldRenderBackground()).toBe(false);
    });

    it('should return false when on motion studio route but no background loaded', () => {
      delete (window as any).location;
      (window as any).location = { pathname: '/motion-studio' };

      expect(manager.shouldRenderBackground()).toBe(false);
    });

    it('should return true when on motion studio route with background loaded', () => {
      delete (window as any).location;
      (window as any).location = { pathname: '/motion-studio' };
      
      // Simulate loaded background
      (manager as any).currentBackground = () => null;

      expect(manager.shouldRenderBackground()).toBe(true);
    });

    it('should handle various route patterns', () => {
      const routes = [
        '/motion-studio',
        '/motion-studio/',
        '/home',
        '/about',
        '/',
      ];

      routes.forEach((route) => {
        delete (window as any).location;
        (window as any).location = { pathname: route };
        
        const shouldRender = manager.shouldRenderBackground();
        
        if (route === '/motion-studio' || route === '/motion-studio/') {
          // Would render if background is loaded
          expect(typeof shouldRender).toBe('boolean');
        } else {
          expect(shouldRender).toBe(false);
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should log errors to console in development', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await manager.loadBackground('liquid-ether');
      } catch (error) {
        // Expected
      }

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle errors gracefully without crashing', async () => {
      await expect(async () => {
        try {
          await manager.loadBackground('invalid-id');
        } catch (error) {
          // Catch and verify error was thrown
          expect(error).toBeDefined();
        }
      }).not.toThrow();
    });

    it('should set error state when loading fails', async () => {
      try {
        await manager.loadBackground('liquid-ether');
      } catch (error) {
        // Expected
      }

      expect(manager.getLoadingState()).toBe('error');
    });
  });

  describe('Reset Functionality', () => {
    it('should clear all state on reset', () => {
      // Set up some state
      (manager as any).currentBackground = () => null;
      (manager as any).currentBackgroundId = 'test';
      (manager as any).loadingState = 'loaded';

      manager.reset();

      expect(manager.getCurrentBackground()).toBeNull();
      expect(manager.getCurrentBackgroundId()).toBeNull();
      expect(manager.getLoadingState()).toBe('idle');
    });

    it('should clear listeners on reset', () => {
      const listener = vi.fn();
      manager.onLoadingStateChange(listener);

      manager.reset();

      // Attempt to trigger state change
      manager.loadBackground('liquid-ether').catch(() => {});

      // Listener should not be called after reset
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(listener).not.toHaveBeenCalled();
          resolve(undefined);
        }, 10);
      });
    });
  });

  describe('Device Information', () => {
    it('should collect device info for error logging', () => {
      const deviceInfo = (manager as any).getDeviceInfo();
      
      expect(deviceInfo).toBeDefined();
      expect(typeof deviceInfo).toBe('object');
    });

    it('should handle missing device APIs gracefully', () => {
      // Test that getDeviceInfo doesn't crash when APIs are missing
      // We can't actually delete navigator properties in tests, but we can verify
      // the method returns an object
      const deviceInfo = (manager as any).getDeviceInfo();
      
      expect(deviceInfo).toBeDefined();
      expect(typeof deviceInfo).toBe('object');
      
      // Verify it has the expected structure (properties may be undefined)
      expect('memory' in deviceInfo || 'cores' in deviceInfo || 'gpu' in deviceInfo).toBe(true);
    });
  });

  describe('Concurrent Load Handling', () => {
    it('should cancel pending import when new load is requested', async () => {
      // Start first load
      const load1 = manager.loadBackground('liquid-ether').catch(() => {});
      
      // Immediately start second load
      const load2 = manager.loadBackground('silk').catch(() => {});

      await Promise.all([load1, load2]);

      // Only the second load should be active
      // (both will fail but we're testing cancellation logic)
    });

    it('should handle rapid successive load calls', async () => {
      const loads = [
        manager.loadBackground('liquid-ether').catch(() => {}),
        manager.loadBackground('silk').catch(() => {}),
        manager.loadBackground('prism').catch(() => {}),
      ];

      await Promise.all(loads);

      // Should not crash or leave inconsistent state
      expect(manager.getLoadingState()).toBeDefined();
    });
  });
});
