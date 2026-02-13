import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Zap, Cpu, BookOpen, Home, Info, GraduationCap, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHoverAnimation } from '@/hooks/useHoverAnimation';
import { useMicroInteraction } from '@/hooks/useMicroInteraction';
import { createAnimation } from '@/lib/animation';
import ThemeToggle from '@/components/ui/theme-toggle';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useCompetition } from '@/contexts/CompetitionContext';
import { Badge } from '@/components/ui/badge';
import { NavbarAuthButton } from '@/components/auth/NavbarAuthButton';

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const { colorTheme } = usePreferences();
  const { isCompetitionMode, userProgress } = useCompetition();

  // Animation hooks
  const logoHoverRef = useHoverAnimation<HTMLAnchorElement>({ 
    scale: 1.05, 
    lift: 2, 
    duration: 200 
  });
  const { ref: menuButtonRef, trigger: triggerMenuAnimation } = useMicroInteraction<HTMLButtonElement>({ 
    type: 'click', 
    intensity: 'subtle' 
  });

  // Determine logo classes based on theme
  const getLogoClasses = () => {
    if (colorTheme === 'allblack') {
      return 'bg-black/80 border border-gray-700'; // Black background with gray border for black theme
    }
    return 'bg-gradient-primary animate-glow-pulse'; // Gradient for other themes
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/generator', label: 'Generator', icon: Zap },
    { path: '/competition', label: 'Competition', icon: Trophy },
    { path: '/components', label: 'Components', icon: Cpu },
    { path: '/library', label: 'Library', icon: BookOpen },
    { path: '/learn', label: 'Learn', icon: GraduationCap },
    { path: '/about', label: 'About', icon: Info },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Scroll detection effect
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Update scrolled state for styling
      setIsScrolled(currentScrollY > 10);
      
      // Hide/show navbar based on scroll direction
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down - hide navbar
        setIsVisible(false);
      } else {
        // Scrolling up - show navbar
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Animate navbar visibility
  useEffect(() => {
    if (navRef.current) {
      createAnimation({
        targets: navRef.current,
        translateY: isVisible ? 0 : -100,
        duration: 300,
        easing: 'easeOutCubic',
      });
    }
  }, [isVisible]);

  // Mobile menu animation
  useEffect(() => {
    if (mobileMenuRef.current) {
      if (isMenuOpen) {
        createAnimation({
          targets: mobileMenuRef.current,
          height: [0, 'auto'],
          opacity: [0, 1],
          duration: 300,
          easing: 'easeOutCubic',
        });
      }
    }
  }, [isMenuOpen]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMenuOpen && 
          mobileMenuRef.current && 
          navRef.current &&
          !navRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleMenuToggle = () => {
    triggerMenuAnimation();
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav 
      ref={navRef}
      className={`
        fixed top-0 left-0 right-0 z-50 transition-all duration-300
        ${isScrolled 
          ? 'glass-effect border-b border-white/5 backdrop-blur-2xl bg-black/40' 
          : 'bg-transparent'
        }
      `}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link 
            ref={logoHoverRef}
            to="/" 
            className="flex items-center space-x-2 relative"
          >
            <div className={`w-10 h-10 ${getLogoClasses()} rounded-lg flex items-center justify-center`}>
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gradient">STEM Project Generator</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {/* Competition Indicator */}
            {isCompetitionMode && userProgress && (
              <Badge 
                variant="outline" 
                className="mr-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400 px-3 py-1 text-xs font-semibold"
                data-testid="competition-indicator"
              >
                {userProgress.current_level} • {userProgress.total_xp} XP
              </Badge>
            )}
            <ThemeToggle />
            {navItems.map((item, _index) => {
              const Icon = item.icon as React.ComponentType<{ className?: string }>;
              const active = isActive(item.path);
              
              return (
                <div key={item.path} className="relative">
                  <Link
                    to={item.path}
                    className={`
                      relative px-4 py-2 rounded-lg flex items-center space-x-2 
                      transition-all duration-200 group
                      ${active 
                        ? 'text-white' 
                        : 'text-foreground hover:text-primary'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                    <span className="font-medium">{item.label}</span>
                    
                    {/* Active indicator */}
                    {active && (
                      <div className="absolute inset-0 bg-gradient-primary rounded-lg shadow-glow -z-10" />
                    )}
                    
                    {/* Hover effect */}
                    <div className="absolute inset-0 bg-muted rounded-lg opacity-0 group-hover:opacity-100 transition-opacity -z-20" />
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Mobile Menu Button */}
          <Button
            ref={menuButtonRef}
            variant="ghost"
            size="icon"
            className="md:hidden relative"
            onClick={handleMenuToggle}
          >
            <div className="relative w-5 h-5">
              <Menu 
                className={`absolute inset-0 transition-all duration-200 ${
                  isMenuOpen ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'
                }`} 
              />
              <X 
                className={`absolute inset-0 transition-all duration-200 ${
                  isMenuOpen ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'
                }`} 
              />
            </div>
          </Button>
        </div>

        {/* Mobile Navigation */}
        <div 
          ref={mobileMenuRef}
          className={`
            md:hidden overflow-hidden border-t border-border transition-all duration-300
            ${isMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}
          `}
        >
          <div className="py-4 space-y-2">
            {/* Theme Toggle in Mobile Menu */}
            <div className="px-4 pb-2 border-b border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Theme</span>
                <ThemeToggle />
              </div>
            </div>
            
            <div className="flex flex-col space-y-1">
              {navItems.map((item, index) => {
                const Icon = item.icon as React.ComponentType<{ className?: string }>;
                const active = isActive(item.path);
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`
                      relative px-4 py-3 rounded-lg flex items-center space-x-3 
                      transition-all duration-200 group
                      ${active 
                        ? 'text-white' 
                        : 'text-foreground hover:text-primary'
                      }
                    `}
                    style={{ 
                      animationDelay: `${index * 50}ms`,
                      animation: isMenuOpen ? 'slideInFromRight 0.3s ease-out forwards' : undefined
                    }}
                  >
                    <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                    <span className="font-medium">{item.label}</span>
                    
                    {/* Active indicator */}
                    {active && (
                      <div className="absolute inset-0 bg-gradient-primary rounded-lg shadow-glow -z-10" />
                    )}
                    
                    {/* Hover effect */}
                    <div className="absolute inset-0 bg-muted rounded-lg opacity-0 group-hover:opacity-100 transition-opacity -z-20" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
