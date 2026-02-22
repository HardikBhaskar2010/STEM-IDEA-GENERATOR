import React, { type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { FloatingNav } from './FloatingNav';
import { FloatingSettings } from './FloatingSettings';
import FooterAbout from './FooterAbout';
import { UniversalChat } from '@/components/UniversalChat';
import FloatingLines from '@/components/FloatingLines';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { pathname } = useLocation();
  const showFooter = !pathname.startsWith('/about');

  return (
    <div className="min-h-screen bg-background">
      {/* Floating Lines Background */}
      <FloatingLines
        topLineCount={3}
        middleLineCount={2}
        bottomLineCount={4}
        topLineDistance={100}
        middleLineDistance={150}
        bottomLineDistance={200}
        animationSpeed={1}
        enableTop={true}
        enableMiddle={true}
        enableBottom={true}
        interactive={true}
        bendRadius={100}
        bendStrength={0.5}
        mixBlendMode="screen"
      />

      {/* Animated background gradient */}
      <div className="fixed inset-0 bg-gradient-hero opacity-5 animate-gradient-shift pointer-events-none" />

      {/* Main Content - Full Width */}
      <main className="relative min-h-screen pb-24">
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
