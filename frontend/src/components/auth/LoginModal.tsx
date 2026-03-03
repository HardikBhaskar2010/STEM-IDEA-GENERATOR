import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Chrome, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/authService';
import { toast } from '@/hooks/use-toast';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  feature?: string;
  message?: string;
}

/**
 * LoginModal Component
 * 
 * Quick login popup modal for locked features
 * 
 * @param open - Whether modal is open
 * @param onClose - Close handler
 * @param feature - Feature name for context
 * @param message - Custom message
 */
export const LoginModal: React.FC<LoginModalProps> = ({
  open,
  onClose,
  feature = 'this feature',
  message
}) => {
  const navigate = useNavigate();
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);

  const handleGoToLogin = () => {
    onClose();
    navigate('/login');
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await authService.signInWithGoogle();
      if (error) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to sign in with Google',
          variant: 'destructive',
        });
      } else {
        onClose();
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to sign in with Google',
        variant: 'destructive',
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md glass-effect border-purple-500/20 bg-gradient-to-br from-purple-900/10 via-black/90 to-violet-900/10">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gradient flex items-center gap-2">
            <Sparkles className="w-6 h-6" />
            Unlock {feature}
          </DialogTitle>
          <DialogDescription className="text-gray-300 text-base">
            {message || 'Sign in to access all features and save your progress.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Google Sign In */}
          <Button
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full bg-white hover:bg-gray-100 text-gray-900 font-medium py-6 rounded-xl transition-all duration-300"
          >
            <Chrome className="mr-2 h-5 w-5 text-blue-500" />
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-black/90 px-2 text-gray-400">Or</span>
            </div>
          </div>

          {/* Email Login */}
          <Button
            onClick={handleGoToLogin}
            variant="outline"
            className="w-full border-white/10 text-white hover:bg-white/5 py-6 rounded-xl transition-all duration-300"
          >
            Sign in with Email
          </Button>
        </div>

        <p className="text-center text-sm text-gray-400">
          Don't have an account?{' '}
          <button
            onClick={() => {
              onClose();
              navigate('/signup');
            }}
            className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
          >
            Sign up
          </button>
        </p>
      </DialogContent>
    </Dialog>
  );
};
