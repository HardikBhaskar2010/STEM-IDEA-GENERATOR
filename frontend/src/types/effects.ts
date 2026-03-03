/**
 * Effects Engine - Core Type Definitions
 * 
 * This file contains all TypeScript interfaces and types for the
 * unified Effects Engine system.
 */

// ============================================================================
// PERFORMANCE MODES
// ============================================================================

export type PerformanceMode = 'low' | 'medium' | 'high';

export interface PerformanceConstraints {
  maxParticles: number;
  enableGlow: boolean;
  enable3D: boolean;
  enableComplexAnimations: boolean;
  targetFPS: number;
}

// ============================================================================
// EFFECT TYPES
// ============================================================================

export type EffectType = 'text' | 'cursor' | 'background' | 'ui';
export type EffectLibrary = 'reactbits' | 'framer' | 'anime' | 'css' | 'r3f' | 'custom';

// ============================================================================
// BASE EFFECT INTERFACE
// ============================================================================

export interface EffectBase {
  id: string;
  name: string;
  type: EffectType;
  library: EffectLibrary;
  description?: string;
  preview?: string; // URL to preview image/video
  tags?: string[];
  
  // Performance
  performanceModes: PerformanceMode[]; // Which modes support this effect
  
  // Settings
  defaultSettings: Record<string, any>;
  settingsSchema?: EffectSettingsSchema; // For dynamic UI generation
}

// ============================================================================
// SETTINGS SCHEMA (for Inspector Panel)
// ============================================================================

export type SettingType = 'number' | 'string' | 'boolean' | 'color' | 'select' | 'range';

export interface SettingDefinition {
  type: SettingType;
  label: string;
  defaultValue: any;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: any; label: string }>;
  description?: string;
}

export type EffectSettingsSchema = Record<string, SettingDefinition>;

// ============================================================================
// TEXT EFFECTS
// ============================================================================

export interface TextEffectSettings {
  speed?: number; // 0.1 to 5
  delay?: number; // 0 to 2000ms
  easing?: string; // CSS easing or cubic-bezier
  direction?: 'left' | 'right' | 'up' | 'down';
  color?: string;
  gradient?: {
    from: string;
    to: string;
    angle?: number;
  };
  
  // Specific to certain effects
  shineWidth?: number; // For shiny text
  glitchIntensity?: number; // For glitch
  typewriterCursor?: boolean; // For typewriter
}

export interface TextEffect extends EffectBase {
  type: 'text';
  component: React.ComponentType<TextEffectComponentProps>;
  defaultSettings: TextEffectSettings;
}

export interface TextEffectComponentProps {
  children: React.ReactNode;
  settings: TextEffectSettings;
  isPreview?: boolean;
}

// ============================================================================
// CURSOR EFFECTS
// ============================================================================

export interface CursorEffectSettings {
  size?: number; // 10 to 100px
  color?: string;
  trailLength?: number; // For trail effects
  magneticStrength?: number; // 0 to 1
  glowIntensity?: number; // 0 to 1
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay';
}

export interface CursorEffect extends EffectBase {
  type: 'cursor';
  component: React.ComponentType<CursorEffectComponentProps>;
  defaultSettings: CursorEffectSettings;
}

export interface CursorEffectComponentProps {
  settings: CursorEffectSettings;
  isActive: boolean;
}

// ============================================================================
// BACKGROUND EFFECTS
// ============================================================================

export interface BackgroundEffectSettings {
  // Gradient settings
  gradientType?: 'linear' | 'radial' | 'conic';
  gradientColors?: string[];
  gradientAngle?: number;
  animateGradient?: boolean;
  
  // Particle settings
  particleCount?: number;
  particleSize?: number;
  particleSpeed?: number;
  particleColor?: string;
  
  // Video/Frame settings
  videoUrl?: string;
  frameSequence?: string[];
  playbackSpeed?: number;
  
  // Layer settings
  opacity?: number; // 0 to 1
  blur?: number; // 0 to 20px
  blendMode?: string;
  
  // R3F settings
  geometry?: 'sphere' | 'box' | 'torus' | 'custom';
  material?: 'normal' | 'phong' | 'standard';
  rotationSpeed?: number;
}

export interface BackgroundEffect extends EffectBase {
  type: 'background';
  component: React.ComponentType<BackgroundEffectComponentProps>;
  defaultSettings: BackgroundEffectSettings;
  heavyLoad?: boolean; // For lazy loading decision
}

export interface BackgroundEffectComponentProps {
  settings: BackgroundEffectSettings;
  isActive: boolean;
}

// ============================================================================
// UI MICRO EFFECTS
// ============================================================================

export interface UIEffectSettings {
  duration?: number; // ms
  easing?: string;
  scale?: number;
  translateX?: number;
  translateY?: number;
  rotate?: number;
  blur?: number;
  opacity?: number;
}

export interface UIEffect extends EffectBase {
  type: 'ui';
  component: React.ComponentType<UIEffectComponentProps>;
  defaultSettings: UIEffectSettings;
}

export interface UIEffectComponentProps {
  children: React.ReactNode;
  settings: UIEffectSettings;
  trigger?: 'hover' | 'click' | 'view' | 'mount';
}

// ============================================================================
// EFFECT REGISTRY
// ============================================================================

export type AnyEffect = TextEffect | CursorEffect | BackgroundEffect | UIEffect;

export interface EffectsRegistryInterface {
  // Registration
  register(effect: AnyEffect): void;
  unregister(id: string): void;
  
  // Retrieval
  get(id: string): AnyEffect | undefined;
  getByType(type: EffectType): AnyEffect[];
  getAll(): AnyEffect[];
  
  // Search/Filter
  search(query: string): AnyEffect[];
  filter(predicate: (effect: AnyEffect) => boolean): AnyEffect[];
  
  // Performance
  getForPerformanceMode(mode: PerformanceMode): AnyEffect[];
}

// ============================================================================
// PRESETS
// ============================================================================

export interface EffectPresetEffects {
  text?: {
    effectId: string;
    settings: TextEffectSettings;
  };
  cursor?: {
    effectId: string;
    settings: CursorEffectSettings;
  };
  background?: {
    effectId: string;
    settings: BackgroundEffectSettings;
  };
  ui?: {
    effectId: string;
    settings: UIEffectSettings;
  };
}

export interface EffectPreset {
  id: string;
  name: string;
  description?: string;
  userId: string | null; // null = public preset
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  
  effects: EffectPresetEffects;
  
  thumbnail?: string; // Base64 or URL
  tags?: string[];
  
  // Metadata
  views?: number;
  likes?: number;
  downloads?: number;
}

// ============================================================================
// PRESET MANAGER
// ============================================================================

export interface PresetManagerInterface {
  // CRUD operations
  create(preset: Omit<EffectPreset, 'id' | 'createdAt' | 'updatedAt'>): Promise<EffectPreset>;
  read(id: string): Promise<EffectPreset | null>;
  update(id: string, updates: Partial<EffectPreset>): Promise<EffectPreset>;
  delete(id: string): Promise<void>;
  
  // List operations
  listUserPresets(userId: string): Promise<EffectPreset[]>;
  listPublicPresets(): Promise<EffectPreset[]>;
  
  // Import/Export
  exportAsJSON(id: string): Promise<string>;
  importFromJSON(json: string): Promise<EffectPreset>;
  
  // Share
  generateShareLink(id: string): Promise<string>;
  loadFromShareLink(link: string): Promise<EffectPreset>;
  
  // Duplicate
  duplicate(id: string): Promise<EffectPreset>;
}

// ============================================================================
// CONTEXT STATE
// ============================================================================

export interface EffectsContextState {
  // Current active effects
  activeTextEffect: string | null;
  activeTextSettings: TextEffectSettings;
  
  activeCursorEffect: string | null;
  activeCursorSettings: CursorEffectSettings;
  
  activeBackgroundEffect: string | null;
  activeBackgroundSettings: BackgroundEffectSettings;
  
  activeUIEffect: string | null;
  activeUISettings: UIEffectSettings;
  
  // Current preset
  currentPreset: EffectPreset | null;
  
  // Performance mode
  performanceMode: PerformanceMode;
  
  // Global toggles
  effectsEnabled: boolean;
  reducedMotion: boolean;
}

export interface EffectsContextActions {
  // Effect activation
  setTextEffect: (effectId: string | null, settings?: TextEffectSettings) => void;
  setCursorEffect: (effectId: string | null, settings?: CursorEffectSettings) => void;
  setBackgroundEffect: (effectId: string | null, settings?: BackgroundEffectSettings) => void;
  setUIEffect: (effectId: string | null, settings?: UIEffectSettings) => void;
  
  // Settings updates
  updateTextSettings: (settings: Partial<TextEffectSettings>) => void;
  updateCursorSettings: (settings: Partial<CursorEffectSettings>) => void;
  updateBackgroundSettings: (settings: Partial<BackgroundEffectSettings>) => void;
  updateUISettings: (settings: Partial<UIEffectSettings>) => void;
  
  // Preset management
  loadPreset: (preset: EffectPreset) => void;
  clearPreset: () => void;
  
  // Global controls
  toggleEffects: () => void;
  setPerformanceMode: (mode: PerformanceMode) => void;
}

export type EffectsContextValue = EffectsContextState & EffectsContextActions;

// ============================================================================
// MOTION STUDIO STATE
// ============================================================================

export interface MotionStudioState {
  // UI State
  selectedEffectId: string | null;
  previewMode: 'interactive' | 'static';
  inspectorExpanded: boolean;
  specialsDrawerOpen: boolean;
  
  // Preview state
  previewText: string;
  previewBackgroundColor: string;
  
  // Search/Filter
  searchQuery: string;
  selectedType: EffectType | 'all';
  selectedTags: string[];
}
