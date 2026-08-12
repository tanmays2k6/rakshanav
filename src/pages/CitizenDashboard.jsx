import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, MapPin, Activity, Navigation, AlertTriangle, 
  Bot, Map, Users, ChevronRight, Zap, Navigation2, 
  RefreshCw, Radio, Maximize
} from 'lucide-react';
import { motion } from 'framer-motion';
import UserView from '../components/UserView';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Link, useNavigate } from 'react-router-dom';

import { locationService } from '../services/locationService';
import { placesService } from '../services/placesService';
import { weatherService } from '../services/weatherService';
import { SafetyEngine } from '../lib/SafetyEngine';

export default function CitizenDashboard() {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [gpsState, setGpsState] = useState('LOADING');
  const [havenState, setHavenState] = useState('LOADING');
  const lastSearchedRef = React.useRef(null);
  
  const [errorMsg, setErrorMsg] = useState(null);
  const [liveLocation, setLiveLocation] = useState(null);
  const [addressData, setAddressData] = useState(null);
  const [nearestHaven, setNearestHaven] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [safetyMetrics, setSafetyMetrics] = useState(null);
  const [nearbyAlerts, setNearbyAlerts] = useState([]);
  const [jurisdiction, setJurisdiction] = useState(null);
  const [jurisdictionLoading, setJurisdictionLoading] = useState(false);
  
  const [reports, setReports] = useState([]);
  const [tripsCount, setTripsCount] = useState(0);
  
  const [showTraffic, setShowTraffic] = useState(true);
  const [showCommunity, setShowCommunity] = useState(true);
  const [showStreetlights, setShowStreetlights] = useState(false);
  const [showHavens, setShowHavens] = useState(true);
  const [showJurisdictions, setShowJurisdictions] = useState(false);

  const fetchLiveData = async () => {
    if (!liveLocation) setLoading(true);
    
    let position;
    try {
      if (!liveLocation) setGpsState('LOADING');
      position = await locationService.getCurrentPosition();
      setLiveLocation(position);
      setGpsState('AVAILABLE');
      setErrorMsg(null);
    } catch (err) {
      console.warn('GPS failed:', err);
      if (err.message && err.message.toLowerCase().includes('denied')) {
        setGpsState('DENIED');
      } else {
        setGpsState('ERROR');
      }
      setLoading(false);
      return;
    }

    const lastLoc = lastSearchedRef.current;
    let shouldFetchHavens = true;
    if (lastLoc && nearestHaven) {
      const dist = placesService.calculateDistance(lastLoc.lat, lastLoc.lng, position.lat, position.lng);
      if (dist < 0.2) shouldFetchHavens = false;
    }

    try {
      const fetchPromises = [
        locationService.reverseGeocode(position.lat, position.lng),
        weatherService.getWeather(position.lat, position.lng),
        supabase.from('reports').select('*').eq('user_id', user?.id).gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),
        supabase.from('trips').select('*').eq('user_id', user?.id).gte('started_at', new Date(new Date().setHours(0,0,0,0)).toISOString())
      ];
      
      let havensPromise = Promise.resolve({ status: 'skipped' });
      if (shouldFetchHavens) {
        setHavenState('LOADING');
        havensPromise = placesService.getNearbyHavens(position.lat, position.lng)
          .then(res => ({ status: 'fulfilled', value: res }))
          .catch(err => ({ status: 'rejected', reason: err }));
      }

      const [address, weather, reportsData, tripsData] = await Promise.allSettled(fetchPromises);
      const havens = await havensPromise;

      if (shouldFetchHavens) {
        lastSearchedRef.current = { lat: position.lat, lng: position.lng };
        if (havens.status === 'fulfilled' && havens.value && havens.value.length > 0) {
          setNearestHaven(havens.value[0]);
          setHavenState('FOUND');
        } else if (havens.status === 'fulfilled') {
          setNearestHaven(null);
          setHavenState('EMPTY');
        } else {
          setNearestHaven(null);
          setHavenState('ERROR');
        }
      }

      let weatherCode = 0;
      let windSpeed = 0;

      if (address.status === 'fulfilled') setAddressData(address.value);
      if (weather.status === 'fulfilled') {
        setWeatherData(weather.value);
        weatherCode = weather.value.weather_code;
        windSpeed = weather.value.wind_speed_10m;
      }
      if (reportsData.status === 'fulfilled' && reportsData.value.data) setReports(reportsData.value.data);
      if (tripsData.status === 'fulfilled' && tripsData.value.data) setTripsCount(tripsData.value.data.length);

      let realAlerts = [];
      let supabaseSuccess = false;
      try {
        const lat = position.lat;
        const lng = position.lng;
        const offset = 0.045;
        const { data, error } = await supabase
          .from('public_incident_view')
          .select('*')
          .eq('status', 'pending')
          .gte('lat', lat - offset).lte('lat', lat + offset)
          .gte('lng', lng - offset).lte('lng', lng + offset)
          .order('created_at', { ascending: false })
          .limit(10);
        if (!error && data) { realAlerts = data; supabaseSuccess = true; }
      } catch (e) { console.warn('Failed to fetch alerts', e); }
      setNearbyAlerts(realAlerts);

      let currentJurisdiction = null;
      try {
        setJurisdictionLoading(true);
        const { data: jData, error: jError } = await supabase.rpc('get_jurisdiction_by_location', { lat: position.lat, lng: position.lng });
        if (!jError && jData && jData.length > 0) currentJurisdiction = jData[0];
      } catch (e) { console.warn('Failed to fetch jurisdiction', e); }
      finally { setJurisdictionLoading(false); }
      setJurisdiction(currentJurisdiction);

      let metrics = null;
      try {
        const envUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');
        const res = await fetch(`${envUrl}/api/route/safety/point?lat=${position.lat}&lng=${position.lng}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.available) {
            metrics = {
              score: data.score,
              breakdown: data.breakdown,
              explanation: data.explanation,
              confidence: data.confidence,
              riskCategory: data.score > 80 ? 'Highly Safe' : data.score > 60 ? 'Moderately Safe' : 'Exercise Caution'
            };
          } else {
            metrics = { score: null, available: false, riskCategory: 'Insufficient data' };
          }
        }
      } catch (e) {
        console.warn('Failed to fetch point safety', e);
        metrics = { score: null, available: false, riskCategory: 'Service Unavailable' };
      }
      
      setSafetyMetrics(metrics);

    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setErrorMsg('Network Error: Unable to fetch live data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleAddReport = async () => { fetchLiveData(); };

  const handleNavigateToHaven = () => {
    if (nearestHaven) {
      navigate('/dashboard/navigation', {
        state: { origin: liveLocation ? 'Current Location' : '', destination: nearestHaven.name, autoTrigger: true }
      });
    }
  };

  const formatHavenDistance = (km) => km < 1 ? `${Math.round(km * 1000)} m away` : `${km.toFixed(1)} km away`;

  const getHavenIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'police':      return '🛡 Police Station';
      case 'hospital':    return '🏥 Hospital';
      case 'clinic':      return '⚕ Clinic';
      case 'fire_station':return '🚒 Fire Station';
      case 'pharmacy':    return '💊 Pharmacy';
      case 'atm':         return '💳 ATM';
      default: return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Safe Haven';
    }
  };

  // Theming helpers
  const surface = isDarkMode
    ? 'bg-[rgba(8,12,18,0.84)] border border-[rgba(255,255,255,0.07)] shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
    : 'bg-white border border-[#E2E6EC] shadow-[0_2px_12px_rgba(0,0,0,0.06)]';

  const textPrimary = isDarkMode ? 'text-white' : 'text-[#111827]';
  const textSecondary = isDarkMode ? 'text-gray-400' : 'text-[#667085]';
  const textMuted = isDarkMode ? 'text-gray-500' : 'text-[#98A2B3]';
  const divider = isDarkMode ? 'border-[rgba(255,255,255,0.05)]' : 'border-[#E2E6EC]';
  const itemBg = isDarkMode ? 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.06)]' : 'bg-[#F7F8FA] border-[#E2E6EC]';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-[1800px] mx-auto p-6"
    >
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
        
        {/* ── Left Content ── */}
        <div className="flex flex-col gap-6 min-w-0 w-auto">
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard 
              isDarkMode={isDarkMode}
              surface={surface} textPrimary={textPrimary} textSecondary={textSecondary}
              title="Live Safety Score" 
              value={safetyMetrics && safetyMetrics.score !== null ? `${safetyMetrics.score}/100` : 'N/A'}
              subtitle={safetyMetrics ? safetyMetrics.riskCategory : 'Awaiting data'}
              icon={<ShieldCheck className="w-[18px] h-[18px] text-[#16A34A]" />}
              iconBg={isDarkMode ? 'bg-[rgba(34,197,94,0.1)] border-[rgba(34,197,94,0.2)]' : 'bg-[#F0FDF4] border-[#BBF7D0]'}
              trend="Live"
              trendColor={isDarkMode ? 'bg-[rgba(22,163,74,0.1)] border-[rgba(22,163,74,0.2)] text-[#22c55e]' : 'bg-[#F0FDF4] border-[#BBF7D0] text-[#16A34A]'}
              loading={loading}
              isScore={safetyMetrics?.score !== null}
              scoreValue={safetyMetrics?.score || 0}
            />
            <KpiCard 
              isDarkMode={isDarkMode}
              surface={surface} textPrimary={textPrimary} textSecondary={textSecondary}
              title="Current Location" 
              value={gpsState === 'AVAILABLE' && addressData ? (addressData.address.suburb || addressData.address.city_district || 'Unknown') : (gpsState === 'DENIED' ? 'Location denied' : 'Location unavailable')}
              subtitle={gpsState === 'AVAILABLE' && liveLocation ? `Accuracy: ±${Math.round(liveLocation.accuracy)}m` : (gpsState === 'LOADING' ? 'Finding your location...' : 'Check permissions')}
              icon={<MapPin className="w-[18px] h-[18px] text-[#2563EB]" />}
              iconBg={isDarkMode ? 'bg-[rgba(37,99,235,0.1)] border-[rgba(37,99,235,0.2)]' : 'bg-[#EFF6FF] border-[#DBEAFE]'}
              trend="GPS"
              trendColor={isDarkMode ? 'bg-[rgba(37,99,235,0.1)] border-[rgba(37,99,235,0.2)] text-[#3b82f6]' : 'bg-[#EFF6FF] border-[#DBEAFE] text-[#2563EB]'}
              loading={gpsState === 'LOADING'}
              actionIcon={<RefreshCw className={`w-3 h-3 ${gpsState === 'LOADING' ? 'animate-spin' : ''}`} />}
              onAction={fetchLiveData}
            />
            <KpiCard 
              isDarkMode={isDarkMode}
              surface={surface} textPrimary={textPrimary} textSecondary={textSecondary}
              title="Nearest Safe Haven" 
              value={
                havenState === 'FOUND' && nearestHaven ? getHavenIcon(nearestHaven.type) :
                havenState === 'EMPTY' ? 'No nearby safe locations' :
                havenState === 'ERROR' ? 'Unable to load places' :
                'Finding locations...'
              }
              subtitle={
                havenState === 'FOUND' && nearestHaven ? `${nearestHaven.name} • ${formatHavenDistance(nearestHaven.distanceKm)}` :
                havenState === 'EMPTY' ? 'No verified facilities found' :
                havenState === 'ERROR' ? 'Check your connection' :
                'Searching area...'
              }
              icon={<Activity className="w-[18px] h-[18px] text-[#F59E0B]" />}
              iconBg={isDarkMode ? 'bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.2)]' : 'bg-[#FFFBEB] border-[#FDE68A]'}
              trend="Map Data"
              trendColor={isDarkMode ? 'bg-[rgba(249,115,22,0.1)] border-[rgba(249,115,22,0.2)] text-[#f97316]' : 'bg-[#FFFBEB] border-[#FDE68A] text-[#F59E0B]'}
              loading={havenState === 'LOADING' || gpsState === 'LOADING'}
              actionIcon={havenState === 'FOUND' && nearestHaven && <Navigation className="w-3 h-3" />}
              onAction={handleNavigateToHaven}
            />
            <KpiCard 
              isDarkMode={isDarkMode}
              surface={surface} textPrimary={textPrimary} textSecondary={textSecondary}
              title="Police Jurisdiction" 
              value={jurisdiction ? jurisdiction.station_name : 'No data'}
              subtitle={jurisdiction ? `Division: ${jurisdiction.division || 'N/A'}` : 'Data unavailable for this region'}
              icon={<ShieldCheck className="w-[18px] h-[18px] text-[#2563EB]" />}
              iconBg={isDarkMode ? 'bg-[rgba(37,99,235,0.1)] border-[rgba(37,99,235,0.2)]' : 'bg-[#EFF6FF] border-[#DBEAFE]'}
              trend="Official Data"
              trendColor={isDarkMode ? 'bg-[rgba(37,99,235,0.1)] border-[rgba(37,99,235,0.2)] text-[#3b82f6]' : 'bg-[#EFF6FF] border-[#DBEAFE] text-[#2563EB]'}
              loading={jurisdictionLoading || gpsState === 'LOADING'}
            />
          </div>

          {/* Live Safety Map */}
          <div className={`rounded-[16px] relative overflow-hidden group min-h-[500px] lg:min-h-[700px] h-[60dvh] lg:h-[700px] w-full flex flex-col ${isDarkMode ? 'shadow-2xl ring-1 ring-white/5' : 'shadow-[0_4px_24px_rgba(0,0,0,0.1)] border border-[#E2E6EC]'}`}>
            {/* Map Control Bar */}
            <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none">
              <div className={`px-3 lg:px-4 py-2 flex flex-wrap lg:flex-nowrap items-center gap-2 lg:gap-3 pointer-events-auto rounded-[14px] backdrop-blur-md
                ${isDarkMode 
                  ? 'bg-[rgba(8,12,18,0.75)] border border-[rgba(255,255,255,0.08)]' 
                  : 'bg-white/90 border border-[#E2E6EC] shadow-[0_2px_12px_rgba(0,0,0,0.08)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Radio className={`w-4 h-4 ${loading ? 'text-yellow-500 animate-pulse' : (isDarkMode ? 'text-[#22c55e]' : 'text-[#16A34A]')}`} />
                  <span className={`text-[11px] lg:text-[13px] font-bold font-display tracking-wide ${isDarkMode ? 'text-white' : 'text-[#111827]'}`}>
                    {loading ? 'Acquiring Signal...' : 'Live Safety Map'}
                  </span>
                </div>
                <div className={`hidden lg:block w-px h-4 ${isDarkMode ? 'bg-[rgba(255,255,255,0.15)]' : 'bg-[#E2E6EC]'} mx-1`} />
                <div className="flex gap-1.5 overflow-x-auto custom-scrollbar pb-1 lg:pb-0">
                  <MapToggle isDarkMode={isDarkMode} active={showCommunity} onClick={() => setShowCommunity(!showCommunity)} label="Hazards" />
                  <MapToggle isDarkMode={isDarkMode} active={showJurisdictions} onClick={() => setShowJurisdictions(!showJurisdictions)} label="Police Zones" />
                  <MapToggle isDarkMode={isDarkMode} active={showTraffic} onClick={() => setShowTraffic(!showTraffic)} label="Traffic" />
                </div>
              </div>
            </div>
            
            <div className="absolute inset-0 z-0">
              {errorMsg ? (
                <div className="w-full h-full flex items-center justify-center bg-red-50">
                  <div className="text-[#DC2626] font-mono text-[13px] bg-[rgba(220,38,38,0.06)] px-4 py-2 rounded-lg border border-[rgba(220,38,38,0.2)]">{errorMsg}</div>
                </div>
              ) : (
                <UserView 
                  onAddReport={handleAddReport} 
                  userReports={reports} 
                  isDashboard={true} 
                  liveLocation={liveLocation}
                  showTraffic={showTraffic}
                  showCommunity={showCommunity}
                  showStreetlights={showStreetlights}
                  showJurisdictions={showJurisdictions}
                  communityReports={nearbyAlerts}
                />
              )}
            </div>
            
            <Link 
              to="/dashboard/navigation"
              className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-10 px-6 py-2.5 flex items-center gap-2 transition-all text-[13px] font-semibold rounded-[14px] backdrop-blur-md group shadow-lg
                ${isDarkMode 
                  ? 'bg-[rgba(8,12,18,0.75)] border border-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(8,12,18,0.9)]'
                  : 'bg-white/90 border border-[#E2E6EC] text-[#111827] hover:bg-white shadow-[0_4px_16px_rgba(0,0,0,0.1)]'
                }`}
            >
              <Map className={`w-4 h-4 group-hover:scale-110 transition-transform ${isDarkMode ? 'text-[#3b82f6]' : 'text-[#2563EB]'}`} />
              Open Full Navigation
            </Link>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className={`text-xl lg:text-2xl font-bold font-display mb-4 lg:mb-6 flex items-center gap-3 ${textPrimary}`}>
              <Zap className={`w-5 h-5 lg:w-6 lg:h-6 ${isDarkMode ? 'text-brand-orange' : 'text-[#F59E0B]'}`} />
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <ActionCard isDarkMode={isDarkMode} title="Start Safe Navigation" icon={<Navigation2 />} to="/dashboard/navigation" color="blue" />
              <ActionCard isDarkMode={isDarkMode} title="AI Route Analysis" icon={<Bot />} to="/dashboard/ai" color="purple" />
              <ActionCard isDarkMode={isDarkMode} title="Report Hazard" icon={<AlertTriangle />} to="/dashboard/report" color="red" />
              <ActionCard isDarkMode={isDarkMode} title="Live Tracking" icon={<Activity />} to="/dashboard/tracking" color="green" />
            </div>
          </div>
        </div>

        {/* ── Right Sidebar ── */}
        <div className="flex flex-col gap-6 xl:sticky xl:top-6 w-full xl:w-[380px] xl:min-w-[340px] xl:max-w-[420px]">
          
          {/* Card 1: Overall Safety Rating */}
          <div className={`rounded-[16px] p-6 relative overflow-hidden flex flex-col gap-4 border-t-[3px] border-t-[#16A34A]
            ${isDarkMode 
              ? 'bg-[rgba(8,12,18,0.84)] border border-[rgba(255,255,255,0.07)] shadow-xl' 
              : 'bg-white border border-[#E2E6EC] shadow-[0_4px_20px_rgba(0,0,0,0.07)]'
            }`}
          >
            <div className={`absolute -right-16 -top-16 w-48 h-48 rounded-full pointer-events-none blur-[50px] ${isDarkMode ? 'bg-[rgba(34,197,94,0.08)]' : 'bg-[rgba(22,163,74,0.04)]'}`} />
            
            <h3 className={`text-[12px] font-mono flex justify-between items-center uppercase tracking-widest ${textMuted}`}>
              OVERALL SAFETY RATING
              <span className={`w-2 h-2 rounded-full animate-pulse ${loading ? 'bg-yellow-400' : (isDarkMode ? 'bg-[#22c55e]' : 'bg-[#16A34A]')}`} />
            </h3>
            
            {loading ? (
              <div className={`w-full h-32 rounded-xl animate-pulse ${isDarkMode ? 'bg-[rgba(255,255,255,0.05)]' : 'bg-[#F1F3F6]'}`} />
            ) : (
              <div className="flex flex-col items-center justify-center my-2">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="56" stroke={isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)'} strokeWidth="8" fill="none" />
                    <motion.circle 
                      cx="64" cy="64" r="56" 
                      stroke={isDarkMode ? '#22c55e' : '#16A34A'}
                      strokeWidth="8" 
                      fill="none" 
                      strokeDasharray="351" 
                      initial={{ strokeDashoffset: 351 }}
                      animate={{ strokeDashoffset: 351 - (351 * (safetyMetrics?.score || 0)) / 100 }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className={`text-4xl font-display font-bold leading-none ${textPrimary}`}>
                      {safetyMetrics?.score !== null ? Math.floor((safetyMetrics?.score || 0) / 10) : '-'}
                      <span className={`text-lg ${textMuted}`}>.{safetyMetrics?.score !== null ? (safetyMetrics?.score || 0) % 10 : '-'}</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 mt-2">
              <SafetyMetric isDarkMode={isDarkMode} label="Environment" value={safetyMetrics?.breakdown?.emergency !== null && safetyMetrics?.breakdown?.emergency !== undefined ? `${Math.round(safetyMetrics?.breakdown.emergency)}/100` : 'Insufficient data'} valueColor={isDarkMode ? 'text-[#22c55e]' : 'text-[#16A34A]'} noData={!safetyMetrics?.breakdown || safetyMetrics?.breakdown.emergency === null} />
              <SafetyMetric isDarkMode={isDarkMode} label="Lighting" value={safetyMetrics?.breakdown?.lighting !== null && safetyMetrics?.breakdown?.lighting !== undefined ? `${Math.round(safetyMetrics?.breakdown.lighting)}/100` : 'Insufficient data'} valueColor={isDarkMode ? 'text-[#3b82f6]' : 'text-[#2563EB]'} noData={!safetyMetrics?.breakdown || safetyMetrics?.breakdown.lighting === null} />
              <SafetyMetric isDarkMode={isDarkMode} label="Community Alerts" value={nearbyAlerts.length} valueColor={isDarkMode ? 'text-[#f97316]' : 'text-[#F59E0B]'} />
              <SafetyMetric isDarkMode={isDarkMode} label="Weather" value={weatherData ? 'Clear' : 'N/A'} valueColor={isDarkMode ? 'text-[#3b82f6]' : 'text-[#2563EB]'} />
              <SafetyMetric isDarkMode={isDarkMode} label="Confidence" value={safetyMetrics?.confidence ? `${safetyMetrics.confidence}%` : 'N/A'} valueColor={isDarkMode ? 'text-yellow-400' : 'text-[#F59E0B]'} />
              <SafetyMetric isDarkMode={isDarkMode} label="Last Updated" value="Just now" valueColor={textMuted} />
            </div>
          </div>

          {/* Card 2: Nearby Alerts */}
          <div className={`rounded-[16px] p-6 flex flex-col gap-4
            ${isDarkMode 
              ? 'bg-[rgba(8,12,18,0.84)] border border-[rgba(255,255,255,0.07)] shadow-xl' 
              : 'bg-white border border-[#E2E6EC] shadow-[0_4px_20px_rgba(0,0,0,0.07)]'
            }`}
          >
            <h3 className={`text-[13px] font-mono flex items-center gap-2 uppercase tracking-widest ${textMuted}`}>
              <AlertTriangle className={`w-3.5 h-3.5 ${isDarkMode ? 'text-[#f97316]' : 'text-[#F59E0B]'}`} />
              NEARBY ALERTS
            </h3>
            
            <div className="flex flex-col gap-3">
              {loading ? (
                [1, 2, 3].map(i => (
                  <div key={i} className={`h-14 w-full rounded-xl animate-pulse ${isDarkMode ? 'bg-[rgba(255,255,255,0.05)]' : 'bg-[#F1F3F6]'}`} />
                ))
              ) : nearbyAlerts.length > 0 ? (
                nearbyAlerts.map(alert => (
                  <div key={alert.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors cursor-pointer group
                    ${isDarkMode 
                      ? 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.08)]'
                      : 'bg-[#F7F8FA] border-[#E2E6EC] hover:bg-[#F1F3F6]'
                    }`}
                  >
                    <div>
                      <h4 className={`text-[13px] font-semibold capitalize transition-colors ${isDarkMode ? 'text-white group-hover:text-[#f97316]' : 'text-[#111827] group-hover:text-[#F59E0B]'}`}>
                        {alert.category || 'Hazard'}
                      </h4>
                      <p className={`text-[11px] mt-0.5 capitalize ${textSecondary}`}>
                        {alert.severity} • {new Date(alert.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • Near you
                      </p>
                    </div>
                    <ChevronRight className={`w-4 h-4 transition-colors ${textMuted} group-hover:${textSecondary}`} />
                  </div>
                ))
              ) : (
                <div className={`text-[13px] py-4 text-center rounded-xl border ${textSecondary}
                  ${isDarkMode 
                    ? 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.05)]' 
                    : 'bg-[#F7F8FA] border-[#E2E6EC]'
                  }`}
                >
                  No active alerts within 5km.
                </div>
              )}
            </div>
          </div>

          {/* Card 3: AI Safety Insights */}
          <div className={`rounded-[16px] p-6 flex-1 flex flex-col gap-4 relative overflow-hidden border
            ${isDarkMode 
              ? 'bg-[rgba(8,12,18,0.84)] border-[rgba(124,58,237,0.2)] shadow-xl' 
              : 'bg-white border-[#EDE9FE] shadow-[0_4px_20px_rgba(0,0,0,0.07)]'
            }`}
          >
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none blur-[40px] ${isDarkMode ? 'bg-[rgba(168,85,247,0.08)]' : 'bg-[rgba(124,58,237,0.04)]'}`} />
            
            <h3 className={`text-[13px] font-mono flex items-center gap-2 uppercase tracking-widest z-10 ${isDarkMode ? 'text-[#a855f7]' : 'text-[#7C3AED]'}`}>
              <Bot className="w-4 h-4" />
              AI INSIGHTS
            </h3>
            
            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2 z-10">
              {loading ? (
                <div className="flex flex-col gap-3">
                  {[1,2].map(i => (
                    <div key={i} className={`h-20 w-full rounded-xl animate-pulse ${isDarkMode ? 'bg-[rgba(255,255,255,0.05)]' : 'bg-[#F5F3FF]'}`} />
                  ))}
                </div>
              ) : safetyMetrics && safetyMetrics.explanation ? (
                Object.values(safetyMetrics.explanation).filter(v=>v).slice(0, 4).map((insight, idx) => (
                  <div key={idx} className={`p-3.5 rounded-xl border text-[13px] leading-relaxed shadow-sm
                    ${isDarkMode 
                      ? 'bg-[rgba(124,58,237,0.08)] border-[rgba(124,58,237,0.18)] text-gray-200' 
                      : 'bg-[#F5F3FF] border-[#DDD6FE] text-[#374151]'
                    }`}
                  >
                    {insight}
                  </div>
                ))
              ) : (
                <div className={`text-[13px] py-4 text-center rounded-xl border ${textSecondary}
                  ${isDarkMode 
                    ? 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.05)]' 
                    : 'bg-[#F7F8FA] border-[#E2E6EC]'
                  }`}
                >
                  Waiting for sufficient data to generate AI insights.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Subcomponents ────────────

function KpiCard({ isDarkMode, surface, textPrimary, textSecondary, title, value, subtitle, icon, iconBg, trend, trendColor, loading, isScore, scoreValue, actionIcon, onAction }) {
  return (
    <div className={`rounded-[16px] p-6 flex flex-col gap-3 h-full min-h-[160px] relative group overflow-hidden justify-between hover-lift transition-all
      ${isDarkMode 
        ? 'bg-[rgba(8,12,18,0.84)] border border-[rgba(255,255,255,0.07)] shadow-[0_4px_20px_rgba(0,0,0,0.4)]' 
        : 'bg-white border border-[#E2E6EC] shadow-[0_2px_12px_rgba(0,0,0,0.06)]'
      }`}
    >
      <div className="z-10 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-[12px] border shrink-0 ${iconBg}`}>
            {icon}
          </div>
          <h4 className={`text-[13px] font-medium tracking-wide capitalize leading-tight ${isDarkMode ? 'text-gray-300' : 'text-[#667085]'}`}>{title}</h4>
        </div>
        
        {loading ? (
          <div className={`h-8 w-24 mt-2 rounded-lg animate-pulse ${isDarkMode ? 'bg-[rgba(255,255,255,0.07)]' : 'bg-[#F1F3F6]'}`} />
        ) : (
          <div className="flex items-center gap-3 mt-1">
            {isScore && (
              <div className="relative w-8 h-8 shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="16" cy="16" r="14" stroke={isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} strokeWidth="3" fill="none" />
                  <circle cx="16" cy="16" r="14" stroke={isDarkMode ? '#22c55e' : '#16A34A'} strokeWidth="3" fill="none" strokeDasharray="88" strokeDashoffset={88 - (88 * scoreValue) / 100} />
                </svg>
              </div>
            )}
            <div title={value} className={`text-[20px] font-display font-bold tracking-tight leading-tight line-clamp-2 ${isDarkMode ? 'text-white' : 'text-[#111827]'}`}>
              {value}
            </div>
          </div>
        )}
        <div className={`text-[12px] whitespace-normal line-clamp-2 ${isDarkMode ? 'text-gray-400' : 'text-[#667085]'}`}>{subtitle}</div>
      </div>

      <div className="flex justify-between items-end z-10">
        <div>
          <span className={`text-[10px] font-mono px-2 py-1 rounded-[6px] border tracking-wider uppercase flex items-center gap-1.5 ${trendColor}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {trend}
          </span>
        </div>
        {actionIcon && (
          <button onClick={onAction} className={`p-2 rounded-[12px] transition-colors border ${isDarkMode ? 'bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border-[rgba(255,255,255,0.07)] text-gray-400 hover:text-white' : 'bg-[#F7F8FA] hover:bg-[#F1F3F6] border-[#E2E6EC] text-[#667085] hover:text-[#111827]'}`}>
            {actionIcon}
          </button>
        )}
      </div>
    </div>
  );
}

function ActionCard({ isDarkMode, title, icon, to, color }) {
  const colorMap = {
    blue: isDarkMode
      ? 'from-[rgba(37,99,235,0.1)] to-[rgba(37,99,235,0.05)] text-[#3b82f6] border-[rgba(37,99,235,0.2)] hover:border-[rgba(37,99,235,0.4)]'
      : 'from-[#EFF6FF] to-[#DBEAFE] text-[#2563EB] border-[#BFDBFE] hover:border-[#93C5FD] hover:shadow-[0_4px_16px_rgba(37,99,235,0.12)]',
    purple: isDarkMode
      ? 'from-[rgba(124,58,237,0.1)] to-[rgba(124,58,237,0.05)] text-[#a855f7] border-[rgba(124,58,237,0.2)] hover:border-[rgba(124,58,237,0.4)]'
      : 'from-[#F5F3FF] to-[#EDE9FE] text-[#7C3AED] border-[#DDD6FE] hover:border-[#C4B5FD] hover:shadow-[0_4px_16px_rgba(124,58,237,0.12)]',
    red: isDarkMode
      ? 'from-[rgba(220,38,38,0.1)] to-[rgba(220,38,38,0.05)] text-[#ef4444] border-[rgba(220,38,38,0.2)] hover:border-[rgba(220,38,38,0.4)]'
      : 'from-[#FFF1F2] to-[#FFE4E6] text-[#DC2626] border-[#FECACA] hover:border-[#FCA5A5] hover:shadow-[0_4px_16px_rgba(220,38,38,0.12)]',
    green: isDarkMode
      ? 'from-[rgba(22,163,74,0.1)] to-[rgba(22,163,74,0.05)] text-[#22c55e] border-[rgba(22,163,74,0.2)] hover:border-[rgba(22,163,74,0.4)]'
      : 'from-[#F0FDF4] to-[#DCFCE7] text-[#16A34A] border-[#BBF7D0] hover:border-[#86EFAC] hover:shadow-[0_4px_16px_rgba(22,163,74,0.12)]',
  };

  return (
    <Link 
      to={to}
      className={`rounded-[16px] p-6 flex flex-col items-center justify-center gap-4 text-center transition-all duration-300 hover-lift border bg-gradient-to-br h-36 ${colorMap[color]}`}
    >
      <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)]' : 'bg-white/60 border-current/20'} shadow-sm`}>
        {React.cloneElement(icon, { className: "w-8 h-8 drop-shadow-sm" })}
      </div>
      <span className={`text-[13px] font-semibold ${isDarkMode ? 'text-gray-200' : 'text-current'}`}>{title}</span>
    </Link>
  );
}

function SafetyMetric({ isDarkMode, label, value, valueColor, noData }) {
  return (
    <div className={`flex justify-between items-center text-[13px] py-2 border-b last:border-0 ${isDarkMode ? 'border-[rgba(255,255,255,0.05)]' : 'border-[#F1F3F6]'}`}>
      <span className={isDarkMode ? 'text-gray-400' : 'text-[#667085]'}>{label}</span>
      <span className={`font-semibold ${noData ? (isDarkMode ? 'text-gray-500' : 'text-[#98A2B3]') : valueColor}`}>{value}</span>
    </div>
  );
}

function MapToggle({ isDarkMode, active, onClick, label }) {
  return (
    <button 
      onClick={onClick}
      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors
        ${active 
          ? (isDarkMode ? 'bg-[rgba(255,255,255,0.18)] text-white' : 'bg-[#2563EB] text-white')
          : (isDarkMode ? 'bg-transparent text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.1)]' : 'bg-transparent text-[#667085] hover:text-[#111827] hover:bg-[rgba(0,0,0,0.06)]')
        }`}
    >
      {label}
    </button>
  );
}
