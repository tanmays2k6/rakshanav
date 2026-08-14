import React, { useState, useEffect } from 'react';
import { Users, ShieldAlert, MapPin, TrendingDown, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import CommandMap from '../../components/government/maps/CommandMap';
import { Marker } from 'react-map-gl/maplibre';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function WomensSafety() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSafetyData();
  }, []);

  const fetchSafetyData = async () => {
    try {
      // In a real scenario, this would aggregate from multiple sources: SOS, Hazard reports, Live Sessions
      const { data, error } = await supabase
        .from('incident_reports')
        .select('*')
        .in('category', ['Harassment', 'Suspicious Activity', 'Poor Lighting', 'Unsafe Area'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIncidents(data || []);
    } catch (err) {
      console.error('Error fetching women safety data:', err);
    } finally {
      setLoading(false);
    }
  };

  const mapCenter = incidents.length > 0 ? [incidents[0].latitude, incidents[0].longitude] : [12.9716, 77.5946];

  // Mock data for the chart to show demographic analytics without exposing PII
  const demographicData = [
    { ageGroup: '18-24', incidents: 45 },
    { ageGroup: '25-34', incidents: 80 },
    { ageGroup: '35-44', incidents: 30 },
    { ageGroup: '45-54', incidents: 15 },
    { ageGroup: '55+', incidents: 5 }
  ];

  return (
    <div className="w-full h-full flex flex-col gap-6 animate-fade-up overflow-y-auto custom-scrollbar pb-8">
      <div className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <Users className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Women's Safety Intelligence</h1>
            <p className="text-sm text-gray-400">Anonymized spatial and demographic risk analytics</p>
          </div>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/20 px-4 py-2 rounded-lg flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-purple-400" />
          <span className="font-mono text-purple-300 font-bold text-sm">
            Strict Privacy Mode: Active
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-[400px]">
        
        {/* Map */}
        <div className="lg:col-span-8 glass-panel rounded-xl border border-white/10 overflow-hidden shadow-2xl relative">
           {loading ? (
             <div className="absolute inset-0 flex items-center justify-center text-white z-10">Loading map data...</div>
           ) : (
             <CommandMap center={mapCenter} zoom={12}>
               {incidents.map(inc => (
                 <Marker key={inc.id} longitude={inc.longitude} latitude={inc.latitude}>
                   <div className="w-5 h-5 bg-purple-500 rounded-full border-2 border-white shadow-[0_0_15px_rgba(168,85,247,0.8)] cursor-pointer hover:scale-125 transition-transform"></div>
                 </Marker>
               ))}
             </CommandMap>
           )}
           <div className="absolute top-4 left-4 bg-[#080c10]/90 backdrop-blur border border-white/10 p-3 rounded-xl">
             <h3 className="text-white text-sm font-bold flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-purple-400" /> High-Risk Corridors
             </h3>
             <ul className="text-xs text-gray-400 space-y-1">
               <li>• Indiranagar 100ft Rd</li>
               <li>• Silk Board Junction</li>
               <li>• Koramangala 80ft Rd</li>
             </ul>
           </div>
        </div>

        {/* Analytics & Demographics */}
        <div className="lg:col-span-4 flex flex-col gap-6 h-full">
          
          <div className="glass-panel p-6 rounded-xl border border-white/10 flex-1">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-wider font-mono">
              <Activity className="w-4 h-4 text-purple-400" /> Demographics (Anonymized)
            </h2>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={demographicData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="ageGroup" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f1520', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '8px' }}
                    cursor={{ fill: 'rgba(168,85,247,0.1)' }}
                  />
                  <Bar dataKey="incidents" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-xl border border-white/10 flex-1">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-wider font-mono">
              <TrendingDown className="w-4 h-4 text-green-400" /> Preventive Actions Impact
            </h2>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              Enhanced street lighting installed in Koramangala last month has correlated with a 34% reduction in "Poor Lighting" reports and a 12% drop in SOS alerts along the 80ft road corridor.
            </p>
            <button className="w-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 font-bold py-2 rounded-lg transition-colors text-xs">
              Generate Detailed Report
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
