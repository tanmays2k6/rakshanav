import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  BarChart2, TrendingUp, Activity, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { governmentService } from '../../services/governmentService';

export default function GovAnalytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    if (!user) return;
    governmentService.getLiveReports().then(data => {
      setReports(data || []);
      setLoading(false);
    });
  }, [user]);

  // Derived Analytics (Basic)
  const categoryCount = {};
  const statusCount = {};
  
  reports.forEach(r => {
    categoryCount[r.category] = (categoryCount[r.category] || 0) + 1;
    statusCount[r.status] = (statusCount[r.status] || 0) + 1;
  });

  const categories = Object.keys(categoryCount).sort((a,b) => categoryCount[b] - categoryCount[a]).slice(0, 5);

  return (
    <div className="w-full h-full flex flex-col gap-6 animate-fade-up overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-brand-blue/20 border border-brand-blue/30 flex items-center justify-center">
          <BarChart2 className="w-5 h-5 text-brand-blue" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Performance Analytics</h1>
          <p className="text-sm text-gray-400">Resolution rates and incident trends</p>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center">
           <div className="w-8 h-8 border-4 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
          
          {/* Status Overview */}
          <div className="glass-panel rounded-xl border border-white/10 p-6 shadow-xl flex flex-col">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-brand-neonGreen" /> Status Overview
            </h2>
            <div className="flex-1 flex items-center justify-center">
              <div className="w-full max-w-sm space-y-4">
                {['Pending', 'Verified', 'In Progress', 'Resolved'].map(status => {
                  const count = statusCount[status] || 0;
                  const total = reports.length || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={status}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-300 font-medium">{status}</span>
                        <span className="text-white font-bold">{count} <span className="text-gray-500 font-mono text-xs">({pct}%)</span></span>
                      </div>
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${status === 'Resolved' ? 'bg-green-500' : status === 'In Progress' ? 'bg-blue-500' : status === 'Pending' ? 'bg-yellow-500' : 'bg-orange-500'}`} 
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Top Categories */}
          <div className="glass-panel rounded-xl border border-white/10 p-6 shadow-xl flex flex-col">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-orange" /> Top Reported Issues
            </h2>
            <div className="flex-1">
              <div className="space-y-4">
                {categories.map((cat, idx) => {
                  const count = categoryCount[cat];
                  const max = categoryCount[categories[0]] || 1;
                  const pct = Math.round((count / max) * 100);
                  
                  return (
                    <div key={cat} className="flex items-center gap-4">
                      <span className="w-6 text-center text-xs font-mono text-gray-500">#{idx + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-300">{cat}</span>
                          <span className="text-white font-bold">{count}</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-brand-orange" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {categories.length === 0 && (
                   <p className="text-center text-gray-500 text-sm mt-10">No data available for categories.</p>
                )}
              </div>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
