import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, CheckCircle2, ShieldAlert, Activity, Map as MapIcon, 
  Clock, Navigation, ShieldCheck, MapPin, List, Bell, Bot, History,
  Filter, Eye, ChevronRight, ActivitySquare, AlertCircle
} from 'lucide-react';
import { governmentService } from '../../services/governmentService';
import Map, { Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function CommandCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [kpis, setKpis] = useState({
    activeComplaints: 0,
    criticalIssues: 0,
    resolvedThisMonth: 0,
    avgResponseTime: 'N/A', // Fallback defaults if undefined
    avgResolutionTime: 'N/A',
    safetyHotspots: 0
  });
  
  const [reports, setReports] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [mapFilter, setMapFilter] = useState('Reports');
  const [selectedReportId, setSelectedReportId] = useState(null);
  
  const colors = {
    Resolved: '#22c55e', // Green
    Low: '#3b82f6', // Blue
    Medium: '#eab308', // Yellow
    High: '#f97316', // Orange
    Critical: '#ef4444' // Red
  };

  useEffect(() => {
    if (!user) return;
    
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const [stats, liveReports] = await Promise.all([
          governmentService.getDashboardKPIs(),
          governmentService.getLiveReports()
        ]);
        
        if (stats.success) {
          setKpis({
            activeComplaints: stats.activeComplaints,
            criticalIssues: stats.criticalIssues,
            resolvedThisMonth: stats.resolvedThisMonth,
            avgResponseTime: stats.avgResponseTime || 'N/A',
            avgResolutionTime: stats.avgResolutionTime || 'N/A', 
            safetyHotspots: stats.safetyHotspots
          });
        }
        
        setReports(liveReports || []);

        if (liveReports) {
          const allUpdates = liveReports.flatMap(r => 
            (r.incident_updates || []).map(u => ({
              ...u,
              reportId: r.id,
              reportTitle: r.title || r.category,
              department: r.assigned_department
            }))
          ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6);
          
          setTimeline(allUpdates);
        }

      } catch (err) {
        console.error("Failed to load government data", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadDashboardData();
    
    const reportsSub = governmentService.subscribeToReports(() => {
      loadDashboardData();
    });
    
    return () => {
      if (reportsSub) reportsSub.unsubscribe();
    };
  }, [user]);

  // Determine map markers based on filter
  const filteredMapReports = reports.filter(r => {
    if (mapFilter === 'Critical') return r.priority === 'Critical' || r.priority === 'High';
    if (mapFilter === 'Resolved') return r.status === 'Resolved';
    if (mapFilter === 'Infrastructure') return r.category.toLowerCase().includes('infrastructure') || r.category.toLowerCase().includes('broken') || r.category.toLowerCase().includes('road') || r.category.toLowerCase().includes('streetlight') || r.category.toLowerCase().includes('water');
    return r.status !== 'Resolved'; // 'Reports' defaults to active
  });

  const mapCenter = filteredMapReports.length > 0 && filteredMapReports[0].latitude 
    ? [filteredMapReports[0].latitude, filteredMapReports[0].longitude] 
    : [12.9716, 77.5946];

  const criticalReports = reports.filter(r => (r.priority === 'Critical' || r.priority === 'High') && r.status !== 'Resolved').slice(0, 4);
  const latestReports = [...reports].filter(r => r.status !== 'Resolved').sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 4);
  
  // Group reports to derive Ward Data
  const wardDataMap = {};
  reports.forEach(r => {
     if (r.status !== 'Resolved' && r.address) {
        // Simple heuristic to extract a "ward" or area name from the address string
        const parts = r.address.split(',');
        const area = parts.length > 1 ? parts[1].trim() : parts[0].trim();
        const cleanArea = area.length > 15 ? area.substring(0, 15) + '...' : area;
        
        if (!wardDataMap[cleanArea]) wardDataMap[cleanArea] = { name: cleanArea, active: 0, critical: 0 };
        wardDataMap[cleanArea].active += 1;
        if (r.priority === 'Critical' || r.priority === 'High') wardDataMap[cleanArea].critical += 1;
     }
  });
  const wardData = Object.values(wardDataMap).sort((a,b) => b.critical - a.critical).slice(0, 4);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col gap-6">
        <div className="grid grid-cols-5 gap-4 animate-pulse">
          {[1,2,3,4,5].map(i => <div key={i} className="h-[120px] glass-panel rounded-xl border border-white/5 bg-white/5"></div>)}
        </div>
        <div className="flex-1 grid grid-cols-12 gap-6 animate-pulse">
          <div className="col-span-8 h-[600px] glass-panel rounded-xl border border-white/5 bg-white/5"></div>
          <div className="col-span-4 h-[600px] glass-panel rounded-xl border border-white/5 bg-white/5"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col gap-6 overflow-y-auto custom-scrollbar animate-fade-up pb-8">
      
      {/* 3. KPI STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 shrink-0">
        <KPICard 
          title="ACTIVE REPORTS" 
          value={kpis.activeComplaints} 
          subtitle="Total pending"
          color="text-white"
        />
        <KPICard 
          title="RESOLVED" 
          value={kpis.resolvedThisMonth} 
          subtitle="This month"
          color="text-brand-neonGreen"
        />
        <KPICard 
          title="AVG RESPONSE" 
          value={kpis.avgResponseTime} 
          subtitle="Time to verify"
          color="text-brand-blue"
        />
        <KPICard 
          title="AVG RESOLUTION" 
          value={kpis.avgResolutionTime} 
          subtitle="Time to resolve"
          color="text-purple-400"
        />
        <KPICard 
          title="HOTSPOTS" 
          value={kpis.safetyHotspots} 
          subtitle="High-risk zones"
          color="text-yellow-400"
        />
      </div>

      {/* MAIN 2-COLUMN LAYOUT: Left (Map + Bottom) and Right (Live Ops) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1 items-start">
        
        {/* CENTER/LEFT ZONE: Map + Quick Actions + Recent Activity */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          
          {/* 4. MAIN COMMAND MAP */}
          <div className="glass-panel rounded-xl border border-white/10 flex flex-col overflow-hidden relative shadow-2xl h-[550px]">
            {/* Map Header */}
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-[#080c10]/80 shrink-0 z-10 backdrop-blur-md">
              <h3 className="font-bold text-white tracking-wider flex items-center gap-2">
                <MapIcon className="w-5 h-5 text-brand-blue" />
                MUNICIPAL COMMAND MAP
              </h3>
              <div className="flex items-center gap-4">
                {/* Map Controls */}
                <div className="hidden md:flex items-center gap-1 bg-black/40 rounded-lg p-1 border border-white/5">
                  {['Reports', 'Critical', 'Infrastructure', 'Resolved'].map(filter => (
                    <button 
                      key={filter}
                      onClick={() => setMapFilter(filter)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${mapFilter === filter ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs font-mono uppercase text-red-400 bg-red-400/10 px-2 py-1.5 rounded border border-red-500/20">
                  <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse"></div>
                  LIVE FEED
                </div>
              </div>
            </div>
            
            <div className="flex-1 relative z-0">
              <Map 
                initialViewState={{ longitude: mapCenter[1], latitude: mapCenter[0], zoom: 12 }}
                style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
                mapStyle="https://tiles.openfreemap.org/styles/dark"
                attributionControl={false}
              >
                {filteredMapReports.map(report => {
                  const color = report.status === 'Resolved' ? colors.Resolved : colors[report.priority] || colors.Medium;
                  const isSelected = selectedReportId === report.id;
                  
                  if (report.latitude && report.longitude) {
                    return (
                      <Marker 
                        key={report.id} 
                        longitude={report.longitude} 
                        latitude={report.latitude}
                        anchor="center"
                      >
                        <div 
                          className={`relative group cursor-pointer z-10 transition-transform ${isSelected ? 'scale-125' : 'hover:scale-110'}`} 
                          onClick={() => setSelectedReportId(isSelected ? null : report.id)}
                        >
                          <div className={`w-4 h-4 rounded-full border-[2.5px] border-[#080c10]`} style={{ backgroundColor: color, boxShadow: `0 0 ${isSelected ? '20px' : '10px'} ${color}` }}></div>
                          
                          {/* Map Popup */}
                          {(isSelected) && (
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 z-50 animate-fade-up">
                              <div className="bg-[#0f1520]/95 backdrop-blur-md border border-white/10 rounded-xl p-4 text-white w-[260px] shadow-2xl relative">
                                {/* Triangle arrow pointing down */}
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#0f1520]/95 border-b border-r border-white/10 transform rotate-45"></div>
                                
                                <div className="flex justify-between items-start mb-2">
                                  <p className="font-mono text-[10px] text-gray-500">ID: #{report.id.substring(0,8)}</p>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider" style={{ backgroundColor: `${color}33`, color: color }}>
                                    {report.priority}
                                  </span>
                                </div>
                                <p className="font-bold text-sm mb-1 line-clamp-1">{report.category}</p>
                                <p className="text-xs text-gray-400 mb-2 flex items-start gap-1">
                                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                                  <span className="line-clamp-2">{report.address}</span>
                                </p>
                                <div className="flex justify-between items-center text-[10px] font-mono text-gray-400 border-t border-white/10 pt-2 mb-3">
                                  <span className="uppercase text-yellow-500">{report.status}</span>
                                  <span>{new Date(report.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); navigate(`/government/reports/${report.id}`); }}
                                  className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-2 rounded-lg text-xs transition-colors"
                                >
                                  View Report
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </Marker>
                    );
                  }
                  return null;
                })}
              </Map>

              {/* Compact Legend */}
              <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-md border border-white/10 rounded-lg p-3 z-10">
                 <div className="flex flex-col gap-2">
                   <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div><span className="text-xs text-gray-300 font-mono">Critical</span></div>
                   <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500"></div><span className="text-xs text-gray-300 font-mono">High</span></div>
                   <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500"></div><span className="text-xs text-gray-300 font-mono">Medium</span></div>
                   <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div><span className="text-xs text-gray-300 font-mono">Resolved</span></div>
                 </div>
              </div>
            </div>
          </div>

          {/* 7. QUICK ACTIONS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QuickAction icon={List} label="VIEW LIVE REPORTS" onClick={() => navigate('/government/reports')} />
            <QuickAction icon={ActivitySquare} label="WARD MONITORING" onClick={() => navigate('/government/ward')} />
            <QuickAction icon={Bot} label="INFRASTRUCTURE" onClick={() => navigate('/government/infrastructure')} />
            <QuickAction icon={Bell} label="SEND NOTIFICATION" onClick={() => navigate('/government/notifications')} />
          </div>

          {/* 6. RECENT GOVERNMENT ACTIVITY */}
          <div className="glass-panel rounded-xl border border-white/10 flex flex-col shadow-lg overflow-hidden">
             <div className="px-6 py-4 border-b border-white/10 bg-[#080c10]/80">
               <h3 className="font-bold text-white text-sm">RECENT GOVERNMENT ACTIVITY</h3>
             </div>
             <div className="p-0 overflow-x-auto">
                {timeline.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-sm">No government activity yet.</div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/5">
                        <th className="p-3 px-6 text-xs font-mono text-gray-500 font-medium">TIME</th>
                        <th className="p-3 text-xs font-mono text-gray-500 font-medium">ACTION</th>
                        <th className="p-3 text-xs font-mono text-gray-500 font-medium">REPORT</th>
                        <th className="p-3 text-xs font-mono text-gray-500 font-medium">DEPARTMENT</th>
                        <th className="p-3 text-xs font-mono text-gray-500 font-medium">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {timeline.map((item, idx) => (
                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                          <td className="p-3 px-6 text-xs text-gray-400 font-mono">
                            {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </td>
                          <td className="p-3 text-sm text-white font-medium">{item.description}</td>
                          <td className="p-3 text-xs text-brand-blue font-mono cursor-pointer hover:underline" onClick={() => navigate(`/government/reports/${item.reportId}`)}>
                            #{item.reportId?.substring(0,6)} ({item.reportTitle})
                          </td>
                          <td className="p-3 text-xs text-gray-400">{item.department || 'Unassigned'}</td>
                          <td className="p-3">
                            <span className="text-[10px] uppercase font-bold text-yellow-500">{item.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
             </div>
          </div>
        </div>

        {/* RIGHT ZONE: LIVE OPERATIONS PANEL */}
        <div className="xl:col-span-4 flex flex-col gap-6 sticky top-6">
          
          {/* SECTION 1: CRITICAL ISSUES */}
          <div className="glass-panel rounded-xl border border-red-500/20 flex flex-col bg-[#0a0505]">
            <div className="px-5 py-3 border-b border-red-500/20 bg-red-950/20 flex justify-between items-center">
              <h3 className="font-bold text-red-500 text-sm flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" /> CRITICAL ISSUES
              </h3>
              <span className="text-xs font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded">{criticalReports.length}</span>
            </div>
            <div className="p-3 space-y-2">
              {criticalReports.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">No critical issues</p>
              ) : (
                criticalReports.map(report => (
                  <div key={report.id} className="p-3 rounded-lg border border-red-500/10 bg-white/5 hover:bg-white/10 transition-colors flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider text-red-500 bg-red-500/10 border border-red-500/20`}>
                        {report.priority}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white leading-tight">{report.category}</p>
                    <p className="text-xs text-gray-400 line-clamp-1">{report.address}</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[10px] text-yellow-500 font-mono uppercase">{report.status}</span>
                      <button onClick={() => navigate(`/government/reports/${report.id}`)} className="text-[10px] font-bold text-brand-blue hover:text-white uppercase tracking-wider flex items-center">
                        VIEW <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SECTION 2: LIVE REPORT FEED */}
          <div className="glass-panel rounded-xl border border-white/10 flex flex-col">
            <div className="px-5 py-3 border-b border-white/10 bg-[#080c10]/80">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand-blue" /> LIVE REPORT FEED
              </h3>
            </div>
            <div className="p-3 space-y-2">
              {latestReports.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">No new citizen reports</p>
              ) : (
                latestReports.map(report => (
                  <div key={report.id} className="p-3 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-colors flex flex-col gap-1 cursor-pointer" onClick={() => navigate(`/government/reports/${report.id}`)}>
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-bold text-white leading-tight">{report.category}</p>
                      <span className="text-[10px] text-gray-500 font-mono shrink-0">
                        {Math.round((new Date() - new Date(report.created_at)) / 60000)} min ago
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-1">{report.address}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SECTION 3: WARD STATUS */}
          <div className="glass-panel rounded-xl border border-white/10 flex flex-col">
            <div className="px-5 py-3 border-b border-white/10 bg-[#080c10]/80">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-neonGreen" /> WARD STATUS
              </h3>
            </div>
            <div className="p-0">
              {wardData.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">No ward data available</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="p-3 text-[10px] font-mono text-gray-500 uppercase font-medium">Ward / Area</th>
                      <th className="p-3 text-[10px] font-mono text-gray-500 uppercase font-medium text-right">Active</th>
                      <th className="p-3 text-[10px] font-mono text-gray-500 uppercase font-medium text-right">Critical</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {wardData.map((ward, i) => (
                      <tr key={i} className="hover:bg-white/5">
                        <td className="p-3 text-xs text-white font-medium">{ward.name}</td>
                        <td className="p-3 text-xs text-gray-300 font-mono text-right">{ward.active}</td>
                        <td className={`p-3 text-xs font-mono text-right font-bold ${ward.critical > 0 ? 'text-red-500' : 'text-gray-500'}`}>
                          {ward.critical}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, subtitle, color }) {
  return (
    <div className="glass-panel p-4 rounded-xl border border-white/10 flex flex-col justify-center h-[120px] bg-[#0a0f16] shadow-md">
      <h3 className="text-xs font-mono font-medium text-gray-500 mb-2 uppercase tracking-wide">{title}</h3>
      <p className={`text-3xl font-display font-bold mb-1 leading-none ${color}`}>{value}</p>
      <p className="text-[11px] text-gray-400 tracking-wide">{subtitle}</p>
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick }) {
  return (
    <button 
      onClick={onClick}
      className="glass-panel p-4 rounded-xl border border-white/10 hover:border-brand-blue/50 hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-3 bg-[#0a0f16] group"
    >
      <Icon className="w-6 h-6 text-brand-blue group-hover:scale-110 transition-transform" />
      <span className="text-[10px] font-bold text-gray-400 group-hover:text-white uppercase tracking-wider text-center">{label}</span>
    </button>
  );
}
