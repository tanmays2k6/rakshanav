import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { Users, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function EnterpriseDashboard() {
  const [stats, setStats] = useState({
    activeCommuters: 0,
    routeAlerts: 0,
    avgSafetyScore: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    // Fetch all trips for enterprise scope (for demo, just fetch all)
    const { data: trips } = await supabase.from('trips').select('safety_score, route_type');
    const { data: reports } = await supabase.from('incident_reports').select('id, status');
    
    let avgScore = 0;
    if (trips && trips.length > 0) {
      avgScore = Math.round(trips.reduce((acc, curr) => acc + (curr.safety_score || 0), 0) / trips.length);
    }
    
    setStats({
      activeCommuters: trips ? trips.length : 0, // Using trip count as a proxy for active commuters
      routeAlerts: reports ? reports.filter(r => r.status !== 'resolved').length : 0,
      avgSafetyScore: avgScore
    });
    setLoading(false);
  };

  return (
    <DashboardLayout title="Enterprise Dashboard">
      <div className="p-8 h-full overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel p-6 flex flex-col gap-2 relative overflow-hidden">
              <div className="flex items-center gap-3 text-brand-blue mb-2 relative z-10">
                <Users className="w-6 h-6" />
                <h3 className="font-semibold text-white">Tracked Commutes</h3>
              </div>
              <p className="text-4xl font-display font-bold relative z-10">{loading ? '--' : stats.activeCommuters}</p>
              <p className="text-sm text-green-400 relative z-10">Real-time DB sync</p>
            </div>
            
            <div className="glass-panel p-6 flex flex-col gap-2 relative overflow-hidden">
              <div className="flex items-center gap-3 text-brand-orange mb-2 relative z-10">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="font-semibold text-white">Active Alerts</h3>
              </div>
              <p className="text-4xl font-display font-bold relative z-10">{loading ? '--' : stats.routeAlerts}</p>
              <p className="text-sm text-yellow-400 relative z-10">Unresolved hazard reports</p>
            </div>

            <div className="glass-panel p-6 flex flex-col gap-2 relative overflow-hidden">
              <div className="flex items-center gap-3 text-green-500 mb-2 relative z-10">
                <ShieldCheck className="w-6 h-6" />
                <h3 className="font-semibold text-white">Avg. Safety Score</h3>
              </div>
              <p className="text-4xl font-display font-bold relative z-10">{loading ? '--' : stats.avgSafetyScore}<span className="text-lg text-gray-500">/100</span></p>
              <p className="text-sm text-gray-400 relative z-10">Across all employee trips</p>
            </div>
          </div>

          <div className="glass-panel p-6 min-h-[400px] flex items-center justify-center border border-white/10">
            <div className="text-center">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                <Activity className="w-8 h-8 text-gray-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Live Commute Map</h3>
              <p className="text-gray-400 max-w-sm mx-auto">Waiting for active fleet telemetry. Data will populate here once enterprise logistics endpoints are broadcasting.</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
