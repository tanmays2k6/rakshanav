import React from 'react';
import { Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#080c12] flex flex-col items-center justify-center p-6 text-center animate-fade-up">
      <div className="mb-8 relative grayscale opacity-70">
        <Logo size="lg" />
      </div>
      
      <h1 className="text-4xl font-display font-black text-white mb-4 tracking-tight">
        404 <span className="text-brand-blue">|</span> Sector Not Found
      </h1>
      
      <p className="text-gray-400 mb-8 max-w-md mx-auto">
        The coordinates you provided do not correspond to a known sector in the RakshaNav system. It may have been moved or the link is expired.
      </p>

      <Link 
        to="/" 
        className="bg-brand-blue hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-brand-blue/20 flex items-center gap-2"
      >
        <Home className="w-5 h-5" />
        Return to Dashboard
      </Link>
    </div>
  );
}
