import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  BarChart2, TrendingUp, ShieldAlert, Activity, AlertTriangle, Calendar
} from 'lucide-react';
import { governmentService } from '../../services/governmentService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend 
} from 'recharts';

export default function Analytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [timeRange, setTimeRange] = useState(30); // days

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - timeRange);

      const [summaryData, chartData] = await Promise.all([
        governmentService.getAnalytics(start, end),
        governmentService.getDailyAnalytics(start, end)
      ]);

      setSummary(summaryData);
      
      // Format chart data for recharts
      if (chartData) {
        const formatted = chartData.map(d => ({
          date: new Date(d.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          Incidents: parseInt(d.incidents),
          Resolved: parseInt(d.resolved),
          'SOS Alerts': parseInt(d.sos_alerts)
        }));
        setDailyData(formatted);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col gap-6 animate-fade-up overflow-y-auto custom-scrollbar pb-8">
      <div className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-blue/20 border border-brand-blue/30 flex items-center justify-center">
            <Activity className="w-5 h-5 text-brand-blue" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Government Analytics</h1>
            <p className="text-sm text-gray-400">Platform usage and safety trends</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white/5 rounded-lg border border-white/10 p-1">
          <button 
            onClick={() => setTimeRange(7)}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${timeRange === 7 ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}
          >
            7 Days
          </button>
          <button 
            onClick={() => setTimeRange(30)}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${timeRange === 30 ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}
          >
            30 Days
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center">
           <div className="w-8 h-8 border-4 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
            <div className="glass-panel p-5 rounded-xl border border-white/10 shadow-md">
              <h3 className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">Total Incidents</h3>
              <p className="text-3xl font-display font-bold text-white">{summary?.total_incidents || 0}</p>
            </div>
            <div className="glass-panel p-5 rounded-xl border border-white/10 shadow-md">
              <h3 className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">Resolved</h3>
              <p className="text-3xl font-display font-bold text-brand-neonGreen">{summary?.resolved_incidents || 0}</p>
            </div>
            <div className="glass-panel p-5 rounded-xl border border-white/10 shadow-md">
              <h3 className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">Active Sessions</h3>
              <p className="text-3xl font-display font-bold text-brand-blue">{summary?.total_active_sessions || 0}</p>
            </div>
            <div className="glass-panel p-5 rounded-xl border border-red-500/20 shadow-md bg-[#0a0505]">
              <h3 className="text-xs font-mono text-red-500 uppercase tracking-wider mb-2">SOS Alerts</h3>
              <p className="text-3xl font-display font-bold text-red-500">{summary?.total_sos || 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
            
            {/* Main Chart */}
            <div className="lg:col-span-8 glass-panel rounded-xl border border-white/10 p-6 flex flex-col min-h-[400px]">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand-blue" /> Incident & Resolution Trends
              </h2>
              <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f1520', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
                    <Line type="monotone" dataKey="Incidents" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="Resolved" stroke="#22c55e" strokeWidth={3} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* SOS Alerts Chart */}
            <div className="lg:col-span-4 glass-panel rounded-xl border border-white/10 p-6 flex flex-col min-h-[400px]">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" /> SOS Alert Volume
              </h2>
              <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 10 }} />
                    <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f1520', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px' }}
                      cursor={{ fill: 'rgba(239,68,68,0.1)' }}
                    />
                    <Bar dataKey="SOS Alerts" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
          </div>
        </>
      )}
    </div>
  );
}
