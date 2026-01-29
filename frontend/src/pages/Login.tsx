import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Mail, Lock, AlertCircle, Chrome, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { authService } from '@/services/authService';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { mode, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // Redirect authenticated users (including guests) to Home
  useEffect(() => {
    if (!authLoading && (mode === 'authenticated' || mode === 'guest')) {
      navigate('/');
    }
  }, [authLoading, mode, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    const { user, error: authError } = await authService.signIn({
      email: formData.email,
      password: formData.password,
    });

    if (authError) {
      setError(authError.message || 'Failed to sign in');
      setIsLoading(false);
      return;
    }

    if (user) {
      toast({
        title: 'Welcome back!',
        description: 'You have been successfully signed in.',
      });
      navigate('/');
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    const { error: authError } = await authService.signInWithGoogle();

    if (authError) {
      setError(authError.message || 'Failed to sign in with Google');
      setIsLoading(false);
      return;
    }

    // OAuth redirect will handle navigation
  };

  const handleGuestMode = async () => {
    setIsLoading(true);
    setError(null);

    const { user, error: authError } = await authService.continueAsGuest();

    if (authError) {
      setError(authError.message || 'Failed to enter guest mode');
      setIsLoading(false);
      return;
    }

    if (user) {
      toast({
        title: 'Welcome, Guest!',
        description: 'You can explore all features. Create an account anytime to save your progress.',
      });
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/5 px-4">
      <Card className="w-full max-w-md glass-effect border-border/50">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-gradient-primary rounded-xl">
              <LogIn className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Sign in to your STEM Project account</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex gap-2">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="pl-10"
                  data-testid="login-email-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="pl-10"
                  data-testid="login-password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-primary text-white"
              disabled={isLoading}
              data-testid="login-submit-button"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="relative my-6">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
              OR
            </span>
          </div>

          {/* Google Sign In */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            data-testid="google-signin-button"
          >
            <Chrome className="mr-2 h-4 w-4" />
            Continue with Google
          </Button>

          {/* Guest Mode */}
          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed"
            onClick={handleGuestMode}
            disabled={isLoading}
            data-testid="guest-mode-button"
          >
            <UserCircle className="mr-2 h-4 w-4" />
            Continue as Guest
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Guest mode: Full experience, create account anytime
          </p>

          <div className="text-center text-sm mt-4">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link to="/signup" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
