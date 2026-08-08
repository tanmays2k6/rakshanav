import React, { useState, useRef, useEffect } from 'react';
import { Bot, User, Send, Sparkles, Loader2, Info, StopCircle, Copy, RefreshCw, Navigation, AlertTriangle, ShieldAlert, Map } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useNavigate, matchRoutes } from 'react-router-dom';
import { appRoutes } from '../../config/routes';
import { useGeminiChat } from '../../hooks/useGemini';

export default function AiAssistant() {
  const { messages, isTyping, sendMessage, stopGeneration } = useGeminiChat();
  const [input, setInput] = useState('');
  const endOfMessagesRef = useRef(null);
  const navigatedMsgIds = useRef(new Set());
  const navigate = useNavigate();

  // Watch for auto-navigation action tags in the AI's final response
  useEffect(() => {
    if (!isTyping && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'ai' && !navigatedMsgIds.current.has(lastMessage.id)) {
        const actionMatch = lastMessage.text.match(/<action\s+type="navigate"\s+target="([^"]+)"(?:\s+origin="([^"]*)")?(?:\s+destination="([^"]*)")?\s*\/>/);
        
        if (actionMatch && actionMatch[1]) {
           let target = actionMatch[1];
           const origin = actionMatch[2];
           const destination = actionMatch[3];

           // Aggressive fallback for common hallucinated routes
           if (target === '/dashboard/navigation' || target === '/navigate' || target.includes('navigate') || target.includes('safe_route') || target.includes('navigation')) {
              target = '/dashboard/navigation';
           }

           if (target === '/dashboard/navigation' && (!origin || !destination)) {
              console.warn('[AI Navigation Guard] Missing origin or destination. Aborting redirect.');
              return;
           }

           // Validate against registered routes
           const isMatch = matchRoutes(appRoutes, target);
           let finalTarget = target;
           if (!isMatch) {
              console.warn(`[AI Navigation] Invalid route requested: ${target}. Falling back to default dashboard.`);
              finalTarget = '/dashboard';
           }

           console.log(`\n==================================================`);
           console.log(`[AI Navigation Logger]`);
           console.log(`Intent / Action: navigate`);
           console.log(`Requested Route: ${actionMatch[1]}`);
           console.log(`Resolved Target: ${finalTarget}`);
           console.log(`Status: ${isMatch ? 'Verified by React Router' : 'Substituted due to invalid path'}`);
           console.log(`==================================================\n`);

           navigatedMsgIds.current.add(lastMessage.id);
           
           setTimeout(() => {
             navigate(finalTarget, { state: { autoTrigger: true, origin, destination } });
           }, 2000);
        }
      }
    }
  }, [messages, isTyping, navigate]);

  const cleanTextForMarkdown = (text) => {
    return text.replace(/<action[\s\S]*?\/>/g, '');
  };

  const suggestedPrompts = [
    "Is it safe to walk home via Koramangala 4th block now?",
    "Find a safer alternative to MG Road.",
    "Nearest police station from my location?",
    "Summarize today's safety alerts in my area."
  ];

  const handleSend = (text = input) => {
    if (!text.trim()) return;
    sendMessage(text);
    setInput('');
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className="flex flex-col h-full bg-[#080c10]/50 rounded-3xl border border-white/5 overflow-hidden shadow-2xl relative">
      
      {/* Header */}
      <div className="h-16 border-b border-white/10 flex items-center px-6 gap-3 shrink-0 glass-panel rounded-none border-t-0 border-l-0 border-r-0">
        <div className="p-2 bg-brand-blue/20 rounded-lg">
          <Bot className="w-5 h-5 text-brand-blue" />
        </div>
        <div>
          <h2 className="font-display font-bold text-white tracking-wide">Gemini Safety Assistant</h2>
          <p className="text-xs text-brand-neonGreen font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-neonGreen animate-pulse"></span>
            Online & monitoring
          </p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative z-10">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-4 max-w-[80%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
            
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'ai' ? 'bg-white/5 border border-white/10 text-brand-blue' : 'bg-brand-blue text-white'
            }`}>
              {msg.role === 'ai' ? <Sparkles className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>

            <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-brand-blue text-white rounded-tr-sm' 
                : 'glass-panel rounded-tl-sm text-gray-200 w-full'
            }`}>
              {msg.role === 'ai' ? (
                <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10">
                  <ReactMarkdown>{cleanTextForMarkdown(msg.text)}</ReactMarkdown>
                  
                  {msg.text.includes('<action type="navigate" target="/dashboard/emergency"') && !isTyping && (
                    <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 cursor-pointer hover:bg-red-500/20 transition-colors" onClick={() => navigate('/dashboard/emergency', { state: { autoTrigger: true } })}>
                       <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center shrink-0 shadow-lg shadow-red-500/40">
                         <ShieldAlert className="w-5 h-5 text-white" />
                       </div>
                       <div className="flex-1">
                         <h4 className="text-white font-bold text-sm">Emergency Mode Initiated</h4>
                         <p className="text-red-400 text-xs mt-0.5">Redirecting to SOS dashboard...</p>
                       </div>
                    </div>
                  )}
                  
                  {msg.text.includes('<action type="navigate" target="/dashboard/navigation"') && !isTyping && (
                    <div className="mt-4 p-3 rounded-xl bg-brand-blue/10 border border-brand-blue/30 flex items-center gap-3 cursor-pointer hover:bg-brand-blue/20 transition-colors" onClick={() => navigate('/dashboard/navigation')}>
                       <div className="w-10 h-10 rounded-full bg-brand-blue flex items-center justify-center shrink-0">
                         <Navigation className="w-5 h-5 text-white" />
                       </div>
                       <div className="flex-1">
                         <h4 className="text-white font-bold text-sm">Safe Route Engine</h4>
                         <p className="text-brand-blue text-xs mt-0.5">Redirecting to navigation map...</p>
                       </div>
                    </div>
                  )}

                  {msg.text.includes('<action type="navigate" target="/dashboard/report"') && !isTyping && (
                    <div className="mt-4 p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center gap-3 cursor-pointer hover:bg-orange-500/20 transition-colors" onClick={() => navigate('/dashboard/report')}>
                       <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
                         <AlertTriangle className="w-5 h-5 text-white" />
                       </div>
                       <div className="flex-1">
                         <h4 className="text-white font-bold text-sm">Report a Hazard</h4>
                         <p className="text-orange-400 text-xs mt-0.5">Opening report form...</p>
                       </div>
                    </div>
                  )}

                  {msg.text.includes('<action type="navigate" target="/dashboard/live"') && !isTyping && (
                    <div className="mt-4 p-3 rounded-xl bg-brand-neonGreen/10 border border-brand-neonGreen/30 flex items-center gap-3 cursor-pointer hover:bg-brand-neonGreen/20 transition-colors" onClick={() => navigate('/dashboard/live')}>
                       <div className="w-10 h-10 rounded-full bg-brand-neonGreen flex items-center justify-center shrink-0">
                         <Map className="w-5 h-5 text-[#080c10]" />
                       </div>
                       <div className="flex-1">
                         <h4 className="text-white font-bold text-sm">Live Tracking</h4>
                         <p className="text-brand-neonGreen text-xs mt-0.5">Starting live session...</p>
                       </div>
                    </div>
                  )}

                  {msg.text && !isTyping && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
                      <button onClick={() => handleCopy(msg.text)} className="text-xs flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                msg.text
              )}
            </div>

          </div>
        ))}
        
        {isTyping && (
          <div className="flex gap-4 max-w-[80%]">
            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-brand-blue flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="glass-panel p-4 rounded-2xl rounded-tl-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-brand-blue rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-brand-blue rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-brand-blue rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 pt-2 shrink-0 z-10">
        
        {/* Chips */}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {suggestedPrompts.map((prompt, idx) => (
              <button 
                key={idx} 
                onClick={() => handleSend(prompt)}
                className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3 text-brand-blue" />
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input box */}
        <div className="relative">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask about safe routes, areas, or emergency info..."
            className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm rounded-2xl pl-4 pr-12 py-4 outline-none focus:border-brand-blue/50 focus:bg-white/10 transition-all shadow-inner"
          />
          {isTyping ? (
            <button 
              onClick={stopGeneration}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-brand-neonRed/20 hover:bg-brand-neonRed/30 text-brand-neonRed rounded-xl flex items-center justify-center transition-colors"
            >
              <StopCircle className="w-5 h-5" />
            </button>
          ) : (
            <button 
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-brand-blue hover:bg-blue-600 disabled:bg-white/10 disabled:text-gray-500 text-white rounded-xl flex items-center justify-center transition-colors"
            >
              <Send className="w-4 h-4 ml-1" />
            </button>
          )}
        </div>
        <p className="text-[10px] text-gray-500 text-center mt-3 flex items-center justify-center gap-1">
          <Info className="w-3 h-3" /> AI can make mistakes. Always trust your instincts and use SOS in emergencies.
        </p>
      </div>

    </div>
  );
}
