import React, { useState, useEffect } from 'react';
import { History, Clock, CheckCircle, Truck, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function ResponsePerformance() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading performance data
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Mocked metrics for response performance since we don't have historical timeline events yet
  const performanceData = [
    { zone: 'East', responseTime: 8.5, resolved: 120 },
    { zone: 'West', responseTime: 12.2, resolved: 85 },
    { zone: 'North', responseTime: 10.1, resolved: 150 },
    { zone: 'South', responseTime: 6.8, resolved: 210 },
    { zone: 'Central', responseTime: 5.4, resolved: 300 }
  ];

  const timelineData = [
    { time: '00:00', avgTime: 12 },
    { time: '04:00', avgTime: 14 },
    { time: '08:00', avgTime: 9 },
    { time: '12:00', avgTime: 7 },
    { time: '16:00', avgTime: 8 },
    { time: '20:00', avgTime: 11 },
  ];

  return (
    <div className="w-full h-full flex flex-col gap-6 animate-fade-up overflow-y-auto custom-scrollbar pb-8">
      <div className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center">
            <History className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Response Performance</h1>
            <p className="text-sm text-gray-400">Emergency & Incident SLA Tracking</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center">
           <div className="w-8 h-8 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
            <div className="glass-panel p-5 rounded-xl border border-white/10 shadow-md">
              <h3 className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-orange" /> Avg SOS Response
              </h3>
              <p className="text-3xl font-display font-bold text-white">4.2 <span className="text-lg text-gray-500 font-normal">mins</span></p>
            </div>
            <div className="glass-panel p-5 rounded-xl border border-white/10 shadow-md">
              <h3 className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" /> Resolution Rate
              </h3>
              <p className="text-3xl font-display font-bold text-green-400">92%</p>
            </div>
            <div className="glass-panel p-5 rounded-xl border border-white/10 shadow-md">
              <h3 className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-400" /> Patrol Units Active
              </h3>
              <p className="text-3xl font-display font-bold text-white">128</p>
            </div>
            <div className="glass-panel p-5 rounded-xl border border-white/10 shadow-md">
              <h3 className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" /> Responders on Duty
              </h3>
              <p className="text-3xl font-display font-bold text-white">412</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[400px]">
            
            {/* Zone Performance */}
            <div className="glass-panel rounded-xl border border-white/10 p-6 flex flex-col h-full">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand-orange" /> Average Response Time by Zone (Mins)
              </h2>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                    <XAxis type="number" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis dataKey="zone" type="category" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f1520', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Bar dataKey="responseTime" fill="#f97316" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Time of Day Performance */}
            <div className="glass-panel rounded-xl border border-white/10 p-6 flex flex-col h-full">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <History className="w-5 h-5 text-blue-400" /> Response Time vs Time of Day
              </h2>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f1520', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    />
                    <Line type="stepAfter" dataKey="avgTime" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', stroke: '#080c10', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
          </div>
        </>
      )}
    </div>
  );
}
