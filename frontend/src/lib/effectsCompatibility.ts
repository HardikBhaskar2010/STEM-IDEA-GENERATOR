import { features, getBrowserInfo } from '@/lib/browserCompat';

export interface EffectsCompatibilityReport {
  supported: boolean;
  warnings: string[];
  browser: ReturnType<typeof getBrowserInfo>;
  capabilities: {
    webgl: boolean;
    intersectionObserver: boolean;
    pointerEvents: boolean;
    requestAnimationFrame: boolean;
  };
}

export function getEffectsCompatibilityReport(): EffectsCompatibilityReport {
  const browser = getBrowserInfo();
  const warnings: string[] = [];

  if (!features.requestAnimationFrame) {
    warnings.push('requestAnimationFrame is unavailable. Motion quality will be reduced.');
  }

  if (!features.intersectionObserver) {
    warnings.push('IntersectionObserver is unavailable. Lazy loading fallbacks are active.');
  }

  if (!features.pointerEvents) {
    warnings.push('Pointer Events are unavailable. Cursor effects are limited.');
  }

  if (!features.webGL) {
    warnings.push('WebGL is unavailable. 3D effects are disabled.');
  }

  if (browser.isSafari && Number.parseInt(browser.version, 10) < 16) {
    warnings.push('Older Safari detected. Some blend/filter effects may be simplified.');
  }

  return {
    supported: warnings.length === 0,
    warnings,
    browser,
    capabilities: {
      webgl: features.webGL,
      intersectionObserver: features.intersectionObserver,
      pointerEvents: features.pointerEvents,
      requestAnimationFrame: features.requestAnimationFrame,
    },
  };
}

export function isCursorEffectsSupported(): boolean {
  return features.pointerEvents && features.requestAnimationFrame;
}

export function is3DEffectsSupported(): boolean {
  return features.webGL;
}
