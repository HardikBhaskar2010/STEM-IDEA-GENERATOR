import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';
import { Loader2, Mail, Lock, User, Sparkles, AlertCircle, Chrome, Building2, UserCircle, GraduationCap, School } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import AuthLayout from '@/components/auth/AuthLayout';
import AuthCard from '@/components/auth/AuthCard';
import RoleSelector from '@/components/auth/RoleSelector';

const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isGuest } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [school, setSchool] = useState('');
  const [role, setRole] = useState('');
  const [joiningAs, setJoiningAs] = useState('student');
  const [hearAbout, setHearAbout] = useState('school');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && !isGuest) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, isGuest, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.signUp({
        email,
        password,
        username: fullName,
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

  return (
    <AuthLayout>
      <AuthCard>
        {/* Icon Header */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', duration: 0.8, delay: 0.2 }}
          className="flex justify-center mb-6"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-purple-500/30 rounded-full blur-xl animate-pulse" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center border border-purple-400/30">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
          </div>
        </motion.div>

        <form onSubmit={handleSignUp} className="space-y-5">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Alert variant="destructive" data-testid="error-alert" className="bg-red-500/10 border-red-500/50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Full Name Field */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="space-y-2"
          >
            <Label htmlFor="fullName" className="text-gray-300 text-sm">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                id="fullName"
                type="text"
                placeholder="Luna Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500/30 transition-all"
                required
                disabled={isLoading}
                data-testid="fullname-input"
              />
            </div>
          </motion.div>

          {/* Email Field */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="space-y-2"
          >
            <Label htmlFor="email" className="text-gray-300 text-sm">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                id="email"
                type="email"
                placeholder="School / Organization"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500/30 transition-all"
                required
                disabled={isLoading}
                data-testid="email-input"
              />
            </div>
          </motion.div>

          {/* School/Organization Field */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="space-y-2"
          >
            <Label htmlFor="school" className="text-gray-300 text-sm">School / Organization</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                id="school"
                type="text"
                placeholder="Your school or organization"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500/30 transition-all"
                disabled={isLoading}
                data-testid="school-input"
              />
            </div>
          </motion.div>

          {/* Role Field */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
            className="space-y-2"
          >
            <Label htmlFor="role" className="text-gray-300 text-sm">Role</Label>
            <div className="relative">
              <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
              <Input
                id="role"
                type="text"
                placeholder="e.g., Student, Teacher, Researcher"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500/30 transition-all"
                disabled={isLoading}
                data-testid="role-input"
              />
            </div>
          </motion.div>

          {/* Password Field */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="space-y-2"
          >
            <Label htmlFor="password" className="text-gray-300 text-sm">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500/30 transition-all"
                required
                disabled={isLoading}
                data-testid="password-input"
              />
            </div>
            <p className="text-xs text-gray-500">Must be at least 8 characters</p>
          </motion.div>

          {/* I am joining as */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.55, duration: 0.5 }}
          >
            <RoleSelector
              label="I am joining as:"
              options={[
                { value: 'student', label: 'Student' },
                { value: 'teacher', label: 'Teacher' },
              ]}
              value={joiningAs}
              onChange={setJoiningAs}
              name="joining-as"
            />
          </motion.div>

          {/* How did you hear about us */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <RoleSelector
              label="How did you hear about us?"
              options={[
                { value: 'school', label: 'School' },
                { value: 'social-media', label: 'Social Media' },
              ]}
              value={hearAbout}
              onChange={setHearAbout}
              name="hear-about"
            />
          </motion.div>

          {/* Sign Up Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5 }}
          >
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-medium py-6 rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02]"
              disabled={isLoading || isGoogleLoading}
              data-testid="signup-button"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Start Your Adventure
                  <Sparkles className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </motion.div>

          {/* Separator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="relative my-6"
          >
            <Separator className="bg-white/10" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-[#0b0b1a] px-3 text-xs text-gray-400 uppercase tracking-wider">Or continue with</span>
            </div>
          </motion.div>

          {/* Google Sign Up */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.5 }}
          >
            <Button
              type="button"
              variant="outline"
              className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20 py-6 rounded-xl transition-all duration-300"
              onClick={handleGoogleSignUp}
              disabled={isLoading || isGoogleLoading}
              data-testid="google-signup-button"
            >
              {isGoogleLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Chrome className="mr-2 h-5 w-5 text-blue-400" />
              )}
              Sign up with Google
            </Button>
          </motion.div>

          {/* Login Link */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.85, duration: 0.5 }}
            className="text-center text-sm text-gray-400 pt-4"
          >
            Already have an account?{' '}
            <Link to="/login" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
              Sign in
            </Link>
          </motion.p>
        </form>
      </AuthCard>
    </AuthLayout>
  );
};

export default SignUp;