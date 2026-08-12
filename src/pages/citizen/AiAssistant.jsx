import React, { useState, useRef, useEffect } from 'react';
import { Bot, User, Send, Sparkles, Loader2, Info, StopCircle, Copy, RefreshCw, Navigation, AlertTriangle, ShieldAlert, Map } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useNavigate, matchRoutes } from 'react-router-dom';
import { appRoutes } from '../../config/routes';
import { useGeminiChat } from '../../hooks/useGemini';
import { useTheme } from '../../contexts/ThemeContext';

export default function AiAssistant() {
  const { messages, isTyping, lastError, sendMessage, stopGeneration } = useGeminiChat();
  const { isDarkMode } = useTheme();
  const [input, setInput] = useState('');
  const [healthStatus, setHealthStatus] = useState('checking'); // 'checking' | 'connected' | 'unavailable'
  const endOfMessagesRef = useRef(null);
  const navigatedMsgIds = useRef(new Set());
  const navigate = useNavigate();

  // Gemini API Health Check
  useEffect(() => {
    let active = true;
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/ai/health');
        if (res.ok) {
          const data = await res.json();
          if (active) {
            setHealthStatus(data.connected ? 'connected' : 'unavailable');
          }
        } else {
          if (active) setHealthStatus('unavailable');
        }
      } catch (err) {
        if (active) setHealthStatus('unavailable');
      }
    };
    checkHealth();
    return () => { active = false; };
  }, []);

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

  const handleRetry = () => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg && lastUserMsg.text) {
      sendMessage(lastUserMsg.text);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className={`flex flex-col h-full rounded-3xl border overflow-hidden shadow-xl relative transition-colors
      ${isDarkMode 
        ? 'bg-[rgba(8,12,18,0.5)] border-[rgba(255,255,255,0.06)]'
        : 'bg-white border-[#E2E6EC]'
      }`}>
      
      {/* Header */}
      <div className={`h-16 border-b flex items-center px-6 gap-3 shrink-0
        ${isDarkMode 
          ? 'border-[rgba(255,255,255,0.08)] bg-[rgba(8,12,18,0.8)]' 
          : 'border-[#E2E6EC] bg-white'
        }`}>
        <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-[rgba(37,99,235,0.15)]' : 'bg-[#EFF6FF]'}`}>
          <Bot className="w-5 h-5 text-[#2563EB]" />
        </div>
        <div>
          <h2 className={`font-display font-bold tracking-wide ${isDarkMode ? 'text-white' : 'text-[#111827]'}`}>Gemini Safety Assistant</h2>
          <p className="text-xs font-mono flex items-center gap-1.5">
            {healthStatus === 'connected' && (
              <>
                <span className="w-2 h-2 rounded-full bg-brand-neonGreen animate-pulse"></span>
                <span className="text-brand-neonGreen font-semibold">Gemini Connected</span>
              </>
            )}
            {healthStatus === 'checking' && (
              <>
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping"></span>
                <span className="text-yellow-400 font-semibold">Connecting...</span>
              </>
            )}
            {healthStatus === 'unavailable' && (
              <>
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span className="text-red-400 font-semibold">Gemini Unavailable</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative z-10">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-4 max-w-[80%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
            
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'ai' 
                ? (isDarkMode ? 'bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-[#2563EB]' : 'bg-[#EFF6FF] border border-[#DBEAFE] text-[#2563EB]')
                : 'bg-[#2563EB] text-white'
            }`}>
              {msg.role === 'ai' ? <Sparkles className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>

            <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-[#2563EB] text-white rounded-tr-sm' 
                : (isDarkMode
                    ? 'bg-[rgba(8,12,18,0.84)] border border-[rgba(255,255,255,0.07)] rounded-tl-sm text-gray-200 w-full'
                    : 'bg-[#F7F8FA] border border-[#E2E6EC] rounded-tl-sm text-[#374151] w-full')
            }`}>
              {msg.role === 'ai' ? (
                <div className={`prose max-w-none prose-p:leading-relaxed ${isDarkMode ? 'prose-invert prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10' : 'prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200'}`}>
                  <ReactMarkdown>{cleanTextForMarkdown(msg.text)}</ReactMarkdown>
                  
                  {msg.text.includes('Gemini Safety Assistant is temporarily unavailable') && !isTyping && (
                    <div className="mt-3 flex items-center gap-3">
                      <button 
                        onClick={handleRetry}
                        className="px-3 py-1.5 bg-brand-blue/20 hover:bg-brand-blue/30 border border-brand-blue/40 text-brand-blue rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Retry
                      </button>
                    </div>
                  )}
                  
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
                    <div className={`flex gap-2 mt-3 pt-3 border-t ${isDarkMode ? 'border-[rgba(255,255,255,0.08)]' : 'border-[#E2E6EC]'}`}>
                      <button onClick={() => handleCopy(msg.text)} className={`text-xs flex items-center gap-1 transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-[#667085] hover:text-[#111827]'}`}>
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
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[#2563EB]
              ${isDarkMode ? 'bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)]' : 'bg-[#EFF6FF] border border-[#DBEAFE]'}`}>
              <Sparkles className="w-4 h-4" />
            </div>
            <div className={`p-4 rounded-2xl rounded-tl-sm flex items-center gap-2
              ${isDarkMode ? 'bg-[rgba(8,12,18,0.84)] border border-[rgba(255,255,255,0.07)]' : 'bg-[#F7F8FA] border border-[#E2E6EC]'}`}>
              <span className="w-2 h-2 bg-[#2563EB] rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-[#2563EB] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-[#2563EB] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
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
                className={`text-xs border px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5
                  ${isDarkMode 
                    ? 'bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border-[rgba(255,255,255,0.1)] text-gray-300'
                    : 'bg-[#F1F3F6] hover:bg-[#E2E6EC] border-[#E2E6EC] text-[#667085]'
                  }`}
              >
                <Sparkles className="w-3 h-3 text-[#2563EB]" />
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
            className={`w-full text-sm rounded-2xl pl-4 pr-12 py-4 outline-none transition-all shadow-inner
              ${isDarkMode 
                ? 'bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-white placeholder-gray-500 focus:border-[rgba(37,99,235,0.5)] focus:bg-[rgba(255,255,255,0.08)]'
                : 'bg-[#F7F8FA] border border-[#E2E6EC] text-[#111827] placeholder-[#98A2B3] focus:border-[#2563EB] focus:ring-2 focus:ring-[rgba(37,99,235,0.15)]'
              }`}
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
