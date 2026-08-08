import React from 'react';
import { ArrowRight, Clock } from 'lucide-react';

export default function StepWelcome({ onNext, user }) {
  return (
    <div className="flex flex-col items-center text-center space-y-6">
      {user?.user_metadata?.avatar_url && (
        <img 
          src={user.user_metadata.avatar_url} 
          alt="Profile" 
          className="w-20 h-20 rounded-full border-2 border-brand-blue/50 object-cover"
        />
      )}
      
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-2">Welcome to RakshaNav</h1>
        <p className="text-gray-400">Let's personalize your experience and make your journeys safer.</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-4 w-full max-w-sm">
        <p className="text-sm text-gray-400 mb-1">Signed in as</p>
        <p className="font-medium text-white">{user?.email}</p>
      </div>

      <div className="flex items-center text-gray-500 text-sm gap-2">
        <Clock className="w-4 h-4" />
        <span>Estimated completion time: 30–45 seconds</span>
      </div>

      <button
        onClick={onNext}
        className="w-full sm:w-auto px-8 py-3 bg-brand-blue text-black font-semibold rounded-lg hover:bg-brand-blue/90 transition-colors flex items-center justify-center gap-2"
      >
        Continue
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}
