/**
 * Background Library Module
 * 
 * This module provides the data layer for managing animated background effects
 * from reactbits.dev within Motion Studio.
 * 
 * @module backgrounds
 */

// Export all types
export type {
  BackgroundCategory,
  BackgroundMetadata,
  BackgroundLibraryData,
  BackgroundPreset,
  BackgroundPersistenceData,
  BackgroundPerformanceMetrics,
  EffectSettingsSchema,
  LoadingState,
  QualityLevel,
  ReactbitsBackgroundProps,
  ValidationResult,
  LoadResult,
  ErrorLog,
  PerformanceLevel,
} from './types';

// Export BackgroundLibrary class
export { BackgroundLibrary } from './BackgroundLibrary';
export { default } from './BackgroundLibrary';

// Export BackgroundManager class
export { BackgroundManager } from './BackgroundManager';
export { default as backgroundManager } from './BackgroundManager';

// Export wrapper utilities and error boundary
export { BackgroundErrorBoundary } from './BackgroundErrorBoundary';
export {
  withReactbitsWrapper,
  ReactbitsBackgroundBase,
  applyThemeAdaptation,
} from './ReactbitsBackgroundWrapper';
