import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Map, MapPin, Activity, Navigation2, Zap, Battery, Signal,
  Share2, StopCircle, Play, AlertTriangle, RefreshCw, Wifi,
  WifiOff, Clock, CheckCircle2, XCircle, ChevronDown
} from 'lucide-react';
import UserView from '../../components/UserView';
import { liveTrackingService, getShareUrl } from '../../services/liveTrackingService';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

// ── Session Persistence Keys ─────────────────────────────────────────────────
const SESSION_STORAGE_KEY = 'rakshanav_live_session';

function saveSessionToStorage(sessionData) {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
      ...sessionData,
      savedAt: Date.now(),
    }));
  } catch (_) {}
}

function loadSessionFromStorage() {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Discard if session has expired
    if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return data;
  } catch (_) {
    return null;
  }
}

function clearSessionStorage() {
  try { sessionStorage.removeItem(SESSION_STORAGE_KEY); } catch (_) {}
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatCountdown(expiresAt) {
  if (!expiresAt) return '';
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function LiveTracking() {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();

  // Loading/init state
  const [initState, setInitState] = useState('loading'); // 'loading' | 'ready'

  // Session state
  const [session, setSession] = useState(null);
  const [telemetry, setTelemetry] = useState(null);
  const [duration, setDuration] = useState(1);
  const [error, setError] = useState(null);
  const [timeLeftStr, setTimeLeftStr] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [copied, setCopied] = useState(false);

  const mountedRef = useRef(true);

  // ── Stop tracking (stable reference, must be above useEffects that use it) ──
  const handleStopTracking = useCallback(async () => {
    if (!mountedRef.current) return;
    setIsStopping(true);
    try {
      await liveTrackingService.stopSession();
    } catch (_) {}
    if (mountedRef.current) {
      setSession(null);
      setTelemetry(null);
      setIsStopping(false);
      clearSessionStorage();
    }
  }, []);

  // ── On mount: restore session from storage or DB ──────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    const init = async () => {
      // Wait for auth to resolve — user can be undefined during the initial
      // auth check. We need to gate on a truthy user or confirmed null.
      if (user === undefined) return; // Still loading auth

      if (!user) {
        if (!cancelled) setInitState('ready');
        return;
      }

      // 1. Check sessionStorage for a cached active session
      const cached = loadSessionFromStorage();
      if (cached && cached.token) {
        // Re-attach the service to the cached session
        const resumed = await liveTrackingService.startSession(user.id, 1);
        if (!cancelled && resumed.success) {
          const mergedSession = { ...cached, ...resumed };
          setSession(mergedSession);
          liveTrackingService.startWatching(
            (data) => { if (mountedRef.current) setTelemetry(data); },
            (err) => {
              if (mountedRef.current) {
                setError(typeof err === 'string' ? err : 'GPS signal lost');
              }
            }
          );
          if (!cancelled) setInitState('ready');
          return;
        }
        // Cached session expired or invalid — clear it
        clearSessionStorage();
      }

      // 2. Check DB for an active session
      try {
        const existing = await liveTrackingService.checkActiveSession(user.id);
        if (!cancelled && existing) {
          const res = await liveTrackingService.startSession(user.id, 1);
          if (!cancelled && res.success) {
            setSession(res);
            saveSessionToStorage(res);
            liveTrackingService.startWatching(
              (data) => { if (mountedRef.current) setTelemetry(data); },
              (err) => {
                if (mountedRef.current) {
                  setError(typeof err === 'string' ? err : 'GPS signal lost');
                }
              }
            );
          }
        }
      } catch (e) {
        console.warn('[LiveTracking] Session check failed:', e);
      }

      if (!cancelled) setInitState('ready');
    };

    init();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      // Do NOT stop the session on unmount — let it stay active in the DB
      // until the user explicitly stops it or it expires.
    };
  }, [user]); // Re-run when auth state resolves

  // ── Save session to storage whenever it changes ───────────────────────────
  useEffect(() => {
    if (session) {
      saveSessionToStorage(session);
    }
  }, [session]);

  // ── Countdown timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!session?.expiresAt) {
      setTimeLeftStr('');
      return;
    }

    const update = () => {
      const countdown = formatCountdown(session.expiresAt);
      if (mountedRef.current) setTimeLeftStr(countdown);
      if (countdown === 'Expired' && mountedRef.current) {
        handleStopTracking();
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [session?.expiresAt, handleStopTracking]);

  // ── Visibility change — re-attach GPS watcher when tab regains focus ─────
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && session && !liveTrackingService.watchId) {
        liveTrackingService.startWatching(
          (data) => { if (mountedRef.current) setTelemetry(data); },
          (err) => { if (mountedRef.current) setError(typeof err === 'string' ? err : 'GPS signal lost'); }
        );
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [session]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleStartTracking = async () => {
    setError(null);
    if (!user) {
      setError('You must be logged in to share live tracking.');
      return;
    }

    setIsStarting(true);
    try {
      const res = await liveTrackingService.startSession(user.id, duration);
      if (res.success) {
        setSession(res);
        saveSessionToStorage(res);
        liveTrackingService.startWatching(
          (data) => { if (mountedRef.current) setTelemetry(data); },
          (err) => {
            if (mountedRef.current) {
              setError(typeof err === 'string' ? err : 'GPS signal lost');
              liveTrackingService.stopSession().catch(() => {});
              setSession(null);
              clearSessionStorage();
            }
          }
        );
      } else {
        setError(res.error || 'Failed to start tracking session.');
      }
    } catch (e) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      if (mountedRef.current) setIsStarting(false);
    }
  };

  const handleSOS = async () => {
    if (session && user) {
      try {
        await liveTrackingService.triggerSOS(user.id);
        alert('SOS signal sent to emergency contacts with your live tracking link!');
      } catch (e) {
        alert('SOS sent. Please also call emergency services.');
      }
    } else {
      alert('Start a live tracking session first!');
    }
  };

  const shareUrl = session ? getShareUrl(session.token) : '';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => { if (mountedRef.current) setCopied(false); }, 2000);
    } catch (_) {
      prompt('Copy this link:', shareUrl);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Live Tracking — RakshaNav',
          text: 'Track my live location securely with RakshaNav:',
          url: shareUrl,
        });
      } catch (err) {
        if (err.name !== 'AbortError') copyLink();
      }
    } else {
      copyLink();
    }
  };

  // ── Theme helpers ─────────────────────────────────────────────────────────
  const surface = isDarkMode
    ? 'bg-[rgba(8,12,18,0.84)] border border-[rgba(255,255,255,0.07)] shadow-xl'
    : 'bg-white border border-[#E2E6EC] shadow-[0_2px_12px_rgba(0,0,0,0.06)]';

  const textPrimary = isDarkMode ? 'text-white' : 'text-[#111827]';
  const textSecondary = isDarkMode ? 'text-gray-400' : 'text-[#667085]';
  const textMuted = isDarkMode ? 'text-gray-500' : 'text-[#98A2B3]';
  const inputBg = isDarkMode
    ? 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.1)] text-white'
    : 'bg-[#F7F8FA] border-[#E2E6EC] text-[#111827]';

  // ── Loading state ─────────────────────────────────────────────────────────
  if (initState === 'loading') {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 min-h-[400px]">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${isDarkMode ? 'bg-[rgba(37,99,235,0.1)] border-[rgba(37,99,235,0.2)]' : 'bg-[#EFF6FF] border-[#DBEAFE]'}`}>
          <Map className="w-6 h-6 text-[#2563EB] animate-pulse" />
        </div>
        <div className="text-center">
          <h3 className={`font-semibold text-base ${textPrimary}`}>Loading Live Tracking</h3>
          <p className={`text-sm mt-1 ${textSecondary}`}>Checking for active sessions…</p>
        </div>
        <div className="flex gap-1.5 mt-2">
          {[0, 150, 300].map(delay => (
            <div key={delay} className={`w-2 h-2 rounded-full animate-bounce ${isDarkMode ? 'bg-[#2563EB]' : 'bg-[#2563EB]'}`} style={{ animationDelay: `${delay}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col gap-6 min-h-[600px]">
      
      {/* Page Header */}
      <div className="flex justify-between items-start shrink-0">
        <div>
          <h2 className={`text-2xl font-display font-bold tracking-tight flex items-center gap-3 ${textPrimary}`}>
            <div className={`p-2 rounded-xl border ${isDarkMode ? 'bg-[rgba(37,99,235,0.1)] border-[rgba(37,99,235,0.2)]' : 'bg-[#EFF6FF] border-[#DBEAFE]'}`}>
              <Map className="w-5 h-5 text-[#2563EB]" />
            </div>
            Live Tracking
          </h2>
          <p className={`text-sm mt-1.5 ${textSecondary}`}>
            Real-time GPS telemetry and secure location sharing.
          </p>
        </div>
        {session && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${isDarkMode ? 'bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.25)] text-[#22c55e]' : 'bg-[#F0FDF4] border-[#BBF7D0] text-[#16A34A]'}`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${isDarkMode ? 'bg-[#22c55e]' : 'bg-[#16A34A]'}`} />
            <span className="text-xs font-mono font-bold tracking-wider uppercase">Live</span>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm shrink-0 ${isDarkMode ? 'bg-[rgba(220,38,38,0.08)] border-[rgba(220,38,38,0.25)] text-red-400' : 'bg-[#FFF1F2] border-[#FECACA] text-[#DC2626]'}`}>
          <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1">{error}</div>
          <button onClick={() => setError(null)} className="shrink-0 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">

        {/* ── Left Sidebar: Telemetry + Controls ── */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1">

          {/* Coordinates Card */}
          <div className={`rounded-[16px] p-6 relative overflow-hidden ${surface}`}>
            <div className={`absolute -right-8 -top-8 w-28 h-28 rounded-full pointer-events-none blur-3xl ${isDarkMode ? 'bg-[rgba(37,99,235,0.15)]' : 'bg-[rgba(37,99,235,0.05)]'}`} />
            <h3 className={`text-xs font-mono font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${textMuted}`}>
              <MapPin className="w-3.5 h-3.5 text-[#2563EB]" /> GPS COORDINATES
            </h3>
            <div className="space-y-4 z-10 relative">
              <TelemetryRow
                isDarkMode={isDarkMode}
                label="LATITUDE"
                value={telemetry ? `${telemetry.latitude.toFixed(5)}° N` : '—'}
                mono
              />
              <TelemetryRow
                isDarkMode={isDarkMode}
                label="LONGITUDE"
                value={telemetry ? `${telemetry.longitude.toFixed(5)}° E` : '—'}
                mono
              />
              <TelemetryRow
                isDarkMode={isDarkMode}
                label="ACCURACY"
                value={telemetry?.accuracy != null ? `±${Math.round(telemetry.accuracy)} m` : '—'}
                mono
              />
            </div>
          </div>

          {/* Speed & Heading */}
          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              isDarkMode={isDarkMode}
              icon={<Activity className="w-5 h-5 text-[#16A34A]" />}
              label="SPEED"
              value={
                telemetry?.speed != null && !isNaN(telemetry.speed)
                  ? `${(telemetry.speed * 3.6).toFixed(1)}`
                  : '—'
              }
              unit="km/h"
              surface={surface}
            />
            <MetricCard
              isDarkMode={isDarkMode}
              icon={<Navigation2 className="w-5 h-5 text-[#F59E0B]" />}
              label="HEADING"
              value={
                telemetry?.heading != null && !isNaN(telemetry.heading)
                  ? `${Math.round(telemetry.heading)}`
                  : '—'
              }
              unit="°"
              surface={surface}
            />
          </div>

          {/* System Status Card */}
          <div className={`rounded-[16px] p-5 ${surface}`}>
            <h3 className={`text-xs font-mono font-bold uppercase tracking-widest mb-4 ${textMuted}`}>SYSTEM STATUS</h3>
            <div className="space-y-3">
              <StatusRow
                isDarkMode={isDarkMode}
                icon={<Signal className="w-4 h-4 text-[#2563EB]" />}
                label="Source"
                badge="GPS"
                badgeColor={isDarkMode ? 'bg-[rgba(255,255,255,0.07)] text-gray-300' : 'bg-[#F1F3F6] text-[#667085]'}
              />
              <StatusRow
                isDarkMode={isDarkMode}
                icon={<Battery className={`w-4 h-4 ${isDarkMode ? 'text-[#22c55e]' : 'text-[#16A34A]'}`} />}
                label="Battery"
                badge={
                  telemetry?.battery != null
                    ? `${telemetry.battery}%`
                    : 'N/A'
                }
                badgeColor={
                  telemetry?.battery != null && telemetry.battery < 20
                    ? 'bg-red-500/10 text-red-500'
                    : isDarkMode
                    ? 'bg-[rgba(255,255,255,0.07)] text-gray-300'
                    : 'bg-[#F1F3F6] text-[#667085]'
                }
              />
              <StatusRow
                isDarkMode={isDarkMode}
                icon={session ? <Wifi className="w-4 h-4 text-[#16A34A]" /> : <WifiOff className={`w-4 h-4 ${textMuted}`} />}
                label="Broadcasting"
                badge={session ? 'ACTIVE' : 'INACTIVE'}
                badgeColor={session
                  ? (isDarkMode ? 'bg-[rgba(22,163,74,0.1)] text-[#22c55e]' : 'bg-[#F0FDF4] text-[#16A34A]')
                  : (isDarkMode ? 'bg-[rgba(255,255,255,0.05)] text-gray-400' : 'bg-[#F7F8FA] text-[#98A2B3]')
                }
              />
            </div>
          </div>

          {/* Session Controls */}
          {!session ? (
            // ── Start Session ──
            <div className={`rounded-[16px] p-5 space-y-4 ${surface}`}>
              <h3 className={`text-xs font-mono font-bold uppercase tracking-widest ${textMuted}`}>START SESSION</h3>
              <div>
                <label className={`text-xs font-mono font-bold uppercase tracking-wider mb-2 block ${textMuted}`}>DURATION</label>
                <div className="relative">
                  <select
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm pr-8 outline-none appearance-none cursor-pointer transition-colors ${inputBg}`}
                  >
                    <option value={0.25}>15 Minutes</option>
                    <option value={0.5}>30 Minutes</option>
                    <option value={1}>1 Hour</option>
                    <option value={2}>2 Hours</option>
                    <option value={4}>4 Hours</option>
                  </select>
                  <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${textMuted}`} />
                </div>
              </div>
              <button
                onClick={handleStartTracking}
                disabled={isStarting || !user}
                className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(37,99,235,0.3)]"
              >
                {isStarting ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Starting...</>
                ) : (
                  <><Play className="w-4 h-4" /> Start Live Sharing</>
                )}
              </button>
              {!user && (
                <p className={`text-xs text-center ${textMuted}`}>Sign in to start a tracking session.</p>
              )}
            </div>
          ) : (
            // ── Active Session ──
            <div className={`rounded-[16px] p-5 space-y-4 ${surface}`}>
              {/* Countdown */}
              {timeLeftStr && (
                <div className={`flex items-center justify-between p-3 rounded-xl border ${isDarkMode ? 'bg-[rgba(22,163,74,0.06)] border-[rgba(22,163,74,0.15)]' : 'bg-[#F0FDF4] border-[#BBF7D0]'}`}>
                  <div className="flex items-center gap-2">
                    <Clock className={`w-4 h-4 ${isDarkMode ? 'text-[#22c55e]' : 'text-[#16A34A]'}`} />
                    <span className={`text-xs font-mono font-bold ${textSecondary}`}>Time Remaining</span>
                  </div>
                  <span className={`text-sm font-mono font-bold tabular-nums ${isDarkMode ? 'text-[#22c55e]' : 'text-[#16A34A]'}`}>{timeLeftStr}</span>
                </div>
              )}

              {/* Share link */}
              <div>
                <label className={`text-xs font-mono font-bold uppercase tracking-wider mb-2 block ${textMuted}`}>TRACKING LINK</label>
                <div className={`p-3 rounded-xl border text-xs font-mono break-all leading-relaxed ${isDarkMode ? 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] text-[#3b82f6]' : 'bg-[#EFF6FF] border-[#DBEAFE] text-[#2563EB]'}`}>
                  {shareUrl}
                </div>
              </div>

              {/* Copy & Share */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={copyLink}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${isDarkMode ? 'bg-[rgba(255,255,255,0.07)] hover:bg-[rgba(255,255,255,0.12)] border-[rgba(255,255,255,0.1)] text-white' : 'bg-white hover:bg-[#F1F3F6] border-[#E2E6EC] text-[#111827]'}`}
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-[#16A34A]" /> : <Share2 className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white border border-transparent transition-colors"
                >
                  <Share2 className="w-4 h-4" /> Share
                </button>
              </div>

              {/* Stop & SOS */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleStopTracking}
                  disabled={isStopping}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border transition-colors disabled:opacity-50 ${isDarkMode ? 'bg-[rgba(239,68,68,0.1)] hover:bg-[rgba(239,68,68,0.2)] border-[rgba(239,68,68,0.2)] text-[#ef4444]' : 'bg-[#FFF1F2] hover:bg-[#FFE4E6] border-[#FECACA] text-[#DC2626]'}`}
                >
                  {isStopping ? <RefreshCw className="w-4 h-4 animate-spin" /> : <StopCircle className="w-4 h-4" />}
                  {isStopping ? 'Stopping…' : 'Stop'}
                </button>
                <button
                  onClick={handleSOS}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-br from-[#ef4444] to-[#DC2626] hover:from-[#DC2626] hover:to-[#b91c1c] text-white border border-transparent transition-all shadow-[0_4px_14px_rgba(220,38,38,0.3)]"
                >
                  <AlertTriangle className="w-4 h-4" /> SOS
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Map View ── */}
        <div className={`flex-1 relative overflow-hidden rounded-[16px] min-h-[400px] lg:min-h-0 ${isDarkMode ? 'border border-[rgba(255,255,255,0.07)] shadow-2xl' : 'border border-[#E2E6EC] shadow-[0_4px_20px_rgba(0,0,0,0.08)]'}`}>
          <div className="absolute inset-0 z-0">
            <UserView onAddReport={() => {}} userReports={[]} isDashboard={true} />
          </div>

          {/* Live broadcast badge */}
          {session && (
            <div className={`absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-2 rounded-[12px] border backdrop-blur-sm ${isDarkMode ? 'bg-[rgba(8,12,18,0.75)] border-[rgba(255,255,255,0.08)] text-gray-300' : 'bg-white/90 border-[#E2E6EC] text-[#667085] shadow-sm'}`}>
              <Map className={`w-4 h-4 animate-pulse ${isDarkMode ? 'text-[#22c55e]' : 'text-[#16A34A]'}`} />
              <span className="text-xs font-mono font-bold">Broadcasting Live</span>
            </div>
          )}

          {/* No-session overlay hint */}
          {!session && (
            <div className="absolute inset-0 z-10 flex items-end justify-center pb-8 pointer-events-none">
              <div className={`px-5 py-2.5 rounded-full flex items-center gap-2 text-sm font-medium backdrop-blur-sm border ${isDarkMode ? 'bg-[rgba(8,12,18,0.7)] border-[rgba(255,255,255,0.08)] text-gray-300' : 'bg-white/90 border-[#E2E6EC] text-[#667085] shadow-sm'}`}>
                <Zap className="w-4 h-4 text-[#F59E0B]" />
                Start a session to enable live location sharing
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TelemetryRow({ isDarkMode, label, value, mono }) {
  const textMuted = isDarkMode ? 'text-gray-500' : 'text-[#98A2B3]';
  const textPrimary = isDarkMode ? 'text-white' : 'text-[#111827]';
  return (
    <div>
      <p className={`text-[10px] font-mono uppercase tracking-widest mb-1 ${textMuted}`}>{label}</p>
      <p className={`text-xl font-bold ${mono ? 'font-mono' : ''} ${textPrimary}`}>{value}</p>
    </div>
  );
}

function MetricCard({ isDarkMode, icon, label, value, unit, surface }) {
  const textMuted = isDarkMode ? 'text-gray-500' : 'text-[#98A2B3]';
  const textPrimary = isDarkMode ? 'text-white' : 'text-[#111827]';
  return (
    <div className={`rounded-[14px] p-4 flex flex-col items-center text-center justify-center gap-2 ${surface}`}>
      {icon}
      <p className={`text-[10px] font-mono uppercase tracking-widest ${textMuted}`}>{label}</p>
      <p className={`text-lg font-bold font-mono leading-none ${textPrimary}`}>
        {value}<span className={`text-xs font-normal ${textMuted}`}>{unit}</span>
      </p>
    </div>
  );
}

function StatusRow({ isDarkMode, icon, label, badge, badgeColor }) {
  const textPrimary = isDarkMode ? 'text-white' : 'text-[#111827]';
  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-2">
        {icon}
        <span className={`text-sm font-medium ${textPrimary}`}>{label}</span>
      </div>
      <span className={`text-[11px] font-mono font-bold px-2 py-1 rounded-lg ${badgeColor}`}>{badge}</span>
    </div>
  );
}
