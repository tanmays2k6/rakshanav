import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
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
  
  // Data State
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

  const navigate = useNavigate();

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

  if (!user) return null;

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-up">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2">
            <Navigation className="w-6 h-6 text-brand-blue" />
            Travel History & Intelligence
          </h2>
          <p className="text-sm text-gray-400 mt-1">Review your past commutes, safety metrics, and AI travel insights.</p>
        </div>
        
        <div className="flex items-center gap-2">
           <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg border ${viewMode === 'list' ? 'bg-brand-blue/20 border-brand-blue text-brand-blue' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}>
              <List className="w-4 h-4" />
           </button>
           <button onClick={() => setViewMode('map')} className={`p-2 rounded-lg border ${viewMode === 'map' ? 'bg-brand-blue/20 border-brand-blue text-brand-blue' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}>
              <MapIcon className="w-4 h-4" />
           </button>
           <button onClick={handleExportCSV} className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg text-gray-300 transition-colors">
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
      <div className="flex flex-wrap items-center gap-3 bg-white/5 border border-white/10 p-2 rounded-xl">
         <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search destinations or origins..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none text-sm text-white pl-9 pr-4 py-2 outline-none"
            />
         </div>
         <div className="w-px h-6 bg-white/10"></div>
         <select 
           value={timeFilter} 
           onChange={(e) => setTimeFilter(e.target.value)}
           className="bg-transparent border-none text-sm text-gray-300 outline-none cursor-pointer"
         >
           <option value="all" className="bg-[#080c12]">All Time</option>
           <option value="today" className="bg-[#080c12]">Today</option>
           <option value="7days" className="bg-[#080c12]">Last 7 Days</option>
           <option value="month" className="bg-[#080c12]">Last Month</option>
         </select>
         <div className="w-px h-6 bg-white/10"></div>
         <select 
           value={sortOrder} 
           onChange={(e) => setSortOrder(e.target.value)}
           className="bg-transparent border-none text-sm text-gray-300 outline-none cursor-pointer"
         >
           <option value="newest" className="bg-[#080c12]">Newest First</option>
           <option value="oldest" className="bg-[#080c12]">Oldest First</option>
           <option value="safest" className="bg-[#080c12]">Safest</option>
           <option value="longest" className="bg-[#080c12]">Longest Distance</option>
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
             <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                <Navigation className="w-8 h-8 text-gray-500" />
             </div>
             <h3 className="text-xl font-bold text-white mb-2">No trips found</h3>
             <p className="text-gray-400 text-sm max-w-sm mb-6">
                You haven't completed any tracked journeys yet. Start navigating to build your safety profile.
             </p>
             <button onClick={() => navigate('/dashboard/navigation')} className="bg-brand-blue hover:bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-brand-blue/20">
                Start Safe Navigation
             </button>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-4">
            {trips.map(trip => (
               <div key={trip.id} className={`glass-panel overflow-hidden transition-all duration-300 ${expandedTripId === trip.id ? 'border-brand-blue/50 ring-1 ring-brand-blue/30' : 'hover:border-white/20'}`}>
                 
                 {/* Compact Header */}
                 <div onClick={() => setExpandedTripId(expandedTripId === trip.id ? null : trip.id)} className="p-5 flex flex-col md:flex-row md:items-center gap-4 cursor-pointer relative group">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b" style={{ backgroundImage: `linear-gradient(to bottom, transparent, ${getRouteColor(trip.route_type)}, transparent)` }}></div>
                    
                    <div className="flex-1 pl-2">
                       <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full bg-brand-blue"></div>
                          <p className="text-sm font-medium text-white truncate max-w-[200px] md:max-w-[300px]">{trip.origin_name.split(',')[0]}</p>
                       </div>
                       <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getRouteColor(trip.route_type) }}></div>
                          <p className="text-sm font-medium text-white truncate max-w-[200px] md:max-w-[300px]">{trip.destination_name.split(',')[0]}</p>
                       </div>
                    </div>

                    <div className="flex items-center gap-6 md:min-w-[350px]">
                       <div>
                          <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Distance</p>
                          <p className="text-sm text-white font-medium">{trip.distance_km} km</p>
                       </div>
                       <div>
                          <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Duration</p>
                          <p className="text-sm text-white font-medium">{trip.duration_minutes} min</p>
                       </div>
                       <div>
                          <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Safety</p>
                          <p className="text-sm text-brand-neonGreen font-bold">{trip.safety_score}/100</p>
                       </div>
                    </div>

                    <div className="text-right md:min-w-[120px] flex flex-col items-end gap-1">
                       <p className="text-xs text-gray-400 font-mono">{new Date(trip.created_at).toLocaleDateString()}</p>
                       <p className="text-[10px] text-gray-500 font-mono">{new Date(trip.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                 </div>

                 {/* Expanded Details */}
                 {expandedTripId === trip.id && (
                    <div className="border-t border-white/10 p-5 bg-black/20 grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                       
                       {/* Map */}
                       <div className="h-[250px] rounded-xl overflow-hidden border border-white/10 relative z-0">
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
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                             <ShieldCheck className="w-4 h-4 text-brand-neonGreen" />
                             Route Intelligence
                          </h4>
                          
                          <div className="grid grid-cols-2 gap-3">
                             <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                <p className="text-[10px] text-gray-400 font-mono mb-1">ROUTE TYPE</p>
                                <p className="text-xs font-bold uppercase" style={{ color: getRouteColor(trip.route_type) }}>{trip.route_type}</p>
                             </div>
                             <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                <p className="text-[10px] text-gray-400 font-mono mb-1">WEATHER</p>
                                <p className="text-xs text-white">{trip.weather || 'Unknown'}</p>
                             </div>
                             <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                <p className="text-[10px] text-gray-400 font-mono mb-1">LIGHTING</p>
                                <p className="text-xs text-white">{trip.lighting_score || 'Unknown'}</p>
                             </div>
                             <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                <p className="text-[10px] text-gray-400 font-mono mb-1">COMMERCIAL</p>
                                <p className="text-xs text-white">{trip.commercial_count} Zones</p>
                             </div>
                          </div>

                          <div className="mt-auto">
                             <p className="text-[10px] text-gray-400 font-mono mb-2">INFRASTRUCTURE ENCOUNTERED</p>
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
function StatCard({ title, value, suffix, textSmall, color = "text-white" }) {
  return (
    <div className="glass-panel p-4 flex flex-col justify-center">
       <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-1">{title}</p>
       <p className={`font-bold ${textSmall ? 'text-sm truncate' : 'text-2xl'} ${color}`}>
          {value} {suffix && <span className="text-xs text-gray-400 font-normal ml-0.5">{suffix}</span>}
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
