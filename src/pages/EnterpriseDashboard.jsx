import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Users, AlertTriangle, ShieldCheck, Activity, Map as MapIcon, 
  TrendingUp, Clock, Navigation, CheckCircle2, XCircle
} from 'lucide-react';
import { enterpriseService } from '../services/enterpriseService';
import Map, { Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function EnterpriseDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [kpis, setKpis] = useState({
    activeCommutes: 0,
    employees: 0,
    activeAlerts: 0,
    avgSafetyScore: null,
    incidents: 0
  });
  
  const [activeTrips, setActiveTrips] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [incidents, setIncidents] = useState([]);
  
  // Colors for Custom Markers

  const colors = {
    safe: '#22c55e',
    caution: '#eab308',
    risk: '#f97316',
    critical: '#ef4444'
  };

  useEffect(() => {
    if (!user) return;
    
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const org = await enterpriseService.getCurrentOrganization(user.id);
        if (!org || !org.id) {
           setLoading(false);
           return;
        }
        
        const orgId = org.id;
        
        const [trips, employeesCount, alertsData, avgScore, incidentsData] = await Promise.all([
          enterpriseService.getActiveCommutes(orgId),
          enterpriseService.getEmployeesCount(orgId),
          enterpriseService.getActiveAlerts(orgId),
          enterpriseService.getAverageSafetyScore(orgId),
          enterpriseService.getRecentIncidents(orgId)
        ]);
        
        setActiveTrips(trips);
        setAlerts(alertsData);
        setIncidents(incidentsData);
        
        setKpis({
          activeCommutes: trips.length,
          employees: employeesCount,
          activeAlerts: alertsData.length,
          avgSafetyScore: avgScore,
          incidents: incidentsData.length
        });
      } catch (err) {
        console.error("Failed to load enterprise data", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadDashboardData();
    
    // Subscriptions for real-time updates
    let tripsSub;
    enterpriseService.getCurrentOrganization(user.id).then(org => {
      if (!org || !org.id) return;
      tripsSub = enterpriseService.subscribeToTrips(() => {
        enterpriseService.getActiveCommutes(org.id).then(trips => {
          setActiveTrips(trips);
          setKpis(prev => ({ ...prev, activeCommutes: trips.length }));
        });
      });
    });
    
    return () => {
      if (tripsSub) tripsSub.unsubscribe();
    };
  }, [user]);

  // Determine center of map. If no trips, default to something generic (e.g. India)
  const defaultCenter = [20.5937, 78.9629]; 
  const mapCenter = activeTrips.length > 0 && activeTrips[0].source_lat 
    ? [activeTrips[0].source_lat, activeTrips[0].source_lng] 
    : defaultCenter;
  const mapZoom = activeTrips.length > 0 ? 11 : 4;

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 animate-pulse">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-28 glass-panel rounded-xl border border-white/5 bg-white/5"></div>
          ))}
        </div>
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
          <div className="lg:col-span-2 h-full glass-panel rounded-xl border border-white/5 bg-white/5"></div>
          <div className="h-full glass-panel rounded-xl border border-white/5 bg-white/5"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col gap-6 overflow-hidden">
      
      {/* KPI ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 shrink-0">
        <KPICard 
          title="Active Commutes" 
          value={kpis.activeCommutes} 
          icon={Navigation} 
          color="text-brand-blue" 
          trend="Live Updates"
          onClick={() => navigate('/enterprise/live')}
        />
        <KPICard 
          title="Employees Monitored" 
          value={kpis.employees} 
          icon={Users} 
          color="text-purple-400" 
          trend="Total enrolled"
          onClick={() => navigate('/enterprise/employees')}
        />
        <KPICard 
          title="Active Safety Alerts" 
          value={kpis.activeAlerts} 
          icon={AlertTriangle} 
          color="text-brand-orange" 
          trend={kpis.activeAlerts > 0 ? "Requires attention" : "All clear"}
          onClick={() => navigate('/enterprise/alerts')}
        />
        <KPICard 
          title="Average Safety Score" 
          value={kpis.avgSafetyScore !== null ? `${kpis.avgSafetyScore}/100` : 'N/A'} 
          icon={ShieldCheck} 
          color="text-brand-neonGreen" 
          trend="Historical average"
          onClick={() => navigate('/enterprise/analytics')}
        />
        <KPICard 
          title="Incidents This Month" 
          value={kpis.incidents} 
          icon={Activity} 
          color="text-red-400" 
          trend="Across all routes"
          onClick={() => navigate('/enterprise/incidents')}
        />
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-6 min-h-[500px]">
        
        {/* LIVE OPERATIONS MAP (Takes up 2 columns on large screens) */}
        <div className="xl:col-span-2 glass-panel rounded-xl border border-white/10 flex flex-col overflow-hidden relative">
          <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-black/20 shrink-0 z-10">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <MapIcon className="w-5 h-5 text-brand-blue" />
              LIVE COMMUTE OPERATIONS
            </h3>
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase text-green-400 bg-green-400/10 px-2 py-1 rounded">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
              Live Feed
            </div>
          </div>
          
          <div className="flex-1 relative z-0">
            {/* Map Integration */}
            <Map 
              initialViewState={{ longitude: mapCenter[1], latitude: mapCenter[0], zoom: mapZoom }}
              style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
              mapStyle="https://tiles.openfreemap.org/styles/dark"
              attributionControl={false}
            >
              {activeTrips.map(trip => {
                const isHighRisk = trip.safety_score < 70;
                const isCritical = trip.safety_score < 50;
                const color = isCritical ? colors.critical : (isHighRisk ? colors.risk : colors.safe);
                
                if (trip.source_lat && trip.source_lng) {
                  return (
                    <Marker 
                      key={trip.id} 
                      longitude={trip.source_lng} 
                      latitude={trip.source_lat}
                      anchor="center"
                    >
                      <div className="relative group cursor-pointer z-10">
                        <div className="w-4 h-4 rounded-full border-2 border-[#080c10]" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}></div>
                        
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                          <div className="bg-black/90 border border-white/10 rounded-lg p-3 text-white min-w-[180px] shadow-xl">
                            <p className="font-bold text-sm mb-1">{trip.profiles?.full_name || 'Employee'}</p>
                            <p className="text-[10px] text-gray-400 truncate max-w-[180px]">{trip.dest_address}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${isCritical ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                Score: {trip.safety_score}/100
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Marker>
                  );
                }
                return null;
              })}
            </Map>

            {/* Empty State Overlay if no active trips */}
            {activeTrips.length === 0 && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-10">
                <div className="text-center p-6 bg-black/80 rounded-xl border border-white/10 max-w-sm">
                  <Navigation className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <h4 className="text-lg font-bold text-white mb-2">No active employee commutes</h4>
                  <p className="text-sm text-gray-400 mb-4">Live employee locations will appear here when monitored commutes are active.</p>
                  <button onClick={() => navigate('/enterprise/analytics')} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                    View Commute History
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* OPERATIONS SIDE PANEL */}
        <div className="flex flex-col gap-6 overflow-hidden">
          
          {/* Currently Travelling List */}
          <div className="glass-panel rounded-xl border border-white/10 flex flex-col h-1/2">
            <div className="px-5 py-3 border-b border-white/10 bg-black/20 shrink-0">
              <h3 className="font-semibold text-white text-sm">CURRENTLY TRAVELLING</h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
              {activeTrips.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-4 text-center">
                  <Clock className="w-8 h-8 text-gray-600 mb-2" />
                  <p className="text-sm text-gray-500">No active trips at the moment.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeTrips.map(trip => (
                    <div key={trip.id} className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group" onClick={() => navigate('/enterprise/live')}>
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-sm text-white">{trip.profiles?.full_name || 'Employee'}</span>
                        <span className="text-[10px] font-mono bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">EN ROUTE</span>
                      </div>
                      <p className="text-xs text-gray-400 truncate w-[200px] mb-2">{trip.dest_address}</p>
                      <div className="w-full bg-black/50 rounded-full h-1.5">
                        <div className="bg-brand-blue h-1.5 rounded-full" style={{ width: '60%' }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Alert Center / Incidents */}
          <div className="glass-panel rounded-xl border border-white/10 flex flex-col h-1/2">
            <div className="px-5 py-3 border-b border-white/10 bg-black/20 shrink-0 flex justify-between items-center">
              <h3 className="font-semibold text-white text-sm">ALERT CENTER</h3>
              <button onClick={() => navigate('/enterprise/alerts')} className="text-xs text-brand-blue hover:text-white transition-colors">View All</button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
              {alerts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-4 text-center">
                  <CheckCircle2 className="w-8 h-8 text-gray-600 mb-2" />
                  <p className="text-sm text-gray-500">Your organization currently has no unresolved safety alerts.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {alerts.map(alert => (
                    <div key={alert.id} className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 cursor-pointer hover:bg-red-500/10 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-xs text-red-400 uppercase">{alert.type}</span>
                        <span className="text-[10px] text-gray-500">{new Date(alert.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm text-white">{alert.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{alert.profiles?.full_name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
      
    </div>
  );
}

function KPICard({ title, value, icon: Icon, color, trend, onClick }) {
  return (
    <div 
      onClick={onClick}
      className="glass-panel p-5 rounded-xl border border-white/5 hover:border-white/20 transition-all cursor-pointer flex flex-col relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full -mr-4 -mt-4 opacity-50 group-hover:scale-110 transition-transform"></div>
      
      <div className={`flex items-center gap-3 ${color} mb-3 relative z-10`}>
        <Icon className="w-5 h-5" />
        <h3 className="font-semibold text-gray-300 text-sm whitespace-nowrap">{title}</h3>
      </div>
      
      <p className="text-3xl font-display font-bold text-white relative z-10 mb-1">{value}</p>
      
      <p className="text-[11px] text-gray-500 uppercase tracking-wider font-mono relative z-10">{trend}</p>
    </div>
  );
}
