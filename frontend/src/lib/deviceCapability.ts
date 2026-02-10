/**
 * Device Capability Detection System
 * Auto-detects device performance and GPU capabilities
 * Returns appropriate 3D rendering level
 */

export type DeviceCapability = 'high' | 'medium' | 'low' | 'minimal';

interface CapabilityMetrics {
  hardwareConcurrency: number;
  deviceMemory?: number;
  connection?: {
    effectiveType: string;
    saveData: boolean;
  };
  gpu?: {
    vendor: string;
    renderer: string;
  };
  isMobile: boolean;
  touchPoints: number;
  screenSize: { width: number; height: number };
}

export class DeviceCapabilityDetector {
  private static instance: DeviceCapabilityDetector;
  private capability: DeviceCapability | null = null;
  private metrics: CapabilityMetrics | null = null;

  private constructor() {}

  static getInstance(): DeviceCapabilityDetector {
    if (!DeviceCapabilityDetector.instance) {
      DeviceCapabilityDetector.instance = new DeviceCapabilityDetector();
    }
    return DeviceCapabilityDetector.instance;
  }

  /**
   * Detect device capability level
   */
  async detect(): Promise<DeviceCapability> {
    if (this.capability) {
      return this.capability;
    }

    this.metrics = await this.collectMetrics();
    this.capability = this.calculateCapability(this.metrics);
    
    console.log('🎮 Device Capability Detected:', this.capability, this.metrics);
    return this.capability;
  }

  /**
   * Collect device metrics
   */
  private async collectMetrics(): Promise<CapabilityMetrics> {
    const metrics: CapabilityMetrics = {
      hardwareConcurrency: navigator.hardwareConcurrency || 2,
      isMobile: this.detectMobile(),
      touchPoints: navigator.maxTouchPoints || 0,
      screenSize: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };

    // Device Memory API (Chrome)
    if ('deviceMemory' in navigator) {
      metrics.deviceMemory = (navigator as any).deviceMemory;
    }

    // Network Information API
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      metrics.connection = {
        effectiveType: connection.effectiveType || 'unknown',
        saveData: connection.saveData || false
      };
    }

    // WebGL GPU Info
    try {
      const canvas = document.createElement('canvas');
      const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
      if (gl) {
        const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          metrics.gpu = {
            vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
            renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
          };
        }
      }
    } catch (e) {
      console.warn('Could not detect GPU info:', e);
    }

    return metrics;
  }

  /**
   * Calculate capability level based on metrics
   */
  private calculateCapability(metrics: CapabilityMetrics): DeviceCapability {
    let score = 0;
    const weights = {
      cpu: 30,
      memory: 25,
      gpu: 25,
      screen: 10,
      network: 5,
      mobile: 5
    };

    // CPU Score (0-30)
    if (metrics.hardwareConcurrency >= 8) score += weights.cpu;
    else if (metrics.hardwareConcurrency >= 4) score += weights.cpu * 0.7;
    else if (metrics.hardwareConcurrency >= 2) score += weights.cpu * 0.4;
    else score += weights.cpu * 0.2;

    // Memory Score (0-25)
    if (metrics.deviceMemory) {
      if (metrics.deviceMemory >= 8) score += weights.memory;
      else if (metrics.deviceMemory >= 4) score += weights.memory * 0.7;
      else if (metrics.deviceMemory >= 2) score += weights.memory * 0.4;
      else score += weights.memory * 0.2;
    } else {
      score += weights.memory * 0.5; // Default if unavailable
    }

    // GPU Score (0-25)
    if (metrics.gpu) {
      const renderer = metrics.gpu.renderer.toLowerCase();
      if (
        renderer.includes('nvidia') ||
        renderer.includes('amd') ||
        renderer.includes('radeon') ||
        renderer.includes('geforce')
      ) {
        score += weights.gpu;
      } else if (renderer.includes('intel')) {
        score += weights.gpu * 0.6;
      } else {
        score += weights.gpu * 0.4;
      }
    } else {
      score += weights.gpu * 0.5;
    }

    // Screen Score (0-10)
    const screenArea = metrics.screenSize.width * metrics.screenSize.height;
    if (screenArea >= 2073600) score += weights.screen; // >= 1920x1080
    else if (screenArea >= 921600) score += weights.screen * 0.7; // >= 1280x720
    else if (screenArea >= 480000) score += weights.screen * 0.4; // >= 800x600
    else score += weights.screen * 0.2;

    // Network Score (0-5)
    if (metrics.connection) {
      if (metrics.connection.saveData) {
        score -= 10; // Penalty for data saver mode
      }
      if (metrics.connection.effectiveType === '4g') score += weights.network;
      else if (metrics.connection.effectiveType === '3g') score += weights.network * 0.5;
      else score += weights.network * 0.3;
    } else {
      score += weights.network * 0.5;
    }

    // Mobile penalty (0-5)
    if (!metrics.isMobile) {
      score += weights.mobile;
    } else {
      score -= 5; // Mobile devices get penalty for 3D
    }

    // Determine capability level
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    if (score >= 40) return 'low';
    return 'minimal';
  }

  /**
   * Detect if device is mobile
   */
  private detectMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth < 768;
  }

  /**
   * Get current capability (cached)
   */
  getCapability(): DeviceCapability | null {
    return this.capability;
  }

  /**
   * Get metrics
   */
  getMetrics(): CapabilityMetrics | null {
    return this.metrics;
  }

  /**
   * Check if capability is at least a certain level
   */
  isAtLeast(level: DeviceCapability): boolean {
    if (!this.capability) return false;
    
    const levels: DeviceCapability[] = ['minimal', 'low', 'medium', 'high'];
    const currentIndex = levels.indexOf(this.capability);
    const requiredIndex = levels.indexOf(level);
    
    return currentIndex >= requiredIndex;
  }

  /**
   * Get recommended particle count based on capability
   */
  getParticleCount(): number {
    switch (this.capability) {
      case 'high': return 2000;
      case 'medium': return 1000;
      case 'low': return 500;
      case 'minimal': return 100;
      default: return 500;
    }
  }

  /**
   * Get recommended animation complexity
   */
  getAnimationComplexity(): 'full' | 'reduced' | 'minimal' {
    switch (this.capability) {
      case 'high': return 'full';
      case 'medium': return 'reduced';
      case 'low': return 'minimal';
      case 'minimal': return 'minimal';
      default: return 'reduced';
    }
  }

  /**
   * Should enable post-processing effects
   */
  shouldEnablePostProcessing(): boolean {
    return this.capability === 'high';
  }

  /**
   * Should enable shadows
   */
  shouldEnableShadows(): boolean {
    return this.capability === 'high' || this.capability === 'medium';
  }

  /**
   * Get pixel ratio (for retina displays)
   */
  getPixelRatio(): number {
    const dpr = window.devicePixelRatio || 1;
    
    switch (this.capability) {
      case 'high': return Math.min(dpr, 2);
      case 'medium': return Math.min(dpr, 1.5);
      case 'low': return 1;
      case 'minimal': return 1;
      default: return 1;
    }
  }
}

// Export singleton instance
export const deviceCapability = DeviceCapabilityDetector.getInstance();
