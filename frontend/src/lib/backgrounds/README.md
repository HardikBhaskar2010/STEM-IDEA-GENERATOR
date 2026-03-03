# Background Library Module

This module provides the data layer for managing animated background effects from reactbits.dev within Motion Studio.

## Structure

```
backgrounds/
├── index.ts              # Main export file
├── types.ts              # TypeScript type definitions
├── BackgroundLibrary.ts  # Core library class with utility methods
└── README.md            # This file
```

## Core Types

### BackgroundMetadata
Complete metadata for a single background effect, including:
- Identification (id, name, description)
- Organization (category, tags)
- Assets (thumbnailUrl, documentationUrl)
- Performance characteristics (performanceLevel, estimatedFPS)
- Capabilities (theme support, animation controls)
- Configuration (defaultSettings, settingsSchema)
- Loading information (importPath, bundleSize)

### BackgroundCategory
Five categories for organizing backgrounds:
- `fluid` - Liquid, flowing animations
- `geometric` - Shape-based patterns
- `particle` - Particle systems
- `gradient` - Gradient-based effects
- `atmospheric` - Ambient, atmospheric effects

### BackgroundPreset
Curated or user-saved background configurations with pre-configured settings.

### BackgroundLibraryData
Complete library data structure containing all backgrounds, category groupings, and presets.

## BackgroundLibrary Class

The `BackgroundLibrary` class provides static methods for accessing and querying background metadata:

### Query Methods
- `getById(id)` - Get background by ID
- `getByCategory(category)` - Get backgrounds in a category
- `search(query)` - Search by name or tags
- `filter(options)` - Filter by multiple criteria
- `findSimilar(id)` - Find similar backgrounds

### Preset Methods
- `getPresetById(id)` - Get preset by ID
- `getPresetsForBackground(backgroundId)` - Get presets for a background
- `getBuiltInPresets()` - Get curated presets
- `getUserPresets()` - Get user-created presets
- `addUserPreset(preset)` - Add a user preset
- `removeUserPreset(id)` - Remove a user preset

### Utility Methods
- `validateMetadata(background)` - Validate background metadata
- `getValidCategories()` - Get all valid categories
- `isValidCategory(category)` - Check if category is valid

## Usage Example

```typescript
import { BackgroundLibrary } from '@/lib/backgrounds';

// Get all backgrounds
const allBackgrounds = BackgroundLibrary.backgrounds;

// Get background by ID
const liquidEther = BackgroundLibrary.getById('liquid-ether');

// Search backgrounds
const fluidBackgrounds = BackgroundLibrary.search('fluid');

// Filter with multiple criteria
const lightFluidBackgrounds = BackgroundLibrary.filter({
  category: 'fluid',
  performanceLevel: 'light',
  supportsTheme: true,
});

// Get backgrounds by category
const particleBackgrounds = BackgroundLibrary.getByCategory('particle');

// Find similar backgrounds
const similar = BackgroundLibrary.findSimilar('liquid-ether');
```

## Next Steps

- **Task 1.2**: Populate metadata for all 20 reactbits backgrounds
- **Task 1.3**: Write property test for BackgroundLibrary completeness
- **Task 1.4**: Write property test for category organization

## Requirements Validated

This module structure satisfies the following requirements:
- **Requirement 1.1**: Background_Library includes all Reactbits_Components
- **Requirement 1.2**: Background_Library organizes components by category
- **Requirement 1.3**: Background_Library provides metadata for each component
- **Requirement 1.4**: Background_Library supports lazy-loading (via importPath)
