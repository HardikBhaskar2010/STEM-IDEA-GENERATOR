import { useState, useEffect } from 'react';

interface ColorInfo {
  rgb: { r: number; g: number; b: number };
  hex: string;
  luminosity: number;
  isDark: boolean;
}

/**
 * Calculates relative luminosity of a color based on WCAG formula
 * Returns a value between 0 (darkest) and 1 (lightest)
 */
function calculateLuminosity(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Converts RGB to hexadecimal color string
 */
function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Parses CSS color value to RGB
 */
function parseColor(color: string): { r: number; g: number; b: number } | null {
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) {return null;}

  ctx.fillStyle = color;
  const computed = ctx.fillStyle;

  // Handle rgb/rgba format
  if (computed.startsWith('#')) {
    const hex = computed.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return { r, g, b };
  }

  return null;
}

/**
 * Hook to detect background color and calculate luminosity
 * Watches for changes to the background color of the document or specified element
 */
export function useBackgroundColor(selector: string = 'body'): ColorInfo {
  const [colorInfo, setColorInfo] = useState<ColorInfo>({
    rgb: { r: 255, g: 255, b: 255 },
    hex: '#ffffff',
    luminosity: 1,
    isDark: false,
  });

  useEffect(() => {
    const updateBackgroundColor = () => {
      const element = document.querySelector(selector);
      if (!element) {return;}

      const computedStyle = window.getComputedStyle(element);
      let bgColor = computedStyle.backgroundColor;

      // Traverse up the DOM if background is transparent
      let parent = element.parentElement;
      let depth = 0;
      while (bgColor === 'rgba(0, 0, 0, 0)' && parent && depth < 10) {
        bgColor = window.getComputedStyle(parent).backgroundColor;
        parent = parent.parentElement;
        depth++;
      }

      // Default to white if still transparent
      if (bgColor === 'rgba(0, 0, 0, 0)') {
        bgColor = 'rgb(255, 255, 255)';
      }

      const parsed = parseColor(bgColor);
      if (!parsed) {return;}

      const luminosity = calculateLuminosity(parsed.r, parsed.g, parsed.b);
      const isDark = luminosity < 0.5;
      const hex = rgbToHex(parsed.r, parsed.g, parsed.b);

      setColorInfo({
        rgb: parsed,
        hex,
        luminosity,
        isDark,
      });
    };

    updateBackgroundColor();

    // Watch for changes
    const observer = new MutationObserver(updateBackgroundColor);
    const element = document.querySelector(selector);
    if (element) {
      observer.observe(element, { attributes: true, attributeFilter: ['style', 'class'] });
    }

    // Also watch window resize in case responsive styles change
    window.addEventListener('resize', updateBackgroundColor);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateBackgroundColor);
    };
  }, [selector]);

  return colorInfo;
}
