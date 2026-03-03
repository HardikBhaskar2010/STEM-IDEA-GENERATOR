import React, { useState, useEffect } from 'react';
import { Shield, Eye, Database, Brain } from 'lucide-react';
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
import { toast } from '@/hooks/use-toast';
import { userPreferencesService, type PrivacySettings } from '@/services/userPreferencesService';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';

interface PrivacySettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PrivacySettingsDialog: React.FC<PrivacySettingsDialogProps> = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const isGuest = user && authService.isGuestUser(user);

  const [settings, setSettings] = useState<PrivacySettings>({
    profile_visibility: 'private',
    allow_data_usage: true,
    ai_personalization: true,
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && user && !isGuest) {
      loadSettings();
    }
  }, [open, user]);

  const loadSettings = async () => {
    if (!user || isGuest) return;

    const data = await userPreferencesService.getPrivacySettings(user.id);
    if (data) {
      setSettings(data);
    }
  };

  const handleSave = async () => {
    if (isGuest) {
      // Save to localStorage for guests
      localStorage.setItem('guest_privacy_settings', JSON.stringify(settings));
      toast({
        title: 'Privacy Settings Saved',
        description: 'Your privacy settings have been saved locally.',
      });
      onOpenChange(false);
      return;
    }

    if (!user) return;

    setIsSaving(true);
    const success = await userPreferencesService.updatePrivacySettings(user.id, settings);
    setIsSaving(false);

    if (success) {
      toast({
        title: 'Privacy Settings Updated',
        description: 'Your privacy settings have been saved successfully.',
      });
      onOpenChange(false);
    } else {
      toast({
        title: 'Error',
        description: 'Failed to save privacy settings. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="privacy-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Privacy Settings
          </DialogTitle>
          <DialogDescription>
            Control your data privacy and how your profile is shared
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Profile Visibility */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-base">
              <Eye className="w-4 h-4" />
              Profile Visibility
            </Label>
            <RadioGroup
              value={settings.profile_visibility}
              onValueChange={(value) => setSettings({ ...settings, profile_visibility: value as any })}
              className="space-y-3"
            >
              <div className="flex items-start space-x-3 p-3 rounded-lg border">
                <RadioGroupItem value="private" id="private" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="private" className="cursor-pointer font-medium">
                    Private
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Only you can see your profile and projects
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 rounded-lg border">
                <RadioGroupItem value="public" id="public" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="public" className="cursor-pointer font-medium">
                    Public
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Share your profile and projects with the community
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Data Usage */}
          <div className="flex items-start justify-between p-4 rounded-lg border">
            <div className="flex-1 pr-4">
              <Label htmlFor="data_usage" className="flex items-center gap-2 font-medium mb-1">
                <Database className="w-4 h-4" />
                Anonymized Data Usage
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow us to use anonymized data to improve recommendations and features. 
                This helps us build better tools for everyone while keeping your identity private.
              </p>
            </div>
            <Switch
              id="data_usage"
              checked={settings.allow_data_usage}
              onCheckedChange={(checked) => setSettings({ ...settings, allow_data_usage: checked })}
            />
          </div>

          {/* AI Personalization */}
          <div className="flex items-start justify-between p-4 rounded-lg border">
            <div className="flex-1 pr-4">
              <Label htmlFor="ai_personalization" className="flex items-center gap-2 font-medium mb-1">
                <Brain className="w-4 h-4" />
                AI Personalization
              </Label>
              <p className="text-sm text-muted-foreground">
                Enable AI to learn your preferences and provide personalized project suggestions 
                based on your interests, skill level, and past projects.
              </p>
            </div>
            <Switch
              id="ai_personalization"
              checked={settings.ai_personalization}
              onCheckedChange={(checked) => setSettings({ ...settings, ai_personalization: checked })}
            />
          </div>

          {/* Trust Badge */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground flex items-start gap-2">
              <Shield className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-500" />
              <span>
                Your data is encrypted and secure. We never sell your personal information. 
                You can download or delete your data anytime from account settings.
              </span>
            </p>
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
            data-testid="save-privacy-button"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrivacySettingsDialog;
