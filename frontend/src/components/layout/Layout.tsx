import React, { type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { FloatingNav } from './FloatingNav';
import { FloatingSettings } from './FloatingSettings';
import FooterAbout from './FooterAbout';
import { UniversalChat } from '@/components/UniversalChat';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { pathname } = useLocation();
  const showFooter = !pathname.startsWith('/about');

  return (
    <div className="relative min-h-screen">
      {/* Background - Base layer */}
      <div className="fixed inset-0 bg-background" style={{ zIndex: 0 }} />
      
      {/* Animated background gradient */}
      <div className="fixed inset-0 bg-gradient-hero opacity-5 animate-gradient-shift pointer-events-none" style={{ zIndex: 1 }} />
      
      {/* Main Content - Stacked on top of backgrounds */}
      <main className="relative min-h-screen pb-24" style={{ zIndex: 10 }}>
        {children}
      </main>
  
      {/* Global Note From Creator footer (hidden on About page) */}
      {showFooter && <FooterAbout />}
      
      {/* Floating Navigation Docks */}
      <FloatingNav />
      <FloatingSettings />
      
      {/* Universal Chat Widget - Available on all pages */}
      <UniversalChat />
    </div>
  );
};

export default Layout;
