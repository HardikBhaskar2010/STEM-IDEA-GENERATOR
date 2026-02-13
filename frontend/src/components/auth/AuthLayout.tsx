import React from 'react';
import BackgroundEffects from './BackgroundEffects';
import HeroSection from './HeroSection';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background effects */}
      <BackgroundEffects />
      
      {/* Main content */}
      <div className="relative z-10 min-h-screen grid lg:grid-cols-2 gap-8 items-center">
        {/* Left: Hero Section */}
        <div className="hidden lg:flex">
          <HeroSection />
        </div>
        
        {/* Right: Auth Form */}
        <div className="flex items-center justify-center px-4 py-12">
          {children}
        </div>
      </div>
      
      {/* Mobile hero - show at top on small screens */}
      <div className="lg:hidden relative z-10 px-4 pt-8">
        <div className="text-center space-y-4 mb-8">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-orange-500 text-xs font-medium tracking-wider uppercase">
              Incoming Transmission
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white">
            STEM Idea Adventure
          </h1>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-violet-400 to-purple-500 bg-clip-text text-transparent">
            starts here
          </h2>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;