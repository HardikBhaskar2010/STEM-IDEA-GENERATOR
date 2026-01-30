import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Zap, 
  Home, 
  Cpu, 
  BookOpen, 
  GraduationCap, 
  Info, 
  X,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/contexts/PreferencesContext';
import { cn } from '@/lib/utils';
import ThemeToggle from '@/components/ui/theme-toggle';
import { VoiceCommand } from '@/components/VoiceCommand';
import { TTSVisualizer } from '@/components/TTSVisualizer';
import { useTTS } from '@/contexts/TTSContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
  const { colorTheme } = usePreferences();
  const { isTTSActive } = useTTS();
  
  // Debug TTS state changes
  useEffect(() => {
    console.log('🔊 Sidebar - TTS state changed:', isTTSActive);
  }, [isTTSActive]);

  // Check if mobile on mount and window resize
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar on route change (mobile only)
  useEffect(() => {
    if (isMobile && isOpen) {
      onClose();
    }
  }, [location.pathname, isMobile]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobile, isOpen]);

  const getLogoClasses = () => {
    if (colorTheme === 'allblack') {
      return 'bg-black/80 border border-gray-700';
    }
    return 'bg-gradient-primary animate-glow-pulse';
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/generator', label: 'Generator', icon: Zap },
    { path: '/components', label: 'Components', icon: Cpu },
    { path: '/library', label: 'Library', icon: BookOpen },
    { path: '/learn', label: 'Learn', icon: GraduationCap },
    { path: '/profile', label: 'Profile', icon: User },
    { path: '/about', label: 'About', icon: Info },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-200"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen bg-black/95 backdrop-blur-xl border-r border-white/10 z-50',
          'flex flex-col w-64',
          'transition-transform duration-300 ease-in-out',
          isMobile && !isOpen && '-translate-x-full',
          isMobile && isOpen && 'translate-x-0 shadow-2xl'
        )}
      >
        {/* Logo & Close Button Section */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <Link 
            to="/" 
            className="flex items-center gap-3"
            onClick={() => isMobile && onClose()}
          >
            <div className={cn(getLogoClasses(), 'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0')}>
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm font-bold text-gradient whitespace-nowrap">
              STEM Generator
            </span>
          </Link>
          
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="flex-shrink-0 hover:bg-white/10 rounded-lg"
              data-testid="sidebar-close-btn"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 custom-scrollbar">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => isMobile && onClose()}
                  data-testid={`sidebar-link-${item.label.toLowerCase()}`}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative',
                    active 
                      ? 'text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  <Icon className={cn(
                    'w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110',
                    active && 'text-white'
                  )} />
                  
                  <span className="font-medium text-sm">{item.label}</span>
                  
                  {/* Active indicator */}
                  {active && (
                    <div className="absolute inset-0 bg-gradient-primary rounded-lg shadow-glow -z-10" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom Section - Theme Toggle, TTS Visualizer & Voice Commands */}
        <div className="p-4 border-t border-white/10 space-y-2">
          <div className="flex gap-3 flex-row items-center justify-center">
            <ThemeToggle />
            
            {/* TTS Visualizer - Shows when AI is speaking */}
            <TTSVisualizer
              isActive={isTTSActive}
              color="#3b82f6"
              lineCount={4}
              height={24}
              className="transition-opacity duration-300"
            />
            
            <VoiceCommand />
          </div>
        </div>
      </aside>

      {/* Spacer for desktop - only when not mobile */}
      {!isMobile && (
        <div className="w-64" />
      )}
    </>
  );
};

export default Sidebar;
