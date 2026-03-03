/**
 * Type definitions for the Background Library system
 * 
 * This module defines the core data structures for managing animated background effects
 * from reactbits.dev within Motion Studio.
 */

/**
 * Categories for organizing background effects
 */
export type BackgroundCategory = 
  | 'fluid'        // Liquid, flowing animations (e.g., Liquid Ether, Silk)
  | 'geometric'    // Shape-based patterns (e.g., Grid Scan, Beams)
  | 'particle'     // Particle systems (e.g., Particles, Pixel Snow)
  | 'gradient'     // Gradient-based effects (e.g., Gradient Blinds, Grainient)
  | 'atmospheric'; // Ambient, atmospheric effects (e.g., Aurora, Plasma)

/**
 * Performance level indicators for background effects
 */
export type PerformanceLevel = 'light' | 'medium' | 'heavy';

/**
 * Settings schema definition for effect configuration
 */
export interface EffectSettingsSchema {
  [key: string]: {
    type: 'number' | 'range' | 'boolean' | 'string' | 'color' | 'select';
    label: string;
    description?: string;
    defaultValue: any;
    min?: number;
    max?: number;
    step?: number;
    options?: Array<{ label: string; value: any }>;
  };
}

/**
 * Complete metadata for a single background effect
 */
export interface BackgroundMetadata {
  // Identification
  id: string;                           // Unique identifier (kebab-case, e.g., "liquid-ether")
  name: string;                         // Display name (e.g., "Liquid Ether")
  description: string;                  // User-facing description
  
  // Organization
  category: BackgroundCategory;         // Primary category
  tags: string[];                       // Additional search/filter tags
  
  // Assets
  thumbnailUrl: string;                 // Optimized preview image (WebP/AVIF < 20KB)
  documentationUrl?: string;            // Link to reactbits.dev docs
  
  // Performance
  performanceLevel: PerformanceLevel;   // Expected performance impact
  estimatedFPS: number;                 // Expected FPS on mid-range device
  
  // Capabilities
  supportsTheme: boolean;               // Can adapt to light/dark themes
  supportsAnimationControl: boolean;    // Can pause/play animation
  supportsSpeedControl: boolean;        // Can adjust animation speed
  
  // Configuration
  defaultSettings: Record<string, any>; // Default parameter values
  settingsSchema: EffectSettingsSchema; // Parameter definitions
  
  // Loading
  importPath: string;                   // Path for dynamic import
  bundleSize: number;                   // Estimated size in KB
}

/**
 * Curated or user-saved background configuration preset
 */
export interface BackgroundPreset {
  id: string;                           // Unique preset identifier
  name: string;                         // Preset display name
  description: string;                  // Preset description
  backgroundId: string;                 // Reference to background effect
  settings: Record<string, any>;        // Pre-configured parameter values
  thumbnailUrl?: string;                // Optional preset-specific thumbnail
  isBuiltIn: boolean;                   // True for curated, false for user-created
  createdAt: Date;                      // Creation timestamp
}

/**
 * Complete background library data structure
 */
export interface BackgroundLibraryData {
  backgrounds: BackgroundMetadata[];                    // All available backgrounds
  categories: Record<BackgroundCategory, string[]>;     // Backgrounds grouped by category
  presets: BackgroundPreset[];                          // Curated and user presets
}

/**
 * Project-level storage for background selection and configuration
 */
export interface BackgroundPersistenceData {
  backgroundId: string | null;          // Selected background ID (null = "None")
  settings: Record<string, any>;        // Current parameter values
  isPaused: boolean;                    // Animation pause state
  animationSpeed: number;               // Animation speed multiplier
  lastModified: Date;                   // Last modification timestamp
}

/**
 * Real-time performance metrics for active background
 */
export interface BackgroundPerformanceMetrics {
  backgroundId: string;                 // Background being measured
  currentFPS: number;                   // Current frames per second
  averageFPS: number;                   // Average FPS over measurement period
  minFPS: number;                       // Minimum FPS recorded
  maxFPS: number;                       // Maximum FPS recorded
  frameDrops: number;                   // Number of dropped frames
  renderTime: number;                   // Average milliseconds per frame
  memoryUsage?: number;                 // Memory usage in MB (if available)
}

/**
 * Loading state for background manager
 */
export type LoadingState = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * Quality level for adaptive performance
 */
export type QualityLevel = 'low' | 'medium' | 'high';

/**
 * Props for ReactbitsBackground wrapper components
 */
export interface ReactbitsBackgroundProps {
  settings: Record<string, any>;        // Effect-specific settings
  theme: 'light' | 'dark';              // Current theme
  isActive: boolean;                    // Whether background is currently active
  isPaused?: boolean;                   // Animation pause state
  animationSpeed?: number;              // Animation speed multiplier (default: 1.0)
}

/**
 * Result of settings validation
 */
export interface ValidationResult {
  validated: Record<string, any>;       // Validated and sanitized settings
  errors: string[];                     // Validation error messages
}

/**
 * Result of loading persisted background
 */
export interface LoadResult {
  success: boolean;                     // Whether load was successful
  backgroundId?: string;                // Loaded background ID
  settings?: Record<string, any>;       // Loaded settings
  isPaused?: boolean;                   // Loaded pause state
  animationSpeed?: number;              // Loaded animation speed
  fallback?: 'none' | 'previous';       // Fallback strategy on failure
}

/**
 * Error log entry for debugging and monitoring
 */
export interface ErrorLog {
  timestamp: Date;                      // When error occurred
  category: 'loading' | 'render' | 'config' | 'persistence' | 'performance';
  backgroundId: string;                 // Background that caused error
  errorMessage: string;                 // Error message
  errorStack?: string;                  // Stack trace (if available)
  userAgent: string;                    // Browser user agent
  deviceInfo: {                         // Device information
    memory?: number;                    // Available memory in GB
    cores?: number;                     // CPU core count
    gpu?: string;                       // GPU identifier
  };
  context: Record<string, any>;         // Additional context data
}
