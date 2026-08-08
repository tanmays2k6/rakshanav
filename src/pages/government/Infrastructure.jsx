import React from 'react';
import { Bot, Cpu, Cog } from 'lucide-react';

export default function Infrastructure() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center animate-fade-up">
      <div className="glass-panel p-10 rounded-2xl border border-white/10 text-center max-w-lg shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-orange/10 rounded-full blur-[50px] -mr-10 -mt-10 pointer-events-none"></div>
        <div className="w-20 h-20 bg-brand-orange/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
           <div className="absolute inset-0 rounded-full border border-brand-orange/30 animate-[spin_4s_linear_infinite_reverse]"></div>
           <Bot className="w-10 h-10 text-brand-orange" />
        </div>
        <h2 className="text-3xl font-display font-bold text-white mb-3">AI Infrastructure Monitoring</h2>
        <p className="text-gray-400 mb-8 leading-relaxed">
          The IoT and AI-driven automated infrastructure anomaly detection system is currently in beta testing. 
          This will allow proactive maintenance before citizens need to report issues.
        </p>
        <div className="inline-flex items-center gap-2 bg-brand-orange/20 text-brand-orange px-4 py-2 rounded-lg text-sm font-bold border border-brand-orange/30">
          <Cpu className="w-4 h-4" /> Coming in v3.0
        </div>
      </div>
    </div>
  );
}
