import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Zap, Rocket, ArrowRight, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEffects } from '@/contexts/EffectsContext';
import { effectsRegistry } from '@/effects/core/EffectsRegistry';

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const { colorTheme } = usePreferences();
  const { isAuthenticated, isLoading } = useAuth();
  const { activeTextEffect, activeTextSettings, effectsEnabled } = useEffects();
  const [isVisible, setIsVisible] = useState(false);
  
  // Get active text effect component
  const textEffect = activeTextEffect && effectsEnabled ? effectsRegistry.get(activeTextEffect) : null;

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
      {/* ==================== SECTION 1: HERO OVERLAY (Above GlobalBackground's ScrollDrivenHero) ==================== */}
      <section className="relative h-screen flex items-center justify-center">
        <div className={`text-center space-y-6 transition-all duration-1000 relative z-10 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}>
          {/* Main title with stunning animation + Effects Engine integration */}
          <div className="space-y-4">
            {textEffect && textEffect.type === 'text' ? (
              <textEffect.component settings={activeTextSettings} isPreview={false}>
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
              </textEffect.component>
            ) : (
              <>
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
              </>
            )}
          </div>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto drop-shadow-lg">
            Embark on a journey through worlds of creativity
          </p>
        </div>
      </section>

      {/* ==================== SECTION 2: IDENTITY / MISSION ==================== */}
      <section className="relative py-24 px-6 bg-gradient-to-b from-black via-gray-900 to-black">
        <div className="max-w-7xl mx-auto">
          {/* Section Headline */}
          <div className={`text-center mb-16 transition-all duration-1000 delay-200 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              <span 
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: isBlackWhite 
                    ? 'linear-gradient(to right, #ffffff, #e5e5e5)' 
                    : 'linear-gradient(to right, #a855f7, #ec4899, #8b5cf6)',
                }}
              >
                Where Innovation Begins
              </span>
            </h2>
            <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">
              STEM Idea Adventure combines AI intelligence with stunning visuals to inspire 
              creativity and innovation in every project you create.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1: AI-Powered Ideas */}
            <div 
              className={`group relative overflow-hidden rounded-2xl p-8 transition-all duration-700 delay-300 hover:scale-105 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{
                background: isBlackWhite 
                  ? 'rgba(255, 255, 255, 0.05)' 
                  : 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(139, 92, 246, 0.05))',
                border: isBlackWhite ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(168, 85, 247, 0.2)',
                backdropFilter: 'blur(10px)',
              }}
            >
              {/* Glow Orb */}
              <div 
                className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-500"
                style={{
                  background: isBlackWhite ? 'rgba(255, 255, 255, 0.3)' : '#a855f7',
                }}
              />
              
              <div className="relative z-10">
                <Sparkles className="h-12 w-12 mb-4" style={{ color: isBlackWhite ? '#ffffff' : '#a855f7' }} />
                <h3 className="text-2xl font-bold mb-3 text-white">AI-Powered Ideas</h3>
                <p className="text-gray-400">
                  Generate unique project concepts tailored to your interests and skill level 
                  with our advanced AI engine.
                </p>
              </div>
            </div>

            {/* Card 2: 500+ Components */}
            <div 
              className={`group relative overflow-hidden rounded-2xl p-8 transition-all duration-700 delay-400 hover:scale-105 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{
                background: isBlackWhite 
                  ? 'rgba(255, 255, 255, 0.05)' 
                  : 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05))',
                border: isBlackWhite ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(59, 130, 246, 0.2)',
                backdropFilter: 'blur(10px)',
              }}
            >
              {/* Glow Orb */}
              <div 
                className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-500"
                style={{
                  background: isBlackWhite ? 'rgba(255, 255, 255, 0.3)' : '#3b82f6',
                }}
              />
              
              <div className="relative z-10">
                <Zap className="h-12 w-12 mb-4" style={{ color: isBlackWhite ? '#ffffff' : '#3b82f6' }} />
                <h3 className="text-2xl font-bold mb-3 text-white">500+ Components</h3>
                <p className="text-gray-400">
                  Explore our vast library of electronic components with 3D previews, 
                  detailed specs, and project recommendations.
                </p>
              </div>
            </div>

            {/* Card 3: Learn By Doing */}
            <div 
              className={`group relative overflow-hidden rounded-2xl p-8 transition-all duration-700 delay-500 hover:scale-105 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{
                background: isBlackWhite 
                  ? 'rgba(255, 255, 255, 0.05)' 
                  : 'linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(219, 39, 119, 0.05))',
                border: isBlackWhite ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(236, 72, 153, 0.2)',
                backdropFilter: 'blur(10px)',
              }}
            >
              {/* Glow Orb */}
              <div 
                className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-500"
                style={{
                  background: isBlackWhite ? 'rgba(255, 255, 255, 0.3)' : '#ec4899',
                }}
              />
              
              <div className="relative z-10">
                <Rocket className="h-12 w-12 mb-4" style={{ color: isBlackWhite ? '#ffffff' : '#ec4899' }} />
                <h3 className="text-2xl font-bold mb-3 text-white">Learn By Doing</h3>
                <p className="text-gray-400">
                  Access hands-on tutorials, interactive lessons, and step-by-step guides 
                  to master STEM concepts through practical application.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SECTION 3: CALL TO ACTION ==================== */}
      <section className="relative py-32 px-6 bg-gradient-to-b from-black via-purple-950/20 to-black">
        <div className="max-w-4xl mx-auto text-center">
          {/* Headline */}
          <div className={`mb-10 transition-all duration-1000 delay-600 ${
            isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}>
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-black mb-6">
              <span 
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: isBlackWhite 
                    ? 'linear-gradient(to right, #ffffff, #e5e5e5)' 
                    : 'linear-gradient(to right, #a855f7, #ec4899)',
                }}
              >
                {isAuthenticated ? 'Welcome Back!' : 'Ready to Create?'}
              </span>
            </h2>
            <p className="text-xl md:text-2xl text-gray-300">
              {isAuthenticated 
                ? 'Continue your journey of innovation and discovery' 
                : 'Start your adventure into the world of STEM creativity'}
            </p>
          </div>

          {/* CTA Buttons */}
          {!isLoading && (
            <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 transition-all duration-1000 delay-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}>
              {isAuthenticated ? (
                // Authenticated: Single "Enter Dashboard" button
                <Button 
                  onClick={handleEnterDashboard} 
                  data-testid="enter-dashboard-btn"
                  size="lg"
                  className="text-lg px-8 py-6 rounded-xl font-semibold shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105"
                  style={{
                    background: isBlackWhite 
                      ? 'linear-gradient(to right, #ffffff, #e5e5e5)' 
                      : 'linear-gradient(to right, #a855f7, #8b5cf6)',
                    color: isBlackWhite ? '#000000' : '#ffffff',
                  }}
                >
                  Enter Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              ) : (
                // Not Authenticated: "Get Started" + "Sign In" buttons
                <>
                  <Button 
                    onClick={handleGetStarted} 
                    data-testid="get-started-btn"
                    size="lg"
                    className="text-lg px-8 py-6 rounded-xl font-semibold shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105"
                    style={{
                      background: isBlackWhite 
                        ? 'linear-gradient(to right, #ffffff, #e5e5e5)' 
                        : 'linear-gradient(to right, #a855f7, #8b5cf6)',
                      color: isBlackWhite ? '#000000' : '#ffffff',
                    }}
                  >
                    Get Started
                    <Rocket className="ml-2 h-5 w-5" />
                  </Button>
                  <Button 
                    onClick={handleSignIn} 
                    variant="outline"
                    data-testid="sign-in-btn"
                    size="lg"
                    className="text-lg px-8 py-6 rounded-xl font-semibold border-2 hover:bg-white/10 transition-all duration-300 hover:scale-105"
                    style={{
                      borderColor: isBlackWhite ? '#ffffff' : '#a855f7',
                      color: isBlackWhite ? '#ffffff' : '#a855f7',
                    }}
                  >
                    Sign In
                    <LogIn className="ml-2 h-5 w-5" />
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Welcome;


