import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { Loader2, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  
  // Validation & Error states
  const [error, setError] = useState(null);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const navigate = useNavigate();

  const validateForm = () => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');
    setError(null);

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    }

    return isValid;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateForm() || loading || googleLoading) return;

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      // Provide meaningful error messages
      if (error.message.includes('Invalid login credentials')) {
        setError('Incorrect email or password. Please try again.');
      } else {
        setError(error.message);
      }
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  const handleGoogleLogin = async () => {
    if (loading || googleLoading) return;
    setGoogleLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/dashboard'
      }
    });
    
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080c10] p-4 relative overflow-hidden">
      {/* Subtle radial glow background to add depth without distraction */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-blue/5 via-[#080c10] to-[#080c10] pointer-events-none"></div>

      <div className="glass-panel w-full max-w-md p-6 md:p-8 relative z-10 flex flex-col">
        {/* Header Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-[120px] md:w-[140px] mb-3">
            <Logo size="2xl" className="w-full h-auto" />
          </div>
          <p className="text-gray-400 font-medium text-sm tracking-wide">Safe Urban Navigation Platform</p>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm text-center" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-xs font-mono text-gray-400 mb-1.5 uppercase tracking-wider">Email</label>
            <input 
              id="email"
              type="email" 
              name="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={`w-full bg-[#0d1117] border ${emailError ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-brand-blue'} rounded-xl px-4 py-3 text-white outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-blue/20`}
              placeholder="you@example.com"
              disabled={loading || googleLoading}
            />
            {emailError && <p className="text-red-400 text-xs mt-1.5">{emailError}</p>}
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-xs font-mono text-gray-400 mb-1.5 uppercase tracking-wider">Password</label>
            <div className="relative">
              <input 
                id="password"
                type={showPassword ? 'text' : 'password'} 
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={`w-full bg-[#0d1117] border ${passwordError ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-brand-blue'} rounded-xl pl-4 pr-12 py-3 text-white outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-blue/20`}
                placeholder="••••••••"
                disabled={loading || googleLoading}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/50 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={loading || googleLoading}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordError && <p className="text-red-400 text-xs mt-1.5">{passwordError}</p>}
            
            <div className="flex justify-end mt-2">
              <Link 
                to="/forgot-password"
                className="text-xs text-gray-400 hover:text-white transition-colors focus:outline-none focus-visible:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading || googleLoading}
            className="w-full bg-brand-blue hover:bg-blue-600 text-white font-semibold rounded-xl px-4 py-3 transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-[#080c10]"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="h-px bg-white/10 flex-1"></div>
          <span className="text-xs text-gray-500 font-mono">OR</span>
          <div className="h-px bg-white/10 flex-1"></div>
        </div>

        {/* Google Auth */}
        <button 
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading || googleLoading}
          className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl px-4 py-3 transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        >
          {googleLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          )}
          {googleLoading ? 'Connecting...' : 'Continue with Google'}
        </button>

        {/* Signup Link */}
        <p className="text-center text-sm text-gray-400 mt-6">
          Don't have an account? <Link to="/signup" className="text-brand-orange hover:text-orange-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50 rounded-sm font-medium transition-colors">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
