import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { Loader2 } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Validation & Message states
  const [error, setError] = useState(null);
  const [emailError, setEmailError] = useState('');
  const [success, setSuccess] = useState(false);

  const validateForm = () => {
    let isValid = true;
    setEmailError('');
    setError(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    }

    return isValid;
  };

  const handleResetRequest = async (e) => {
    e.preventDefault();
    if (!validateForm() || loading) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    // Determine reset URL dynamically to support both localhost and production
    const resetUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${resetUrl}/reset-password`,
    });
    
    if (resetError) {
      // Show generic error unless it's a rate limit
      if (resetError.message.includes('rate limit')) {
        setError('Too many requests. Please try again later.');
      } else {
        setError('An error occurred. Please try again.');
      }
    } else {
      // Generic success message to prevent email enumeration
      setSuccess(true);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080c10] p-4 relative overflow-hidden">
      {/* Subtle radial glow background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-blue/5 via-[#080c10] to-[#080c10] pointer-events-none"></div>

      <div className="glass-panel w-full max-w-md p-8 relative z-10 flex flex-col">
        {/* Header Section */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-[120px] md:w-[140px] mb-3">
            <Logo size="2xl" className="w-full h-auto" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Reset your password</h2>
          <p className="text-gray-400 text-sm text-center">
            Enter the email address associated with your RakshaNav account and we'll send you a password reset link.
          </p>
        </div>

        {/* Global Error/Success Banners */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm text-center" role="alert">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-6 bg-green-500/10 border border-green-500/50 text-green-400 p-3 rounded-lg text-sm text-center" role="alert">
            If an account exists for this email, we've sent a password reset link. Please check your inbox.
          </div>
        )}

        <form onSubmit={handleResetRequest} className="flex flex-col gap-5">
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
              disabled={loading || success}
            />
            {emailError && <p className="text-red-400 text-xs mt-1.5">{emailError}</p>}
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading || success}
            className="w-full bg-brand-blue hover:bg-blue-600 text-white font-semibold rounded-xl px-4 py-3 transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-[#080c10]"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>

        {/* Back to Sign In Link */}
        <p className="text-center text-sm text-gray-400 mt-6">
          <Link to="/login" className="text-brand-blue hover:text-blue-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/50 rounded-sm font-medium transition-colors">
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
