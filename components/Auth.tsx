
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Box, Lock, Mail, Building2, ArrowRight } from 'lucide-react';
import Button from './Button';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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
        if (!companyName) throw new Error("Company name is required for signup");

        // 1. Sign up user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (authError) throw authError;
        if (!authData.user) throw new Error("No user created");

        // 2. Create Company
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .insert([{ name: companyName }])
          .select()
          .single();

        if (companyError) throw companyError;

        // 3. Create Profile linking User to Company
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: authData.user.id,
            email: email,
            company_id: companyData.id
          }]);

        if (profileError) throw profileError;
      }
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
          {isLogin ? 'Welcome Back' : 'Create Company Account'}
        </h2>
        <p className="text-slate-400 text-center mb-8 text-sm">
          {isLogin ? 'Sign in to access your logistics dashboard' : 'Start optimizing your logistics today'}
        </p>

        {error && (
          <div className="bg-red-900/30 border border-red-500/50 text-red-200 p-3 rounded-lg mb-6 text-sm text-center">
            {error}
          </div>
        )}

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

          {!isLogin && (
            <div className="relative animate-in fade-in slide-in-from-top-4">
              <Building2 className="absolute left-3 top-3 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Company Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2.5 pl-10 text-slate-200 focus:border-blue-500 outline-none transition-colors"
                required
              />
            </div>
          )}

          <Button 
            type="submit" 
            isLoading={loading} 
            className="w-full py-3 mt-2 text-base"
          >
            {isLogin ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1 w-full"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
