import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import Logo from '../components/Logo';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMsg(null);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setMsg("Registration successful! Check your email for verification, or login if auto-confirm is enabled.");
      setLoading(false);
      // If user is auto-signed in, they will be redirected by AuthContext wrapper or they can navigate manually.
      if (data.session) {
        navigate('/onboarding');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080c10] p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-orange opacity-10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-blue opacity-10 rounded-full blur-[100px]"></div>

      <div className="glass-panel w-full max-w-md p-6 md:p-8 relative z-10 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 mb-4">
          <Logo size="xl" className="mb-2" />
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">Create Account</h1>
          <p className="text-gray-400 text-sm">Join the RakshaNav network</p>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm text-center">{error}</div>}
        {msg && <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-3 rounded-lg text-sm text-center">{msg}</div>}

        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1 uppercase tracking-wider">Full Name</label>
            <input 
              type="text" 
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full bg-[#0d1117] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-orange transition-colors"
              placeholder="Jane Doe"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1 uppercase tracking-wider">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#0d1117] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-orange transition-colors"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1 uppercase tracking-wider">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#0d1117] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-orange transition-colors"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-brand-orange hover:bg-orange-600 text-white font-semibold rounded-xl px-4 py-3 transition-colors mt-2 disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-2">
          Already have an account? <Link to="/login" className="text-brand-blue hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
