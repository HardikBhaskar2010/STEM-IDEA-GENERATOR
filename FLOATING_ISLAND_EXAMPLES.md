# Floating Island Component - Usage Examples

## Basic Usage

### Default Floating Navigation

```tsx
import { FloatingNav } from '@/components/layout/FloatingNav';
import { FloatingSettings } from '@/components/layout/FloatingSettings';

export default function Dashboard() {
  return (
    <div>
      <FloatingNav />
      <FloatingSettings />
      {/* Your dashboard content */}
    </div>
  );
}
```

## Advanced Usage

### Custom Floating Component with Theme Awareness

```tsx
import { AdaptiveFloatingContainer } from '@/components/layout/AdaptiveFloatingContainer';
import { useTheme } from '@/hooks/useTheme';
import { useBackgroundColor } from '@/hooks/useBackgroundColor';

export function CustomFloatingWidget() {
  const { isDark } = useTheme();
  const bgColor = useBackgroundColor('body');

  return (
    <AdaptiveFloatingContainer selector="body" className="custom-class">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">
          {isDark ? '🌙' : '☀️'} {bgColor.isDark ? 'Dark' : 'Light'} Background
        </span>
        <button className="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30">
          Action
        </button>
      </div>
    </AdaptiveFloatingContainer>
  );
}
```

### Listening to Theme Changes

```tsx
import { useEffect } from 'react';
import { themeChangeEvent } from '@/hooks/useTheme';

export function ThemeAwareComponent() {
  useEffect(() => {
    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('Theme changed:', customEvent.detail);
      // Perform actions on theme change
    };

    themeChangeEvent.addEventListener('themechange', handleThemeChange);
    return () => 
      themeChangeEvent.removeEventListener('themechange', handleThemeChange);
  }, []);

  return <div>Theme-aware content</div>;
}
```

### Using Multiple Floating Elements

```tsx
import { AdaptiveFloatingContainer } from '@/components/layout/AdaptiveFloatingContainer';
import { FloatingDock } from '@/components/ui/floating-dock';

export function MultipleFloatingElements() {
  const navigationItems = [
    { title: 'Home', icon: <HomeIcon />, href: '/' },
    { title: 'Search', icon: <SearchIcon />, href: '/search' },
  ];

  const toolsItems = [
    { title: 'Settings', icon: <SettingsIcon />, href: '/settings' },
    { title: 'Help', icon: <HelpIcon />, href: '/help' },
  ];

  return (
    <>
      {/* Bottom center - Navigation */}
      <AdaptiveFloatingContainer selector="body" className="bottom-6">
        <FloatingDock items={navigationItems} />
      </AdaptiveFloatingContainer>

      {/* Right side floating action */}
      <div className="fixed bottom-6 right-6 z-50">
        <AdaptiveFloatingContainer selector="body">
          <button className="w-12 h-12 rounded-full flex items-center justify-center">
            <span className="text-2xl">+</span>
          </button>
        </AdaptiveFloatingContainer>
      </div>
    </>
  );
}
```

## Hook Examples

### Using useBackgroundColor

```tsx
import { useBackgroundColor } from '@/hooks/useBackgroundColor';

export function BackgroundAwareComponent() {
  const bgColor = useBackgroundColor('body');

  return (
    <div className="p-4 rounded-lg">
      <p>Background Color: {bgColor.hex}</p>
      <p>Luminosity: {(bgColor.luminosity * 100).toFixed(2)}%</p>
      <p>Mode: {bgColor.isDark ? 'Dark' : 'Light'}</p>
    </div>
  );
}
```

### Using useTheme with All Properties

```tsx
import { useTheme } from '@/hooks/useTheme';

export function ThemeControlPanel() {
  const { theme, setTheme, isDark, effectiveTheme, systemTheme } = useTheme();

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Current Theme</label>
        <select 
          value={theme} 
          onChange={(e) => setTheme(e.target.value as any)}
          className="mt-1 block w-full rounded border"
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
      
      <div className="text-sm space-y-1">
        <p>System Theme: <strong>{systemTheme}</strong></p>
        <p>Effective Theme: <strong>{effectiveTheme}</strong></p>
        <p>Is Dark: <strong>{isDark ? 'Yes' : 'No'}</strong></p>
      </div>
    </div>
  );
}
```

### Using useSystemTheme

```tsx
import { useSystemTheme } from '@/hooks/useSystemTheme';

export function SystemThemeInfo() {
  const { systemTheme, isDarkMode, prefersReducedMotion } = useSystemTheme();

  return (
    <div className="space-y-2">
      <p>System Theme: {systemTheme}</p>
      <p>Dark Mode: {isDarkMode ? 'Enabled' : 'Disabled'}</p>
      <p>Reduced Motion: {prefersReducedMotion ? 'Preferred' : 'Not preferred'}</p>
    </div>
  );
}
```

## Styling Examples

### Glass-Morphism Classes

```tsx
// Light glass effect (use on dark backgrounds)
<div className="glass-light">Light glass effect</div>

// Dark glass effect (use on light backgrounds)
<div className="glass-dark">Dark glass effect</div>

// Adaptive glass container
<div className="glass-adaptive">Content</div>

// With hover effects
<div className="glass-light-hover">Hover over me</div>
<div className="glass-dark-hover">Hover over me</div>
```

### Centered Floating Elements

```tsx
// Basic centering
<div className="floating-centered">
  Centered floating element
</div>

// Responsive centering
<div className="floating-centered-sm sm:floating-centered-md lg:floating-centered-lg">
  Responsive centering
</div>
```

### Theme Transitions

```tsx
// Smooth transition on theme change
<div className="theme-transition">
  Content with smooth theme transitions
</div>
```

## Real-world Examples

### Floating Chat Button with Theme Adaptation

```tsx
import { AdaptiveFloatingContainer } from '@/components/layout/AdaptiveFloatingContainer';
import { MessageCircle } from 'lucide-react';

export function FloatingChatButton() {
  return (
    <AdaptiveFloatingContainer 
      selector="body"
      className="bottom-20 right-6"
    >
      <button 
        className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-shadow"
        aria-label="Open chat"
      >
        <MessageCircle size={24} />
      </button>
    </AdaptiveFloatingContainer>
  );
}
```

### Multi-Feature Floating Toolbar

```tsx
import { AdaptiveFloatingContainer } from '@/components/layout/AdaptiveFloatingContainer';
import { useTheme } from '@/hooks/useTheme';
import { useBackgroundColor } from '@/hooks/useBackgroundColor';
import { 
  Home, Settings, Bell, Search, User 
} from 'lucide-react';

export function FloatingToolbar() {
  const { isDark } = useTheme();
  const bgColor = useBackgroundColor('body');

  const tools = [
    { icon: Home, label: 'Home' },
    { icon: Search, label: 'Search' },
    { icon: Bell, label: 'Notifications' },
    { icon: Settings, label: 'Settings' },
    { icon: User, label: 'Profile' },
  ];

  return (
    <AdaptiveFloatingContainer selector="body">
      <div className="flex gap-1 md:gap-2">
        {tools.map(({ icon: Icon, label }) => (
          <button
            key={label}
            title={label}
            className="p-2 rounded-full hover:bg-white/20 transition-colors"
            aria-label={label}
          >
            <Icon size={20} />
          </button>
        ))}
      </div>
    </AdaptiveFloatingContainer>
  );
}
```

### Theme-Aware Floating Status Display

```tsx
import { AdaptiveFloatingContainer } from '@/components/layout/AdaptiveFloatingContainer';
import { useTheme } from '@/hooks/useTheme';
import { useBackgroundColor } from '@/hooks/useBackgroundColor';

export function FloatingStatus() {
  const { isDark, effectiveTheme } = useTheme();
  const bgColor = useBackgroundColor('body');

  return (
    <AdaptiveFloatingContainer 
      selector="body"
      className="top-6 left-1/2 -translate-x-1/2"
    >
      <div className="text-xs font-medium space-y-1">
        <div className="flex gap-2">
          <span>Theme:</span>
          <strong>{effectiveTheme}</strong>
        </div>
        <div className="flex gap-2">
          <span>Background:</span>
          <strong>{bgColor.isDark ? 'Dark' : 'Light'}</strong>
        </div>
      </div>
    </AdaptiveFloatingContainer>
  );
}
```

## Component Composition Examples

### Dashboard with All Floating Elements

```tsx
import { FloatingNav } from '@/components/layout/FloatingNav';
import { FloatingSettings } from '@/components/layout/FloatingSettings';
import { FloatingChatButton } from './FloatingChatButton';
import { FloatingToolbar } from './FloatingToolbar';

export function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-800">
      {/* Main content */}
      <main className="p-8">
        <h1 className="text-4xl font-bold">Dashboard</h1>
        {/* Your content here */}
      </main>

      {/* Floating elements */}
      <FloatingNav />
      <FloatingSettings />
      <FloatingChatButton />
      <FloatingToolbar />
    </div>
  );
}
```

## Tips & Best Practices

1. **Always specify selector for useBackgroundColor** - Default is 'body' but you can target any element
2. **Use theme change events for global updates** - Better than prop drilling
3. **Respect reduced motion preferences** - Check prefersReducedMotion in useSystemTheme
4. **Test on real devices** - Glass effects may vary based on hardware
5. **Use semantic HTML** - Maintain accessibility with proper ARIA labels
6. **Monitor performance** - Use React DevTools Profiler to check re-renders
7. **Provide fallbacks** - Some CSS features may not be supported in older browsers

## Debugging

### Check background detection:
```tsx
const bg = useBackgroundColor('body');
console.log('BG Color:', bg);
console.log('Luminosity:', bg.luminosity);
console.log('Is Dark:', bg.isDark);
```

### Check theme state:
```tsx
const { theme, isDark, effectiveTheme, systemTheme } = useTheme();
console.log({ theme, isDark, effectiveTheme, systemTheme });
```

### Monitor theme changes:
```tsx
import { themeChangeEvent } from '@/hooks/useTheme';

themeChangeEvent.addEventListener('themechange', (e) => {
  console.log('Theme event:', (e as CustomEvent).detail);
});
```
