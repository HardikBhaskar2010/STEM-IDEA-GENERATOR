/**
 * Browser Compatibility Utilities
 * Phase 9: Performance & Accessibility
 * 
 * Detects browser features and provides fallbacks
 */

export interface BrowserInfo {
  name: string;
  version: string;
  isChrome: boolean;
  isFirefox: boolean;
  isSafari: boolean;
  isEdge: boolean;
  isIE: boolean;
  isMobile: boolean;
}

/**
 * Detect browser information
 */
export function getBrowserInfo(): BrowserInfo {
  if (typeof window === 'undefined') {
    return {
      name: 'unknown',
      version: '0',
      isChrome: false,
      isFirefox: false,
      isSafari: false,
      isEdge: false,
      isIE: false,
      isMobile: false,
    };
  }
  
  const ua = navigator.userAgent;
  const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(ua);
  
  // Chrome
  const isChrome = /Chrome/.test(ua) && /Google Inc/.test(navigator.vendor);
  const chromeMatch = ua.match(/Chrome\/(\d+)/);
  
  // Firefox
  const isFirefox = /Firefox/.test(ua);
  const firefoxMatch = ua.match(/Firefox\/(\d+)/);
  
  // Safari
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
  const safariMatch = ua.match(/Version\/(\d+)/);
  
  // Edge
  const isEdge = /Edg/.test(ua);
  const edgeMatch = ua.match(/Edg\/(\d+)/);
  
  // IE
  const isIE = /Trident/.test(ua) || /MSIE/.test(ua);
  
  let name = 'unknown';
  let version = '0';
  
  if (isChrome) {
    name = 'chrome';
    version = chromeMatch ? chromeMatch[1] : '0';
  } else if (isFirefox) {
    name = 'firefox';
    version = firefoxMatch ? firefoxMatch[1] : '0';
  } else if (isSafari) {
    name = 'safari';
    version = safariMatch ? safariMatch[1] : '0';
  } else if (isEdge) {
    name = 'edge';
    version = edgeMatch ? edgeMatch[1] : '0';
  } else if (isIE) {
    name = 'ie';
    version = '11';
  }
  
  return {
    name,
    version,
    isChrome,
    isFirefox,
    isSafari,
    isEdge,
    isIE,
    isMobile,
  };
}

/**
 * Feature detection utilities
 */
export const features = {
  intersectionObserver: typeof window !== 'undefined' && 'IntersectionObserver' in window,
  resizeObserver: typeof window !== 'undefined' && 'ResizeObserver' in window,
  mutationObserver: typeof window !== 'undefined' && 'MutationObserver' in window,
  requestAnimationFrame: typeof window !== 'undefined' && 'requestAnimationFrame' in window,
  requestIdleCallback: typeof window !== 'undefined' && 'requestIdleCallback' in window,
  webGL: (() => {
    if (typeof window === 'undefined') {return false;}
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  })(),
  webGL2: (() => {
    if (typeof window === 'undefined') {return false;}
    try {
      const canvas = document.createElement('canvas');
      return !!canvas.getContext('webgl2');
    } catch (e) {
      return false;
    }
  })(),
  webWorkers: typeof window !== 'undefined' && 'Worker' in window,
  serviceWorkers: typeof window !== 'undefined' && 'serviceWorker' in navigator,
  webAssembly: typeof window !== 'undefined' && 'WebAssembly' in window,
  localStorage: (() => {
    if (typeof window === 'undefined') {return false;}
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      return true;
    } catch (e) {
      return false;
    }
  })(),
  sessionStorage: (() => {
    if (typeof window === 'undefined') {return false;}
    try {
      sessionStorage.setItem('test', 'test');
      sessionStorage.removeItem('test');
      return true;
    } catch (e) {
      return false;
    }
  })(),
  touchEvents: typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0),
  pointerEvents: typeof window !== 'undefined' && 'PointerEvent' in window,
};

/**
 * Check if CSS property is supported
 */
export function supportsCSSProperty(property: string, value?: string): boolean {
  if (typeof window === 'undefined') {return false;}
  
  const element = document.createElement('div');
  const style = element.style as any;
  
  if (value) {
    style[property] = value;
    return style[property] === value;
  }
  
  return property in style;
}

/**
 * Get CSS vendor prefix
 */
export function getVendorPrefix(): string {
  if (typeof window === 'undefined') {return '';}
  
  const styles = window.getComputedStyle(document.documentElement, '');
  const pre = (Array.prototype.slice
    .call(styles)
    .join('')
    .match(/-(moz|webkit|ms)-/) || (styles as any).OLink === '' && ['', 'o'])[1];
  
  return pre ? `-${pre}-` : '';
}

/**
 * Polyfill requestAnimationFrame
 */
export function polyfillRAF(): void {
  if (typeof window === 'undefined') {return;}
  
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      return window.setTimeout(() => callback(Date.now()), 1000 / 60);
    };
  }
  
  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = (id: number) => {
      clearTimeout(id);
    };
  }
}

/**
 * Check if browser needs specific workarounds
 */
export function needsWorkaround(feature: string): boolean {
  const browser = getBrowserInfo();
  
  // Safari-specific workarounds
  if (browser.isSafari) {
    if (feature === 'willChange') {
      // Safari has issues with will-change in some cases
      return parseInt(browser.version) < 15;
    }
  }
  
  // Firefox-specific workarounds
  if (browser.isFirefox) {
    if (feature === 'backdropFilter') {
      return parseInt(browser.version) < 103;
    }
  }
  
  return false;
}

/**
 * Create fallback for unsupported features
 */
export function createFallback<T>(feature: string, supported: T, fallback: T): T {
  const hasFeature = (features as any)[feature];
  return hasFeature ? supported : fallback;
}

/**
 * Log browser compatibility info (for debugging)
 */
export function logCompatibility(): void {
  if (typeof console === 'undefined') {return;}
  
  const browser = getBrowserInfo();
  console.group('🌐 Browser Compatibility');
  console.log('Browser:', browser.name, browser.version);
  console.log('Mobile:', browser.isMobile);
  console.log('Features:', features);
  console.groupEnd();
}
