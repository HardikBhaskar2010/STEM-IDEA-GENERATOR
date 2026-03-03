/**
 * BackgroundManager Service
 * 
 * Handles background lifecycle, loading, and coordination.
 * Manages dynamic imports, loading states, and ensures only one background is mounted at a time.
 */

import type { BackgroundMetadata, LoadingState } from './types';
import { BackgroundLibrary } from './BackgroundLibrary';
import type React from 'react';

/**
 * BackgroundManager class
 * Singleton service for managing background effects
 */
export class BackgroundManager {
  private static instance: BackgroundManager | null = null;
  
  private currentBackground: React.ComponentType<any> | null = null;
  private currentBackgroundId: string | null = null;
  private loadingState: LoadingState = 'idle';
  private previousBackgroundId: string | null = null;
  private pendingImport: Promise<any> | null = null;
  private listeners: Set<(state: LoadingState) => void> = new Set();

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): BackgroundManager {
    if (!BackgroundManager.instance) {
      BackgroundManager.instance = new BackgroundManager();
    }
    return BackgroundManager.instance;
  }

  /**
   * Load a background by ID
   * Unmounts previous background before mounting new one
   * 
   * @param id - Background identifier
   * @returns Promise that resolves when background is loaded
   */
  async loadBackground(id: string): Promise<void> {
    // Cancel any pending imports
    if (this.pendingImport) {
      this.pendingImport = null;
    }

    // Set loading state
    this.setLoadingState('loading');

    try {
      // Get background metadata
      const metadata = BackgroundLibrary.getById(id);
      
      if (!metadata) {
        throw new Error(`Background ${id} not found in library`);
      }

      // Store previous background for potential revert
      this.previousBackgroundId = this.currentBackgroundId;

      // Dynamic import with error handling
      const importPromise = this.dynamicImport(metadata);
      this.pendingImport = importPromise;
      
      const module = await importPromise;

      // Check if this import was cancelled
      if (this.pendingImport !== importPromise) {
        return;
      }

      // Unmount previous background
      this.unmountBackground();

      // Mount new background
      this.currentBackground = module.default || module;
      this.currentBackgroundId = id;
      this.setLoadingState('loaded');

    } catch (error) {
      console.error(`Failed to load background ${id}:`, error);
      this.handleError(error as Error, id);
      this.setLoadingState('error');
      throw error;
    } finally {
      this.pendingImport = null;
    }
  }

  /**
   * Dynamic import with path resolution
   * @param metadata - Background metadata
   * @returns Promise resolving to the imported module
   */
  private async dynamicImport(metadata: BackgroundMetadata): Promise<any> {
    // The importPath in metadata is like '@/components/backgrounds/LiquidEther'
    // We need to handle this dynamically
    const path = metadata.importPath.replace('@/', '../');
    
    try {
      // Use dynamic import with variable
      return await import(/* @vite-ignore */ path);
    } catch (error) {
      console.error(`Failed to import from ${path}:`, error);
      throw new Error(`Failed to load background component: ${metadata.name}`);
    }
  }

  /**
   * Unmount the current background
   * Cleans up resources and resets state
   */
  unmountBackground(): void {
    if (this.currentBackground) {
      // Clear current background
      this.currentBackground = null;
      this.currentBackgroundId = null;
    }
  }

  /**
   * Apply theme variant to current background
   * @param theme - Theme to apply ('light' or 'dark')
   */
  applyThemeVariant(theme: 'light' | 'dark'): void {
    // Theme application is handled by the BackgroundLayer component
    // This method is here for API completeness and future enhancements
    
    if (!this.currentBackgroundId) {
      return;
    }

    const metadata = BackgroundLibrary.getById(this.currentBackgroundId);
    
    if (!metadata) {
      return;
    }

    // Log theme application for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `Applying ${theme} theme to ${metadata.name}`,
        metadata.supportsTheme ? '(native support)' : '(fallback adaptation)'
      );
    }
  }

  /**
   * Get current loading state
   * @returns Current loading state
   */
  getLoadingState(): LoadingState {
    return this.loadingState;
  }

  /**
   * Get current background component
   * @returns Current background component or null
   */
  getCurrentBackground(): React.ComponentType<any> | null {
    return this.currentBackground;
  }

  /**
   * Get current background ID
   * @returns Current background ID or null
   */
  getCurrentBackgroundId(): string | null {
    return this.currentBackgroundId;
  }

  /**
   * Check if a background is currently loaded
   * @returns True if a background is loaded
   */
  hasBackground(): boolean {
    return this.currentBackground !== null;
  }

  /**
   * Handle loading errors
   * @param error - Error that occurred
   * @param backgroundId - ID of background that failed to load
   */
  private handleError(error: Error, backgroundId: string): void {
    console.error(`Background loading error for ${backgroundId}:`, error);

    // Log error details
    this.logError({
      category: 'loading',
      backgroundId,
      errorMessage: error.message,
      errorStack: error.stack,
    });

    // Attempt to revert to previous background if available
    if (this.previousBackgroundId && this.previousBackgroundId !== backgroundId) {
      console.log(`Attempting to revert to previous background: ${this.previousBackgroundId}`);
      // Note: Actual revert would be handled by the UI layer
    }
  }

  /**
   * Log error for debugging and monitoring
   * @param details - Error details
   */
  private logError(details: {
    category: 'loading' | 'render' | 'config' | 'persistence' | 'performance';
    backgroundId: string;
    errorMessage: string;
    errorStack?: string;
  }): void {
    const errorLog = {
      timestamp: new Date(),
      category: details.category,
      backgroundId: details.backgroundId,
      errorMessage: details.errorMessage,
      errorStack: details.errorStack,
      userAgent: navigator.userAgent,
      deviceInfo: this.getDeviceInfo(),
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Background Error:', errorLog);
    }

    // In production, this would send to error tracking service
    // errorTrackingService.log(errorLog);
  }

  /**
   * Get device information for error logging
   * @returns Device information object
   */
  private getDeviceInfo(): {
    memory?: number;
    cores?: number;
    gpu?: string;
  } {
    const deviceInfo: {
      memory?: number;
      cores?: number;
      gpu?: string;
    } = {};

    // Get memory if available
    if ('deviceMemory' in navigator) {
      deviceInfo.memory = (navigator as any).deviceMemory;
    }

    // Get CPU cores if available
    if ('hardwareConcurrency' in navigator) {
      deviceInfo.cores = navigator.hardwareConcurrency;
    }

    // GPU info would require WebGL context, skipping for now
    
    return deviceInfo;
  }

  /**
   * Set loading state and notify listeners
   * @param state - New loading state
   */
  private setLoadingState(state: LoadingState): void {
    this.loadingState = state;
    this.notifyListeners(state);
  }

  /**
   * Subscribe to loading state changes
   * @param listener - Callback function
   * @returns Unsubscribe function
   */
  onLoadingStateChange(listener: (state: LoadingState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state change
   * @param state - New loading state
   */
  private notifyListeners(state: LoadingState): void {
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (error) {
        console.error('Error in loading state listener:', error);
      }
    });
  }

  /**
   * Check if background should render based on current route
   * Only renders in Motion Studio routes
   * @returns True if background should render
   */
  shouldRenderBackground(): boolean {
    // Check if we're on a Motion Studio route
    const isMotionStudioRoute = window.location.pathname === '/motion-studio';
    
    // Only render if we have a background and we're on the right route
    return isMotionStudioRoute && this.currentBackground !== null;
  }

  /**
   * Reset manager state
   * Useful for testing and cleanup
   */
  reset(): void {
    this.unmountBackground();
    this.loadingState = 'idle';
    this.previousBackgroundId = null;
    this.pendingImport = null;
    this.listeners.clear();
  }
}

// Export singleton instance
export default BackgroundManager.getInstance();
