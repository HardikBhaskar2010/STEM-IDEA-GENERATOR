/**
 * BackgroundLibrary Module
 * 
 * Central registry of all available reactbits background effects with metadata.
 * Provides utility functions for querying, filtering, and organizing backgrounds.
 */

import type {
  BackgroundMetadata,
  BackgroundCategory,
  BackgroundLibraryData,
  BackgroundPreset,
} from './types';

/**
 * Background library data
 * Complete metadata for all 20 reactbits backgrounds
 */
const backgroundsData: BackgroundMetadata[] = [
  // FLUID CATEGORY
  {
    id: 'liquid-ether',
    name: 'Liquid Ether',
    description: 'Smooth, flowing liquid animation with ethereal gradients',
    category: 'fluid',
    tags: ['liquid', 'smooth', 'flowing', 'gradient', 'ethereal'],
    thumbnailUrl: '/thumbnails/backgrounds/liquid-ether.webp',
    documentationUrl: 'https://reactbits.dev/backgrounds/liquid-ether',
    performanceLevel: 'medium',
    estimatedFPS: 45,
    supportsTheme: true,
    supportsAnimationControl: true,
    supportsSpeedControl: true,
    defaultSettings: {
      speed: 1.0,
      intensity: 0.7,
      colorScheme: 'blue-purple',
    },
    settingsSchema: {
      speed: {
        type: 'range',
        label: 'Animation Speed',
        description: 'Controls the flow speed',
        defaultValue: 1.0,
        min: 0.1,
        max: 2.0,
        step: 0.1,
      },
      intensity: {
        type: 'range',
        label: 'Intensity',
        description: 'Controls the effect intensity',
        defaultValue: 0.7,
        min: 0.1,
        max: 1.0,
        step: 0.1,
      },
      colorScheme: {
        type: 'select',
        label: 'Color Scheme',
        description: 'Select color palette',
        defaultValue: 'blue-purple',
        options: [
          { label: 'Blue Purple', value: 'blue-purple' },
          { label: 'Green Teal', value: 'green-teal' },
          { label: 'Orange Red', value: 'orange-red' },
        ],
      },
    },
    importPath: '@/components/backgrounds/LiquidEther',
    bundleSize: 45,
  },
  {
    id: 'silk',
    name: 'Silk',
    description: 'Silky smooth fabric-like waves with elegant motion',
    category: 'fluid',
    tags: ['silk', 'fabric', 'waves', 'elegant', 'smooth'],
    thumbnailUrl: '/thumbnails/backgrounds/silk.webp',
    documentationUrl: 'https://reactbits.dev/backgrounds/silk',
    performanceLevel: 'light',
    estimatedFPS: 55,
    supportsTheme: true,
    supportsAnimationControl: true,
    supportsSpeedControl: true,
    defaultSettings: {
      speed: 0.8,
      waveAmplitude: 0.5,
      colorA: '#e0c3fc',
      colorB: '#8ec5fc',
    },
    settingsSchema: {
      speed: {
        type: 'range',
        label: 'Wave Speed',
        defaultValue: 0.8,
        min: 0.1,
        max: 2.0,
        step: 0.1,
      },
      waveAmplitude: {
        type: 'range',
        label: 'Wave Amplitude',
        defaultValue: 0.5,
        min: 0.1,
        max: 1.0,
        step: 0.1,
      },
      colorA: {
        type: 'color',
        label: 'Primary Color',
        defaultValue: '#e0c3fc',
      },
      colorB: {
        type: 'color',
        label: 'Secondary Color',
        defaultValue: '#8ec5fc',
      },
    },
    importPath: '@/components/backgrounds/Silk',
    bundleSize: 35,
  },
  {
    id: 'prism',
    name: 'Prism',
    description: 'Prismatic light refraction with rainbow color shifts',
    category: 'geometric',
    tags: ['prism', 'light', 'refraction', 'rainbow', 'geometric'],
    thumbnailUrl: '/thumbnails/backgrounds/prism.webp',
    documentationUrl: 'https://reactbits.dev/backgrounds/prism',
    performanceLevel: 'medium',
    estimatedFPS: 40,
    supportsTheme: true,
    supportsAnimationControl: true,
    supportsSpeedControl: true,
    defaultSettings: {
      rotationSpeed: 1.0,
      complexity: 0.6,
      brightness: 0.8,
    },
    settingsSchema: {
      rotationSpeed: {
        type: 'range',
        label: 'Rotation Speed',
        defaultValue: 1.0,
        min: 0.1,
        max: 3.0,
        step: 0.1,
      },
      complexity: {
        type: 'range',
        label: 'Complexity',
        defaultValue: 0.6,
        min: 0.1,
        max: 1.0,
        step: 0.1,
      },
      brightness: {
        type: 'range',
        label: 'Brightness',
        defaultValue: 0.8,
        min: 0.1,
        max: 1.0,
        step: 0.1,
      },
    },
    importPath: '@/components/backgrounds/Prism',
    bundleSize: 50,
  },
  {
    id: 'dark-veil',
    name: 'Dark Veil',
    description: 'Mysterious dark overlay with subtle movement',
    category: 'atmospheric',
    tags: ['dark', 'mysterious', 'veil', 'subtle', 'atmospheric'],
    thumbnailUrl: '/thumbnails/backgrounds/dark-veil.webp',
    documentationUrl: 'https://reactbits.dev/backgrounds/dark-veil',
    performanceLevel: 'light',
    estimatedFPS: 60,
    supportsTheme: false,
    supportsAnimationControl: true,
    supportsSpeedControl: false,
    defaultSettings: {
      opacity: 0.85,
      movement: 0.3,
    },
    settingsSchema: {
      opacity: {
        type: 'range',
        label: 'Opacity',
        defaultValue: 0.85,
        min: 0.3,
        max: 1.0,
        step: 0.05,
      },
      movement: {
        type: 'range',
        label: 'Movement',
        defaultValue: 0.3,
        min: 0.0,
        max: 1.0,
        step: 0.1,
      },
    },
    importPath: '@/components/backgrounds/DarkVeil',
    bundleSize: 25,
  },
  {
    id: 'light-pillar',
    name: 'Light Pillar',
    description: 'Vertical light beams with atmospheric glow',
    category: 'atmospheric',
    tags: ['light', 'pillar', 'beams', 'vertical', 'glow'],
    thumbnailUrl: '/thumbnails/backgrounds/light-pillar.webp',
    documentationUrl: 'https://reactbits.dev/backgrounds/light-pillar',
    performanceLevel: 'medium',
    estimatedFPS: 42,
    supportsTheme: true,
    supportsAnimationControl: true,
    supportsSpeedControl: true,
    defaultSettings: {
      beamCount: 5,
      speed: 0.5,
      intensity: 0.7,
      color: '#ffffff',
    },
    settingsSchema: {
      beamCount: {
        type: 'range',
        label: 'Beam Count',
        defaultValue: 5,
        min: 1,
        max: 10,
        step: 1,
      },
      speed: {
        type: 'range',
        label: 'Speed',
        defaultValue: 0.5,
        min: 0.1,
        max: 2.0,
        step: 0.1,
      },
      intensity: {
        type: 'range',
        label: 'Intensity',
        defaultValue: 0.7,
        min: 0.1,
        max: 1.0,
        step: 0.1,
      },
      color: {
        type: 'color',
        label: 'Beam Color',
        defaultValue: '#ffffff',
      },
    },
    importPath: '@/components/backgrounds/LightPillar',
    bundleSize: 40,
  },
  {
    id: 'floating-lines',
    name: 'Floating Lines',
    description: 'Elegant floating lines with smooth parallax motion',
    category: 'geometric',
    tags: ['lines', 'floating', 'parallax', 'elegant', 'minimal'],
    thumbnailUrl: '/thumbnails/backgrounds/floating-lines.webp',
    documentationUrl: 'https://reactbits.dev/backgrounds/floating-lines',
    performanceLevel: 'light',
    estimatedFPS: 58,
    supportsTheme: true,
    supportsAnimationControl: true,
    supportsSpeedControl: true,
    defaultSettings: {
      lineCount: 20,
      speed: 0.6,
      thickness: 2,
      color: '#4a90e2',
    },
    settingsSchema: {
      lineCount: {
        type: 'range',
        label: 'Line Count',
        defaultValue: 20,
        min: 5,
        max: 50,
        step: 5,
      },
      speed: {
        type: 'range',
        label: 'Speed',
        defaultValue: 0.6,
        min: 0.1,
        max: 2.0,
        step: 0.1,
      },
      thickness: {
        type: 'range',
        label: 'Line Thickness',
        defaultValue: 2,
        min: 1,
        max: 5,
        step: 1,
      },
      color: {
        type: 'color',
        label: 'Line Color',
        defaultValue: '#4a90e2',
      },
    },
    importPath: '@/components/backgrounds/FloatingLines',
    bundleSize: 30,
  },
  {
    id: 'light-rays',
    name: 'Light Rays',
    description: 'Radial light rays emanating from center with volumetric effect',
    category: 'atmospheric',
    tags: ['light', 'rays', 'radial', 'volumetric', 'dramatic'],
    thumbnailUrl: '/thumbnails/backgrounds/light-rays.webp',
    documentationUrl: 'https://reactbits.dev/backgrounds/light-rays',
    performanceLevel: 'medium',
    estimatedFPS: 38,
    supportsTheme: true,
    supportsAnimationControl: true,
    supportsSpeedControl: true,
    defaultSettings: {
      rayCount: 12,
      rotationSpeed: 0.3,
      intensity: 0.6,
      spread: 0.8,
    },
    settingsSchema: {
      rayCount: {
        type: 'range',
        label: 'Ray Count',
        defaultValue: 12,
        min: 4,
        max: 24,
        step: 2,
      },
      rotationSpeed: {
        type: 'range',
        label: 'Rotation Speed',
        defaultValue: 0.3,
        min: 0.0,
        max: 2.0,
        step: 0.1,
      },
      intensity: {
        type: 'range',
        label: 'Intensity',
        defaultValue: 0.6,
        min: 0.1,
        max: 1.0,
        step: 0.1,
      },
      spread: {
        type: 'range',
        label: 'Spread',
        defaultValue: 0.8,
        min: 0.3,
        max: 1.0,
        step: 0.1,
      },
    },
    importPath: '@/components/backgrounds/LightRays',
    bundleSize: 42,
  },
  {
    id: 'pixel-blast',
    name: 'Pixel Blast',
    description: 'Explosive pixel particles with dynamic bursts',
    category: 'particle',
    tags: ['pixel', 'blast', 'explosion', 'particles', 'dynamic'],
    thumbnailUrl: '/thumbnails/backgrounds/pixel-blast.webp',
    documentationUrl: 'https://reactbits.dev/backgrounds/pixel-blast',
    performanceLevel: 'heavy',
    estimatedFPS: 28,
    supportsTheme: true,
    supportsAnimationControl: true,
    supportsSpeedControl: true,
    defaultSettings: {
      particleCount: 150,
      blastFrequency: 0.5,
      speed: 1.0,
      colorVariation: 0.7,
    },
    settingsSchema: {
      particleCount: {
        type: 'range',
        label: 'Particle Count',
        defaultValue: 150,
        min: 50,
        max: 300,
        step: 10,
      },
      blastFrequency: {
        type: 'range',
        label: 'Blast Frequency',
        defaultValue: 0.5,
        min: 0.1,
        max: 2.0,
        step: 0.1,
      },
      speed: {
        type: 'range',
        label: 'Speed',
        defaultValue: 1.0,
        min: 0.1,
        max: 2.0,
        step: 0.1,
      },
      colorVariation: {
        type: 'range',
        label: 'Color Variation',
        defaultValue: 0.7,
        min: 0.0,
        max: 1.0,
        step: 0.1,
      },
    },
    importPath: '@/components/backgrounds/PixelBlast',
    bundleSize: 65,
  },
  {
    id: 'color-bends',
    name: 'Color Bends',
    description: 'Bending color waves with chromatic aberration effect',
    category: 'gradient',
    tags: ['color', 'bends', 'waves', 'chromatic', 'aberration'],
    thumbnailUrl: '/thumbnails/backgrounds/color-bends.webp',
    documentationUrl: 'https://reactbits.dev/backgrounds/color-bends',
    performanceLevel: 'medium',
    estimatedFPS: 43,
    supportsTheme: true,
    supportsAnimationControl: true,
    supportsSpeedControl: true,
    defaultSettings: {
      bendIntensity: 0.6,
      speed: 0.8,
      colorShift: 0.5,
    },
    settingsSchema: {
      bendIntensity: {
        type: 'range',
        label: 'Bend Intensity',
        defaultValue: 0.6,
        min: 0.1,
        max: 1.0,
        step: 0.1,
      },
      speed: {
        type: 'range',
        label: 'Speed',
        defaultValue: 0.8,
        min: 0.1,
        max: 2.0,
        step: 0.1,
      },
      colorShift: {
        type: 'range',
        label: 'Color Shift',
        defaultValue: 0.5,
        min: 0.0,
        max: 1.0,
        step: 0.1,
      },
    },
    importPath: '@/components/backgrounds/ColorBends',
    bundleSize: 48,
  },
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Northern lights effect with flowing color bands',
    category: 'atmospheric',
    tags: ['aurora', 'northern lights', 'flowing', 'colorful', 'natural'],
    thumbnailUrl: '/thumbnails/backgrounds/aurora.webp',
    documentationUrl: 'https://reactbits.dev/backgrounds/aurora',
    performanceLevel: 'medium',
    estimatedFPS: 40,
    supportsTheme: true,
    supportsAnimationControl: true,
    supportsSpeedControl: true,
    defaultSettings: {
      speed: 0.7,
      intensity: 0.8,
      colorPalette: 'green-blue',
    },
    settingsSchema: {
      speed: {
        type: 'range',
        label: 'Flow Speed',
        defaultValue: 0.7,
        min: 0.1,
        max: 2.0,
        step: 0.1,
      },
      intensity: {
        type: 'range',
        label: 'Intensity',
        defaultValue: 0.8,
        min: 0.1,
        max: 1.0,
        step: 0.1,
      },
      colorPalette: {
        type: 'select',
        label: 'Color Palette',
        defaultValue: 'green-blue',
        options: [
          { label: 'Green Blue', value: 'green-blue' },
          { label: 'Purple Pink', value: 'purple-pink' },
          { label: 'Multi Color', value: 'multi-color' },
        ],
      },
    },
    importPath: '@/components/backgrounds/Aurora',
    bundleSize: 52,
  },
  {
    id: 'plasma',
    name: 'Plasma',
    description: 'Organic plasma effect with swirling energy patterns',
    category: 'fluid',
    tags: ['plasma', 'energy', 'swirling', 'organic', 'dynamic'],
    thumbnailUrl: '/thumbnails/backgrounds/plasma.webp',
    documentationUrl: 'https://reactbits.dev/backgrounds/plasma',
    performanceLevel: 'heavy',
    estimatedFPS: 30,
    supportsTheme: true,
    supportsAnimationControl: true,
    supportsSpeedControl: true,
    defaultSettings: {
      complexity: 0.7,
      speed: 1.0,
      colorIntensity: 0.8,
    },
    settingsSchema: {
      complexity: {
        type: 'range',
        label: 'Complexity',
        defaultValue: 0.7,
        min: 0.1,
        max: 1.0,
        step: 0.1,
      },
      speed: {
        type: 'range',
        label: 'Speed',
        defaultValue: 1.0,
        min: 0.1,
        max: 2.0,
        step: 0.1,
      },
      colorIntensity: {
        type: 'range',
        label: 'Color Intensity',
        defaultValue: 0.8,
        min: 0.1,
        max: 1.0,
        step: 0.1,
      },
    },
    importPath: '@/components/backgrounds/Plasma',
    bundleSize: 58,
  },
  {
    id: 'particles',
    name: 'Particles',
    description: 'Classic particle system with interconnected nodes',
    category: 'particle',
    tags: ['particles', 'nodes', 'network', 'connected', 'classic'],
    thumbnailUrl: '/thumbnails/backgrounds/particles.webp',
    documentationUrl: 'https://reactbits.dev/backgrounds/particles',
    performanceLevel: 'medium',
    estimatedFPS: 45,
    supportsTheme: true,
    supportsAnimationControl: true,
    supportsSpeedControl: true,
    defaultSettings: {
      particleCount: 100,
      connectionDistance: 150,
      speed: 0.5,
      particleSize: 3,
    },
    settingsSchema: {
      particleCount: {
        type: 'range',
        label: 'Particle Count',
        defaultValue: 100,
        min: 20,
        max: 200,
        step: 10,
      },
      connectionDistance: {
        type: 'range',
        label: 'Connection Distance',
        defaultValue: 150,
        min: 50,
        max: 300,
        step: 10,
      },
      speed: {
        type: 'range',
        label: 'Speed',
        defaultValue: 0.5,
        min: 0.1,
        max: 2.0,
        step: 0.1,
      },
      particleSize: {
        type: 'range',
        label: 'Particle Size',
        defaultValue: 3,
        min: 1,
        max: 8,
        step: 1,
      },
    },
    importPath: '@/components/backgrounds/Particles',
    bundleSize: 44,
  },
  {
    id: 'gradient-blinds',
    name: 'Gradient Blinds',
    description: 'Animated gradient blinds with smooth transitions',
    category: 'gradient',
    tags: ['gradient', 'blinds', 'stripes', 'transitions', 'smooth'],
    thumbnailUrl: '/thumbnails/backgrounds/gradient-blinds.webp',
    documentationUrl: 'https://reactbits.dev/backgrounds/gradient-blinds',
    performanceLevel: 'light',
    estimatedFPS: 55,
    supportsTheme: true,
    supportsAnimationControl: true,
    supportsSpeedControl: true,
    defaultSettings: {
      blindCount: 8,
      speed: 0.6,
      colorA: '#667eea',
      colorB: '#764ba2',
    },
    settingsSchema: {
      blindCount: {
        type: 'range',
        label: 'Blind Count',
        defaultValue: 8,
        min: 3,
        max: 15,
        step: 1,
      },
      speed: {
        type: 'range',
        label: 'Speed',
        defaultValue: 0.6,
        min: 0.1,
        max: 2.0,
        step: 0.1,
      },
      colorA: {
        type: 'color',
        label: 'Color A',
        defaultValue: '#667eea',
      },
      colorB: {
        type: 'color',
        label: 'Color B',
        defaultValue: '#764ba2',
      },
    },
    importPath: '@/components/backgrounds/GradientBlinds',
    bundleSize: 38,
  },
  {
    id: 'grainient',
    name: 'Grainient',
    description: 'Grainy gradient with film-like texture',
    category: 'gradient',
    tags: ['grain', 'gradient', 'texture', 'film', 'vintage'],
    thumbnailUrl: '/thumbnails/backgrounds/grainient.webp',
    documentationUrl: 'https://reactbits.dev/backgrounds/grainient',
    performanceLevel: 'light',
    estimatedFPS: 60,
    supportsTheme: true,
    supportsAnimationControl: true,
    supportsSpeedControl: false,
    defaultSettings: {
      grainIntensity: 0.4,
      gradientAngle: 45,
      colorA: '#ff6b6b',
      colorB: '#4ecdc4',
    },
    settingsSchema: {
      grainIntensity: {
        type: 'range',
        label: 'Grain Intensity',
        defaultValue: 0.4,
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      gradientAngle: {
        type: 'range',
        label: 'Gradient Angle',
        defaultValue: 45,
        min: 0,
        max: 360,
        step: 15,
      },
      colorA: {
        type: 'color',
        label: 'Color A',
        defaultValue: '#ff6b6b',
      },
      colorB: {
        type: 'color',
        label: 'Color B',
        defaultValue: '#4ecdc4',
      },
    },
    importPath: '@/components/backgrounds/Grainient',
    bundleSize: 32,
  },
  {
    id: 'grid-scan',
    name: 'Grid Scan',
    description: 'Scanning grid pattern with cyberpunk aesthetic',
    category: 'geometric',
    tags: ['grid', 'scan', 'cyberpunk', 'tech', 'futuristic'],
    thumbnailUrl: '/thumbnails/backgrounds/grid-scan.webp',
    documentationUrl: 'https://reactbits.dev/backgrounds/grid-scan',
    performanceLevel: 'medium',
    estimatedFPS: 48,
    supportsTheme: true,
    supportsAnimationControl: true,
    supportsSpeedControl: true,
    defaultSettings: {
      gridSize: 40,
      scanSpeed: 1.0,
      lineColor: '#00ff00',
      glowIntensity: 0.7,
    },
    settingsSchema: {
      gridSize: {
        type: 'range',
        label: 'Grid Size',
        defaultValue: 40,
        min: 20,
        max: 100,
        step: 10,
      },
      scanSpeed: {
        type: 'range',
        label: 'Scan Speed',
        defaultValue: 1.0,
        min: 0.1,
        max: 3.0,
        step: 0.1,
      },
      lineColor: {
        type: 'color',
        label: 'Line Color',
        defaultValue: '#00ff00',
      },
      glowIntensity: {
        type: 'range',
        label: 'Glow Intensity',
        defaultValue: 0.7,
        min: 0.0,
        max: 1.0,
        step: 0.1,
      },
    },
    importPath: '@/components/backgrounds/GridScan',
    bundleSize: 46,
  },
  {
    id: 'beams',
    name: 'Beams',
    description: 'Intersecting light beams with dynamic patterns',
    category: 'geometric',
    tags: ['beams', 'light', 'intersecting', 'patterns', 'dynamic'],
    thumbnailUrl: '/thumbnails/backgrounds/beams.webp',
    documentationUrl: 'https://reactbits.dev/backgrounds/beams',
    performanceLevel: 'medium',
    estimatedFPS: 44,
    supportsTheme: true,
    supportsAnimationControl: true,
    supportsSpeedControl: true,
    defaultSettings: {
      beamCount: 6,
      speed: 0.8,
      thickness: 4,
      opacity: 0.6,
    },
    settingsSchema: {
      beamCount: {
        type: 'range',
        label: 'Beam Count',
        defaultValue: 6,
        min: 2,
        max: 12,
        step: 1,
      },
      speed: {
        type: 'range',
        label: 'Speed',
        defaultValue: 0.8,
        min: 0.1,
        max: 2.0,
        step: 0.1,
      },
      thickness: {
        type: 'range',
        label: 'Thickness',
        defaultValue: 4,
        min: 1,
        max: 10,
        step: 1,
      },
      opacity: {
        type: 'range',
        label: 'Opacity',
        defaultValue: 0.6,
        min: 0.1,
        max: 1.0,
        step: 0.1,
      },
    },
    importPath: '@/components/backgrounds/Beams',
    bundleSize: 41,
  },
  {
    id: 'pixel-snow',
    name: 'Pixel Snow',
    description: 'Falling pixel particles like digital snowflakes',
    category: 'particle',
    tags: ['pixel', 'snow', 'falling', 'particles', 'winter'],
    thumbnailUrl: '/thumbnails/backgrounds/pixel-snow.webp',
    documentationUrl: 'https://reactbits.dev/backgrounds/pixel-snow',
    performanceLevel: 'medium',
    estimatedFPS: 46,
    supportsTheme: true,
    supportsAnimationControl: true,
    supportsSpeedControl: true,
    defaultSettings: {
      particleCount: 120,
      fallSpeed: 0.7,
      pixelSize: 4,
      windEffect: 0.3,
    },
    settingsSchema: {
      particleCount: {
        type: 'range',
        label: 'Particle Count',
        defaultValue: 120,
        min: 30,
        max: 250,
        step: 10,
      },
      fallSpeed: {
        type: 'range',
        label: 'Fall Speed',
        defaultValue: 0.7,
        min: 0.1,
        max: 2.0,
        step: 0.1,
      },
      pixelSize: {
        type: 'range',
        label: 'Pixel Size',
        defaultValue: 4,
        min: 2,
        max: 10,
        step: 1,
      },
      windEffect: {
        type: 'range',
        label: 'Wind Effect',
        defaultValue: 0.3,
        min: 0.0,
        max: 1.0,
        step: 0.1,
      },
    },
    importPath: '@/components/backgrounds/PixelSnow',
    bundleSize: 39,
  },
  {
    id: 'lightning',
    name: 'Lightning',
    description: 'Electric lightning bolts with branching patterns',
    category: 'atmospheric',
    tags: ['lightning', 'electric', 'bolts', 'storm', 'energy'],
    thumbnailUrl: '/thumbnails/backgrounds/lightning.webp',
    documentationUrl: 'https://reactbits.dev/backgrounds/lightning',
    performanceLevel: 'heavy',
    estimatedFPS: 32,
    supportsTheme: true,
    supportsAnimationControl: true,
    supportsSpeedControl: true,
    defaultSettings: {
      frequency: 0.4,
      branches: 5,
      intensity: 0.8,
      color: '#a0d8ff',
    },
    settingsSchema: {
      frequency: {
        type: 'range',
        label: 'Strike Frequency',
        defaultValue: 0.4,
        min: 0.1,
        max: 1.0,
        step: 0.1,
      },
      branches: {
        type: 'range',
        label: 'Branch Count',
        defaultValue: 5,
        min: 1,
        max: 10,
        step: 1,
      },
      intensity: {
        type: 'range',
        label: 'Intensity',
        defaultValue: 0.8,
        min: 0.1,
        max: 1.0,
        step: 0.1,
      },
      color: {
        type: 'color',
        label: 'Lightning Color',
        defaultValue: '#a0d8ff',
      },
    },
    importPath: '@/components/backgrounds/Lightning',
    bundleSize: 62,
  },
  {
    id: 'prismatic-burst',
    name: 'Prismatic Burst',
    description: 'Bursting prismatic colors with radial expansion',
    category: 'gradient',
    tags: ['prismatic', 'burst', 'radial', 'colorful', 'explosion'],
    thumbnailUrl: '/thumbnails/backgrounds/prismatic-burst.webp',
    documentationUrl: 'https://reactbits.dev/backgrounds/prismatic-burst',
    performanceLevel: 'medium',
    estimatedFPS: 41,
    supportsTheme: true,
    supportsAnimationControl: true,
    supportsSpeedControl: true,
    defaultSettings: {
      burstSpeed: 0.9,
      colorCount: 7,
      intensity: 0.75,
      rotation: 0.5,
    },
    settingsSchema: {
      burstSpeed: {
        type: 'range',
        label: 'Burst Speed',
        defaultValue: 0.9,
        min: 0.1,
        max: 2.0,
        step: 0.1,
      },
      colorCount: {
        type: 'range',
        label: 'Color Count',
        defaultValue: 7,
        min: 3,
        max: 12,
        step: 1,
      },
      intensity: {
        type: 'range',
        label: 'Intensity',
        defaultValue: 0.75,
        min: 0.1,
        max: 1.0,
        step: 0.05,
      },
      rotation: {
        type: 'range',
        label: 'Rotation',
        defaultValue: 0.5,
        min: 0.0,
        max: 2.0,
        step: 0.1,
      },
    },
    importPath: '@/components/backgrounds/PrismaticBurst',
    bundleSize: 49,
  },
  {
    id: 'galaxy',
    name: 'Galaxy',
    description: 'Swirling galaxy with stars and nebula clouds',
    category: 'atmospheric',
    tags: ['galaxy', 'space', 'stars', 'nebula', 'cosmic'],
    thumbnailUrl: '/thumbnails/backgrounds/galaxy.webp',
    documentationUrl: 'https://reactbits.dev/backgrounds/galaxy',
    performanceLevel: 'heavy',
    estimatedFPS: 35,
    supportsTheme: false,
    supportsAnimationControl: true,
    supportsSpeedControl: true,
    defaultSettings: {
      rotationSpeed: 0.3,
      starCount: 200,
      nebulaIntensity: 0.6,
      colorScheme: 'purple-blue',
    },
    settingsSchema: {
      rotationSpeed: {
        type: 'range',
        label: 'Rotation Speed',
        defaultValue: 0.3,
        min: 0.0,
        max: 1.0,
        step: 0.1,
      },
      starCount: {
        type: 'range',
        label: 'Star Count',
        defaultValue: 200,
        min: 50,
        max: 500,
        step: 25,
      },
      nebulaIntensity: {
        type: 'range',
        label: 'Nebula Intensity',
        defaultValue: 0.6,
        min: 0.0,
        max: 1.0,
        step: 0.1,
      },
      colorScheme: {
        type: 'select',
        label: 'Color Scheme',
        defaultValue: 'purple-blue',
        options: [
          { label: 'Purple Blue', value: 'purple-blue' },
          { label: 'Red Orange', value: 'red-orange' },
          { label: 'Green Teal', value: 'green-teal' },
        ],
      },
    },
    importPath: '@/components/backgrounds/Galaxy',
    bundleSize: 72,
  },
  {
    id: 'dither',
    name: 'Dither',
    description: 'Retro dithering effect with pixel patterns',
    category: 'gradient',
    tags: ['dither', 'retro', 'pixel', 'pattern', 'vintage'],
    thumbnailUrl: '/thumbnails/backgrounds/dither.webp',
    documentationUrl: 'https://reactbits.dev/backgrounds/dither',
    performanceLevel: 'light',
    estimatedFPS: 58,
    supportsTheme: true,
    supportsAnimationControl: true,
    supportsSpeedControl: true,
    defaultSettings: {
      ditherDensity: 0.5,
      animationSpeed: 0.4,
      colorA: '#000000',
      colorB: '#ffffff',
    },
    settingsSchema: {
      ditherDensity: {
        type: 'range',
        label: 'Dither Density',
        defaultValue: 0.5,
        min: 0.1,
        max: 1.0,
        step: 0.1,
      },
      animationSpeed: {
        type: 'range',
        label: 'Animation Speed',
        defaultValue: 0.4,
        min: 0.0,
        max: 2.0,
        step: 0.1,
      },
      colorA: {
        type: 'color',
        label: 'Color A',
        defaultValue: '#000000',
      },
      colorB: {
        type: 'color',
        label: 'Color B',
        defaultValue: '#ffffff',
      },
    },
    importPath: '@/components/backgrounds/Dither',
    bundleSize: 36,
  },
];

/**
 * Curated presets
 * Pre-configured background settings for quick application
 */
const presetsData: BackgroundPreset[] = [
  // Preset 1: Calm Ocean
  {
    id: 'calm-ocean',
    name: 'Calm Ocean',
    description: 'Peaceful blue waves with gentle motion',
    backgroundId: 'liquid-ether',
    settings: {
      speed: 0.5,
      intensity: 0.5,
      colorScheme: 'blue-purple',
    },
    thumbnailUrl: '/thumbnails/presets/calm-ocean.webp',
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
  },
  
  // Preset 2: Energetic Burst
  {
    id: 'energetic-burst',
    name: 'Energetic Burst',
    description: 'High-energy particle explosions with vibrant colors',
    backgroundId: 'pixel-blast',
    settings: {
      particleCount: 200,
      blastFrequency: 1.2,
      speed: 1.5,
      colorVariation: 0.9,
    },
    thumbnailUrl: '/thumbnails/presets/energetic-burst.webp',
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
  },
  
  // Preset 3: Minimal Grid
  {
    id: 'minimal-grid',
    name: 'Minimal Grid',
    description: 'Clean cyberpunk grid with subtle scanning effect',
    backgroundId: 'grid-scan',
    settings: {
      gridSize: 60,
      scanSpeed: 0.5,
      lineColor: '#00ff00',
      glowIntensity: 0.4,
    },
    thumbnailUrl: '/thumbnails/presets/minimal-grid.webp',
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
  },
  
  // Preset 4: Northern Lights
  {
    id: 'northern-lights',
    name: 'Northern Lights',
    description: 'Stunning aurora borealis with flowing colors',
    backgroundId: 'aurora',
    settings: {
      speed: 0.6,
      intensity: 0.9,
      colorPalette: 'green-blue',
    },
    thumbnailUrl: '/thumbnails/presets/northern-lights.webp',
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
  },
  
  // Preset 5: Cosmic Journey
  {
    id: 'cosmic-journey',
    name: 'Cosmic Journey',
    description: 'Deep space galaxy with swirling stars',
    backgroundId: 'galaxy',
    settings: {
      rotationSpeed: 0.4,
      starCount: 300,
      nebulaIntensity: 0.7,
      colorScheme: 'purple-blue',
    },
    thumbnailUrl: '/thumbnails/presets/cosmic-journey.webp',
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
  },
  
  // Preset 6: Soft Gradient
  {
    id: 'soft-gradient',
    name: 'Soft Gradient',
    description: 'Gentle grainy gradient with vintage feel',
    backgroundId: 'grainient',
    settings: {
      grainIntensity: 0.3,
      gradientAngle: 135,
      colorA: '#ffecd2',
      colorB: '#fcb69f',
    },
    thumbnailUrl: '/thumbnails/presets/soft-gradient.webp',
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
  },
  
  // Preset 7: Electric Storm
  {
    id: 'electric-storm',
    name: 'Electric Storm',
    description: 'Intense lightning with dramatic energy',
    backgroundId: 'lightning',
    settings: {
      frequency: 0.7,
      branches: 8,
      intensity: 0.9,
      color: '#a0d8ff',
    },
    thumbnailUrl: '/thumbnails/presets/electric-storm.webp',
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
  },
  
  // Preset 8: Floating Zen
  {
    id: 'floating-zen',
    name: 'Floating Zen',
    description: 'Minimalist floating lines with calm movement',
    backgroundId: 'floating-lines',
    settings: {
      lineCount: 15,
      speed: 0.4,
      thickness: 1,
      color: '#4a90e2',
    },
    thumbnailUrl: '/thumbnails/presets/floating-zen.webp',
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
  },
];

/**
 * BackgroundLibrary class
 * Provides methods for accessing and querying background metadata
 */
export class BackgroundLibrary {
  /**
   * Get all available backgrounds
   */
  static get backgrounds(): BackgroundMetadata[] {
    return backgroundsData;
  }

  /**
   * Get all available presets
   */
  static get presets(): BackgroundPreset[] {
    return presetsData;
  }

  /**
   * Get backgrounds organized by category
   */
  static get categories(): Record<BackgroundCategory, string[]> {
    const categories: Record<BackgroundCategory, string[]> = {
      fluid: [],
      geometric: [],
      particle: [],
      gradient: [],
      atmospheric: [],
    };

    backgroundsData.forEach((bg) => {
      categories[bg.category].push(bg.id);
    });

    return categories;
  }

  /**
   * Get complete library data
   */
  static getData(): BackgroundLibraryData {
    return {
      backgrounds: this.backgrounds,
      categories: this.categories,
      presets: this.presets,
    };
  }

  /**
   * Get background by ID
   * @param id - Background identifier
   * @returns Background metadata or undefined if not found
   */
  static getById(id: string): BackgroundMetadata | undefined {
    return backgroundsData.find((bg) => bg.id === id);
  }

  /**
   * Get backgrounds by category
   * @param category - Category to filter by
   * @returns Array of backgrounds in the specified category
   */
  static getByCategory(category: BackgroundCategory): BackgroundMetadata[] {
    return backgroundsData.filter((bg) => bg.category === category);
  }

  /**
   * Search backgrounds by name or tags
   * @param query - Search query (case-insensitive)
   * @returns Array of matching backgrounds
   */
  static search(query: string): BackgroundMetadata[] {
    const lowerQuery = query.toLowerCase().trim();
    
    if (!lowerQuery) {
      return backgroundsData;
    }

    return backgroundsData.filter((bg) => {
      const nameMatch = bg.name.toLowerCase().includes(lowerQuery);
      const descMatch = bg.description.toLowerCase().includes(lowerQuery);
      const tagMatch = bg.tags.some((tag) => tag.toLowerCase().includes(lowerQuery));
      
      return nameMatch || descMatch || tagMatch;
    });
  }

  /**
   * Filter backgrounds by multiple criteria
   * @param options - Filter options
   * @returns Array of matching backgrounds
   */
  static filter(options: {
    category?: BackgroundCategory | 'all';
    searchQuery?: string;
    performanceLevel?: 'light' | 'medium' | 'heavy';
    supportsTheme?: boolean;
  }): BackgroundMetadata[] {
    let results = backgroundsData;

    // Filter by category
    if (options.category && options.category !== 'all') {
      results = results.filter((bg) => bg.category === options.category);
    }

    // Filter by search query
    if (options.searchQuery) {
      const lowerQuery = options.searchQuery.toLowerCase().trim();
      results = results.filter((bg) => {
        const nameMatch = bg.name.toLowerCase().includes(lowerQuery);
        const descMatch = bg.description.toLowerCase().includes(lowerQuery);
        const tagMatch = bg.tags.some((tag) => tag.toLowerCase().includes(lowerQuery));
        return nameMatch || descMatch || tagMatch;
      });
    }

    // Filter by performance level
    if (options.performanceLevel) {
      results = results.filter((bg) => bg.performanceLevel === options.performanceLevel);
    }

    // Filter by theme support
    if (options.supportsTheme !== undefined) {
      results = results.filter((bg) => bg.supportsTheme === options.supportsTheme);
    }

    return results;
  }

  /**
   * Find similar backgrounds based on category and tags
   * @param id - Background ID to find similar backgrounds for
   * @returns Array of similar backgrounds (excluding the input background)
   */
  static findSimilar(id: string): BackgroundMetadata[] {
    const background = this.getById(id);
    
    if (!background) {
      return [];
    }

    // Find backgrounds in same category with overlapping tags
    const similar = backgroundsData.filter((bg) => {
      if (bg.id === id) return false;
      
      const sameCategory = bg.category === background.category;
      const sharedTags = bg.tags.some((tag) => background.tags.includes(tag));
      
      return sameCategory || sharedTags;
    });

    // Sort by relevance (same category first, then by shared tags)
    return similar.sort((a, b) => {
      const aScore = 
        (a.category === background.category ? 2 : 0) +
        a.tags.filter((tag) => background.tags.includes(tag)).length;
      
      const bScore = 
        (b.category === background.category ? 2 : 0) +
        b.tags.filter((tag) => background.tags.includes(tag)).length;
      
      return bScore - aScore;
    });
  }

  /**
   * Get preset by ID
   * @param id - Preset identifier
   * @returns Preset or undefined if not found
   */
  static getPresetById(id: string): BackgroundPreset | undefined {
    return presetsData.find((preset) => preset.id === id);
  }

  /**
   * Get presets for a specific background
   * @param backgroundId - Background identifier
   * @returns Array of presets for the specified background
   */
  static getPresetsForBackground(backgroundId: string): BackgroundPreset[] {
    return presetsData.filter((preset) => preset.backgroundId === backgroundId);
  }

  /**
   * Get all built-in (curated) presets
   * @returns Array of built-in presets
   */
  static getBuiltInPresets(): BackgroundPreset[] {
    return presetsData.filter((preset) => preset.isBuiltIn);
  }

  /**
   * Get all user-created presets
   * @returns Array of user-created presets
   */
  static getUserPresets(): BackgroundPreset[] {
    return presetsData.filter((preset) => !preset.isBuiltIn);
  }

  /**
   * Add a user-created preset
   * @param preset - Preset to add
   */
  static addUserPreset(preset: BackgroundPreset): void {
    if (preset.isBuiltIn) {
      throw new Error('Cannot add built-in preset through addUserPreset');
    }
    
    // Check if preset with same ID already exists
    const existingIndex = presetsData.findIndex((p) => p.id === preset.id);
    
    if (existingIndex >= 0) {
      // Update existing preset
      presetsData[existingIndex] = preset;
    } else {
      // Add new preset
      presetsData.push(preset);
    }
  }

  /**
   * Remove a user-created preset
   * @param id - Preset ID to remove
   * @returns True if preset was removed, false if not found or is built-in
   */
  static removeUserPreset(id: string): boolean {
    const preset = this.getPresetById(id);
    
    if (!preset || preset.isBuiltIn) {
      return false;
    }
    
    const index = presetsData.findIndex((p) => p.id === id);
    if (index >= 0) {
      presetsData.splice(index, 1);
      return true;
    }
    
    return false;
  }

  /**
   * Validate that a background has all required metadata fields
   * @param background - Background to validate
   * @returns True if valid, false otherwise
   */
  static validateMetadata(background: BackgroundMetadata): boolean {
    const requiredFields: (keyof BackgroundMetadata)[] = [
      'id',
      'name',
      'description',
      'category',
      'tags',
      'thumbnailUrl',
      'performanceLevel',
      'estimatedFPS',
      'supportsTheme',
      'supportsAnimationControl',
      'supportsSpeedControl',
      'defaultSettings',
      'settingsSchema',
      'importPath',
      'bundleSize',
    ];

    return requiredFields.every((field) => {
      const value = background[field];
      return value !== undefined && value !== null && value !== '';
    });
  }

  /**
   * Get all valid categories
   * @returns Array of valid category values
   */
  static getValidCategories(): BackgroundCategory[] {
    return ['fluid', 'geometric', 'particle', 'gradient', 'atmospheric'];
  }

  /**
   * Check if a category is valid
   * @param category - Category to check
   * @returns True if valid, false otherwise
   */
  static isValidCategory(category: string): category is BackgroundCategory {
    return this.getValidCategories().includes(category as BackgroundCategory);
  }
}

// Export singleton instance
export default BackgroundLibrary;
