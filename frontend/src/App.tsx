import React, { Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AnimationProvider } from "@/contexts/AnimationContext";
import { PreferencesProvider } from "@/contexts/PreferencesContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
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
import { GlobalBackground } from "@/components/layout/GlobalBackground";
import { polyfillRAF } from '@/lib/browserCompat';
import { SciFiCursor } from "@/components/layout/SciFiCursor";

const WelcomeRoute = () => {
  const { isLoading, mode } = useAuth();

  if (isLoading) return <PageLoading />;

  // Only skip welcome when truly authenticated (not guest).
  if (mode === "authenticated") return <Navigate to="/dashboard" replace />;

  return <Welcome />;
};

// Lazy load page components
const Welcome = React.lazy(() => import("./pages/Welcome"));
const Login = React.lazy(() => import("./pages/Login"));
const SignUp = React.lazy(() => import("./pages/SignUp"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const VeronicaAI = React.lazy(() => import("./pages/VeronicaAI"));
const Competition = React.lazy(() => import("./pages/Competition"));
const Components = React.lazy(() => import("./pages/Components"));
const Library = React.lazy(() => import("./pages/Library"));
const Learn = React.lazy(() => import("./pages/Learn"));
const Profile = React.lazy(() => import("./pages/Profile"));
const About = React.lazy(() => import("./pages/About"));
const ProjectDetail = React.lazy(() => import("./pages/ProjectDetail"));
const VeronicaProject = React.lazy(() => import("./pages/VeronicaProject"));
const ComponentComparison = React.lazy(() => import("./pages/ComponentComparison"));
const AuthCallback = React.lazy(() => import("./pages/AuthCallback"));
const Presentation = React.lazy(() => import("./pages/Presentation"));
const AdminDashboard = React.lazy(() => import("./pages/AdminDashboard"));
const AdminLogs = React.lazy(() => import("./pages/AdminLogs"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const STEMWorkshop = React.lazy(() => import("./pages/STEMWorkshop"));

const queryClient = new QueryClient();

// Preload animations on app initialization
if (typeof window !== "undefined") {
  preloadAnimations();
}

import { ThemeProvider } from "next-themes";

const App = () => {
  useEffect(() => {
    polyfillRAF();
    debugApiCalls();
    console.log("🔍 Environment Variables:", {
      VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
      NODE_ENV: import.meta.env.NODE_ENV,
      MODE: import.meta.env.MODE,
    });
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
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
                                <SciFiCursor />
                                {/* 🌐 Global GridScan background — theme-aware, skips /, /login, /signup, /about */}
                                <GlobalBackground />
                                {/* 🚀 CMD+K Command Palette */}
                                <CommandPalette />
                                <PerfPromptBanner />

                                <Suspense fallback={<PageLoading />}>
                                  <Routes>
                                    <Route path="/" element={<WelcomeRoute />} />
                                    <Route path="/login" element={<Login />} />
                                    <Route path="/signup" element={<SignUp />} />
                                    <Route path="/dashboard" element={<Dashboard />} />
                                    <Route path="/auth/callback" element={<AuthCallback />} />
                                    <Route path="/project/:id" element={<ProjectDetail />} />
                                    <Route path="/veronica-project/:id" element={<VeronicaProject />} />
                                    <Route path="/veronica-ai" element={<VeronicaAI />} />
                                    <Route path="/competition" element={<Competition />} />
                                    <Route path="/components" element={<Components />} />
                                    <Route path="/components/compare" element={<ComponentComparison />} />
                                    <Route path="/library" element={<Library />} />
                                    <Route path="/learn" element={<Learn />} />
                                    <Route path="/profile" element={<Profile />} />
                                    <Route path="/about" element={<About />} />
                                    <Route path="/admin" element={<AdminDashboard />} />
                                    <Route path="/admin/logs" element={<AdminLogs />} />
                                    <Route path="/presentation" element={<Presentation />} />
                                    <Route path="/workshop" element={<STEMWorkshop />} />
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
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;





