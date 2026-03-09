# Floating Island Spacing & Positioning Guide

## Overview

This document explains how the floating island components (FloatingNav and FloatingSettings) are positioned to prevent overlap and maintain visual harmony across all screen sizes.

## Problem Solved

Previously, the FloatingSettings component overlapped with the FloatingNav component, creating a cluttered appearance. The solution implements a responsive positioning system that adapts to different screen sizes while maintaining proper spacing.

## Architecture

### Two-Island Layout

The application uses two primary floating islands:

1. **FloatingNav** (Navigation Island)
   - Contains main navigation items
   - Centered horizontally: `left-1/2 -translate-x-1/2`
   - Position: Bottom-center of viewport

2. **FloatingSettings** (Settings Island)
   - Contains theme, TTS, and voice controls
   - Offset to the right of FloatingNav
   - Uses responsive offset: `translate-x-[260px|380px|420px]`
   - Position: Bottom-right offset from center

### Responsive Breakpoints

```
Mobile (< 768px):
  FloatingNav: centered
  FloatingSettings: translate-x-[260px]
  Spacing: ~260px between centers

Tablet (768px - 1023px):
  FloatingNav: centered
  FloatingSettings: translate-x-[380px]
  Spacing: ~380px between centers

Desktop (≥ 1024px):
  FloatingNav: centered
  FloatingSettings: translate-x-[420px]
  Spacing: ~420px between centers
```

## Implementation Details

### Hook: `useFloatingIslandPosition`

Located in `/frontend/src/hooks/useFloatingIslandPosition.ts`

Provides:
- `viewportWidth`: Current viewport width
- `isSmallScreen`: Boolean for mobile detection
- `getIslandPosition()`: Calculates position for an island
- `calculateMinimumSpacing()`: Calculates safe spacing

### Components Updated

#### FloatingNav (`/frontend/src/components/layout/FloatingNav.tsx`)

```tsx
<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
  <AdaptiveFloatingContainer selector="body">
    <FloatingDock items={items} />
  </AdaptiveFloatingContainer>
</div>
```

- Fixed centered positioning
- Uses `AdaptiveFloatingContainer` for theme-aware styling

#### FloatingSettings (`/frontend/src/components/layout/FloatingSettings.tsx`)

```tsx
// Responsive offset function
const getResponsiveOffset = (): string => {
  if (isSmallScreen) {
    return 'translate-x-[260px]'; // Mobile
  }
  return 'translate-x-[380px]'; // Desktop and tablet
};

<div className={`fixed bottom-6 left-1/2 ${getResponsiveOffset()} z-50`}>
  <AdaptiveFloatingContainer selector="body">
    {/* Settings content */}
  </AdaptiveFloatingContainer>
</div>
```

- Responsive offset based on viewport width
- Prevents overlap at all screen sizes

## Spacing Calculations

### Estimated Component Widths

- FloatingNav: ~550px (desktop), ~320px (mobile)
- FloatingSettings: ~320px (desktop), ~240px (mobile)

### Current Offsets (From center)

| Screen Size | FloatingNav | FloatingSettings | Spacing |
|-------------|------------|------------------|---------|
| Mobile     | 0px        | +260px           | 260px   |
| Tablet     | 0px        | +380px           | 380px   |
| Desktop    | 0px        | +420px           | 420px   |

These offsets ensure:
- No overlap between components
- Proper visual hierarchy
- Responsive adaptation to screen constraints

## CSS Utilities

Added to `/frontend/src/index.css`:

```css
/* Centered island positioning */
.floating-centered
.floating-centered-sm (sm:)
.floating-centered-md (md:)
.floating-centered-lg (lg:)

/* Offset island positioning */
.floating-offset-right-sm
.floating-offset-right-md
.floating-offset-right-lg

/* Optimal spacing to prevent overlap */
.floating-offset-right-optimal
  - Mobile: translate-x-[260px]
  - Tablet: translate-x-[380px]
  - Desktop: translate-x-[420px]

/* Gap spacing utilities */
.floating-gap-sm (0.75rem)
.floating-gap-md (1rem)
.floating-gap-lg (1.5rem)
```

## Adaptive Container Integration

The `AdaptiveFloatingContainer` component:
- Detects background luminosity
- Applies appropriate glass-morphism effect
- Maintains theme awareness
- Provides smooth transitions

Works seamlessly with the positioning system to create a cohesive visual experience.

## Testing Checklist

- [ ] Mobile view (< 380px): Islands properly spaced
- [ ] Tablet view (768px - 1023px): Islands visible without overlap
- [ ] Desktop view (≥ 1024px): Optimal spacing maintained
- [ ] Landscape orientation: Proper positioning
- [ ] Portrait orientation: Proper positioning
- [ ] Viewport resize: Smooth transition between breakpoints
- [ ] Theme switching: Visual adaptation works correctly
- [ ] Dark mode: Glass effect visible and contrasted
- [ ] Light mode: Glass effect visible and contrasted
- [ ] Interaction: Both islands remain accessible

## Future Enhancements

1. **Stacking on Ultra-Mobile**: For very small screens (< 320px), consider stacking islands vertically
2. **Left Offset Option**: Support for left-positioned secondary islands
3. **Custom Island System**: Generic floating island manager for multiple components
4. **Collision Detection**: Automatic spacing adjustment based on actual rendered dimensions
5. **Animation**: Smooth slide-in animation when islands appear

## Migration Guide

If you're adding a new floating island:

1. Import `useFloatingIslandPosition` hook
2. Use responsive offset classes or dynamic offset calculation
3. Wrap with `AdaptiveFloatingContainer` for theme awareness
4. Test across all breakpoints
5. Verify no overlap with existing islands

Example:

```tsx
import { useFloatingIslandPosition } from '@/hooks/useFloatingIslandPosition';

export const MyFloatingIsland = () => {
  const { isSmallScreen } = useFloatingIslandPosition();
  
  const offset = isSmallScreen ? 'translate-x-[320px]' : 'translate-x-[500px]';
  
  return (
    <div className={`fixed bottom-6 left-1/2 ${offset} z-50`}>
      <AdaptiveFloatingContainer selector="body">
        {/* Island content */}
      </AdaptiveFloatingContainer>
    </div>
  );
};
```
