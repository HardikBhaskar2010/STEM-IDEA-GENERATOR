import React, { Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { SpeedInsights } from "@vercel/speed-insights/react"
import { Analytics } from "@vercel/analytics/react"
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AnimationProvider } from "@/contexts/AnimationContext";
import { PreferencesProvider } from "@/contexts/PreferencesContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { PerfProvider } from "@/contexts/PerfContext";
import { ThreeDProvider } from "@/contexts/ThreeDContext";
import { TTSProvider } from "@/contexts/TTSContext";
import { CodeGenerationProvider } from "@/contexts/CodeGenerationContext";
import { CompetitionProvider } from "@/contexts/CompetitionContext";
import { AchievementProvider } from "@/contexts/AchievementContext";
import { PageLoading } from "@/components/ui/loading";
import ErrorBoundary from "@/components/ui/error-boundary";
import { preloadAnimations } from "@/lib/animation";
import { PerfPromptBanner } from "@/components/ui/perf-prompt-banner";
import { debugApiCalls } from "@/utils/apiDebug";
import { CommandPalette } from "@/components/CommandPalette";
import FloatingLines from "@/components/FloatingLines";

// Lazy load page components
const Welcome = React.lazy(() => import("./pages/Welcome"));
const Login = React.lazy(() => import("./pages/Login"));
const SignUp = React.lazy(() => import("./pages/SignUp"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const Generator = React.lazy(() => import("./pages/Generator"));
const CodeGenerator = React.lazy(() => import("./pages/CodeGenerator"));
const Competition = React.lazy(() => import("./pages/Competition"));
const Components = React.lazy(() => import("./pages/Components"));
const Library = React.lazy(() => import("./pages/Library"));
const Learn = React.lazy(() => import("./pages/Learn"));
const Profile = React.lazy(() => import("./pages/Profile"));
const About = React.lazy(() => import("./pages/About"));
const ProjectDetail = React.lazy(() => import("./pages/ProjectDetail"));
const ComponentComparison = React.lazy(() => import("./pages/ComponentComparison"));
const AuthCallback = React.lazy(() => import("./pages/AuthCallback"));
const Presentation = React.lazy(() => import("./pages/Presentation"));
const AdminDashboard = React.lazy(() => import("./pages/AdminDashboard"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Preload animations on app initialization
if (typeof window !== 'undefined') {
  preloadAnimations();
}

const App = () => {
  // Initialize API debugging in development/production for troubleshooting
  useEffect(() => {
    debugApiCalls();
    console.log('🔍 Environment Variables:', {
      VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
      NODE_ENV: import.meta.env.NODE_ENV,
      MODE: import.meta.env.MODE
    });
  }, []);

  return (
    <ErrorBoundary>
      <div className="relative min-h-screen w-full overflow-hidden bg-background/20">
        <FloatingLines 
          enabledWaves={["top", "middle", "bottom"]}
          lineCount={5}
          lineDistance={5}
          bendRadius={5}
          bendStrength={-0.5}
          interactive={true}
          parallax={true}
          parallaxStrength={0.45}
          mouseDamping={0.08}
        />
        <div className="relative z-10">
        <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PreferencesProvider>
            <PerfProvider>
              <ThreeDProvider>
                <AnimationProvider>
                  <TTSProvider>
                    <CodeGenerationProvider>
                      <CompetitionProvider>
                        <AchievementProvider>
                          <TooltipProvider>
                      {/* 🔥 Vercel magic */}
                      <SpeedInsights />
                      <Analytics />

                      <Toaster />
                      <Sonner />

                      <BrowserRouter>
                        {/* 🚀 CMD+K Command Palette */}
                        <CommandPalette />
                        <PerfPromptBanner />
                        <Suspense fallback={<PageLoading />}>
                          <Routes>
                            <Route path="/" element={<Welcome />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/signup" element={<SignUp />} />
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/auth/callback" element={<AuthCallback />} />
                            <Route path="/project/:id" element={<ProjectDetail />} />
                            <Route path="/generator" element={<Generator />} />
                            <Route path="/code-generator" element={<CodeGenerator />} />
                            <Route path="/competition" element={<Competition />} />
                            <Route path="/components" element={<Components />} />
                            <Route path="/components/compare" element={<ComponentComparison />} />
                            <Route path="/library" element={<Library />} />
                            <Route path="/learn" element={<Learn />} />
                            <Route path="/profile" element={<Profile />} />
                            <Route path="/about" element={<About />} />
                            <Route path="/admin" element={<AdminDashboard />} />
                            <Route path="/presentation" element={<Presentation />} />
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </Suspense>
                      </BrowserRouter>
                    </TooltipProvider>
                  </AchievementProvider>
                </CompetitionProvider>
              </CodeGenerationProvider>
            </TTSProvider>
            </AnimationProvider>
          </ThreeDProvider>
        </PerfProvider>
      </PreferencesProvider>
    </AuthProvider>
    </QueryClientProvider>
    </div>
    </div>
  </ErrorBoundary>
);
};


export default App;
