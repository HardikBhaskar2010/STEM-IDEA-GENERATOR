import React, { useState, useEffect } from 'react';
import { Settings2, Sun, Moon, Monitor, Globe, Bell } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { userPreferencesService, type UserPreferences } from '@/services/userPreferencesService';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';

interface PreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PreferencesDialog: React.FC<PreferencesDialogProps> = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const isGuest = user && authService.isGuestUser(user);

  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'system',
    language: 'en',
    notifications: {
      ai_suggestions: true,
      new_components: true,
      weekly_ideas: true,
      feature_updates: true,
    },
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && user && !isGuest) {
      loadPreferences();
    }
  }, [open, user]);

  const loadPreferences = async () => {
    if (!user || isGuest) return;

    const data = await userPreferencesService.getUserPreferences(user.id);
    if (data) {
      setPreferences(data);
    }
  };

  const handleSave = async () => {
    if (isGuest) {
      // Save to localStorage for guests
      localStorage.setItem('guest_preferences', JSON.stringify(preferences));
      toast({
        title: 'Preferences Saved',
        description: 'Your preferences have been saved locally.',
      });
      onOpenChange(false);
      return;
    }

    if (!user) return;

    setIsSaving(true);
    const success = await userPreferencesService.updateUserPreferences(user.id, preferences);
    setIsSaving(false);

    if (success) {
      toast({
        title: 'Preferences Updated',
        description: 'Your preferences have been saved successfully.',
      });
      onOpenChange(false);
      
      // Apply theme change immediately
      if (preferences.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (preferences.theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        // System preference
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    } else {
      toast({
        title: 'Error',
        description: 'Failed to save preferences. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'ja', name: '日本語' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="preferences-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Preferences
          </DialogTitle>
          <DialogDescription>
            Customize your experience with theme, language, and notification settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Theme Selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-base">
              <Sun className="w-4 h-4" />
              Theme
            </Label>
            <RadioGroup
              value={preferences.theme}
              onValueChange={(value) => setPreferences({ ...preferences, theme: value as any })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="light" id="light" />
                <Label htmlFor="light" className="flex items-center gap-1 cursor-pointer">
                  <Sun className="w-3.5 h-3.5" />
                  Light
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dark" id="dark" />
                <Label htmlFor="dark" className="flex items-center gap-1 cursor-pointer">
                  <Moon className="w-3.5 h-3.5" />
                  Dark
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="system" id="system" />
                <Label htmlFor="system" className="flex items-center gap-1 cursor-pointer">
                  <Monitor className="w-3.5 h-3.5" />
                  System
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Language Selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-base">
              <Globe className="w-4 h-4" />
              Language
            </Label>
            <Select
              value={preferences.language}
              onValueChange={(value) => setPreferences({ ...preferences, language: value as any })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notification Preferences */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-base">
              <Bell className="w-4 h-4" />
              Notifications
            </Label>
            <div className="space-y-3 pl-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="ai_suggestions" className="font-normal">
                    AI Suggestions
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Get notified when AI has new project ideas for you
                  </p>
                </div>
                <Switch
                  id="ai_suggestions"
                  checked={preferences.notifications.ai_suggestions}
                  onCheckedChange={(checked) =>
                    setPreferences({
                      ...preferences,
                      notifications: { ...preferences.notifications, ai_suggestions: checked },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="new_components" className="font-normal">
                    New Components
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Be notified when new components are added
                  </p>
                </div>
                <Switch
                  id="new_components"
                  checked={preferences.notifications.new_components}
                  onCheckedChange={(checked) =>
                    setPreferences({
                      ...preferences,
                      notifications: { ...preferences.notifications, new_components: checked },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="weekly_ideas" className="font-normal">
                    Weekly Project Ideas
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Receive weekly digest of curated project ideas
                  </p>
                </div>
                <Switch
                  id="weekly_ideas"
                  checked={preferences.notifications.weekly_ideas}
                  onCheckedChange={(checked) =>
                    setPreferences({
                      ...preferences,
                      notifications: { ...preferences.notifications, weekly_ideas: checked },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="feature_updates" className="font-normal">
                    Feature Updates
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Stay informed about new features and improvements
                  </p>
                </div>
                <Switch
                  id="feature_updates"
                  checked={preferences.notifications.feature_updates}
                  onCheckedChange={(checked) =>
                    setPreferences({
                      ...preferences,
                      notifications: { ...preferences.notifications, feature_updates: checked },
                    })
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-gradient-primary text-white"
            data-testid="save-preferences-button"
          >
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PreferencesDialog;
