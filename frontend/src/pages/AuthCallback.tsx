import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';

// OAuth Callback Handler
const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session from URL hash
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth callback error:', error);
          setStatus('error');
          setMessage(error.message || 'Authentication failed');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        if (session) {
          console.log('✅ OAuth authentication successful');
          setStatus('success');
          setMessage('Authentication successful! Redirecting...');
          
          // Wait a moment for the auth context to update
          setTimeout(() => {
            navigate('/');
          }, 1500);
        } else {
          setStatus('error');
          setMessage('No session found');
          setTimeout(() => navigate('/login'), 3000);
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/5 px-4">
      <Card className="w-full max-w-md glass-effect border-border/50">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'loading' && (
              <div className="p-3 bg-primary/10 rounded-xl">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="p-3 bg-green-500/10 rounded-xl">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            )}
            {status === 'error' && (
              <div className="p-3 bg-destructive/10 rounded-xl">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl">
            {status === 'loading' && 'Authenticating...'}
            {status === 'success' && 'Success!'}
            {status === 'error' && 'Authentication Failed'}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {status === 'loading' && (
            <p className="text-sm text-muted-foreground">Please wait while we complete your sign in...</p>
          )}
          {status === 'success' && (
            <p className="text-sm text-muted-foreground">Taking you to your dashboard...</p>
          )}
          {status === 'error' && (
            <p className="text-sm text-muted-foreground">Redirecting to login page...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthCallback;
