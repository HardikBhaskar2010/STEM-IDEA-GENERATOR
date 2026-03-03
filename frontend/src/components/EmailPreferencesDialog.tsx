import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, Package, Calendar, Megaphone, BellOff } from 'lucide-react';
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
import { toast } from '@/hooks/use-toast';
import { userPreferencesService, type EmailPreferences } from '@/services/userPreferencesService';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface EmailPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EmailPreferencesDialog: React.FC<EmailPreferencesDialogProps> = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const isGuest = user && authService.isGuestUser(user);

  const [preferences, setPreferences] = useState<EmailPreferences>({
    account_created: true,
    project_first_save: true,
    weekly_digest: true,
    feature_updates: true,
    unsubscribe_all: false,
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && user && !isGuest) {
      loadPreferences();
    }
  }, [open, user]);

  const loadPreferences = async () => {
    if (!user || isGuest) return;

    const data = await userPreferencesService.getEmailPreferences(user.id);
    if (data) {
      setPreferences(data);
    }
  };

  const handleSave = async () => {
    if (isGuest) {
      toast({
        title: 'Guest Mode',
        description: 'Email notifications are not available in guest mode. Create an account to enable.',
      });
      onOpenChange(false);
      return;
    }

    if (!user) return;

    setIsSaving(true);
    const success = await userPreferencesService.updateEmailPreferences(user.id, preferences);
    setIsSaving(false);

    if (success) {
      toast({
        title: 'Email Preferences Updated',
        description: preferences.unsubscribe_all 
          ? 'You have been unsubscribed from all emails.'
          : 'Your email preferences have been saved successfully.',
      });
      onOpenChange(false);
    } else {
      toast({
        title: 'Error',
        description: 'Failed to save email preferences. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleUnsubscribeAll = (checked: boolean) => {
    if (checked) {
      // Unsubscribe from everything
      setPreferences({
        account_created: false,
        project_first_save: false,
        weekly_digest: false,
        feature_updates: false,
        unsubscribe_all: true,
      });
    } else {
      // Re-enable defaults
      setPreferences({
        account_created: true,
        project_first_save: true,
        weekly_digest: true,
        feature_updates: true,
        unsubscribe_all: false,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]" data-testid="email-preferences-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Notifications
          </DialogTitle>
          <DialogDescription>
            Choose which emails you want to receive. We only send value, not spam 💜
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Unsubscribe All Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border-2 border-dashed">
            <div className="flex-1 pr-4">
              <Label htmlFor="unsubscribe_all" className="flex items-center gap-2 font-medium mb-1">
                <BellOff className="w-4 h-4" />
                Unsubscribe from All
              </Label>
              <p className="text-sm text-muted-foreground">
                Disable all email notifications at once
              </p>
            </div>
            <Switch
              id="unsubscribe_all"
              checked={preferences.unsubscribe_all}
              onCheckedChange={handleUnsubscribeAll}
            />
          </div>

          <Separator />

          {/* Individual Email Preferences */}
          <div className="space-y-4 opacity-75" style={{ opacity: preferences.unsubscribe_all ? 0.5 : 1, pointerEvents: preferences.unsubscribe_all ? 'none' : 'auto' }}>
            {/* Account Created */}
            <div className="flex items-start justify-between p-3 rounded-lg border">
              <div className="flex-1 pr-4">
                <Label htmlFor="account_created" className="flex items-center gap-2 font-medium mb-1">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Account Created
                  <Badge variant="outline" className="text-xs">Essential</Badge>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Welcome email with account setup tips
                </p>
              </div>
              <Switch
                id="account_created"
                checked={preferences.account_created}
                onCheckedChange={(checked) => setPreferences({ ...preferences, account_created: checked })}
                disabled={preferences.unsubscribe_all}
              />
            </div>

            {/* First Project Save */}
            <div className="flex items-start justify-between p-3 rounded-lg border">
              <div className="flex-1 pr-4">
                <Label htmlFor="project_first_save" className="flex items-center gap-2 font-medium mb-1">
                  <Package className="w-4 h-4 text-blue-500" />
                  First Project Saved
                  <Badge variant="outline" className="text-xs">Milestone</Badge>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Celebration email when you save your first project
                </p>
              </div>
              <Switch
                id="project_first_save"
                checked={preferences.project_first_save}
                onCheckedChange={(checked) => setPreferences({ ...preferences, project_first_save: checked })}
                disabled={preferences.unsubscribe_all}
              />
            </div>

            {/* Weekly Digest */}
            <div className="flex items-start justify-between p-3 rounded-lg border">
              <div className="flex-1 pr-4">
                <Label htmlFor="weekly_digest" className="flex items-center gap-2 font-medium mb-1">
                  <Calendar className="w-4 h-4 text-purple-500" />
                  Weekly Project Digest
                  <Badge variant="outline" className="text-xs">Popular</Badge>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Curated project ideas and tips every Monday morning
                </p>
              </div>
              <Switch
                id="weekly_digest"
                checked={preferences.weekly_digest}
                onCheckedChange={(checked) => setPreferences({ ...preferences, weekly_digest: checked })}
                disabled={preferences.unsubscribe_all}
              />
            </div>

            {/* Feature Updates */}
            <div className="flex items-start justify-between p-3 rounded-lg border">
              <div className="flex-1 pr-4">
                <Label htmlFor="feature_updates" className="flex items-center gap-2 font-medium mb-1">
                  <Megaphone className="w-4 h-4 text-orange-500" />
                  Major Feature Updates
                </Label>
                <p className="text-sm text-muted-foreground">
                  Only important announcements and new features (max 1/month)
                </p>
              </div>
              <Switch
                id="feature_updates"
                checked={preferences.feature_updates}
                onCheckedChange={(checked) => setPreferences({ ...preferences, feature_updates: checked })}
                disabled={preferences.unsubscribe_all}
              />
            </div>
          </div>

          {/* Email Policy Note */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">
              📧 <strong>Our Email Promise:</strong> We respect your inbox. No daily spam, no clickbait, 
              no selling your data. Only valuable content that helps you build better projects. 
              You can change these settings anytime.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || isGuest}
            className="bg-gradient-primary text-white"
            data-testid="save-email-preferences-button"
          >
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmailPreferencesDialog;
