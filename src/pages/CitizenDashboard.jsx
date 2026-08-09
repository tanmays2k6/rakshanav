import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, MapPin, Activity, Navigation, AlertTriangle, 
  Bot, Clock, Star, Map, Users, ChevronRight, Zap, Navigation2, 
  RefreshCw, Layers, Radio, LocateFixed, Maximize
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import UserView from '../components/UserView';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

// Import our new live services
import { locationService } from '../services/locationService';
import { placesService } from '../services/placesService';
import { weatherService } from '../services/weatherService';
import { SafetyEngine } from '../lib/SafetyEngine';

export default function CitizenDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Real Data States
  const [loading, setLoading] = useState(true);
  const [gpsState, setGpsState] = useState('LOADING'); // LOADING, AVAILABLE, DENIED, ERROR
  const [havenState, setHavenState] = useState('LOADING'); // LOADING, FOUND, EMPTY, ERROR
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
  
  // Real stats from Supabase
  const [reports, setReports] = useState([]);
  const [tripsCount, setTripsCount] = useState(0);
  
  // Map Toggles
  const [showTraffic, setShowTraffic] = useState(true);
  const [showCommunity, setShowCommunity] = useState(true);
  const [showStreetlights, setShowStreetlights] = useState(false);
  const [showHavens, setShowHavens] = useState(true);
  const [showJurisdictions, setShowJurisdictions] = useState(false);

  const fetchLiveData = async () => {
    // Only set the global loading state if we don't have location yet to avoid flashing UI on background refetches
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
      return; // Halt if GPS fails; cannot fetch havens or other location-based data
    }

    // Determine if we need to fetch havens based on distance moved (>200m)
    const lastLoc = lastSearchedRef.current;
    let shouldFetchHavens = true;
    if (lastLoc && nearestHaven) {
      const dist = placesService.calculateDistance(lastLoc.lat, lastLoc.lng, position.lat, position.lng);
      if (dist < 0.2) {
        shouldFetchHavens = false;
      }
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

      if (address.status === 'fulfilled') {
        setAddressData(address.value);
      }

      if (weather.status === 'fulfilled') {
        setWeatherData(weather.value);
        weatherCode = weather.value.weather_code;
        windSpeed = weather.value.wind_speed_10m;
      }
      
      if (reportsData.status === 'fulfilled' && reportsData.value.data) {
        setReports(reportsData.value.data);
      }
      
      if (tripsData.status === 'fulfilled' && tripsData.value.data) {
        setTripsCount(tripsData.value.data.length);
      }

      // 3. Fetch Real Nearby Alerts & Build Infrastructure Object
      let realAlerts = [];
      let supabaseSuccess = false;
      try {
        // Pseudo-bounding box for 5km (approx 0.045 degrees)
        const lat = position.lat;
        const lng = position.lng;
        const offset = 0.045;
        
        const { data, error } = await supabase
          .from('public_incident_view')
          .select('*')
          .eq('status', 'pending')
          .gte('lat', lat - offset)
          .lte('lat', lat + offset)
          .gte('lng', lng - offset)
          .lte('lng', lng + offset)
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (!error && data) {
           realAlerts = data;
           supabaseSuccess = true;
        }
      } catch (e) {
        console.warn('Failed to fetch alerts', e);
      }
      setNearbyAlerts(realAlerts);

      // 4. Fetch Police Jurisdiction
      let currentJurisdiction = null;
      try {
        setJurisdictionLoading(true);
        const { data: jData, error: jError } = await supabase.rpc('get_jurisdiction_by_location', { lat: position.lat, lng: position.lng });
        if (!jError && jData && jData.length > 0) {
          currentJurisdiction = jData[0];
        }
      } catch (e) {
        console.warn('Failed to fetch jurisdiction', e);
      } finally {
        setJurisdictionLoading(false);
      }
      setJurisdiction(currentJurisdiction);

      // Compute Live Safety Score using V2 Engine
      const hour = new Date().getHours();
      const isNight = hour < 6 || hour > 18;
      
      const infrastructure = {
        police: currentJurisdiction ? 1 : null, // Not zero, null if unknown
        hospitals: nearestHaven && nearestHaven.type === 'hospital' ? 1 : null,
        commercial: null, 
        parks: null
      };

      const weatherObj = weather.status === 'fulfilled' ? {
        isRaining: weatherCode >= 50 && weatherCode <= 69,
        isFoggy: weatherCode === 45 || weatherCode === 48,
        windSpeed: windSpeed
      } : { isRaining: false, isFoggy: false, windSpeed: 0 };

      const confidenceMetrics = {
        gps: gpsState === 'AVAILABLE',
        infrastructure: havenState === 'FOUND',
        weather: weather.status === 'fulfilled',
        reports: supabaseSuccess,
        routing: true, // Not routing
        ai: true // Not AI
      };

      const metrics = SafetyEngine.calculateLiveSafety(
        infrastructure,
        realAlerts,
        weatherObj,
        { isNightTime: isNight },
        confidenceMetrics
      );
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

  const handleAddReport = async (report) => {
    // Refresh context if report added
    fetchLiveData();
  };

  const handleNavigateToHaven = () => {
    if (nearestHaven) {
      navigate('/dashboard/navigation', {
        state: {
          origin: liveLocation ? 'Current Location' : '',
          destination: nearestHaven.name,
          autoTrigger: true
        }
      });
    }
  };

  const formatHavenDistance = (km) => {
    if (km < 1) return `${Math.round(km * 1000)} m away`;
    return `${km.toFixed(1)} km away`;
  };

  const getHavenIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'police': return '🛡 Police Station';
      case 'hospital': return '🏥 Hospital';
      case 'clinic': return '⚕ Clinic';
      case 'fire_station': return '🚒 Fire Station';
      case 'pharmacy': return '💊 Pharmacy';
      case 'atm': return '💳 ATM';
      default: return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Safe Haven';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-[1800px] mx-auto p-6"
    >
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
        
        {/* ── LeftContent ── */}
        <div className="flex flex-col gap-6 min-w-0 w-auto">
          
          {/* KPI Cards (4 cols) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard 
              title="Live Safety Score" 
              value={safetyMetrics ? `${safetyMetrics.score}/100` : 'N/A'}
              subtitle={safetyMetrics ? safetyMetrics.riskCategory : 'Awaiting data'}
              icon={<ShieldCheck className="w-[18px] h-[18px] text-brand-neonGreen" />} 
              trend="Live"
              glow="rgba(34,197,94,0.15)"
              loading={loading}
              isScore={true}
              scoreValue={safetyMetrics?.score || 0}
            />
            <KpiCard 
              title="Current Location" 
              value={gpsState === 'AVAILABLE' && addressData ? (addressData.address.suburb || addressData.address.city_district || 'Unknown') : (gpsState === 'DENIED' ? 'Location denied' : 'Location unavailable')}
              subtitle={gpsState === 'AVAILABLE' && liveLocation ? `Accuracy: ±${Math.round(liveLocation.accuracy)}m` : (gpsState === 'LOADING' ? 'Finding your location...' : 'Check permissions')}
              icon={<MapPin className="w-[18px] h-[18px] text-brand-blue" />} 
              trend="GPS"
              glow="rgba(59,130,246,0.15)"
              loading={gpsState === 'LOADING'}
              actionIcon={<RefreshCw className={`w-3 h-3 ${gpsState === 'LOADING' ? 'animate-spin' : ''}`} />}
              onAction={fetchLiveData}
            />
            <KpiCard 
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
              icon={<Activity className="w-[18px] h-[18px] text-brand-orange" />} 
              trend="Map Data"
              glow="rgba(249,115,22,0.15)"
              loading={havenState === 'LOADING' || gpsState === 'LOADING'}
              actionIcon={havenState === 'FOUND' && nearestHaven && <Navigation className="w-3 h-3" />}
              onAction={handleNavigateToHaven}
            />
            <KpiCard 
              title="Police Jurisdiction" 
              value={jurisdiction ? jurisdiction.station_name : 'No data'}
              subtitle={jurisdiction ? `Division: ${jurisdiction.division || 'N/A'}` : 'Data unavailable for this region'}
              icon={<ShieldCheck className="w-[18px] h-[18px] text-brand-blue" />} 
              trend="Official Data"
              glow="rgba(59,130,246,0.15)"
              loading={jurisdictionLoading || gpsState === 'LOADING'}
            />
          </div>

          {/* Live Safety Map */}
          <div className="glass-panel relative overflow-hidden group min-h-[500px] lg:min-h-[700px] h-[60dvh] lg:h-[700px] w-full flex flex-col shadow-2xl ring-1 ring-white/5">
            <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none">
              <div className="glass-panel px-3 lg:px-4 py-2 flex flex-wrap lg:flex-nowrap items-center gap-2 lg:gap-3 pointer-events-auto bg-black/40 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <Radio className={`w-4 h-4 ${loading ? 'text-yellow-400 animate-pulse' : 'text-brand-neonGreen'}`} />
                  <span className="text-[11px] lg:text-[13px] font-bold font-display tracking-wide text-white">
                    {loading ? 'Acquiring Signal...' : 'Live Safety Map'}
                  </span>
                </div>
                <div className="hidden lg:block w-px h-4 bg-white/20 mx-1"></div>
                <div className="flex gap-1.5 overflow-x-auto custom-scrollbar pb-1 lg:pb-0">
                  <MapToggle active={showCommunity} onClick={() => setShowCommunity(!showCommunity)} label="Hazards" />
                  <MapToggle active={showJurisdictions} onClick={() => setShowJurisdictions(!showJurisdictions)} label="Police Zones" />
                  <MapToggle active={showTraffic} onClick={() => setShowTraffic(!showTraffic)} label="Traffic" />
                </div>
              </div>

            </div>
            
            <div className="absolute inset-0 z-0 bg-gray-900/80 flex items-center justify-center">
              {errorMsg ? (
                 <div className="text-red-400 font-mono text-[13px] bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20">{errorMsg}</div>
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
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 glass-panel px-6 py-2.5 flex items-center gap-2 hover:bg-white/10 transition-all text-[13px] font-semibold text-white group shadow-xl bg-black/50"
            >
              <Map className="w-4 h-4 text-brand-blue group-hover:scale-110 transition-transform" />
              Open Full Navigation
            </Link>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="text-xl lg:text-2xl font-bold font-display mb-4 lg:mb-6 flex items-center gap-3 text-white">
              <Zap className="w-5 h-5 lg:w-6 lg:h-6 text-brand-orange" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <ActionCard title="Start Safe Navigation" icon={<Navigation2 />} to="/dashboard/navigation" color="blue" />
              <ActionCard title="AI Route Analysis" icon={<Bot />} to="/dashboard/ai" color="purple" />
              <ActionCard title="Report Hazard" icon={<AlertTriangle />} to="/dashboard/report" color="red" />
              <ActionCard title="Live Tracking" icon={<Activity />} to="/dashboard/tracking" color="green" />
            </div>
          </div>

        </div>

        {/* ── RightSidebar ── */}
        <div className="flex flex-col gap-6 xl:sticky xl:top-6 w-full xl:w-[380px] xl:min-w-[340px] xl:max-w-[420px]">
          
          {/* Card 1: Live Safety Rating */}
          <div className="glass-panel p-6 relative overflow-hidden flex flex-col gap-4 shadow-xl border-t-[3px] border-t-brand-neonGreen">
            <div className="absolute -right-16 -top-16 w-48 h-48 bg-brand-neonGreen/10 blur-[50px] rounded-full pointer-events-none"></div>
            
            <h3 className="text-[12px] font-mono text-gray-400 flex justify-between items-center uppercase tracking-widest">
              OVERALL SAFETY RATING
              <span className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-400' : 'bg-brand-neonGreen'} animate-pulse`}></span>
            </h3>
            
            {loading ? (
               <Skeleton className="w-full h-32 rounded-full" />
            ) : (
               <div className="flex flex-col items-center justify-center my-2">
                 <div className="relative w-32 h-32 flex items-center justify-center">
                   <svg className="w-full h-full transform -rotate-90">
                     <circle cx="64" cy="64" r="56" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="none" />
                     <motion.circle 
                       cx="64" cy="64" r="56" 
                       stroke="currentColor" 
                       strokeWidth="8" 
                       fill="none" 
                       strokeDasharray="351" 
                       initial={{ strokeDashoffset: 351 }}
                       animate={{ strokeDashoffset: 351 - (351 * (safetyMetrics?.score || 0)) / 100 }}
                       transition={{ duration: 1.5, ease: "easeOut" }}
                       className="text-brand-neonGreen"
                     />
                   </svg>
                   <div className="absolute flex flex-col items-center justify-center">
                     <span className="text-4xl font-display font-bold text-white leading-none">
                       {Math.round((safetyMetrics?.score || 0) / 10)}<span className="text-lg text-gray-500">.{(safetyMetrics?.score || 0) % 10}</span>
                     </span>
                   </div>
                 </div>
               </div>
            )}

            <div className="space-y-2 mt-2">
              <SafetyMetric label="Environment" value={safetyMetrics && safetyMetrics.breakdown.emergency !== null ? `${Math.round(safetyMetrics.breakdown.emergency)}/100` : 'Insufficient data'} color={safetyMetrics && safetyMetrics.breakdown.emergency !== null ? "text-brand-neonGreen" : "text-gray-500"} />
              <SafetyMetric label="Lighting" value={safetyMetrics && safetyMetrics.breakdown.lighting !== null ? `${Math.round(safetyMetrics.breakdown.lighting)}/100` : 'Insufficient data'} color={safetyMetrics && safetyMetrics.breakdown.lighting !== null ? "text-brand-blue" : "text-gray-500"} />
              <SafetyMetric label="Community Alerts" value={nearbyAlerts.length} color="text-brand-orange" />
              <SafetyMetric label="Weather" value={weatherData ? 'Clear' : 'N/A'} color="text-brand-blue" />
              <SafetyMetric label="Confidence" value={safetyMetrics ? `${safetyMetrics.confidence}%` : 'N/A'} color="text-yellow-400" />
              <SafetyMetric label="Last Updated" value="Just now" color="text-gray-400" />
            </div>
          </div>

          {/* Card 2: Nearby Alerts */}
          <div className="glass-panel p-6 flex flex-col gap-4 shadow-xl">
            <h3 className="text-[13px] font-mono text-gray-400 flex items-center gap-2 uppercase tracking-widest">
              <AlertTriangle className="w-3.5 h-3.5 text-brand-orange" />
              NEARBY ALERTS
            </h3>
            
            <div className="flex flex-col gap-3">
              {loading ? (
                [1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)
              ) : nearbyAlerts.length > 0 ? (
                nearbyAlerts.map(alert => (
                  <div key={alert.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                     <div>
                       <h4 className="text-[13px] font-semibold text-white group-hover:text-brand-orange transition-colors capitalize">{alert.category || 'Hazard'}</h4>
                       <p className="text-[11px] text-gray-400 mt-0.5 capitalize">{alert.severity} • {new Date(alert.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • Near you</p>
                     </div>
                     <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                  </div>
                ))
              ) : (
                <div className="text-[13px] text-gray-400 py-4 text-center bg-white/5 rounded-xl border border-white/5">
                  No active alerts within 5km.
                </div>
              )}
            </div>
          </div>

          {/* Card 3: AI Safety Insights */}
          <div className="glass-panel p-6 flex-1 flex flex-col gap-4 shadow-xl border border-brand-purple/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-[40px] rounded-full pointer-events-none"></div>
            
            <h3 className="text-[13px] font-mono text-[#a855f7] flex items-center gap-2 uppercase tracking-widest z-10">
              <Bot className="w-4 h-4" />
              AI INSIGHTS
            </h3>
            
            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2 z-10">
              {loading ? (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : safetyMetrics && safetyMetrics.explanation ? (
                Object.values(safetyMetrics.explanation).filter(v=>v).slice(0, 4).map((insight, idx) => (
                  <div key={idx} className="bg-[#a855f7]/10 p-3.5 rounded-xl border border-[#a855f7]/20 text-[13px] text-gray-200 leading-relaxed shadow-sm">
                    {insight}
                  </div>
                ))
              ) : (
                <div className="text-[13px] text-gray-400 py-4 text-center bg-white/5 rounded-xl border border-white/5">
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

function KpiCard({ title, value, subtitle, icon, trend, glow, loading, isScore, scoreValue, actionIcon, onAction }) {
    return (
    <div className="glass-panel p-6 hover-lift flex flex-col gap-3 h-full min-h-[160px] relative group overflow-hidden justify-between">
      <div 
        className="absolute -right-8 -top-8 w-32 h-32 rounded-full blur-[40px] opacity-30 group-hover:opacity-50 transition-opacity"
        style={{ backgroundColor: glow }}
      ></div>
      
      <div className="z-10 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/5 rounded-[12px] border border-white/10 shadow-inner backdrop-blur-md shrink-0">
            {icon}
          </div>
          <h4 className="text-[13px] text-gray-300 font-medium tracking-wide capitalize leading-tight">{title}</h4>
        </div>
        
        {loading ? (
           <Skeleton className="h-8 w-24 mt-2" />
        ) : (
           <div className="flex items-center gap-3 mt-1">
             {isScore && (
               <div className="relative w-8 h-8 shrink-0">
                 <svg className="w-full h-full transform -rotate-90">
                   <circle cx="16" cy="16" r="14" stroke="rgba(255,255,255,0.1)" strokeWidth="3" fill="none" />
                   <circle cx="16" cy="16" r="14" stroke="#22c55e" strokeWidth="3" fill="none" strokeDasharray="88" strokeDashoffset={88 - (88 * scoreValue) / 100} />
                 </svg>
               </div>
             )}
             <div 
               title={value}
               className="text-[20px] font-display font-bold text-white tracking-tight leading-tight line-clamp-2"
             >
               {value}
             </div>
           </div>
        )}
        <div className="text-[12px] text-gray-400 whitespace-normal line-clamp-2">{subtitle}</div>
      </div>

      <div className="flex justify-between items-end z-10">
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-mono text-brand-blue bg-brand-blue/10 px-2 py-1 rounded-[6px] border border-brand-blue/20 tracking-wider uppercase flex items-center gap-1.5">
             <span className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse"></span>
             {trend}
           </span>
        </div>
        {actionIcon && (
          <button onClick={onAction} className="p-2 bg-white/5 hover:bg-white/10 rounded-[12px] transition-colors text-gray-400 hover:text-white border border-white/5">
            {actionIcon}
          </button>
        )}
      </div>
    </div>
  );
}

function ActionCard({ title, icon, to, color }) {
  const colorMap = {
    blue: 'from-brand-blue/10 to-brand-blue/5 text-brand-blue border-brand-blue/20 hover:border-brand-blue/40 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]',
    purple: 'from-purple-500/10 to-purple-600/5 text-purple-400 border-purple-500/20 hover:border-purple-500/40 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]',
    red: 'from-brand-neonRed/10 to-brand-neonRed/5 text-brand-neonRed border-brand-neonRed/20 hover:border-brand-neonRed/40 hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]',
    green: 'from-brand-neonGreen/10 to-emerald-600/5 text-brand-neonGreen border-brand-neonGreen/20 hover:border-brand-neonGreen/40 hover:shadow-[0_0_20px_rgba(34,197,94,0.15)]',
  };

  return (
    <Link 
      to={to}
      className={`glass-panel p-6 flex flex-col items-center justify-center gap-4 text-center transition-all duration-300 hover-lift border ${colorMap[color]} bg-gradient-to-br h-36`}
    >
      <div className="p-3 bg-white/5 rounded-2xl shadow-inner border border-white/5">
        {React.cloneElement(icon, { className: "w-8 h-8 drop-shadow-md" })}
      </div>
      <span className="text-[13px] font-semibold text-gray-200">{title}</span>
    </Link>
  );
}

function SafetyMetric({ label, value, color }) {
  return (
    <div className="flex justify-between items-center text-[13px] py-2 border-b border-white/5 last:border-0">
      <span className="text-gray-400">{label}</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  );
}

function Skeleton({ className }) {
  return (
    <div className={`bg-white/5 animate-pulse rounded-xl ${className}`}></div>
  );
}

function MapToggle({ active, onClick, label }) {
  return (
    <button 
      onClick={onClick}
      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${active ? 'bg-white/20 text-white' : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/10'}`}
    >
      {label}
    </button>
  );
}

function MapBtn({ icon, onClick, loading }) {
  return (
    <button 
      onClick={onClick}
      className="w-10 h-10 glass-panel flex items-center justify-center hover:bg-white/10 transition-colors bg-black/40 backdrop-blur-md text-white"
    >
      {React.cloneElement(icon, { className: `w-5 h-5 ${loading ? 'animate-spin text-brand-blue' : ''}` })}
    </button>
  );
}
