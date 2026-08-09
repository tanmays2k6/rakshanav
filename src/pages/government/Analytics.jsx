import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  BarChart2, TrendingUp, ShieldAlert, Map, AlertTriangle, Crosshair
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function CrimeAnalytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [jurisdictions, setJurisdictions] = useState([]);

  useEffect(() => {
    fetchCrimeData();
  }, []);

  const fetchCrimeData = async () => {
    try {
      // Fetch jurisdictions mapping
      const { data: jurData } = await supabase.from('police_jurisdictions').select('id, station_name, division, zone');
      if (jurData) {
        setJurisdictions(jurData);
      }
      
      // Fetch historical crime stats (2021-2023)
      const { data: statsData } = await supabase.from('crime_statistics').select('*').order('year', { ascending: false });
      if (statsData) {
        setStats(statsData);
      }
    } catch (err) {
      console.error('Error fetching crime data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group stats by Category for the latest year
  const categoryTotals = {};
  stats.forEach(s => {
    categoryTotals[s.category] = (categoryTotals[s.category] || 0) + s.reported_count;
  });
  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="w-full h-full flex flex-col gap-6 animate-fade-up overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
          <ShieldAlert className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Bengaluru Crime Intelligence</h1>
          <p className="text-sm text-gray-400">Jurisdiction-aware historical crime analytics</p>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center">
           <div className="w-8 h-8 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
          
          {/* Top Crime Categories */}
          <div className="glass-panel rounded-xl border border-white/10 p-6 shadow-xl flex flex-col">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-orange" /> Top Crime Categories (Historical)
            </h2>
            <div className="flex-1">
              <div className="space-y-4">
                {topCategories.map(([cat, count], idx) => {
                  const max = topCategories[0][1] || 1;
                  const pct = Math.round((count / max) * 100);
                  
                  return (
                    <div key={cat} className="flex items-center gap-4">
                      <span className="w-6 text-center text-xs font-mono text-gray-500">#{idx + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-300">{cat}</span>
                          <span className="text-white font-bold">{count.toLocaleString()}</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-red-500" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {topCategories.length === 0 && (
                   <p className="text-center text-gray-500 text-sm mt-10">No historical data available.</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Active Jurisdictions Summary */}
          <div className="glass-panel rounded-xl border border-white/10 p-6 shadow-xl flex flex-col">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Map className="w-5 h-5 text-blue-400" /> Jurisdiction Coverage
            </h2>
            <div className="flex-1 flex flex-col justify-center items-center text-center">
              <div className="w-24 h-24 rounded-full border-4 border-blue-500/30 flex items-center justify-center mb-4">
                <span className="text-3xl font-bold text-white">{jurisdictions.length}</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Police Stations Mapped</h3>
              <p className="text-sm text-gray-400 max-w-xs">Bengaluru police jurisdictions are integrated for accurate geo-spatial crime intelligence.</p>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
