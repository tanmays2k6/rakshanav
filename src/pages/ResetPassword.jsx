import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Validation & Message states
  const [error, setError] = useState(null);
  const [passwordError, setPasswordError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Session states
  const [isValidating, setIsValidating] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth(); // If they are somehow already fully logged in

  useEffect(() => {
    let mounted = true;

    // Check for the recovery hash in the URL just in case
    const hash = window.location.hash;
    const isRecoveryHash = hash && hash.includes('type=recovery');

    // Subscribe to auth events to catch the PASSWORD_RECOVERY event
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      if (event === 'PASSWORD_RECOVERY') {
        setHasRecoverySession(true);
        setIsValidating(false);
      } else if (event === 'SIGNED_IN' && isRecoveryHash) {
        // Sometimes Supabase fires SIGNED_IN if it considers it a normal login from a magic link
        setHasRecoverySession(true);
        setIsValidating(false);
      }
    });

    // Fallback check: if no event fired within 2 seconds, determine state based on session
    const timer = setTimeout(async () => {
      if (mounted) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session || user) {
          // If they have a session, we allow them to change password.
          setHasRecoverySession(true);
        }
        setIsValidating(false);
      }
    }, 2000);

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [user]);

  const validateForm = () => {
    let isValid = true;
    setPasswordError('');
    setError(null);

    if (!newPassword) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (newPassword.length < 8) {
      setPasswordError('Password must contain at least 8 characters');
      isValid = false;
    } else if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      isValid = false;
    }

    return isValid;
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!validateForm() || loading) return;

    setLoading(true);
    setError(null);
    setSuccess(false);
    
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
    }
    
    setLoading(false);
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080c10]">
        <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
      </div>
    );
  }

  if (!hasRecoverySession && !success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080c10] p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-blue/5 via-[#080c10] to-[#080c10] pointer-events-none"></div>
        <div className="glass-panel w-full max-w-md p-8 relative z-10 flex flex-col text-center">
          <div className="w-[120px] md:w-[140px] mb-6 mx-auto">
            <Logo size="2xl" className="w-full h-auto" />
          </div>
          <h2 className="text-xl font-bold text-white mb-4">Invalid Link</h2>
          <p className="text-gray-400 text-sm mb-8">
            This password reset link is invalid or has expired.
          </p>
          <Link 
            to="/forgot-password"
            className="w-full bg-brand-blue hover:bg-blue-600 text-white font-semibold rounded-xl px-4 py-3 transition-colors inline-block"
          >
            Request a new reset link
          </Link>
          <Link to="/login" className="text-gray-400 hover:text-white text-sm mt-6 transition-colors">
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080c10] p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-blue/5 via-[#080c10] to-[#080c10] pointer-events-none"></div>

      <div className="glass-panel w-full max-w-md p-8 relative z-10 flex flex-col">
        <div className="flex flex-col items-center mb-6">
          <div className="w-[120px] md:w-[140px] mb-3">
            <Logo size="2xl" className="w-full h-auto" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Set New Password</h2>
          <p className="text-gray-400 text-sm text-center">
            Please enter your new password below.
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm text-center" role="alert">
            {error}
          </div>
        )}
        
        {success ? (
          <div className="flex flex-col text-center">
            <div className="mb-6 bg-green-500/10 border border-green-500/50 text-green-400 p-4 rounded-lg text-sm" role="alert">
              <span className="block font-bold mb-1">Password updated successfully.</span>
              You can now sign in with your new password.
            </div>
            <button 
              onClick={() => {
                // Ensure they are fully logged out so they can log in cleanly
                supabase.auth.signOut().then(() => {
                  navigate('/login');
                });
              }}
              className="w-full bg-brand-blue hover:bg-blue-600 text-white font-semibold rounded-xl px-4 py-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
            >
              Continue to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="flex flex-col gap-5">
            <div>
              <label htmlFor="newPassword" className="block text-xs font-mono text-gray-400 mb-1.5 uppercase tracking-wider">New Password</label>
              <div className="relative">
                <input 
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'} 
                  name="newPassword"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className={`w-full bg-[#0d1117] border ${passwordError ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-brand-blue'} rounded-xl pl-4 pr-12 py-3 text-white outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-blue/20`}
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/50 transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordError && <p className="text-red-400 text-xs mt-1.5">{passwordError}</p>}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-mono text-gray-400 mb-1.5 uppercase tracking-wider">Confirm New Password</label>
              <input 
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'} 
                name="confirmPassword"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className={`w-full bg-[#0d1117] border ${passwordError ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-brand-blue'} rounded-xl px-4 py-3 text-white outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-blue/20`}
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-brand-blue hover:bg-blue-600 text-white font-semibold rounded-xl px-4 py-3 transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
