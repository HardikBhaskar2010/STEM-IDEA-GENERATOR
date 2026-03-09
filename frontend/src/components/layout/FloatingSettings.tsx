/**
 * Settings Floating Dock
 * Contains theme toggle, TTS visualizer, and voice command with adaptive theming
 */

import { FloatingDock } from "@/components/ui/floating-dock";
import { AdaptiveFloatingContainer } from "@/components/layout/AdaptiveFloatingContainer";
import { useTTS } from "@/contexts/TTSContext";
import { useTheme } from "@/hooks/useTheme";
import { useState } from "react";
import { Palette, Volume2, Mic } from "lucide-react";
import ThemeToggle from "@/components/ui/theme-toggle";
import { VoiceCommand } from "@/components/VoiceCommand";
import { TTSVisualizer } from "@/components/TTSVisualizer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const FloatingSettings = () => {
  const { isTTSActive } = useTTS();
  const { isDark } = useTheme();
  const [showThemeDialog, setShowThemeDialog] = useState(false);
  const [showVoiceDialog, setShowVoiceDialog] = useState(false);

  const items = [
    {
      title: "Theme",
      icon: (
        <Palette className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#theme",
    },
    {
      title: isTTSActive ? "TTS Active" : "TTS",
      icon: isTTSActive ? (
        <Volume2 className="h-full w-full text-blue-500 dark:text-blue-400 animate-pulse" />
      ) : (
        <Volume2 className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#tts",
    },
    {
      title: "Voice",
      icon: (
        <Mic className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#voice",
    },
  ];

  // Adaptive classes based on theme
  const dockClassName = isDark
    ? "bg-black/80 backdrop-blur-xl border border-white/10"
    : "bg-white/80 backdrop-blur-xl border border-gray-200/30";

  return (
    <>
      <div className="fixed bottom-6 left-1/2 translate-x-[260px] md:translate-x-[340px] z-50">
        <AdaptiveFloatingContainer selector="body">
          <div className="relative">
            {/* Custom click handlers overlay */}
            <div className="absolute inset-0 flex gap-4 items-end px-4 pb-3 pointer-events-none z-10">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowThemeDialog(true);
                }}
                className="w-[40px] h-[40px] md:w-[80px] md:h-[80px] rounded-full pointer-events-auto"
                aria-label="Open theme settings"
              />
              <div className="w-[40px] h-[40px] md:w-[80px] md:h-[80px] rounded-full pointer-events-none" />
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowVoiceDialog(true);
                }}
                className="w-[40px] h-[40px] md:w-[80px] md:h-[80px] rounded-full pointer-events-auto"
                aria-label="Open voice command"
              />
            </div>

            <FloatingDock
              items={items}
              desktopClassName={dockClassName}
              mobileClassName=""
            />
          </div>
        </AdaptiveFloatingContainer>
      </div>

      {/* Theme Dialog */}
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

      {/* Voice Command Dialog */}
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
