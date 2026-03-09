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
} from "lucide-react";

export const FloatingNav = () => {
  const { isGuest, isAdmin } = useAuth();
  const { isCompetitionMode } = useCompetition();
  const { isDark } = useTheme();
  const location = useLocation();

  // Base navigation items
  const baseItems = [
    {
      title: "Dashboard",
      icon: <Home className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/dashboard",
    },
    {
      title: "Generator",
      icon: <Zap className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/generator",
    },
    {
      title: "Veronica AI",
      icon: <Code className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/code-generator",
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

  // Adaptive classes based on theme
  const dockClassName = isDark
    ? "bg-black/80 backdrop-blur-xl border border-white/10"
    : "bg-white/80 backdrop-blur-xl border border-gray-200/30";

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <AdaptiveFloatingContainer selector="body">
        <FloatingDock
          items={items}
          desktopClassName={dockClassName}
          mobileClassName=""
        />
      </AdaptiveFloatingContainer>
    </div>
  );
};

