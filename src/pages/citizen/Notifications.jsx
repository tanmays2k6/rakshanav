import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle2, AlertTriangle, Info, Settings, Clock, ArrowRight } from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

export default function Notifications() {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Initial fetch
    const loadNotifs = async () => {
      setLoading(true);
      const res = await notificationService.fetchNotifications(user.id);
      if (res.success) {
        setNotifications(res.data);
      }
      setLoading(false);
    };
    loadNotifs();

    // Start realtime subscription
    notificationService.startRealtime(user.id);
    
    const unsubscribe = notificationService.subscribe((newData) => {
      setNotifications(newData);
    });

    return () => {
      unsubscribe();
      notificationService.stopRealtime();
    };
  }, [user]);

  const getIcon = (type) => {
    switch(type) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-brand-neonGreen" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'danger': return <AlertTriangle className="w-5 h-5 text-brand-neonRed" />;
      default: return <Info className="w-5 h-5 text-brand-blue" />;
    }
  };

  const getRelativeTime = (timestamp) => {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const daysDifference = Math.round((new Date(timestamp) - new Date()) / (1000 * 60 * 60 * 24));
    
    if (daysDifference === 0) {
      const hoursDiff = Math.round((new Date(timestamp) - new Date()) / (1000 * 60 * 60));
      if (hoursDiff === 0) {
        const minsDiff = Math.round((new Date(timestamp) - new Date()) / (1000 * 60));
        return rtf.format(minsDiff, 'minute');
      }
      return rtf.format(hoursDiff, 'hour');
    }
    return rtf.format(daysDifference, 'day');
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      // Optimistic update
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      await notificationService.markAsRead(user.id, notif);
    }

    // Dynamic routing based on notification metadata or type
    if (notif.route_id || notif.metadata?.route_id) {
      navigate('/dashboard/navigation');
    } else if (notif.metadata?.hazard_id) {
      navigate('/dashboard/report');
    } else if (notif.type === 'danger') {
      navigate('/dashboard/emergency');
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-up max-w-3xl mx-auto w-full">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className={`text-2xl font-display font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-[#111827]'}`}>Safety Alerts</h2>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-[#667085]'}`}>Real-time updates from Government, Enterprise, and System.</p>
        </div>
        <button 
          onClick={() => navigate('/dashboard/settings')}
          className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-gray-400 hover:text-white' : 'bg-[#F1F3F6] hover:bg-[#E2E6EC] text-[#667085] hover:text-[#111827]'}`}
          title="Notification Preferences"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3 pb-20">
        {loading ? (
           <div className="flex items-center justify-center h-40">
             <div className="w-6 h-6 rounded-full border-2 border-brand-blue border-t-transparent animate-spin"></div>
           </div>
        ) : notifications.length === 0 ? (
          <div className={`rounded-[16px] p-10 flex flex-col items-center justify-center text-center border
            ${isDarkMode ? 'bg-[rgba(8,12,18,0.84)] border-[rgba(255,255,255,0.07)]' : 'bg-white border-[#E2E6EC]'}`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDarkMode ? 'bg-[rgba(255,255,255,0.05)]' : 'bg-[#F1F3F6]'}`}>
              <Bell className={`w-8 h-8 ${isDarkMode ? 'text-gray-500' : 'text-[#98A2B3]'}`} />
            </div>
            <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-[#111827]'}`}>You're all caught up!</h3>
            <p className={`text-sm max-w-sm ${isDarkMode ? 'text-gray-400' : 'text-[#667085]'}`}>No new safety alerts or updates are available at this time.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div 
              key={notif.id} 
              onClick={() => handleNotificationClick(notif)}
              className={`rounded-[16px] p-5 flex gap-4 items-start group transition-all cursor-pointer relative overflow-hidden border
                ${isDarkMode 
                  ? `bg-[rgba(8,12,18,0.84)] border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.15)] ${notif.is_read ? 'opacity-70' : ''}`
                  : `bg-white border-[#E2E6EC] hover:border-[#CBD5E0] hover:shadow-sm ${notif.is_read ? 'opacity-70' : ''}`
                }`}
            >
              
              {notif.type === 'danger' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-neonRed"></div>}
              {!notif.is_read && notif.type !== 'danger' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-blue"></div>}
              
              <div className="mt-1">
                {getIcon(notif.type)}
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                     <h3 className={`text-sm ${notif.is_read ? `font-medium ${isDarkMode ? 'text-gray-300' : 'text-[#667085]'}` : `font-bold ${isDarkMode ? 'text-white' : 'text-[#111827]'}`}`}>{notif.title}</h3>
                     {!notif.is_read && <span className="w-2 h-2 rounded-full bg-[#2563EB]"></span>}
                     {notif.priority === 'critical' && <span className="text-[10px] uppercase font-bold tracking-wider bg-red-500/20 text-red-500 px-2 py-0.5 rounded ml-2">Critical</span>}
                  </div>
                  <span className={`text-xs font-mono flex items-center gap-1 ${isDarkMode ? 'text-gray-500' : 'text-[#98A2B3]'}`}>
                     <Clock className="w-3 h-3" />
                     {getRelativeTime(notif.created_at)}
                  </span>
                </div>
                <p className={`text-sm leading-relaxed mt-1 ${isDarkMode ? 'text-gray-400' : 'text-[#667085]'}`}>{notif.message}</p>
                <div className={`mt-3 flex items-center gap-4 text-xs font-mono uppercase ${isDarkMode ? 'text-gray-500' : 'text-[#98A2B3]'}`}>
                   <span className={`px-2 py-1 rounded ${isDarkMode ? 'bg-[rgba(255,255,255,0.05)]' : 'bg-[#F1F3F6]'}`}>Source: {notif.sender_role}</span>
                   <span className={`flex items-center gap-1 ml-auto transition-colors ${isDarkMode ? 'group-hover:text-[#3b82f6]' : 'group-hover:text-[#2563EB]'}`}>
                     Action <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                   </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
