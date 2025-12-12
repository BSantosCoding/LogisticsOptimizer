import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Box, Lock, Mail, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from 'react-i18next';

const Auth: React.FC = () => {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("No user created");

        if (!authData.session) {
          setMessage("Account created! Please check your email to confirm your account before logging in.");
          setIsLogin(true);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setMessage('Password reset link sent! Check your email.');
      setShowForgotPassword(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary p-3 rounded-xl">
              <Box className="text-primary-foreground" size={32} />
            </div>
          </div>
          <CardTitle className="text-2xl">
            {showForgotPassword ? 'Reset Password' : isLogin ? 'Welcome Back' : 'Create Account'}
          </CardTitle>
          <CardDescription>
            {showForgotPassword
              ? 'Enter your email to receive a password reset link'
              : isLogin ? 'Sign in to access your logistics dashboard' : 'Sign up to start optimizing logistics'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive p-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-500 p-3 rounded-lg text-sm text-center">
              {message}
            </div>
          )}

          {showForgotPassword ? (
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
                <Input
                  type="email"
                  placeholder="Work Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>

              <Button
                onClick={handleForgotPassword}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>

              <div className="text-center">
                <button
                  onClick={() => { setShowForgotPassword(false); setError(null); setMessage(null); }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1 w-full"
                >
                  Back to Sign In
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
                <Input
                  type="email"
                  placeholder="Work Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                {isLogin && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => { setShowForgotPassword(true); setError(null); setMessage(null); }}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      {t('auth.forgotPassword')}
                    </button>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </form>
          )}

          {!showForgotPassword && (
            <div className="text-center pt-2">
              <button
                onClick={() => { setIsLogin(!isLogin); setError(null); setMessage(null); }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1 w-full"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
