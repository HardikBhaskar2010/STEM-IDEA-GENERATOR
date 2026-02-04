import React, { useState, useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Zap } from 'lucide-react';
import Sidebar from './Sidebar';
import FooterAbout from './FooterAbout';
import { Button } from '@/components/ui/button';
import { UniversalChat } from '@/components/UniversalChat';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const showFooter = !pathname.startsWith('/about');

  // Check if mobile on mount and window resize
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(false); // Close sidebar when switching to desktop
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Animated background gradient */}
      <div className="fixed inset-0 bg-gradient-hero opacity-5 animate-gradient-shift pointer-events-none" />
      
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col">
        {/* Mobile Header with Menu Button */}
        {isMobile && (
          <header className="sticky top-0 z-30 bg-black/95 backdrop-blur-xl border-b border-white/10">
            <div className="flex items-center justify-between px-4 py-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="hover:bg-white/10 rounded-lg"
                data-testid="mobile-menu-btn"
              >
                <Menu className="w-6 h-6" />
              </Button>
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-primary animate-glow-pulse flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-bold text-gradient">STEM Generator</span>
              </div>
              
              <div className="w-10" /> {/* Spacer for centering */}
            </div>
          </header>
        )}
        
        <main className="relative flex-1">
          {children}
        </main>

        {/* Global Note From Creator footer (hidden on About page) */}
        {showFooter && <FooterAbout />}
      </div>
      
      {/* Universal Chat Widget - Available on all pages */}
      <UniversalChat />
    </div>
  );
};

export default Layout;
