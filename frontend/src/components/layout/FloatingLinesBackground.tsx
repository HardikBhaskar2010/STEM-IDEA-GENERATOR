import { usePreferences } from '@/contexts/PreferencesContext';
import FloatingLines from '@/components/three/FloatingLines';

// Theme color mappings - 3 gradient colors per theme
const THEME_COLORS: Record<string, string[]> = {
  purple: ['#a855f7', '#8b5cf6', '#7c3aed'],
  pink: ['#ec4899', '#db2777', '#be185d'],
  blue: ['#3b82f6', '#2563eb', '#1d4ed8'],
  green: ['#10b981', '#059669', '#047857'],
  red: ['#ef4444', '#dc2626', '#b91c1c'],
  orange: ['#f97316', '#ea580c', '#c2410c'],
  gray: ['#6b7280', '#4b5563', '#374151']
};

export function FloatingLinesBackground() {
  const { theme } = usePreferences();

  const gradientColors = THEME_COLORS[theme] || THEME_COLORS.purple;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -10,          // 👈 Fixed: was 0, now -10 for proper layering
        pointerEvents: 'none',
        opacity: 0.35,       // subtle glow vibe
        overflow: 'hidden'
      }}
  
    >
      <FloatingLines
        linesGradient={gradientColors}
        enabledWaves={['top', 'middle', 'bottom']}
        lineCount={5}
        lineDistance={5}
        bendRadius={5}
        bendStrength={-0.5}
        interactive={true}
        parallax={true}
        animationSpeed={1}
        mixBlendMode="normal"   // 👈 No more washing out UI
        mouseDamping={0.08}
      />
    </div>
  );
}
