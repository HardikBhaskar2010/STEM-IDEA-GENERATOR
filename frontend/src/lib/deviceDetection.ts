/**
 * Device Detection Utilities
 * Phase 9: Performance & Accessibility
 * 
 * Detects device capabilities for optimization
 */

export interface DeviceCapabilities {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  deviceMemory: number;
  hardwareConcurrency: number;
  connectionType: string;
  effectiveConnectionType: string;
  isLowEndDevice: boolean;
  supportsWebGL: boolean;
  supportsWebGL2: boolean;
  pixelRatio: number;
  screenSize: { width: number; height: number };
  orientation: 'portrait' | 'landscape';
}

/**
 * Detect if device is mobile
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') {return false;}
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Detect if device is tablet
 */
export function isTablet(): boolean {
  if (typeof window === 'undefined') {return false;}
  
  const userAgent = navigator.userAgent.toLowerCase();
  const isTabletUA = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(userAgent);
  
  return isTabletUA;
}

/**
 * Detect if device has touch support
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') {return false;}
  
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
}

/**
 * Get device memory in GB
 */
export function getDeviceMemory(): number {
  if (typeof window === 'undefined') {return 4;}
  
  return (navigator as any).deviceMemory || 4;
}

/**
 * Get hardware concurrency (CPU cores)
 */
export function getHardwareConcurrency(): number {
  if (typeof window === 'undefined') {return 4;}
  
  return navigator.hardwareConcurrency || 4;
}

/**
 * Get network connection info
 */
export function getConnectionInfo(): { type: string; effectiveType: string; downlink?: number } {
  if (typeof window === 'undefined') {return { type: '4g', effectiveType: '4g' };}
  
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  if (!connection) {
    return { type: '4g', effectiveType: '4g' };
  }
  
  return {
    type: connection.type || 'unknown',
    effectiveType: connection.effectiveType || '4g',
    downlink: connection.downlink,
  };
}

/**
 * Detect if device is low-end
 */
export function isLowEndDevice(): boolean {
  const memory = getDeviceMemory();
  const cores = getHardwareConcurrency();
  const connection = getConnectionInfo();
  const mobile = isMobile();
  
  // Low-end criteria
  return (
    memory <= 2 ||
    cores <= 2 ||
    connection.effectiveType === '2g' ||
    connection.effectiveType === 'slow-2g' ||
    (mobile && cores <= 4)
  );
}

/**
 * Check WebGL support
 */
export function supportsWebGL(): boolean {
  if (typeof window === 'undefined') {return false;}
  
  try {
    const canvas = document.createElement('canvas');
    return !!(
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    );
  } catch (e) {
    return false;
  }
}

/**
 * Check WebGL2 support
 */
export function supportsWebGL2(): boolean {
  if (typeof window === 'undefined') {return false;}
  
  try {
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('webgl2');
  } catch (e) {
    return false;
  }
}

/**
 * Get pixel ratio
 */
export function getPixelRatio(): number {
  if (typeof window === 'undefined') {return 1;}
  
  return window.devicePixelRatio || 1;
}

/**
 * Get screen size
 */
export function getScreenSize(): { width: number; height: number } {
  if (typeof window === 'undefined') {return { width: 1920, height: 1080 };}
  
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

/**
 * Get screen orientation
 */
export function getOrientation(): 'portrait' | 'landscape' {
  if (typeof window === 'undefined') {return 'landscape';}
  
  return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
}

/**
 * Get comprehensive device capabilities
 */
export function getDeviceCapabilities(): DeviceCapabilities {
  const mobile = isMobile();
  const tablet = isTablet();
  const connection = getConnectionInfo();
  
  return {
    isMobile: mobile,
    isTablet: tablet,
    isDesktop: !mobile && !tablet,
    isTouchDevice: isTouchDevice(),
    deviceMemory: getDeviceMemory(),
    hardwareConcurrency: getHardwareConcurrency(),
    connectionType: connection.type,
    effectiveConnectionType: connection.effectiveType,
    isLowEndDevice: isLowEndDevice(),
    supportsWebGL: supportsWebGL(),
    supportsWebGL2: supportsWebGL2(),
    pixelRatio: getPixelRatio(),
    screenSize: getScreenSize(),
    orientation: getOrientation(),
  };
}

/**
 * Battery status monitoring
 */
export async function getBatteryStatus(): Promise<{
  level: number;
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
} | null> {
  if (typeof navigator === 'undefined' || !(navigator as any).getBattery) {
    return null;
  }
  
  try {
    const battery = await (navigator as any).getBattery();
    return {
      level: battery.level,
      charging: battery.charging,
      chargingTime: battery.chargingTime,
      dischargingTime: battery.dischargingTime,
    };
  } catch (e) {
    return null;
  }
}

/**
 * Check if device is in low power mode
 */
export async function isLowPowerMode(): Promise<boolean> {
  const battery = await getBatteryStatus();
  if (!battery) {return false;}
  
  // Consider low power if battery is low and not charging
  return battery.level < 0.2 && !battery.charging;
}
