# Floating Island Dynamic Adaptation - Implementation Guide

## Overview

This implementation provides a comprehensive solution for making the Floating Island component dynamically adapt to the application's background, automatically center itself, and synchronize with system theme settings.

## Key Features Implemented

### 1. Background Color Detection (`useBackgroundColor.ts`)

The `useBackgroundColor` hook automatically detects the page background color and calculates its luminosity using the WCAG formula.

**Features:**
- Real-time background color detection
- Luminosity calculation (0 = darkest, 1 = lightest)
- Automatic color parsing from CSS values
- DOM traversal for transparent elements
- Mutation observation for dynamic changes
- Responsive to window resize events

**Usage:**
```typescript
const bgColorInfo = useBackgroundColor('body');
// Returns: { rgb, hex, luminosity, isDark }
```

### 2. Adaptive Floating Container (`AdaptiveFloatingContainer.tsx`)

Wraps floating components with smart styling that adapts to the background.

**Features:**
- Automatic glass-morphism effect based on background
- Theme-aware styling (light/dark mode)
- Responsive padding and sizing
- Smooth transitions between states
- Viewport-centered positioning

**Usage:**
```tsx
<AdaptiveFloatingContainer selector="body">
  <FloatingDock items={items} />
</AdaptiveFloatingContainer>
```

### 3. Enhanced Theme System (`useTheme.ts`)

Extended useTheme hook with system preference synchronization and event emission.

**Features:**
- System theme preference detection
- Theme change events for global synchronization
- Computed properties (effectiveTheme, isDark)
- Automatic class management
- localStorage persistence

**Usage:**
```typescript
const { 
  theme, 
  setTheme, 
  isDark, 
  effectiveTheme, 
  systemTheme 
} = useTheme();
```

### 4. System Theme Hook (`useSystemTheme.ts`)

Dedicated hook for monitoring system theme preferences.

**Features:**
- Real-time system preference monitoring
- Reduced motion preference detection
- Clean API for theme queries

**Usage:**
```typescript
const { systemTheme, isDarkMode, prefersReducedMotion } = useSystemTheme();
```

### 5. Enhanced CSS (`index.css`)

New utility classes and CSS variables for theme transitions and glass effects.

**New Classes:**
- `.glass-light` - Light mode glass effect
- `.glass-dark` - Dark mode glass effect
- `.glass-adaptive` - Responsive glass container
- `.floating-centered` - Viewport centering
- `.theme-transition` - Smooth theme transitions

**New Variables:**
- `--transition-theme` - Theme transition timing
- Glass effect classes for various states

## Component Updates

### FloatingNav.tsx

Updated to use `AdaptiveFloatingContainer` wrapper and dynamic dock styling based on theme.

```tsx
const dockClassName = isDark
  ? "bg-black/80 backdrop-blur-xl border border-white/10"
  : "bg-white/80 backdrop-blur-xl border border-gray-200/30";

return (
  <AdaptiveFloatingContainer selector="body">
    <FloatingDock items={items} desktopClassName={dockClassName} />
  </AdaptiveFloatingContainer>
);
```

### FloatingSettings.tsx

Updated with the same adaptive container pattern and theme-aware styling.

### FloatingDock.tsx

Enhanced with flexible icon color customization through `iconColorClassName` prop.

## Responsive Behavior

The implementation is fully responsive:

- **Mobile:** Adaptive padding (`px-3 py-3 sm:px-4 md:px-4`)
- **Tablet:** Optimized spacing and sizing
- **Desktop:** Full-featured glass-morphism effects
- **Centering:** Uses CSS transforms for consistent positioning across breakpoints

## Theme Synchronization Flow

```
System Preference Changes
        ↓
useSystemTheme Hook detects change
        ↓
useTheme Hook updates effectiveTheme
        ↓
themeChangeEvent emitted
        ↓
Components re-render with new theme
        ↓
AdaptiveFloatingContainer updates styling
```

## Background Adaptation Flow

```
Background Color Changed (DOM/CSS)
        ↓
useBackgroundColor observes changes
        ↓
Calculates luminosity
        ↓
AdaptiveFloatingContainer receives updated bgColorInfo
        ↓
Glass effect styling automatically adjusts
```

## Usage Examples

### Basic Setup

```tsx
import { FloatingNav } from '@/components/layout/FloatingNav';
import { FloatingSettings } from '@/components/layout/FloatingSettings';

export default function App() {
  return (
    <div className="min-h-screen">
      <FloatingNav />
      <FloatingSettings />
      {/* Your content */}
    </div>
  );
}
```

### Custom Adaptive Container

```tsx
import { AdaptiveFloatingContainer } from '@/components/layout/AdaptiveFloatingContainer';

export function CustomFloatingElement() {
  return (
    <AdaptiveFloatingContainer selector="body" className="custom-class">
      <div>Your content here</div>
    </AdaptiveFloatingContainer>
  );
}
```

### Listening to Theme Changes

```tsx
import { themeChangeEvent } from '@/hooks/useTheme';
import { useEffect } from 'react';

useEffect(() => {
  const handleThemeChange = (e: Event) => {
    const { detail } = e as CustomEvent;
    console.log('Theme changed to:', detail.theme);
  };

  themeChangeEvent.addEventListener('themechange', handleThemeChange);
  return () => themeChangeEvent.removeEventListener('themechange', handleThemeChange);
}, []);
```

## Performance Considerations

1. **useBackgroundColor:** Uses MutationObserver and debounced resize listeners
2. **AdaptiveFloatingContainer:** Minimal re-renders using proper memoization
3. **useTheme:** CSS class management instead of inline styles
4. **CSS Transitions:** Hardware-accelerated transforms

## Browser Support

- Modern browsers with support for:
  - CSS `backdrop-filter`
  - `prefers-color-scheme` media query
  - `prefers-reduced-motion` media query
  - CSS Custom Properties
  - MutationObserver API
  - matchMedia API

## Accessibility Features

- Respects `prefers-reduced-motion` setting
- Uses semantic HTML with proper ARIA labels
- High contrast ratios maintained based on background luminosity
- Keyboard navigation support preserved
- Screen reader friendly

## Troubleshooting

### Floating Island not centering
- Ensure parent element uses `position: relative` or is the viewport
- Check that z-index doesn't conflict with other elements
- Verify Tailwind CSS is properly configured

### Theme not syncing
- Ensure `useTheme` hook is called within the app context
- Check browser console for JavaScript errors
- Verify localStorage is not disabled

### Background color not detected
- Ensure selector parameter is correct (default is 'body')
- Check if background is set via inline styles or classes
- Verify CSS is loaded before component mounts

## Future Enhancements

1. Add color contrast ratio calculation for better accessibility
2. Implement blur intensity adjustments based on background
3. Add animation preference detection
4. Support for custom color palettes
5. Theme scheduling (time-based auto-switching)

## Testing

Test the implementation with:
1. Different background colors (light/dark/custom)
2. System theme changes (OS settings)
3. Window resizing
4. Dynamic CSS class changes
5. Various browsers and devices
6. Reduced motion preferences
