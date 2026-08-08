import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Bell, Send, MapPin, AlertTriangle, Info, CheckCircle2,
  Clock, ShieldAlert, Megaphone
} from 'lucide-react';
import { governmentService } from '../../services/governmentService';

export default function GovNotifications() {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [sending, setSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    category: 'Safety Alert',
    severity: 'high',
    target_ward: 'All Wards'
  });

  const fetchHistory = async () => {
    // In a real app we need the user's organization ID
    const org = await governmentService.getCurrentOrganization(user.id);
    if (org && org.id) {
      const data = await governmentService.getNotificationsHistory(org.id);
      setHistory(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    
    try {
      const org = await governmentService.getCurrentOrganization(user.id);
      if (!org) throw new Error("Organization not found");

      const res = await governmentService.sendOfficialNotification(org.id, user.id, formData);
      if (res.success) {
        setShowSuccess(true);
        setFormData({ ...formData, title: '', message: '' });
        fetchHistory();
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        alert("Failed to send notification: " + res.error);
      }
    } catch (err) {
      console.error(err);
      alert("Error sending notification");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-6 animate-fade-up overflow-hidden">
      
      {/* Create Notification */}
      <div className="w-full lg:w-[450px] flex flex-col gap-6 shrink-0 h-full overflow-y-auto custom-scrollbar">
        <div className="glass-panel rounded-xl border border-white/10 p-6 shadow-xl relative overflow-hidden">
          {/* Decor */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/10 rounded-full blur-[50px] -mr-10 -mt-10 pointer-events-none"></div>

          <h2 className="text-xl font-display font-bold text-white flex items-center gap-2 mb-2 relative z-10">
            <Megaphone className="w-5 h-5 text-brand-blue" />
            Official Broadcast
          </h2>
          <p className="text-sm text-gray-400 mb-6 relative z-10">Send safety advisories and alerts directly to citizens in specified wards.</p>

          <form onSubmit={handleSend} className="space-y-5 relative z-10">
            <div>
              <label className="block text-xs font-mono text-gray-500 mb-1">TITLE</label>
              <input 
                required type="text" name="title" value={formData.title} onChange={handleChange}
                placeholder="E.g., Heavy Rainfall Alert"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand-blue outline-none transition-colors"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-gray-500 mb-1">CATEGORY</label>
                <select name="category" value={formData.category} onChange={handleChange} className="w-full bg-[#1a1f26] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand-blue outline-none transition-colors">
                  <option value="Safety Alert">Safety Alert</option>
                  <option value="Traffic Advisory">Traffic Advisory</option>
                  <option value="Weather Warning">Weather Warning</option>
                  <option value="Public Health">Public Health</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-500 mb-1">SEVERITY</label>
                <select name="severity" value={formData.severity} onChange={handleChange} className="w-full bg-[#1a1f26] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand-blue outline-none transition-colors">
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-500 mb-1">TARGET WARD / AREA</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <select name="target_ward" value={formData.target_ward} onChange={handleChange} className="w-full bg-[#1a1f26] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-white text-sm focus:border-brand-blue outline-none transition-colors">
                  <option value="All Wards">All Wards (City Wide)</option>
                  <option value="Koramangala">Koramangala</option>
                  <option value="Indiranagar">Indiranagar</option>
                  <option value="Whitefield">Whitefield</option>
                  <option value="Jayanagar">Jayanagar</option>
                  <option value="HSR Layout">HSR Layout</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-500 mb-1">MESSAGE</label>
              <textarea 
                required name="message" value={formData.message} onChange={handleChange} rows="4"
                placeholder="Type the official advisory message..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand-blue outline-none transition-colors resize-none"
              ></textarea>
            </div>

            {showSuccess ? (
              <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold">
                <CheckCircle2 className="w-5 h-5" /> Broadcast Sent Successfully
              </div>
            ) : (
              <button 
                type="submit" disabled={sending || !formData.title || !formData.message}
                className="w-full bg-gradient-to-r from-brand-blue to-blue-600 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-[0_4px_20px_rgba(37,99,235,0.3)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><Send className="w-4 h-4" /> Broadcast Notification</>}
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Broadcast History */}
      <div className="flex-1 glass-panel rounded-xl border border-white/10 flex flex-col overflow-hidden shadow-xl min-h-[500px]">
        <div className="px-6 py-5 border-b border-white/10 bg-black/40 shrink-0 flex justify-between items-center backdrop-blur-md">
          <h2 className="font-bold text-white text-lg flex items-center gap-2">
            <History className="w-5 h-5 text-brand-neonGreen" /> Broadcast History
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {loading ? (
             <div className="flex justify-center items-center h-full">
               <div className="w-8 h-8 border-4 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin"></div>
             </div>
          ) : history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
              <Bell className="w-16 h-16 text-gray-600 mb-4 opacity-50" />
              <h3 className="text-xl font-bold text-white mb-2">No Broadcasts Yet</h3>
              <p className="text-gray-400">Official notifications and safety advisories sent to citizens will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map(item => (
                <div key={item.id} className="p-5 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors relative group">
                  <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-brand-blue opacity-50 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <h4 className="font-bold text-white text-base">{item.title}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        item.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                        item.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        item.severity === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {item.severity}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-300 leading-relaxed mb-4">{item.message}</p>
                  
                  <div className="flex items-center gap-4 border-t border-white/5 pt-3 text-[11px] text-gray-500 font-mono">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> TARGET: {item.target_ward}
                    </span>
                    <span className="flex items-center gap-1">
                      <Info className="w-3.5 h-3.5" /> CAT: {item.category}
                    </span>
                    <span className="ml-auto text-brand-neonGreen flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> SENT TO CITIZENS
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
