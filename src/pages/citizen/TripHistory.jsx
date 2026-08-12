import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { tripService } from '../../services/tripService';
import { geminiService } from '../../services/geminiService';
import { 
  MapPin, Navigation, Clock, ShieldCheck, AlertTriangle, Search, Filter,
  Download, Map as MapIcon, List, Zap, Eye
} from 'lucide-react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

export default function TripHistory() {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  
  const [trips, setTrips] = useState([]);
  const [stats, setStats] = useState(null);
  const [insights, setInsights] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI State
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [timeFilter, setTimeFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTripId, setExpandedTripId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, timeFilter, sortOrder, searchQuery]);

  // Realtime subscription is SEPARATE from filter state to prevent subscription storm.
  // Only depends on user — a new subscription is NOT needed when filters change.
  useEffect(() => {
    if (!user) return;
    const unsub = tripService.subscribeToTrips(user.id, () => {
       loadData(); // Re-fetch on insert/update to refresh list and stats
    });
    return () => unsub();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setIsLoading(true);
    setErrorMsg('');
    
    try {
      // Fetch trips for authenticated user
      const fetchedTrips = await tripService.getTrips(user.id, timeFilter, sortOrder, searchQuery);
      setTrips(fetchedTrips || []);

      // Fetch Stats for authenticated user
      const fetchedStats = await tripService.getTripStats(user.id);
      setStats(fetchedStats);

      // Fetch AI Insights if stats exist and no search active
      if (fetchedStats && fetchedStats.totalTrips > 0 && !searchQuery) {
        const fetchedInsights = await geminiService.generateTripInsights(fetchedStats);
        setInsights(fetchedInsights || []);
      }
    } catch (err) {
      console.error('[TripHistory] Error loading data:', err);
      setErrorMsg('Unable to load trip history. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (trips.length === 0) return;
    const headers = ['Origin', 'Destination', 'Distance(km)', 'Duration(min)', 'Safety Score', 'Type', 'Date'];
    const rows = trips.map(t => [
      `"${t.origin_name}"`, 
      `"${t.destination_name}"`, 
      t.distance_km, 
      t.duration_minutes, 
      t.safety_score, 
      t.route_type, 
      new Date(t.created_at).toLocaleString()
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "RakshaNav_Trips.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRouteColor = (type) => {
    if (type === 'safest') return '#22c55e'; // Green
    if (type === 'fastest') return '#f97316'; // Orange
    return '#3b82f6'; // Blue
  };

  const textPrimary = isDarkMode ? 'text-white' : 'text-[#111827]';
  const textSecondary = isDarkMode ? 'text-gray-400' : 'text-[#667085]';
  const textMuted = isDarkMode ? 'text-gray-500' : 'text-[#98A2B3]';
  const borderColor = isDarkMode ? 'border-[rgba(255,255,255,0.08)]' : 'border-[#E2E6EC]';
  const surfaceCard = isDarkMode 
    ? 'bg-[rgba(8,12,18,0.84)] border border-[rgba(255,255,255,0.07)] shadow-xl'
    : 'bg-white border border-[#E2E6EC] shadow-sm';

  if (!user) return null;

  return (
    <div className="h-full flex flex-col gap-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-display font-bold tracking-tight flex items-center gap-2 ${textPrimary}`}>
            <Navigation className="w-6 h-6 text-[#2563EB]" />
            Travel History & Intelligence
          </h2>
          <p className={`text-sm mt-1 ${textSecondary}`}>Review your past commutes, safety metrics, and AI travel insights.</p>
        </div>
        
        <div className="flex items-center gap-2">
           <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg border ${viewMode === 'list' 
             ? (isDarkMode ? 'bg-[rgba(37,99,235,0.15)] border-[rgba(37,99,235,0.3)] text-[#3b82f6]' : 'bg-[#EFF6FF] border-[#DBEAFE] text-[#2563EB]') 
             : (isDarkMode ? 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.1)] text-gray-400 hover:bg-[rgba(255,255,255,0.1)]' : 'bg-white border-[#E2E6EC] text-[#667085] hover:bg-[#F1F3F6]')}`}>
              <List className="w-4 h-4" />
           </button>
           <button onClick={() => setViewMode('map')} className={`p-2 rounded-lg border ${viewMode === 'map' 
             ? (isDarkMode ? 'bg-[rgba(37,99,235,0.15)] border-[rgba(37,99,235,0.3)] text-[#3b82f6]' : 'bg-[#EFF6FF] border-[#DBEAFE] text-[#2563EB]') 
             : (isDarkMode ? 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.1)] text-gray-400 hover:bg-[rgba(255,255,255,0.1)]' : 'bg-white border-[#E2E6EC] text-[#667085] hover:bg-[#F1F3F6]')}`}>
              <MapIcon className="w-4 h-4" />
           </button>
           <button onClick={handleExportCSV} className={`p-2 rounded-lg border transition-colors ${isDarkMode ? 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.1)] text-gray-300' : 'bg-white border-[#E2E6EC] hover:bg-[#F1F3F6] text-[#667085]'}`}>
             <Download className="w-4 h-4" />
           </button>
        </div>
      </div>

      {/* DYNAMIC STATS (Only show if stats exist) */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Trips" value={stats.totalTrips} suffix="trips" />
          <StatCard title="Total Distance" value={stats.totalDistance} suffix="km" />
          <StatCard title="Avg Safety Score" value={stats.avgSafetyScore} suffix="/100" color="text-brand-neonGreen" />
          <StatCard title="Top Destination" value={stats.topDest.split(',')[0]} textSmall />
        </div>
      )}

      {/* AI INSIGHTS */}
      {insights.length > 0 && !isLoading && (
        <div className="bg-brand-blue/10 border border-brand-blue/30 rounded-xl p-4 flex gap-4 items-start">
           <Zap className="w-5 h-5 text-brand-blue shrink-0 mt-0.5" />
           <div>
             <h4 className="text-sm font-bold text-brand-blue mb-1">Gemini Travel Insights</h4>
             <ul className="text-xs text-blue-200 space-y-1 list-disc pl-4">
               {insights.map((insight, idx) => (
                 <li key={idx}>{insight}</li>
               ))}
             </ul>
           </div>
        </div>
      )}

      {/* TOOLBAR */}
      <div className={`flex flex-wrap items-center gap-3 border p-2 rounded-xl transition-colors
        ${isDarkMode ? 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)]' : 'bg-white border-[#E2E6EC]'}`}>
         <div className="flex-1 min-w-[200px] relative">
            <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-gray-400' : 'text-[#98A2B3]'}`} />
            <input 
              type="text" 
              placeholder="Search destinations or origins..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full border-none text-sm pl-9 pr-4 py-2 outline-none bg-transparent ${isDarkMode ? 'text-white' : 'text-[#111827]'}`}
            />
         </div>
         <div className={`w-px h-6 ${isDarkMode ? 'bg-[rgba(255,255,255,0.1)]' : 'bg-[#E2E6EC]'}`}></div>
         <select 
           value={timeFilter} 
           onChange={(e) => setTimeFilter(e.target.value)}
           className={`border-none text-sm outline-none cursor-pointer bg-transparent ${isDarkMode ? 'text-gray-300' : 'text-[#667085]'}`}
         >
           <option value="all" className={isDarkMode ? 'bg-[#080c12]' : 'bg-white'}>All Time</option>
           <option value="today" className={isDarkMode ? 'bg-[#080c12]' : 'bg-white'}>Today</option>
           <option value="7days" className={isDarkMode ? 'bg-[#080c12]' : 'bg-white'}>Last 7 Days</option>
           <option value="month" className={isDarkMode ? 'bg-[#080c12]' : 'bg-white'}>Last Month</option>
         </select>
         <div className={`w-px h-6 ${isDarkMode ? 'bg-[rgba(255,255,255,0.1)]' : 'bg-[#E2E6EC]'}`}></div>
         <select 
           value={sortOrder} 
           onChange={(e) => setSortOrder(e.target.value)}
           className={`border-none text-sm outline-none cursor-pointer bg-transparent ${isDarkMode ? 'text-gray-300' : 'text-[#667085]'}`}
         >
           <option value="newest" className={isDarkMode ? 'bg-[#080c12]' : 'bg-white'}>Newest First</option>
           <option value="oldest" className={isDarkMode ? 'bg-[#080c12]' : 'bg-white'}>Oldest First</option>
           <option value="safest" className={isDarkMode ? 'bg-[#080c12]' : 'bg-white'}>Safest</option>
           <option value="longest" className={isDarkMode ? 'bg-[#080c12]' : 'bg-white'}>Longest Distance</option>
         </select>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 relative">
        
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-4 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin mb-3"></div>
            <p className="text-xs text-gray-400 font-mono">Loading trip history...</p>
          </div>
        ) : errorMsg ? (
          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
             <p className="text-sm text-red-400 font-semibold mb-3">{errorMsg}</p>
             <button onClick={loadData} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold rounded-lg transition-colors">
               Retry Loading
             </button>
          </div>
        ) : trips.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
             <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDarkMode ? 'bg-[rgba(255,255,255,0.05)]' : 'bg-[#F1F3F6]'}`}>
                <Navigation className={`w-8 h-8 ${isDarkMode ? 'text-gray-500' : 'text-[#98A2B3]'}`} />
             </div>
             <h3 className={`text-xl font-bold mb-2 ${textPrimary}`}>No trips found</h3>
             <p className={`text-sm max-w-sm mb-6 ${textSecondary}`}>
                You haven't completed any tracked journeys yet. Start navigating to build your safety profile.
             </p>
             <button onClick={() => navigate('/dashboard/navigation')} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-lg">
                Start Safe Navigation
             </button>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-4">
            {trips.map(trip => (
               <div key={trip.id} className={`rounded-[16px] border overflow-hidden transition-all duration-300
                 ${isDarkMode 
                   ? `bg-[rgba(8,12,18,0.84)] ${expandedTripId === trip.id ? 'border-[rgba(37,99,235,0.4)] ring-1 ring-[rgba(37,99,235,0.2)]' : 'border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.15)]'}`
                   : `bg-white ${expandedTripId === trip.id ? 'border-[#BFDBFE] ring-1 ring-[rgba(37,99,235,0.1)]' : 'border-[#E2E6EC] hover:border-[#CBD5E0] hover:shadow-sm'}`
                 }`}>
                 
                 {/* Compact Header */}
                 <div onClick={() => setExpandedTripId(expandedTripId === trip.id ? null : trip.id)} className="p-5 flex flex-col md:flex-row md:items-center gap-4 cursor-pointer relative group">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b" style={{ backgroundImage: `linear-gradient(to bottom, transparent, ${getRouteColor(trip.route_type)}, transparent)` }}></div>
                    
                    <div className="flex-1 pl-2">
                       <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full bg-[#2563EB]"></div>
                          <p className={`text-sm font-medium truncate max-w-[200px] md:max-w-[300px] ${textPrimary}`}>{trip.origin_name.split(',')[0]}</p>
                       </div>
                       <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getRouteColor(trip.route_type) }}></div>
                          <p className={`text-sm font-medium truncate max-w-[200px] md:max-w-[300px] ${textPrimary}`}>{trip.destination_name.split(',')[0]}</p>
                       </div>
                    </div>

                    <div className="flex items-center gap-6 md:min-w-[350px]">
                       <div>
                          <p className={`text-[10px] font-mono uppercase tracking-wider ${textMuted}`}>Distance</p>
                          <p className={`text-sm font-medium ${textPrimary}`}>{trip.distance_km} km</p>
                       </div>
                       <div>
                          <p className={`text-[10px] font-mono uppercase tracking-wider ${textMuted}`}>Duration</p>
                          <p className={`text-sm font-medium ${textPrimary}`}>{trip.duration_minutes} min</p>
                       </div>
                       <div>
                          <p className={`text-[10px] font-mono uppercase tracking-wider ${textMuted}`}>Safety</p>
                          <p className={`text-sm font-bold ${isDarkMode ? 'text-[#22c55e]' : 'text-[#16A34A]'}`}>{trip.safety_score}/100</p>
                       </div>
                    </div>

                    <div className={`text-right md:min-w-[120px] flex flex-col items-end gap-1`}>
                       <p className={`text-xs font-mono ${textMuted}`}>{new Date(trip.created_at).toLocaleDateString()}</p>
                       <p className={`text-[10px] font-mono ${textMuted}`}>{new Date(trip.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                 </div>

                 {/* Expanded Details */}
                 {expandedTripId === trip.id && (
                    <div className={`border-t p-5 grid grid-cols-1 md:grid-cols-2 gap-6
                       ${isDarkMode ? 'border-[rgba(255,255,255,0.07)] bg-[rgba(0,0,0,0.2)]' : 'border-[#E2E6EC] bg-[#F7F8FA]'}`}>
                       
                       {/* Map */}
                       <div className={`h-[250px] rounded-xl overflow-hidden border relative z-0 ${isDarkMode ? 'border-[rgba(255,255,255,0.08)]' : 'border-[#E2E6EC]'}`}>
                          {trip.route_geometry?.coordinates && (
                            <MapContainer 
                              bounds={L.polyline(trip.route_geometry.coordinates.map(c => [c[1], c[0]])).getBounds()}
                              style={{ height: '100%', width: '100%', background: '#080c12' }}
                              zoomControl={false}
                            >
                              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                              <Polyline 
                                positions={trip.route_geometry.coordinates.map(c => [c[1], c[0]])} 
                                color={getRouteColor(trip.route_type)} 
                                weight={4} 
                                opacity={0.8} 
                              />
                            </MapContainer>
                          )}
                       </div>

                       {/* Stats */}
                       <div className="flex flex-col gap-4">
                          <h4 className={`text-sm font-bold flex items-center gap-2 ${textPrimary}`}>
                             <ShieldCheck className={`w-4 h-4 ${isDarkMode ? 'text-[#22c55e]' : 'text-[#16A34A]'}`} />
                             Route Intelligence
                          </h4>
                          
                          <div className="grid grid-cols-2 gap-3">
                             <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.05)]' : 'bg-white border-[#E2E6EC]'}`}>
                                <p className={`text-[10px] font-mono mb-1 ${textMuted}`}>ROUTE TYPE</p>
                                <p className="text-xs font-bold uppercase" style={{ color: getRouteColor(trip.route_type) }}>{trip.route_type}</p>
                             </div>
                             <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.05)]' : 'bg-white border-[#E2E6EC]'}`}>
                                <p className={`text-[10px] font-mono mb-1 ${textMuted}`}>WEATHER</p>
                                <p className={`text-xs ${textPrimary}`}>{trip.weather || 'Unknown'}</p>
                             </div>
                             <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.05)]' : 'bg-white border-[#E2E6EC]'}`}>
                                <p className={`text-[10px] font-mono mb-1 ${textMuted}`}>LIGHTING</p>
                                <p className={`text-xs ${textPrimary}`}>{trip.lighting_score || 'Unknown'}</p>
                             </div>
                             <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.05)]' : 'bg-white border-[#E2E6EC]'}`}>
                                <p className={`text-[10px] font-mono mb-1 ${textMuted}`}>COMMERCIAL</p>
                                <p className={`text-xs ${textPrimary}`}>{trip.commercial_count} Zones</p>
                             </div>
                          </div>

                          <div className="mt-auto">
                             <p className={`text-[10px] font-mono mb-2 ${textMuted}`}>INFRASTRUCTURE ENCOUNTERED</p>
                             <div className="flex gap-2">
                               <Pill label={`${trip.police_count} Police`} icon="👮" color="#3b82f6" />
                               <Pill label={`${trip.hospital_count} Hospitals`} icon="🏥" color="#ef4444" />
                             </div>
                          </div>
                       </div>

                    </div>
                 )}
               </div>
            ))}
          </div>
        ) : (
          <div className="h-full rounded-2xl overflow-hidden border border-white/10 relative z-0">
             {/* Map View of all trips */}
             <MapContainer 
                center={[12.9716, 77.5946]}
                zoom={12}
                style={{ height: '100%', width: '100%', background: '#080c12' }}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                {trips.map(trip => {
                   if (!trip.route_geometry?.coordinates) return null;
                   return (
                     <Polyline 
                        key={trip.id}
                        positions={trip.route_geometry.coordinates.map(c => [c[1], c[0]])} 
                        color={getRouteColor(trip.route_type)} 
                        weight={3} 
                        opacity={0.6} 
                     />
                   )
                })}
             </MapContainer>
             <div className="absolute top-4 right-4 z-[1000] glass-panel px-4 py-3 flex flex-col gap-2 pointer-events-none">
                <div className="flex items-center gap-2 text-xs text-white"><div className="w-3 h-1 bg-[#22c55e]"></div> Safest Routes</div>
                <div className="flex items-center gap-2 text-xs text-white"><div className="w-3 h-1 bg-[#3b82f6]"></div> Balanced Routes</div>
                <div className="flex items-center gap-2 text-xs text-white"><div className="w-3 h-1 bg-[#f97316]"></div> Fastest Routes</div>
             </div>
          </div>
        )}
      </div>

    </div>
  );
}

// Subcomponents
function StatCard({ title, value, suffix, textSmall, color = "" }) {
  const { isDarkMode } = useTheme();
  return (
    <div className={`rounded-[16px] p-4 flex flex-col justify-center border
      ${isDarkMode 
        ? 'bg-[rgba(8,12,18,0.84)] border-[rgba(255,255,255,0.07)]'
        : 'bg-white border-[#E2E6EC] shadow-sm'
      }`}>
       <p className={`text-[10px] font-mono uppercase tracking-wider mb-1 ${isDarkMode ? 'text-gray-500' : 'text-[#98A2B3]'}`}>{title}</p>
       <p className={`font-bold ${textSmall ? 'text-sm truncate' : 'text-2xl'} ${color || (isDarkMode ? 'text-white' : 'text-[#111827]')}`}>
          {value} {suffix && <span className={`text-xs font-normal ml-0.5 ${isDarkMode ? 'text-gray-400' : 'text-[#98A2B3]'}`}>{suffix}</span>}
       </p>
    </div>
  )
}

function Pill({ label, icon, color }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border" style={{ backgroundColor: color+'15', borderColor: color+'30' }}>
      <span className="text-[10px]">{icon}</span>
      <span className="text-[10px] font-bold" style={{ color }}>{label}</span>
    </div>
  )
}
