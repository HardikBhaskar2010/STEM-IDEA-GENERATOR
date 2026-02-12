import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';
import { Loader2, Mail, Lock, User, Sparkles, ArrowRight, CheckCircle2, AlertCircle, Chrome } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isGuest } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && !isGuest) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, isGuest, navigate]);

  // Calculate password strength
  useEffect(() => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;
    setPasswordStrength(strength);
  }, [password]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Validation
    const errors: { [key: string]: string } = {};
    
    if (!username.trim()) {
      errors.username = 'Username is required';
    } else if (username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Please fix the errors below');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.signUp({
        email,
        password,
        username,
      });
      
      if (result.error) {
        setError(result.error.message || 'Failed to create account');
        toast({
          title: 'Sign Up Failed',
          description: result.error.message || 'Please try again',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Account Created! 🎉',
          description: 'Welcome to STEM Idea Adventure. Check your email to verify your account.',
          duration: 5000,
        });
        navigate('/login');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await authService.signInWithGoogle();
      if (error) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to sign in with Google',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: 'Failed to sign in with Google',
        variant: 'destructive',
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      await authService.continueAsGuest();
      toast({
        title: 'Continuing as Guest',
        description: 'You can create an account anytime to save your progress.',
      });
      navigate('/dashboard');
    } catch (err: any) {
      toast({
        title: 'Error',
        description: 'Failed to continue as guest',
        variant: 'destructive',
      });
    }
  };

  const getStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-red-500';
    if (passwordStrength === 2) return 'bg-yellow-500';
    if (passwordStrength === 3) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (passwordStrength <= 1) return 'Weak';
    if (passwordStrength === 2) return 'Fair';
    if (passwordStrength === 3) return 'Good';
    return 'Strong';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-2xl border-primary/20" data-testid="signup-card">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Create Account</CardTitle>
          <CardDescription className="text-base">
            Join STEM Idea Adventure and start creating
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSignUp}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" data-testid="error-alert" className="animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="username"
                  type="text"
                  placeholder="your_username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setFieldErrors(prev => ({ ...prev, username: '' }));
                  }}
                  className={`pl-10 transition-all ${fieldErrors.username ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  required
                  disabled={isLoading}
                  data-testid="username-input"
                />
                {fieldErrors.username && (
                  <p className="text-xs text-red-500 mt-1 animate-in fade-in slide-in-from-top-1">{fieldErrors.username}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldErrors(prev => ({ ...prev, email: '' }));
                  }}
                  className={`pl-10 transition-all ${fieldErrors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  required
                  disabled={isLoading}
                  data-testid="email-input"
                />
                {fieldErrors.email && (
                  <p className="text-xs text-red-500 mt-1 animate-in fade-in slide-in-from-top-1">{fieldErrors.email}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldErrors(prev => ({ ...prev, password: '' }));
                  }}
                  className={`pl-10 transition-all ${fieldErrors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  required
                  disabled={isLoading}
                  data-testid="password-input"
                />
                {fieldErrors.password && (
                  <p className="text-xs text-red-500 mt-1 animate-in fade-in slide-in-from-top-1">{fieldErrors.password}</p>
                )}
              </div>
              {password && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex gap-1">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                          i < passwordStrength ? getStrengthColor() : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Password strength: <span className={`font-semibold ${passwordStrength >= 3 ? 'text-green-500' : passwordStrength === 2 ? 'text-yellow-500' : 'text-red-500'}`}>{getStrengthText()}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setFieldErrors(prev => ({ ...prev, confirmPassword: '' }));
                  }}
                  className={`pl-10 transition-all ${fieldErrors.confirmPassword ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  required
                  disabled={isLoading}
                  data-testid="confirm-password-input"
                />
                {confirmPassword && password === confirmPassword && (
                  <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-green-500 animate-in zoom-in duration-200" />
                )}
                {fieldErrors.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1 animate-in fade-in slide-in-from-top-1">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1 pt-2 bg-muted/30 p-3 rounded-lg">
              <p className="font-medium mb-2 text-foreground">Password requirements:</p>
              <ul className="space-y-1.5">
                <li className={`flex items-center gap-2 transition-colors ${password.length >= 8 ? 'text-green-600 dark:text-green-500' : ''}`}>
                  {password.length >= 8 ? <CheckCircle2 className="h-3 w-3" /> : <div className="h-3 w-3 rounded-full border-2" />}
                  At least 8 characters
                </li>
                <li className={`flex items-center gap-2 transition-colors ${password.match(/[a-z]/) && password.match(/[A-Z]/) ? 'text-green-600 dark:text-green-500' : ''}`}>
                  {password.match(/[a-z]/) && password.match(/[A-Z]/) ? <CheckCircle2 className="h-3 w-3" /> : <div className="h-3 w-3 rounded-full border-2" />}
                  Upper and lowercase letters
                </li>
                <li className={`flex items-center gap-2 transition-colors ${password.match(/[0-9]/) ? 'text-green-600 dark:text-green-500' : ''}`}>
                  {password.match(/[0-9]/) ? <CheckCircle2 className="h-3 w-3" /> : <div className="h-3 w-3 rounded-full border-2" />}
                  At least one number
                </li>
              </ul>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-3">
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300"
              disabled={isLoading || isGoogleLoading}
              data-testid="signup-button"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>

            <div className="relative w-full">
              <Separator className="my-4" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-background px-2 text-xs text-muted-foreground">OR CONTINUE WITH</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full group hover:bg-primary/5 transition-all duration-300"
              onClick={handleGoogleSignUp}
              disabled={isLoading || isGoogleLoading}
              data-testid="google-signup-button"
            >
              {isGoogleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Chrome className="mr-2 h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
              )}
              Sign up with Google
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground hover:text-foreground transition-colors"
              onClick={handleSkip}
              disabled={isLoading || isGoogleLoading}
              data-testid="skip-button"
            >
              Skip for now
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default SignUp;