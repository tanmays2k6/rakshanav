const fs = require('fs');

const path = 'e:/rakshanav-main/rakshanav-main/rakshanav/src/pages/citizen/AiAssistant.jsx';
let c = fs.readFileSync(path, 'utf8');

const newImports = `import React, { useState, useRef, useEffect } from 'react';
import { Bot, User, Send, Sparkles, Loader2, Info, StopCircle, Copy, RefreshCw, Navigation, AlertTriangle, ShieldAlert, Map } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import { useGeminiChat } from '../../hooks/useGemini';`;

c = c.replace(/import React[\s\S]*?import { useGeminiChat } from '\.\.\/\.\.\/hooks\/useGemini';/, newImports);

const newSetup = `export default function AiAssistant() {
  const { messages, isTyping, sendMessage, stopGeneration } = useGeminiChat();
  const [input, setInput] = useState('');
  const endOfMessagesRef = useRef(null);
  const navigate = useNavigate();

  // Watch for auto-navigation action tags in the AI's final response
  useEffect(() => {
    if (!isTyping && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'ai') {
        const actionMatch = lastMessage.text.match(/<action\\s+type="navigate"\\s+target="([^"]+)"\\s*\\/>/);
        if (actionMatch && actionMatch[1]) {
           const target = actionMatch[1];
           // Delay slightly so user can read the text before being swooped away
           setTimeout(() => {
             navigate(target, { state: { autoTrigger: true } });
           }, 2000);
        }
      }
    }
  }, [messages, isTyping, navigate]);

  const cleanTextForMarkdown = (text) => {
    return text.replace(/<action[\\s\\S]*?\\/>/g, '');
  };
`;

c = c.replace(/export default function AiAssistant\(\) \{[\s\S]*?const handleSend =/m, newSetup + '\n  const handleSend =');

const newMarkdownRender = `{msg.role === 'ai' ? (
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
                  
                  {msg.text.includes('<action type="navigate" target="/dashboard/navigate"') && !isTyping && (
                    <div className="mt-4 p-3 rounded-xl bg-brand-blue/10 border border-brand-blue/30 flex items-center gap-3 cursor-pointer hover:bg-brand-blue/20 transition-colors" onClick={() => navigate('/dashboard/navigate')}>
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
              ) : (`;

c = c.replace(/\{msg\.role === 'ai' \? \([\s\S]*?\) : \(/, newMarkdownRender);

fs.writeFileSync(path, c, 'utf8');
console.log('Patched AiAssistant.jsx');
