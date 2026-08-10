import React, { useState, useEffect } from 'react';
import { Map, MapPin, Activity, Navigation2, Zap, Battery, Signal, Share2, StopCircle, Play, AlertTriangle } from 'lucide-react';
import UserView from '../../components/UserView';
import { liveTrackingService, getShareUrl } from '../../services/liveTrackingService';
import { useAuth } from '../../contexts/AuthContext';

export default function LiveTracking() {
  const { user } = useAuth();
  const [session, setSession] = useState(null);
  const [telemetry, setTelemetry] = useState(null);
  const [duration, setDuration] = useState(1);
  const [error, setError] = useState(null);
  const [timeLeftStr, setTimeLeftStr] = useState('');

  useEffect(() => {
    let mounted = true;
    const initSession = async () => {
      if (user) {
        const existingSession = await liveTrackingService.checkActiveSession(user.id);
        if (existingSession && mounted) {
           // Resume existing active session
           const res = await liveTrackingService.startSession(user.id, 1);
           if (res.success && mounted) {
             setSession(res);
             liveTrackingService.startWatching(
               (data) => { if (mounted) setTelemetry(data); },
               (err) => {
                 if (mounted) {
                   setError(err);
                   setSession(null);
                 }
               }
             );
           }
        }
      }
    };
    initSession();

    return () => {
      mounted = false;
      // Do NOT stopSession on unmount so link remains active in database until duration expires or user clicks Stop
    };
  }, [user]);

  // Live countdown timer based on session.expiresAt
  useEffect(() => {
    if (!session || !session.expiresAt) {
      setTimeLeftStr('');
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const target = new Date(session.expiresAt).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeftStr('Expired');
        handleStopTracking();
      } else {
        const mins = Math.floor(diff / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        const pad = (n) => String(n).padStart(2, '0');
        setTimeLeftStr(`${pad(mins)}:${pad(secs)}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session, handleStopTracking]);


  const handleStartTracking = async () => {
    setError(null);
    if (!user) {
      setError("You must be logged in to share live tracking.");
      return;
    }

    const res = await liveTrackingService.startSession(user.id, duration);
    if (res.success) {
      setSession(res);
      liveTrackingService.startWatching(
        (data) => setTelemetry(data),
        (err) => {
          setError(err);
          liveTrackingService.stopSession();
          setSession(null);
        }
      );
    } else {
      setError(res.error);
    }
  };

  // Stable reference prevents stale closure in the countdown timer useEffect
  const handleStopTracking = React.useCallback(async () => {
    await liveTrackingService.stopSession();
    setSession(null);
    setTelemetry(null);
  }, []);

  const handleSOS = () => {
    if (session) {
      liveTrackingService.triggerSOS(user.id);
      alert('SOS signal sent to emergency contacts with your live tracking link!');
    } else {
      alert('Start a live tracking session first!');
    }
  };

  const shareUrl = session ? getShareUrl(session.token) : '';

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    alert('Tracking link copied!');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Live Tracking - RakshaNav',
          text: 'Track my live location securely with RakshaNav:',
          url: shareUrl
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      copyLink();
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-up">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-display font-bold text-white tracking-tight">Live Tracking</h2>
          <p className="text-sm text-gray-400 mt-1">Real-time GPS telemetry and secure sharing.</p>
        </div>
        {session && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30">
            <div className="w-2 h-2 rounded-full bg-brand-neonGreen animate-pulse"></div>
            <span className="text-xs font-mono font-medium text-brand-neonGreen">ACTIVE</span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        {/* Telemetry Data */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2">
          
          <div className="glass-panel p-6 relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-brand-blue/20 blur-2xl rounded-full"></div>
            <h3 className="text-sm font-mono text-gray-400 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand-blue" />
              COORDINATES
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 font-mono mb-1">LATITUDE</p>
                <p className="font-mono text-xl text-white font-bold">{telemetry ? telemetry.latitude.toFixed(5) : '--'}° N</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-mono mb-1">LONGITUDE</p>
                <p className="font-mono text-xl text-white font-bold">{telemetry ? telemetry.longitude.toFixed(5) : '--'}° E</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass-panel p-4 flex flex-col items-center text-center justify-center">
              <Activity className="w-5 h-5 text-brand-neonGreen mb-2" />
              <p className="text-xs font-mono text-gray-500 mb-1">SPEED</p>
              <p className="text-lg font-bold text-white">{telemetry && telemetry.speed !== null && !isNaN(telemetry.speed) ? (telemetry.speed * 3.6).toFixed(1) : '--'} km/h</p>
            </div>
            <div className="glass-panel p-4 flex flex-col items-center text-center justify-center">
              <Navigation2 className="w-5 h-5 text-brand-orange mb-2" />
              <p className="text-xs font-mono text-gray-500 mb-1">HEADING</p>
              <p className="text-lg font-bold text-white">{telemetry && telemetry.heading !== null && !isNaN(telemetry.heading) ? Math.round(telemetry.heading) : '--'}°</p>
            </div>
          </div>

          <div className="glass-panel p-5 space-y-4">
            <h3 className="text-sm font-mono text-gray-400 mb-2">SYSTEM STATUS</h3>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Signal className="w-4 h-4 text-brand-blue" />
                <span className="text-sm text-white">Source</span>
              </div>
              <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded text-gray-300">
                GPS
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Battery className="w-4 h-4 text-brand-neonGreen" />
                <span className="text-sm text-white">Battery</span>
              </div>
              <span className="text-xs font-mono text-gray-300">{telemetry && telemetry.battery !== undefined && telemetry.battery !== null ? `${telemetry.battery}%` : 'Unavailable'}</span>
            </div>
          </div>

          {!session ? (
            <div className="glass-panel p-4 mt-auto space-y-4">
              <div>
                <label className="text-xs text-gray-400 font-mono mb-2 block">DURATION</label>
                <select 
                  value={duration} 
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none"
                >
                  <option value={0.25} className="bg-[#080c12]">15 Minutes</option>
                  <option value={0.5} className="bg-[#080c12]">30 Minutes</option>
                  <option value={1} className="bg-[#080c12]">1 Hour</option>
                  <option value={2} className="bg-[#080c12]">2 Hours</option>
                  <option value={4} className="bg-[#080c12]">4 Hours</option>
                </select>
              </div>
              <button 
                onClick={handleStartTracking}
                className="w-full bg-brand-blue hover:bg-blue-600 text-white p-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/20"
              >
                <Play className="w-4 h-4" /> Start Live Sharing
              </button>
            </div>
          ) : (
            <div className="glass-panel p-4 mt-auto space-y-3">
              <div className="flex justify-between items-center text-xs font-mono text-gray-400">
                <span>TRACKING LINK</span>
                {timeLeftStr && <span className="text-brand-neonGreen font-bold">Expires: {timeLeftStr}</span>}
              </div>
              <div className="bg-white/5 border border-white/10 p-3 rounded-lg break-all text-xs font-mono text-brand-blue">
                {shareUrl}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={copyLink} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg text-sm font-medium transition-colors flex justify-center items-center gap-2">
                  <Share2 className="w-4 h-4" /> Copy Link
                </button>
                <button 
                  onClick={handleShare}
                  className="bg-brand-blue/80 hover:bg-brand-blue text-white p-2 rounded-lg text-sm font-medium transition-colors flex justify-center items-center text-center gap-2"
                >
                  <Share2 className="w-4 h-4" /> Share
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button 
                  onClick={handleStopTracking}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-400 p-2 rounded-lg text-sm font-bold transition-colors flex justify-center items-center gap-2"
                >
                  <StopCircle className="w-4 h-4" /> Stop
                </button>
                <button 
                  onClick={handleSOS}
                  className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg text-sm font-bold transition-colors flex justify-center items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" /> SOS
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Map View */}
        <div className="flex-1 glass-panel relative overflow-hidden rounded-2xl border border-white/10">
          <div className="absolute inset-0 z-0">
             <UserView onAddReport={() => {}} userReports={[]} isDashboard={true} />
          </div>
          {session && (
            <div className="absolute top-4 left-4 z-10 glass-panel px-4 py-2 pointer-events-none">
              <span className="text-xs font-mono text-gray-300 flex items-center gap-2">
                <Map className="w-4 h-4 text-brand-neonGreen animate-pulse" />
                Live Broadcasting
              </span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
