import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
  title?: string;
  description?: string;
}

/**
 * UpgradeModal - Component to prompt guest users to create an account
 * Usage: Show this when guests try to access premium features
 */
const UpgradeModal: React.FC<UpgradeModalProps> = ({
  open,
  onOpenChange,
  feature = 'this feature',
  title = 'Upgrade to Save Your Progress',
  description = 'Create a free account to unlock all features and save your work permanently.',
}) => {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate('/signup');
  };

  const handleContinueAsGuest = () => {
    onOpenChange(false);
  };

  const benefits = [
    'Save projects permanently',
    'Access from any device',
    'Track your progress',
    'Unlock achievements',
    'Get personalized recommendations',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-gradient-primary rounded-xl">
              <Crown className="w-8 h-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">{title}</DialogTitle>
          <DialogDescription className="text-center">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Feature being blocked */}
          <Card className="p-4 bg-muted/50 border-border">
            <p className="text-sm text-center text-muted-foreground">
              <strong className="text-foreground">Guest Mode:</strong> You're trying to use <strong>{feature}</strong>. 
              Create an account to unlock this and more!
            </p>
          </Card>

          {/* Benefits */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">With a free account you get:</h4>
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-green-500" />
                </div>
                <span>{benefit}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <Button
              onClick={handleUpgrade}
              className="w-full bg-gradient-primary text-white"
              size="lg"
              data-testid="upgrade-modal-create-account-btn"
            >
              <Crown className="w-4 h-4 mr-2" />
              Create Free Account
            </Button>
            <Button
              onClick={handleContinueAsGuest}
              variant="ghost"
              className="w-full"
              size="sm"
              data-testid="upgrade-modal-continue-guest-btn"
            >
              Continue as Guest
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Takes less than 30 seconds • No credit card required
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;
