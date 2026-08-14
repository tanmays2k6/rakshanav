import React, { useState, useEffect } from 'react';
import { Bot, Cpu, AlertTriangle, MapPin, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import CommandMap from '../../components/government/maps/CommandMap';
import { Marker } from 'react-map-gl/maplibre';

export default function InfrastructureIntel() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInfraIncidents();
  }, []);

  const fetchInfraIncidents = async () => {
    try {
      const { data, error } = await supabase
        .from('incident_reports')
        .select('*')
        .in('category', ['Infrastructure', 'Pothole', 'Streetlight', 'Road Damage', 'Water Logging', 'Traffic Signal'])
        .neq('status', 'Resolved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIncidents(data || []);
    } catch (err) {
      console.error('Error fetching infra intel:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category) => {
    switch (category?.toLowerCase()) {
      case 'streetlight': return 'text-yellow-400 bg-yellow-400/20';
      case 'pothole': return 'text-orange-500 bg-orange-500/20';
      case 'water logging': return 'text-blue-400 bg-blue-400/20';
      case 'traffic signal': return 'text-red-400 bg-red-400/20';
      default: return 'text-brand-orange bg-brand-orange/20';
    }
  };

  const mapCenter = incidents.length > 0 ? [incidents[0].latitude, incidents[0].longitude] : [12.9716, 77.5946];

  return (
    <div className="w-full h-full flex flex-col gap-6 animate-fade-up">
      <div className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-orange/20 border border-brand-orange/30 flex items-center justify-center">
            <Bot className="w-5 h-5 text-brand-orange" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Infrastructure Intelligence</h1>
            <p className="text-sm text-gray-400">AI-driven urban asset monitoring</p>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-lg flex items-center gap-3">
          <span className="font-mono text-gray-300 font-bold uppercase tracking-wider text-sm">
            {incidents.length} Issues Detected
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* Map */}
        <div className="lg:col-span-8 glass-panel rounded-xl border border-white/10 overflow-hidden shadow-2xl relative min-h-[400px]">
           {loading ? (
             <div className="absolute inset-0 flex items-center justify-center text-white z-10">Loading map data...</div>
           ) : (
             <CommandMap center={mapCenter} zoom={13}>
               {incidents.map(inc => (
                 <Marker key={inc.id} longitude={inc.longitude} latitude={inc.latitude}>
                   <div className="w-4 h-4 bg-brand-orange rounded-full border-2 border-white shadow-[0_0_10px_rgba(249,115,22,0.8)] cursor-pointer hover:scale-150 transition-transform"></div>
                 </Marker>
               ))}
             </CommandMap>
           )}
        </div>

        {/* List */}
        <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search assets..." 
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm outline-none focus:border-brand-orange/50 transition-colors"
            />
          </div>

          {incidents.length === 0 && !loading && (
             <div className="glass-panel p-8 text-center text-gray-500 rounded-xl border border-white/5">
                No active infrastructure issues found.
             </div>
          )}

          {incidents.map(inc => {
            const colorClass = getCategoryColor(inc.category);
            return (
              <div key={inc.id} className="glass-panel p-4 rounded-xl border border-white/5 hover:border-white/20 transition-all cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded ${colorClass}`}>
                    {inc.category}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {new Date(inc.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="font-bold text-white text-sm line-clamp-1">{inc.title}</h3>
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{inc.description}</p>
                <div className="mt-3 flex items-center justify-between text-xs font-mono text-gray-500">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {inc.priority} Priority</span>
                  <span className={inc.status === 'Pending' ? 'text-red-400' : 'text-yellow-400'}>{inc.status}</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
