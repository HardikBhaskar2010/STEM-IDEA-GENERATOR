# ReactbitsBackground Wrapper Guide

This guide explains how to use the ReactbitsBackground wrapper interface to integrate reactbits.dev background components into Motion Studio.

## Overview

The wrapper system provides:
- **Standardized interface** for all reactbits backgrounds
- **Error boundaries** for graceful error handling
- **Theme adaptation** for light/dark mode support
- **Animation controls** for pause/play and speed adjustment
- **Consistent prop interface** across all backgrounds

## Core Components

### 1. ReactbitsBackgroundProps Interface

All wrapped background components use this standardized interface:

```typescript
interface ReactbitsBackgroundProps {
  settings: Record<string, any>;   // Effect-specific settings
  theme: 'light' | 'dark';          // Current theme
  isActive: boolean;                // Whether background is active
  isPaused?: boolean;               // Animation pause state (optional)
  animationSpeed?: number;          // Speed multiplier (optional, default: 1.0)
}
```

### 2. BackgroundErrorBoundary

Error boundary component that catches rendering errors and provides fallback UI:

```typescript
<BackgroundErrorBoundary 
  backgroundId="liquid-ether" 
  onError={() => console.log('Error occurred')}
>
  <YourBackgroundComponent />
</BackgroundErrorBoundary>
```

**Features:**
- Catches errors during background rendering
- Displays safe fallback UI
- Logs errors with structured data
- Notifies parent component via `onError` callback

### 3. withReactbitsWrapper HOC

Higher-order component that wraps reactbits components with standardized interface:

```typescript
import { withReactbitsWrapper } from '@/lib/backgrounds';
import { LiquidEther } from 'reactbits-components';

export const LiquidEtherBackground = withReactbitsWrapper(
  LiquidEther,
  'liquid-ether',
  true  // supportsTheme: true if component has native theme support
);
```

**What it provides:**
- Error boundary wrapping
- Theme adaptation (if needed)
- Animation control props
- Consistent data attributes
- Standardized prop interface

### 4. ReactbitsBackgroundBase Component

Alternative to HOC for manual wrapping with more control:

```typescript
<ReactbitsBackgroundBase
  backgroundId="aurora"
  supportsTheme={false}
  theme="dark"
  isActive={true}
  settings={{}}
>
  <AuroraComponent {...customProps} />
</ReactbitsBackgroundBase>
```

## Usage Examples

### Example 1: Wrapping a Background with Native Theme Support

```typescript
import { withReactbitsWrapper } from '@/lib/backgrounds';
import { Prism } from 'reactbits-components';

// Prism has native light/dark theme support
export const PrismBackground = withReactbitsWrapper(
  Prism,
  'prism',
  true  // supportsTheme = true
);

// Usage
<PrismBackground
  settings={{ intensity: 0.8, speed: 1.2 }}
  theme="dark"
  isActive={true}
  isPaused={false}
  animationSpeed={1.0}
/>
```

### Example 2: Wrapping a Background Without Theme Support

```typescript
import { withReactbitsWrapper } from '@/lib/backgrounds';
import { PixelBlast } from 'reactbits-components';

// PixelBlast doesn't have native theme support
// Wrapper will apply opacity/brightness adjustments
export const PixelBlastBackground = withReactbitsWrapper(
  PixelBlast,
  'pixel-blast',
  false  // supportsTheme = false
);

// Usage - wrapper automatically applies theme adaptations
<PixelBlastBackground
  settings={{ particleCount: 100 }}
  theme="light"  // Wrapper applies opacity: 0.7, brightness: 1.2
  isActive={true}
/>
```

### Example 3: Manual Wrapping with ReactbitsBackgroundBase

```typescript
import { ReactbitsBackgroundBase } from '@/lib/backgrounds';
import { CustomBackground } from './CustomBackground';

function MyBackground(props: ReactbitsBackgroundProps) {
  return (
    <ReactbitsBackgroundBase
      backgroundId="custom-bg"
      supportsTheme={false}
      {...props}
    >
      <CustomBackground
        color={props.settings.color}
        intensity={props.settings.intensity}
        // Custom prop mapping
      />
    </ReactbitsBackgroundBase>
  );
}
```

## Theme Adaptation

The wrapper provides automatic theme adaptation for backgrounds without native theme support:

### Light Theme Adaptations
```css
opacity: 0.7;
filter: brightness(1.2);
```

### Dark Theme Adaptations
```css
opacity: 1.0;
```

### Custom Theme Adaptation

If you need custom theme adaptation logic:

```typescript
import { applyThemeAdaptation } from '@/lib/backgrounds';

const customStyles = applyThemeAdaptation(false, 'light');
// Returns: { opacity: 0.7, filter: 'brightness(1.2)' }
```

## Animation Controls

Wrapped components automatically receive animation control props:

```typescript
<WrappedBackground
  settings={{}}
  theme="dark"
  isActive={true}
  isPaused={true}        // Pauses animation
  animationSpeed={0.5}   // Runs at half speed
/>
```

The wrapper passes these as:
- `paused={isPaused}` to the underlying component
- `speed={animationSpeed}` to the underlying component

## Error Handling

The wrapper catches errors and provides graceful fallback:

1. **Error occurs** → Error boundary catches it
2. **Fallback UI displayed** → "Background effect unavailable"
3. **Error logged** → Structured error log with context
4. **Parent notified** → `onError` callback triggered
5. **App continues** → Rest of application unaffected

## Data Attributes

Wrapped components include data attributes for debugging and testing:

```html
<div 
  data-background-id="liquid-ether"
  data-background-active="true"
>
  <!-- Background content -->
</div>
```

## Best Practices

1. **Always use the wrapper** for reactbits components
2. **Set supportsTheme correctly** to avoid unnecessary style overrides
3. **Handle errors gracefully** by providing onError callbacks
4. **Test with both themes** to ensure proper adaptation
5. **Document custom settings** in the background metadata

## Testing

The wrapper includes comprehensive tests:

```bash
npm test BackgroundErrorBoundary.test.tsx
npm test ReactbitsBackgroundWrapper.test.tsx
```

Tests cover:
- Error boundary behavior
- Theme adaptation logic
- Prop passing
- Animation controls
- Data attributes
- Fallback rendering

## Next Steps

After wrapping a background component:

1. Add metadata to `BackgroundLibrary.ts`
2. Create thumbnail image (WebP/AVIF < 20KB)
3. Test with both light and dark themes
4. Verify animation controls work
5. Test error scenarios
6. Add to background selector UI

## Related Files

- `types.ts` - Type definitions
- `BackgroundErrorBoundary.tsx` - Error boundary component
- `ReactbitsBackgroundWrapper.tsx` - Wrapper utilities
- `BackgroundLibrary.ts` - Background metadata registry
- `BackgroundManager.ts` - Background lifecycle management
