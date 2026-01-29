import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Zap, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/contexts/PreferencesContext';

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const { colorTheme } = usePreferences();
  const [isVisible, setIsVisible] = useState(false);
  const [particlesReady, setParticlesReady] = useState(false);

  useEffect(() => {
    // Trigger animations after mount
    const timer1 = setTimeout(() => setIsVisible(true), 100);
    const timer2 = setTimeout(() => setParticlesReady(true), 500);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const handleEnter = () => {
    navigate('/dashboard');
  };

  // Determine if we're in black and white theme
  const isBlackWhite = colorTheme === 'allblack';

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Animated gradient background - uses theme colors */}
      <div 
        className="absolute inset-0"
        style={{
          background: isBlackWhite 
            ? 'linear-gradient(to bottom right, hsl(0 0% 0%), hsl(0 0% 5%), hsl(0 0% 0%))'
            : 'linear-gradient(to bottom right, hsl(var(--background)), hsl(var(--primary) / 0.1), hsl(var(--background)))'
        }}
      >
        <div 
          className="absolute inset-0 animate-pulse-slow"
          style={{
            background: isBlackWhite
              ? 'radial-gradient(ellipse at center, hsl(0 0% 20% / 0.3), transparent)'
              : 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.2), transparent)'
          }}
        />
      </div>

      {/* Animated particles - uses theme colors */}
      <div className="absolute inset-0 overflow-hidden">
        {particlesReady && Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full animate-float"
            style={{
              backgroundColor: isBlackWhite 
                ? `hsl(0 0% ${60 + Math.random() * 40}%)`
                : `hsl(var(--primary))`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`,
              opacity: Math.random() * 0.7 + 0.3,
            }}
          />
        ))}
      </div>

      {/* Glowing orbs - uses theme colors */}
      <div 
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl animate-float-slow"
        style={{
          backgroundColor: isBlackWhite 
            ? 'hsl(0 0% 30% / 0.2)'
            : 'hsl(var(--primary) / 0.2)'
        }}
      />
      <div 
        className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl animate-float-slow"
        style={{
          backgroundColor: isBlackWhite 
            ? 'hsl(0 0% 40% / 0.2)'
            : 'hsl(var(--secondary) / 0.2)',
          animationDelay: '2s'
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        <div className={`text-center space-y-8 transition-all duration-2000 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}>
          
          {/* Sparkle icon animation */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <Sparkles 
                className="w-20 h-20 animate-pulse"
                style={{ color: isBlackWhite ? 'hsl(0 0% 90%)' : 'hsl(var(--primary))' }}
              />
              <div className="absolute inset-0 animate-ping">
                <Sparkles 
                  className="w-20 h-20 opacity-75"
                  style={{ color: isBlackWhite ? 'hsl(0 0% 90%)' : 'hsl(var(--primary))' }}
                />
              </div>
            </div>
          </div>

          {/* Main title with stunning animation - theme aware */}
          <div className="space-y-4">
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tight">
              <span 
                className="inline-block animate-glow-text bg-clip-text text-transparent animate-gradient-x"
                style={{
                  backgroundImage: isBlackWhite 
                    ? 'linear-gradient(to right, hsl(0 0% 100%), hsl(0 0% 70%), hsl(0 0% 100%))'
                    : 'var(--gradient-primary)',
                  backgroundSize: '200% auto'
                }}
              >
                STEM
              </span>
            </h1>
            <h2 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight">
              <span 
                className="inline-block animate-glow-text-delayed bg-clip-text text-transparent animate-gradient-x"
                style={{
                  backgroundImage: isBlackWhite 
                    ? 'linear-gradient(to right, hsl(0 0% 85%), hsl(0 0% 100%), hsl(0 0% 85%))'
                    : 'var(--gradient-secondary)',
                  backgroundSize: '200% auto'
                }}
              >
                Idea Adventure
              </span>
            </h2>
          </div>

          {/* Subtitle */}
          <p className={`text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto transition-all duration-1000 delay-500 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            Embark on a journey to discover, create, and innovate with AI-powered project ideas
          </p>

          {/* Feature badges - theme aware */}
          <div className={`flex flex-wrap justify-center gap-4 pt-8 transition-all duration-1000 delay-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <div 
              className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm"
              style={{
                backgroundColor: isBlackWhite ? 'hsl(0 0% 20% / 0.5)' : 'hsl(var(--primary) / 0.2)',
                borderWidth: '1px',
                borderColor: isBlackWhite ? 'hsl(0 0% 40% / 0.5)' : 'hsl(var(--primary) / 0.3)'
              }}
            >
              <Zap 
                className="w-4 h-4" 
                style={{ color: isBlackWhite ? 'hsl(0 0% 90%)' : 'hsl(var(--primary))' }}
              />
              <span 
                className="text-sm font-semibold"
                style={{ color: isBlackWhite ? 'hsl(0 0% 85%)' : 'hsl(var(--primary))' }}
              >
                AI-Powered
              </span>
            </div>
            <div 
              className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm"
              style={{
                backgroundColor: isBlackWhite ? 'hsl(0 0% 25% / 0.5)' : 'hsl(var(--secondary) / 0.2)',
                borderWidth: '1px',
                borderColor: isBlackWhite ? 'hsl(0 0% 45% / 0.5)' : 'hsl(var(--secondary) / 0.3)'
              }}
            >
              <Rocket 
                className="w-4 h-4" 
                style={{ color: isBlackWhite ? 'hsl(0 0% 90%)' : 'hsl(var(--secondary))' }}
              />
              <span 
                className="text-sm font-semibold"
                style={{ color: isBlackWhite ? 'hsl(0 0% 85%)' : 'hsl(var(--secondary))' }}
              >
                500+ Components
              </span>
            </div>
            <div 
              className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm"
              style={{
                backgroundColor: isBlackWhite ? 'hsl(0 0% 30% / 0.5)' : 'hsl(var(--accent) / 0.2)',
                borderWidth: '1px',
                borderColor: isBlackWhite ? 'hsl(0 0% 50% / 0.5)' : 'hsl(var(--accent) / 0.3)'
              }}
            >
              <Sparkles 
                className="w-4 h-4" 
                style={{ color: isBlackWhite ? 'hsl(0 0% 90%)' : 'hsl(var(--accent))' }}
              />
              <span 
                className="text-sm font-semibold"
                style={{ color: isBlackWhite ? 'hsl(0 0% 85%)' : 'hsl(var(--accent))' }}
              >
                Interactive Learning
              </span>
            </div>
          </div>

          {/* CTA Button - theme aware */}
          <div className={`pt-12 transition-all duration-1000 delay-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <Button
              onClick={handleEnter}
              size="lg"
              className="group relative px-12 py-6 text-xl font-bold text-primary-foreground rounded-full transition-all duration-300 transform hover:scale-105"
              style={{
                background: isBlackWhite 
                  ? 'linear-gradient(to right, hsl(0 0% 100%), hsl(0 0% 85%))'
                  : 'var(--gradient-primary)',
                boxShadow: isBlackWhite 
                  ? '0 25px 50px -12px hsl(0 0% 50% / 0.5)'
                  : 'var(--shadow-glow)',
                color: isBlackWhite ? 'hsl(0 0% 0%)' : 'hsl(var(--primary-foreground))'
              }}
              data-testid="start-journey-btn"
            >
              <span className="relative z-10 flex items-center gap-3">
                Start Your Journey
                <Rocket className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </span>
              <div 
                className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 blur-xl transition-opacity"
                style={{
                  background: isBlackWhite 
                    ? 'linear-gradient(to right, hsl(0 0% 100%), hsl(0 0% 80%))'
                    : 'var(--gradient-primary)'
                }}
              />
            </Button>
          </div>

          {/* Scroll indicator - theme aware */}
          <div className={`pt-16 transition-all duration-1000 delay-1200 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}>
            <div className="animate-bounce">
              <div 
                className="w-6 h-10 rounded-full flex items-start justify-center p-2"
                style={{
                  borderWidth: '2px',
                  borderColor: isBlackWhite ? 'hsl(0 0% 50% / 0.5)' : 'hsl(var(--primary) / 0.5)'
                }}
              >
                <div 
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{
                    backgroundColor: isBlackWhite ? 'hsl(0 0% 90%)' : 'hsl(var(--primary))'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
};

export default Welcome;
