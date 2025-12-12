
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Box, Lock, Mail, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
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
        // LOGIN FLOW
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        // SIGN UP FLOW
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("No user created");

        // If session is null, email confirmation is required
        if (!authData.session) {
          setMessage("Account created! Please check your email to confirm your account before logging in.");
          setIsLogin(true); // Switch to login view
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-900/30">
            <Box className="text-white" size={32} />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white text-center mb-2">
          {showForgotPassword ? 'Reset Password' : isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-slate-400 text-center mb-8 text-sm">
          {showForgotPassword
            ? 'Enter your email to receive a password reset link'
            : isLogin ? 'Sign in to access your logistics dashboard' : 'Sign up to start optimizing logistics'}
        </p>

        {error && (
          <div className="bg-red-900/30 border border-red-500/50 text-red-200 p-3 rounded-lg mb-6 text-sm text-center">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-900/30 border border-green-500/50 text-green-200 p-3 rounded-lg mb-6 text-sm text-center">
            {message}
          </div>
        )}

        {showForgotPassword ? (
          // FORGOT PASSWORD FORM
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
              <input
                type="email"
                placeholder="Work Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2.5 pl-10 text-slate-200 focus:border-blue-500 outline-none transition-colors"
                required
              />
            </div>

            <Button
              onClick={handleForgotPassword}
              isLoading={loading}
              className="w-full py-3 mt-2 text-base"
            >
              Send Reset Link
            </Button>

            <div className="mt-6 text-center">
              <button
                onClick={() => { setShowForgotPassword(false); setError(null); setMessage(null); }}
                className="text-sm text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1 w-full"
              >
                Back to Sign In
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ) : (
          // LOGIN / SIGNUP FORM
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
              <input
                type="email"
                placeholder="Work Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2.5 pl-10 text-slate-200 focus:border-blue-500 outline-none transition-colors"
                required
              />
            </div>

            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-500" size={18} />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2.5 pl-10 text-slate-200 focus:border-blue-500 outline-none transition-colors"
                  required
                />
              </div>
              {isLogin && (
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => { setShowForgotPassword(true); setError(null); setMessage(null); }}
                    className="text-xs text-slate-400 hover:text-blue-400 transition-colors"
                  >
                    {t('auth.forgotPassword')}
                  </button>
                </div>
              )}
            </div>

            <Button
              type="submit"
              isLoading={loading}
              className="w-full py-3 mt-2 text-base"
            >
              {isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>
        )}

        {!showForgotPassword && (
          <div className="mt-6 text-center">
            <button
              onClick={() => { setIsLogin(!isLogin); setError(null); setMessage(null); }}
              className="text-sm text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1 w-full"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;
