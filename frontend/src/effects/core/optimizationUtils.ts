import type { CSSProperties } from 'react';

export interface EffectOptimizationFlags {
  isMobile: boolean;
  isLowEndDevice: boolean;
  reducedMotion: boolean;
}

export const PHASE9_GPU_BASE_STYLE: CSSProperties = {
  transform: 'translate3d(0, 0, 0)',
  backfaceVisibility: 'hidden',
  willChange: 'transform, opacity',
};

export function getAnimationFactor(flags: EffectOptimizationFlags): number {
  if (flags.reducedMotion) return 0;
  if (flags.isLowEndDevice) return 0.55;
  if (flags.isMobile) return 0.75;
  return 1;
}

export function getAdaptiveCount(
  baseCount: number,
  flags: EffectOptimizationFlags,
  options?: {
    mobileRatio?: number;
    lowEndRatio?: number;
    min?: number;
  }
): number {
  const mobileRatio = options?.mobileRatio ?? 0.65;
  const lowEndRatio = options?.lowEndRatio ?? 0.4;
  const min = options?.min ?? 1;

  if (flags.reducedMotion) return min;
  if (flags.isLowEndDevice) return Math.max(min, Math.round(baseCount * lowEndRatio));
  if (flags.isMobile) return Math.max(min, Math.round(baseCount * mobileRatio));
  return baseCount;
}

export function getAdaptiveDuration(baseSeconds: number, flags: EffectOptimizationFlags): number {
  if (flags.reducedMotion) return 0.01;
  if (flags.isLowEndDevice) return Math.max(0.12, baseSeconds * 0.7);
  if (flags.isMobile) return Math.max(0.12, baseSeconds * 0.85);
  return baseSeconds;
}

export function shouldDisableHeavyEffects(flags: EffectOptimizationFlags): boolean {
  return flags.reducedMotion || flags.isLowEndDevice;
}
