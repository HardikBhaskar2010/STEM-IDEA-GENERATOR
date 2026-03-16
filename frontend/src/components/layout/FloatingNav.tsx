/**
 * Main Navigation Floating Dock
 * Contains primary navigation items with adaptive theming
 */

import { FloatingDock } from "@/components/ui/floating-dock";
import { AdaptiveFloatingContainer } from "@/components/layout/AdaptiveFloatingContainer";
import { useAuth } from "@/contexts/AuthContext";
import { useCompetition } from "@/contexts/CompetitionContext";
import { useTheme } from "@/hooks/useTheme";
import { useLocation } from "react-router-dom";
import { useState } from "react";
import { useTTS } from "@/contexts/TTSContext";
import ThemeToggle from "@/components/ui/theme-toggle";
import { VoiceCommand } from "@/components/VoiceCommand";
import { TTSVisualizer } from "@/components/TTSVisualizer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Home,
  Zap,
  Code,
  Trophy,
  Cpu,
  BookOpen,
  GraduationCap,
  User,
  Info,
  Shield,
  LogIn,
  Palette,
  Volume2,
  Mic,
} from "lucide-react";

export const FloatingNav = () => {
  const { isGuest, isAdmin } = useAuth();
  const { isCompetitionMode } = useCompetition();
  const { isTTSActive } = useTTS();
  const { isDark } = useTheme();
  const location = useLocation();
  const [showThemeDialog, setShowThemeDialog] = useState(false);
  const [showVoiceDialog, setShowVoiceDialog] = useState(false);

  // Base navigation items
  const baseItems = [
    {
      title: "Dashboard",
      icon: <Home className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/dashboard",
    },
    {
      title: "Veronica AI",
      icon: <Code className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/veronica-ai",
    },
    {
      title: "Competition",
      icon: <Trophy className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/competition",
    },
    {
      title: "Components",
      icon: <Cpu className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/components",
    },
    {
      title: "Library",
      icon: <BookOpen className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/library",
    },
    {
      title: "Learn",
      icon: <GraduationCap className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/learn",
    },
  ];

  // Add Profile or Sign In based on guest status
  const authItem = isGuest
    ? {
        title: "Sign In",
        icon: <LogIn className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
        href: "/login",
      }
    : {
        title: "Profile",
        icon: <User className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
        href: "/profile",
      };

  const items = [...baseItems, authItem];

  // Add About
  items.push({
    title: "About",
    icon: <Info className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
    href: "/about",
  });

  // Add Admin-only items if admin
  if (isAdmin) {
    items.push({
      title: "Admin Panel",
      icon: <Shield className="h-full w-full text-purple-500 dark:text-purple-400" />,
      href: "/admin",
    });
  }

  items.push({
    title: "Controls Divider",
    icon: null,
    href: "#",
    type: "divider",
  });

  items.push({
    title: "Theme",
    icon: <Palette className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
    href: "#theme",
    onClick: () => setShowThemeDialog(true),
  });

  items.push({
    title: isTTSActive ? "TTS Active" : "TTS",
    icon: isTTSActive ? (
      <Volume2 className="h-full w-full text-blue-500 dark:text-blue-400 animate-pulse" />
    ) : (
      <Volume2 className="h-full w-full text-neutral-500 dark:text-neutral-300" />
    ),
    href: "#tts",
  });

  items.push({
    title: "Voice",
    icon: <Mic className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
    href: "#voice",
    onClick: () => setShowVoiceDialog(true),
  });

  // Priority 2: Enhanced floating dock depth with stronger elevation
  const dockClassName = isDark
    ? "bg-black/80 backdrop-blur-2xl border border-white/10 shadow-[0px_10px_40px_rgba(0,0,0,0.5),0px_2px_8px_rgba(0,0,0,0.3)]"
    : "bg-white/85 backdrop-blur-2xl border border-gray-200/40 shadow-[0px_10px_40px_rgba(0,0,0,0.15),0px_2px_8px_rgba(0,0,0,0.08)]";

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <AdaptiveFloatingContainer selector="body">
          <FloatingDock
            items={items}
            desktopClassName={dockClassName}
            mobileClassName=""
          />
        </AdaptiveFloatingContainer>
      </div>

      <Dialog open={showThemeDialog} onOpenChange={setShowThemeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Theme Settings</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-6">
            <ThemeToggle />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showVoiceDialog} onOpenChange={setShowVoiceDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Voice Command</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center gap-4 p-6">
            <VoiceCommand />
            <TTSVisualizer
              isActive={isTTSActive}
              color="#3b82f6"
              lineCount={4}
              height={48}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};


