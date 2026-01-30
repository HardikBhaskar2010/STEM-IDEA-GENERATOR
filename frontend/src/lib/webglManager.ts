/**
 * WebGL Context Manager
 * Handles WebGL context creation, loss, and recovery
 * Prevents multiple contexts from being created simultaneously
 */

export interface WebGLContextInfo {
  isSupported: boolean;
  maxContexts: number;
  currentContexts: number;
  vendor: string;
  renderer: string;
  version: string;
}

class WebGLManager {
  private static instance: WebGLManager;
  private activeContexts: Set<WebGLRenderingContext> = new Set();
  private contextInfo: WebGLContextInfo | null = null;
  private maxContexts = 16; // Conservative limit
  private isContextLost = false;

  private constructor() {
    this.detectWebGLSupport();
  }

  static getInstance(): WebGLManager {
    if (!WebGLManager.instance) {
      WebGLManager.instance = new WebGLManager();
    }
    return WebGLManager.instance;
  }

  /**
   * Detect WebGL support and capabilities
   */
  private detectWebGLSupport(): void {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl) {
        this.contextInfo = {
          isSupported: false,
          maxContexts: 0,
          currentContexts: 0,
          vendor: 'Unknown',
          renderer: 'Unknown',
          version: 'Unknown'
        };
        return;
      }

      // Get WebGL info
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
      const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      const version = gl.getParameter(gl.VERSION);

      // Detect max contexts (conservative approach)
      const maxTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
      this.maxContexts = Math.min(16, Math.floor(maxTextureUnits / 4));

      this.contextInfo = {
        isSupported: true,
        maxContexts: this.maxContexts,
        currentContexts: this.activeContexts.size,
        vendor: vendor || 'Unknown',
        renderer: renderer || 'Unknown',
        version: version || 'Unknown'
      };

      console.log('🎮 WebGL Manager initialized:', this.contextInfo);

      // Clean up test context
      const loseContext = gl.getExtension('WEBGL_lose_context');
      if (loseContext) {
        loseContext.loseContext();
      }
    } catch (error) {
      console.error('WebGL detection failed:', error);
      this.contextInfo = {
        isSupported: false,
        maxContexts: 0,
        currentContexts: 0,
        vendor: 'Error',
        renderer: 'Error',
        version: 'Error'
      };
    }
  }

  /**
   * Check if WebGL is supported
   */
  isWebGLSupported(): boolean {
    return this.contextInfo?.isSupported || false;
  }

  /**
   * Check if we can create a new context
   */
  canCreateContext(): boolean {
    if (!this.isWebGLSupported() || this.isContextLost) {
      return false;
    }
    return this.activeContexts.size < this.maxContexts;
  }

  /**
   * Register a new WebGL context
   */
  registerContext(gl: WebGLRenderingContext): void {
    if (this.activeContexts.size >= this.maxContexts) {
      console.warn('⚠️ WebGL context limit reached, forcing cleanup');
      this.cleanupOldestContext();
    }

    this.activeContexts.add(gl);
    console.log(`🎮 WebGL context registered (${this.activeContexts.size}/${this.maxContexts})`);

    // Add context lost listener
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.addEventListener('webglcontextlost', this.handleContextLost.bind(this), false);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored.bind(this), false);
  }

  /**
   * Unregister a WebGL context
   */
  unregisterContext(gl: WebGLRenderingContext): void {
    this.activeContexts.delete(gl);
    console.log(`🎮 WebGL context unregistered (${this.activeContexts.size}/${this.maxContexts})`);
  }

  /**
   * Handle WebGL context lost
   */
  private handleContextLost(event: Event): void {
    event.preventDefault();
    this.isContextLost = true;
    console.error('🚨 WebGL context lost - attempting recovery');
    
    // Clear all active contexts
    this.activeContexts.clear();
    
    // Attempt recovery after a delay
    setTimeout(() => {
      this.attemptContextRecovery();
    }, 1000);
  }

  /**
   * Handle WebGL context restored
   */
  private handleContextRestored(event: Event): void {
    this.isContextLost = false;
    console.log('✅ WebGL context restored');
  }

  /**
   * Attempt to recover WebGL context
   */
  private attemptContextRecovery(): void {
    try {
      // Re-detect WebGL support
      this.detectWebGLSupport();
      
      if (this.isWebGLSupported()) {
        this.isContextLost = false;
        console.log('✅ WebGL context recovery successful');
        
        // Notify components to reinitialize
        window.dispatchEvent(new CustomEvent('webgl-recovered'));
      } else {
        console.error('❌ WebGL context recovery failed');
      }
    } catch (error) {
      console.error('❌ WebGL recovery error:', error);
    }
  }

  /**
   * Force cleanup of oldest context
   */
  private cleanupOldestContext(): void {
    const oldestContext = this.activeContexts.values().next().value;
    if (oldestContext) {
      const loseContext = oldestContext.getExtension('WEBGL_lose_context');
      if (loseContext) {
        loseContext.loseContext();
      }
      this.activeContexts.delete(oldestContext);
    }
  }

  /**
   * Get WebGL context information
   */
  getContextInfo(): WebGLContextInfo | null {
    if (this.contextInfo) {
      return {
        ...this.contextInfo,
        currentContexts: this.activeContexts.size
      };
    }
    return null;
  }

  /**
   * Force cleanup all contexts
   */
  cleanup(): void {
    console.log('🧹 Cleaning up all WebGL contexts');
    
    for (const gl of this.activeContexts) {
      try {
        const loseContext = gl.getExtension('WEBGL_lose_context');
        if (loseContext) {
          loseContext.loseContext();
        }
      } catch (error) {
        console.warn('Error cleaning up WebGL context:', error);
      }
    }
    
    this.activeContexts.clear();
  }

  /**
   * Get recommended settings based on current state
   */
  getRecommendedSettings(): {
    enableWebGL: boolean;
    maxParticles: number;
    enableShadows: boolean;
    enablePostProcessing: boolean;
    pixelRatio: number;
  } {
    const info = this.getContextInfo();
    
    if (!info?.isSupported || this.isContextLost) {
      return {
        enableWebGL: false,
        maxParticles: 0,
        enableShadows: false,
        enablePostProcessing: false,
        pixelRatio: 1
      };
    }

    // Conservative settings to prevent context loss
    const contextUtilization = info.currentContexts / info.maxContexts;
    
    return {
      enableWebGL: true,
      maxParticles: contextUtilization > 0.8 ? 100 : contextUtilization > 0.5 ? 500 : 1000,
      enableShadows: contextUtilization < 0.5,
      enablePostProcessing: contextUtilization < 0.3,
      pixelRatio: contextUtilization > 0.7 ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    };
  }
}

// Export singleton instance
export const webglManager = WebGLManager.getInstance();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    webglManager.cleanup();
  });
}