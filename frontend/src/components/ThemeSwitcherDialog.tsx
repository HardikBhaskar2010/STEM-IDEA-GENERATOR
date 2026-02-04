import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { usePreferences, COLOR_THEMES, type ColorTheme } from '@/contexts/PreferencesContext';

interface ThemeSwitcherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ThemeSwitcherDialog: React.FC<ThemeSwitcherDialogProps> = ({ open, onOpenChange }) => {
  const { colorTheme, setColorTheme } = usePreferences();

  const themeOptions: Array<{ id: ColorTheme; gradient: string; icon: string }> = [
    { 
      id: 'allblack', 
      gradient: 'linear-gradient(135deg, #a3a3a3 0%, #525252 100%)',
      icon: '🌫️'
    },
    { 
      id: 'purple', 
      gradient: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
      icon: '🟣'
    },
    { 
      id: 'pink', 
      gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
      icon: '🌸'
    },
    { 
      id: 'blue', 
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      icon: '🔵'
    },
    { 
      id: 'green', 
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      icon: '🟢'
    },
    { 
      id: 'red', 
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      icon: '🔴'
    },
    { 
      id: 'orange', 
      gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
      icon: '🟠'
    },
  ];

  const handleThemeChange = (theme: ColorTheme) => {
    setColorTheme(theme);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-black/95 border border-purple-500/20 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black tracking-tight">
            <span 
              className="bg-gradient-to-r from-purple-400 to-pink-400"
              style={{
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Specials
            </span>
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-base">
            Choose your color palette. Customize your entire app experience.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
          {themeOptions.map((theme) => (
            <Card
              key={theme.id}
              className={`relative cursor-pointer transition-all duration-300 overflow-hidden border-2 ${
                colorTheme === theme.id
                  ? 'border-white shadow-2xl scale-105'
                  : 'border-gray-700 hover:border-gray-500 hover:scale-102'
              }`}
              onClick={() => handleThemeChange(theme.id)}
              data-testid={`theme-${theme.id}`}
            >
              {/* Theme Preview */}
              <div className="relative h-32 p-4 flex flex-col justify-between">
                {/* Gradient Background */}
                <div 
                  className="absolute inset-0 opacity-30"
                  style={{ background: theme.gradient }}
                />
                
                {/* Black Overlay */}
                <div className="absolute inset-0 bg-black/60" />
                
                {/* Content */}
                <div className="relative z-10 flex items-start justify-between">
                  <span className="text-3xl">{theme.icon}</span>
                  {colorTheme === theme.id && (
                    <div 
                      className="p-1 rounded-full"
                      style={{ background: theme.gradient }}
                    >
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>

                <div className="relative z-10">
                  <h3 className="text-white font-bold text-lg mb-1">
                    {COLOR_THEMES[theme.id].name}
                  </h3>
                  <p className="text-gray-400 text-xs line-clamp-2">
                    {COLOR_THEMES[theme.id].description}
                  </p>
                </div>

                {/* Accent Bar */}
                <div 
                  className="absolute bottom-0 left-0 right-0 h-1"
                  style={{ background: theme.gradient }}
                />
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-gray-700 hover:bg-gray-800"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ThemeSwitcherDialog;
