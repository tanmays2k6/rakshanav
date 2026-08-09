import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, ShieldAlert, Activity, AlertTriangle, ShieldCheck, Server, Database, History } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeReports: 0,
    totalOrganizations: 0,
    criticalAlerts: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminStats = async () => {
      setLoading(true);
      try {
        const [usersRes, reportsRes, orgsRes, alertsRes] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('incident_reports').select('*', { count: 'exact', head: true }).neq('status', 'Resolved').neq('status', 'Rejected'),
          supabase.from('organizations').select('*', { count: 'exact', head: true }),
          supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('priority', 'critical')
        ]);
        
        setStats({
          totalUsers: usersRes.count || 0,
          activeReports: reportsRes.count || 0,
          totalOrganizations: orgsRes.count || 0,
          criticalAlerts: alertsRes.count || 0
        });
      } catch (err) {
        console.error("Error fetching admin stats", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAdminStats();
  }, []);

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-up">
      <div className="flex justify-between items-center">
         <div>
            <h1 className="text-3xl font-display font-black text-white tracking-tight flex items-center gap-3">
              <Server className="w-8 h-8 text-purple-500" />
              System Administration
            </h1>
            <p className="text-sm text-gray-400 mt-1">Global overview of platform health, users, and critical incidents.</p>
         </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
         <StatCard label="Total Users" value={stats.totalUsers} icon={<Users className="w-5 h-5 text-brand-blue" />} color="border-brand-blue/30" />
         <StatCard label="Active Reports" value={stats.activeReports} icon={<ShieldAlert className="w-5 h-5 text-orange-500" />} color="border-orange-500/30" />
         <StatCard label="Enterprises" value={stats.totalOrganizations} icon={<ShieldCheck className="w-5 h-5 text-brand-neonGreen" />} color="border-brand-neonGreen/30" />
         <StatCard label="Critical Alerts" value={stats.criticalAlerts} icon={<AlertTriangle className="w-5 h-5 text-brand-neonRed" />} color="border-brand-neonRed/30" />
      </div>
      
      {/* Placeholder for complex admin views */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
         <div className="glass-panel p-6 border border-white/10 rounded-xl flex flex-col">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
               <Activity className="w-5 h-5 text-purple-400" /> System Health
            </h3>
            <div className="flex-1 flex items-center justify-center border border-dashed border-white/10 rounded-xl bg-black/20">
               <div className="text-center">
                  <Database className="w-10 h-10 text-gray-600 mx-auto mb-2 animate-pulse" />
                  <p className="text-sm font-mono text-gray-400">All Database Services Operational</p>
                  <p className="text-xs text-gray-500 mt-1">PostgreSQL Connection: Stable</p>
               </div>
            </div>
         </div>
         
         <div className="glass-panel p-6 border border-white/10 rounded-xl flex flex-col">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
               <History className="w-5 h-5 text-gray-400" /> Recent Audit Logs
            </h3>
            <div className="flex-1 flex items-center justify-center border border-dashed border-white/10 rounded-xl bg-black/20 p-4">
               <div className="w-full h-full space-y-3">
                  <div className="bg-white/5 p-3 rounded-lg flex justify-between items-center">
                     <div>
                        <p className="text-xs font-bold text-white">Role Updated</p>
                        <p className="text-[10px] text-gray-500 font-mono">User user_id changed to Government</p>
                     </div>
                     <span className="text-[10px] text-gray-400">2m ago</span>
                  </div>
                  <div className="bg-white/5 p-3 rounded-lg flex justify-between items-center">
                     <div>
                        <p className="text-xs font-bold text-white">System Alert Broadcasted</p>
                        <p className="text-[10px] text-gray-500 font-mono">Ward 5 Flooding Warning</p>
                     </div>
                     <span className="text-[10px] text-gray-400">15m ago</span>
                  </div>
                  <div className="bg-white/5 p-3 rounded-lg flex justify-between items-center opacity-50">
                     <div>
                        <p className="text-xs font-bold text-white">New Enterprise Registered</p>
                        <p className="text-[10px] text-gray-500 font-mono">TechCorp India</p>
                     </div>
                     <span className="text-[10px] text-gray-400">1h ago</span>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className={`glass-panel p-6 rounded-xl border ${color} relative overflow-hidden group hover:bg-white/5 transition-colors`}>
       <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-100 transition-opacity transform group-hover:scale-110">
          {icon}
       </div>
       <p className="text-xs font-mono text-gray-400 uppercase tracking-widest mb-1">{label}</p>
       <p className="text-4xl font-black text-white">{value}</p>
    </div>
  )
}
