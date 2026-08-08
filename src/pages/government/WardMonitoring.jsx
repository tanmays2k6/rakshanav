import React from 'react';
import { Users, Map as MapIcon, ShieldCheck } from 'lucide-react';

export default function WardMonitoring() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center animate-fade-up">
      <div className="glass-panel p-10 rounded-2xl border border-white/10 text-center max-w-lg shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/10 rounded-full blur-[50px] -mr-10 -mt-10 pointer-events-none"></div>
        <div className="w-20 h-20 bg-brand-blue/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
           <div className="absolute inset-0 rounded-full border border-brand-blue/30 animate-[spin_4s_linear_infinite]"></div>
           <Users className="w-10 h-10 text-brand-blue" />
        </div>
        <h2 className="text-3xl font-display font-bold text-white mb-3">Ward Monitoring</h2>
        <p className="text-gray-400 mb-8 leading-relaxed">
          No ward demographics or geographic hotspot tracking data is available yet for your jurisdiction.
        </p>
      </div>
    </div>
  );
}
