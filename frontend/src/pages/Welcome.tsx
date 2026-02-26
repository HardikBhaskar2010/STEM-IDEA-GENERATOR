import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Zap, Rocket, ArrowRight, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useAuth } from '@/contexts/AuthContext';
import ScrollCinematicHero from '@/components/ScrollCinematicHero';

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const { colorTheme } = usePreferences();
  const { isAuthenticated, isLoading } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animations after mount
    const timer1 = setTimeout(() => setIsVisible(true), 100);
    
    return () => {
      clearTimeout(timer1);
    };
  }, []);

  // No auto-redirect logic - let users experience the page

  const handleEnterDashboard = () => {
    navigate('/dashboard');
  };

  const handleGetStarted = () => {
    navigate('/signup');
  };

  const handleSignIn = () => {
    navigate('/login');
  };

  // Determine if we're in black and white theme
  const isBlackWhite = colorTheme === 'allblack';

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-black">
      {/* ==================== SECTION 1: CINEMATIC HERO ==================== */}
      <ScrollCinematicHero
        totalFrames={120}
        frameBasePath="/frames/ezgif-frame-"
        scrollMultiplier={3}
        overlayContent={
          <div className={`text-center space-y-6 transition-all duration-1000 ${
            isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}>
            {/* Main title with stunning animation */}
            <div className="space-y-4">
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tight drop-shadow-2xl">
                <span 
                  className="inline-block bg-clip-text text-transparent"
                  style={{
                    backgroundImage: 'linear-gradient(to right, #ffffff, #e0e7ff, #c7d2fe)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  STEM
                </span>
              </h1>
              <h2 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight drop-shadow-2xl">
                <span 
                  className="inline-block bg-clip-text text-transparent"
                  style={{
                    backgroundImage: 'linear-gradient(to right, #ddd6fe, #ffffff, #c7d2fe)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Idea Adventure
                </span>
              </h2>
            </div>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto drop-shadow-lg">
              Embark on a journey through worlds of creativity
            </p>
          </div>
        }
      />

      {/* ==================== SECTION 2: IDENTITY / MISSION ==================== */}
      <div className="relative bg-background">
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
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-20">
          <div className={`text-center space-y-12 max-w-5xl mx-auto transition-all duration-2000 ${
            isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}>
            
            {/* Sparkle icon animation */}
            <div className="flex justify-center">
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

            {/* Identity headline */}
            <div className="space-y-6">
              <h3 className="text-4xl md:text-6xl font-bold tracking-tight">
                <span 
                  className="inline-block bg-clip-text text-transparent"
                  style={{
                    backgroundImage: isBlackWhite 
                      ? 'linear-gradient(to right, hsl(0 0% 100%), hsl(0 0% 70%), hsl(0 0% 100%))'
                      : 'var(--gradient-primary)',
                  }}
                >
                  Where Innovation Begins
                </span>
              </h3>
              
              {/* Mission statement */}
              <p className={`text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed transition-all duration-1000 delay-300 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}>
                STEM Idea Adventure is your AI-powered companion for turning curiosity into creation. 
                Generate innovative project ideas, access 500+ components, and learn through interactive experiences.
              </p>
            </div>

            {/* Feature highlights - theme aware */}
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 transition-all duration-1000 delay-500 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              {/* Feature 1: AI-Powered */}
              <div className="flex flex-col items-center gap-4 p-6 rounded-2xl backdrop-blur-sm transition-transform hover:scale-105"
                style={{
                  backgroundColor: isBlackWhite ? 'hsl(0 0% 15% / 0.5)' : 'hsl(var(--primary) / 0.1)',
                  borderWidth: '1px',
                  borderColor: isBlackWhite ? 'hsl(0 0% 30% / 0.5)' : 'hsl(var(--primary) / 0.2)'
                }}
              >
                <div className="p-4 rounded-full"
                  style={{
                    backgroundColor: isBlackWhite ? 'hsl(0 0% 25% / 0.5)' : 'hsl(var(--primary) / 0.2)',
                  }}
                >
                  <Zap 
                    className="w-8 h-8" 
                    style={{ color: isBlackWhite ? 'hsl(0 0% 90%)' : 'hsl(var(--primary))' }}
                  />
                </div>
                <h4 className="text-xl font-bold" style={{ color: isBlackWhite ? 'hsl(0 0% 95%)' : 'hsl(var(--foreground))' }}>
                  AI-Powered Ideas
                </h4>
                <p className="text-sm text-muted-foreground text-center">
                  Generate unique project concepts tailored to your interests and skill level
                </p>
              </div>

              {/* Feature 2: Component Library */}
              <div className="flex flex-col items-center gap-4 p-6 rounded-2xl backdrop-blur-sm transition-transform hover:scale-105"
                style={{
                  backgroundColor: isBlackWhite ? 'hsl(0 0% 15% / 0.5)' : 'hsl(var(--secondary) / 0.1)',
                  borderWidth: '1px',
                  borderColor: isBlackWhite ? 'hsl(0 0% 30% / 0.5)' : 'hsl(var(--secondary) / 0.2)'
                }}
              >
                <div className="p-4 rounded-full"
                  style={{
                    backgroundColor: isBlackWhite ? 'hsl(0 0% 25% / 0.5)' : 'hsl(var(--secondary) / 0.2)',
                  }}
                >
                  <Rocket 
                    className="w-8 h-8" 
                    style={{ color: isBlackWhite ? 'hsl(0 0% 90%)' : 'hsl(var(--secondary))' }}
                  />
                </div>
                <h4 className="text-xl font-bold" style={{ color: isBlackWhite ? 'hsl(0 0% 95%)' : 'hsl(var(--foreground))' }}>
                  500+ Components
                </h4>
                <p className="text-sm text-muted-foreground text-center">
                  Access a vast library of reusable building blocks for your projects
                </p>
              </div>

              {/* Feature 3: Interactive Learning */}
              <div className="flex flex-col items-center gap-4 p-6 rounded-2xl backdrop-blur-sm transition-transform hover:scale-105"
                style={{
                  backgroundColor: isBlackWhite ? 'hsl(0 0% 15% / 0.5)' : 'hsl(var(--accent) / 0.1)',
                  borderWidth: '1px',
                  borderColor: isBlackWhite ? 'hsl(0 0% 30% / 0.5)' : 'hsl(var(--accent) / 0.2)'
                }}
              >
                <div className="p-4 rounded-full"
                  style={{
                    backgroundColor: isBlackWhite ? 'hsl(0 0% 25% / 0.5)' : 'hsl(var(--accent) / 0.2)',
                  }}
                >
                  <Sparkles 
                    className="w-8 h-8" 
                    style={{ color: isBlackWhite ? 'hsl(0 0% 90%)' : 'hsl(var(--accent))' }}
                  />
                </div>
                <h4 className="text-xl font-bold" style={{ color: isBlackWhite ? 'hsl(0 0% 95%)' : 'hsl(var(--foreground))' }}>
                  Learn By Doing
                </h4>
                <p className="text-sm text-muted-foreground text-center">
                  Hands-on tutorials and challenges that make learning fun and engaging
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== SECTION 3: CALL TO ACTION ==================== */}
      <div className="relative bg-background border-t"
        style={{
          borderColor: isBlackWhite ? 'hsl(0 0% 20%)' : 'hsl(var(--border))'
        }}
      >
        {/* Background effects */}
        <div 
          className="absolute inset-0"
          style={{
            background: isBlackWhite 
              ? 'linear-gradient(to bottom, hsl(0 0% 0%), hsl(0 0% 3%))'
              : 'linear-gradient(to bottom, hsl(var(--background)), hsl(var(--primary) / 0.05))'
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-[70vh] px-4 py-20">
          <div className={`text-center space-y-10 max-w-3xl mx-auto transition-all duration-1000 delay-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            
            {/* CTA Headline */}
            <div className="space-y-4">
              <h3 className="text-4xl md:text-5xl font-bold tracking-tight">
                <span 
                  className="inline-block bg-clip-text text-transparent"
                  style={{
                    backgroundImage: isBlackWhite 
                      ? 'linear-gradient(to right, hsl(0 0% 100%), hsl(0 0% 80%))'
                      : 'var(--gradient-primary)',
                  }}
                >
                  {isAuthenticated ? 'Welcome Back!' : 'Ready to Create?'}
                </span>
              </h3>
              <p className="text-lg md:text-xl text-muted-foreground">
                {isAuthenticated 
                  ? 'Continue your journey of innovation and discovery'
                  : 'Join thousands of creators bringing their ideas to life'
                }
              </p>
            </div>

            {/* Conditional CTA Buttons */}
            {!isLoading && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
                {isAuthenticated ? (
                  // Authenticated: Show "Enter Dashboard" button
                  <Button
                    onClick={handleEnterDashboard}
                    size="lg"
                    className="group relative px-12 py-6 text-xl font-bold text-primary-foreground rounded-full transition-all duration-300 transform hover:scale-105 w-full sm:w-auto"
                    style={{
                      background: isBlackWhite 
                        ? 'linear-gradient(to right, hsl(0 0% 100%), hsl(0 0% 85%))'
                        : 'var(--gradient-primary)',
                      boxShadow: isBlackWhite 
                        ? '0 25px 50px -12px hsl(0 0% 50% / 0.5)'
                        : 'var(--shadow-glow)',
                      color: isBlackWhite ? 'hsl(0 0% 0%)' : 'hsl(var(--primary-foreground))'
                    }}
                    data-testid="enter-dashboard-btn"
                  >
                    <span className="relative z-10 flex items-center gap-3">
                      Enter Dashboard
                      <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
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
                ) : (
                  // Not Authenticated: Show "Get Started" + "Sign In" buttons
                  <>
                    <Button
                      onClick={handleGetStarted}
                      size="lg"
                      className="group relative px-12 py-6 text-xl font-bold text-primary-foreground rounded-full transition-all duration-300 transform hover:scale-105 w-full sm:w-auto"
                      style={{
                        background: isBlackWhite 
                          ? 'linear-gradient(to right, hsl(0 0% 100%), hsl(0 0% 85%))'
                          : 'var(--gradient-primary)',
                        boxShadow: isBlackWhite 
                          ? '0 25px 50px -12px hsl(0 0% 50% / 0.5)'
                          : 'var(--shadow-glow)',
                        color: isBlackWhite ? 'hsl(0 0% 0%)' : 'hsl(var(--primary-foreground))'
                      }}
                      data-testid="get-started-btn"
                    >
                      <span className="relative z-10 flex items-center gap-3">
                        Get Started
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

                    <Button
                      onClick={handleSignIn}
                      size="lg"
                      variant="outline"
                      className="group px-12 py-6 text-xl font-semibold rounded-full transition-all duration-300 transform hover:scale-105 w-full sm:w-auto"
                      style={{
                        borderColor: isBlackWhite ? 'hsl(0 0% 40%)' : 'hsl(var(--primary))',
                        color: isBlackWhite ? 'hsl(0 0% 90%)' : 'hsl(var(--primary))'
                      }}
                      data-testid="sign-in-btn"
                    >
                      <span className="flex items-center gap-3">
                        Sign In
                        <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Loading state */}
            {isLoading && (
              <div className="flex items-center justify-center gap-3 text-muted-foreground">
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <span>Loading...</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom gradient overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </div>
    </div>
  );
};

export default Welcome;


