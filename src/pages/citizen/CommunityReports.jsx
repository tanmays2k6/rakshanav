import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { hazardService } from '../../services/hazardService';
import { 
  ShieldAlert, CheckCircle2, Clock, MapPin, Search, Filter, AlertTriangle, 
  ThumbsUp, ThumbsDown, MessageSquare, Navigation, Info, X, ChevronRight, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const defaultMarker = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

export default function CommunityReports() {
  const { user } = useAuth();
  
  // State
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, resolved: 0, critical: 0, today: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [viewMode, setViewMode] = useState('all'); // 'all', 'my'
  
  // Details Modal
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [incidentTimeline, setIncidentTimeline] = useState([]);
  const [incidentComments, setIncidentComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [userVote, setUserVote] = useState(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Initial Load
  useEffect(() => {
    fetchInitialData();
    if (navigator.geolocation) {
       navigator.geolocation.getCurrentPosition(pos => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
       });
    }
    
    // Subscribe to realtime updates
    const unsub = hazardService.subscribeToReports((payload) => {
       fetchInitialData(); // Re-fetch on any change to keep it simple for now
    });

    return () => unsub();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    const [fetchedReports, fetchedStats] = await Promise.all([
      hazardService.getReports(),
      hazardService.getReportStats()
    ]);
    setReports(fetchedReports || []);
    if (fetchedStats.success) setStats(fetchedStats);
    setIsLoading(false);
  };

  // Distance Calculator
  const getDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const dist = R * c;
    return dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`;
  };

  const getTimeAgo = (dateStr) => {
    const diff = Math.floor((new Date() - new Date(dateStr)) / 1000 / 60);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
    return `${Math.floor(diff/1440)}d ago`;
  };

  // Filter Logic
  const filteredReports = reports.filter(r => {
     if (viewMode === 'my' && r.user_id !== user?.id) return false;
     if (filterCategory !== 'All' && r.category !== filterCategory) return false;
     if (filterStatus !== 'All' && r.status !== filterStatus) return false;
     
     if (debouncedSearch) {
       const term = debouncedSearch.toLowerCase();
       return (
         (r.title && r.title.toLowerCase().includes(term)) ||
         (r.description && r.description.toLowerCase().includes(term)) ||
         (r.address && r.address.toLowerCase().includes(term)) ||
         (r.category && r.category.toLowerCase().includes(term))
       );
     }
     return true;
  });

  // Open Details Modal
  const openDetails = async (incident) => {
    setSelectedIncident(incident);
    const [timeline, comments, vote] = await Promise.all([
      hazardService.getIncidentTimeline(incident.id),
      hazardService.getIncidentComments(incident.id),
      user ? hazardService.getUserVote(incident.id, user.id) : null
    ]);
    setIncidentTimeline(timeline || []);
    setIncidentComments(comments || []);
    setUserVote(vote);
  };

  const handleVote = async (type) => {
    if (!user) return alert("You must be logged in to vote.");
    if (userVote === type) return; // Already voted this
    
    // Optimistic update
    const prevVote = userVote;
    setUserVote(type);
    
    const res = await hazardService.voteOnIncident(selectedIncident.id, user.id, type);
    if (!res.success) {
       setUserVote(prevVote); // revert
       alert("Failed to register vote.");
    }
  };

  const handleComment = async () => {
    if (!user) return alert("You must be logged in to comment.");
    if (!newComment.trim()) return;
    
    setIsSubmittingComment(true);
    const res = await hazardService.addComment(selectedIncident.id, user.id, newComment);
    if (res.success) {
       setNewComment('');
       const comments = await hazardService.getIncidentComments(selectedIncident.id);
       setIncidentComments(comments);
    } else {
       alert("Failed to post comment.");
    }
    setIsSubmittingComment(false);
  };

  const getStatusStyle = (status) => {
    switch(status) {
      case 'Resolved': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'Verified': return 'bg-blue-500/10 text-brand-blue border-blue-500/20';
      case 'In Progress': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'Rejected': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-up max-w-[1600px] mx-auto w-full relative pb-10">
      
      {/* HEADER & STATS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-6">
        <div>
           <h2 className="text-32 font-display font-black text-white tracking-tight flex items-center gap-3">
             <Activity className="w-8 h-8 text-brand-blue" />
             Community Incident Feed
           </h2>
           <p className="text-gray-400 mt-1 max-w-xl">Live, public safety reports generated by the community. Stay informed about active hazards around your city.</p>
        </div>
        
        <div className="flex gap-4 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
           <StatCard label="Total Reports" value={stats.total} icon={<MapPin className="w-4 h-4 text-gray-400" />} />
           <StatCard label="Active" value={stats.active} icon={<AlertTriangle className="w-4 h-4 text-orange-400" />} color="text-orange-400" />
           <StatCard label="Critical" value={stats.critical} icon={<ShieldAlert className="w-4 h-4 text-red-400" />} color="text-red-400" />
           <StatCard label="Resolved" value={stats.resolved} icon={<CheckCircle2 className="w-4 h-4 text-green-400" />} color="text-green-400" />
        </div>
      </div>

      {/* SEARCH & FILTERS */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search incident title, category, address..." 
            className="w-full pl-11 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 outline-none focus:border-brand-blue transition-colors"
          />
        </div>
        
        <div className="flex gap-2">
           <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-blue appearance-none">
             <option value="All">All Categories</option>
             <option value="Streetlight">Streetlight</option>
             <option value="Road Damage">Road Damage</option>
             <option value="Garbage">Garbage</option>
             <option value="Flooding">Flooding</option>
             <option value="Crime">Crime</option>
             <option value="Traffic">Traffic</option>
             <option value="Accident">Accident</option>
             <option value="Construction">Construction</option>
           </select>
           
           <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-blue appearance-none">
             <option value="All">All Statuses</option>
             <option value="Pending">Pending</option>
             <option value="Verified">Verified</option>
             <option value="In Progress">In Progress</option>
             <option value="Resolved">Resolved</option>
           </select>
           
           <div className="flex bg-black/40 border border-white/10 rounded-xl p-1">
              <button onClick={() => setViewMode('all')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${viewMode === 'all' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}>All</button>
              <button onClick={() => setViewMode('my')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${viewMode === 'my' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}>Mine</button>
           </div>
        </div>
      </div>

      {/* MAIN CONTENT: SPLIT VIEW (MAP + FEED) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1 min-h-[600px]">
         
         {/* Live Map (5 cols) */}
         <div className="xl:col-span-5 h-[300px] xl:h-full rounded-2xl overflow-hidden border border-white/10 relative bg-[#050505]">
            <MapContainer center={userLocation ? [userLocation.lat, userLocation.lng] : [12.9716, 77.5946]} zoom={12} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              {userLocation && (
                 <Circle center={[userLocation.lat, userLocation.lng]} radius={200} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.2 }} />
              )}
              {filteredReports.map(r => (
                <Marker key={r.id} position={[r.latitude, r.longitude]} icon={defaultMarker}>
                  <Popup className="custom-popup">
                     <div className="font-bold text-gray-800">{r.title}</div>
                     <div className="text-xs text-gray-500 mt-1">{r.status}</div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
            <div className="absolute top-4 left-4 z-[1000] bg-black/80 backdrop-blur border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-brand-blue animate-pulse"></div>
               <span className="text-[10px] text-white font-mono tracking-widest uppercase">Live Feed Map</span>
            </div>
         </div>

         {/* Incident Feed (7 cols) */}
         <div className="xl:col-span-7 flex flex-col bg-black/20 rounded-2xl border border-white/5 p-2 overflow-hidden h-[600px] xl:h-full">
            <div className="overflow-y-auto custom-scrollbar p-2 space-y-4">
               {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-50 py-20">
                     <Clock className="w-10 h-10 text-gray-500 animate-spin mb-4" />
                     <p className="text-gray-400 font-mono text-sm">Synchronizing Database...</p>
                  </div>
               ) : filteredReports.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-20 bg-white/5 rounded-xl border border-dashed border-white/10">
                     <ShieldAlert className="w-16 h-16 text-gray-600 mb-4" />
                     <h3 className="text-xl font-bold text-white mb-2">No Reports Found</h3>
                     <p className="text-sm text-gray-400 max-w-sm">No incidents match your current filters. If you see something, report it to keep the community safe.</p>
                  </div>
               ) : (
                  filteredReports.map((report) => (
                     <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={report.id} 
                        className="glass-panel p-5 cursor-pointer hover:bg-white/5 transition-colors group relative overflow-hidden"
                        onClick={() => openDetails(report)}
                     >
                        {report.severity === 'Critical' && <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>}
                        <div className="flex justify-between items-start mb-3">
                           <div className="flex items-center gap-3">
                              <div className={`p-2.5 rounded-xl ${getStatusStyle(report.status).split(' ')[0]}`}>
                                 <AlertTriangle className={`w-5 h-5 ${getStatusStyle(report.status).split(' ')[1]}`} />
                              </div>
                              <div>
                                 <h3 className="font-bold text-white text-[15px] group-hover:text-brand-blue transition-colors">{report.title}</h3>
                                 <p className="text-xs text-gray-400 font-mono mt-1 flex items-center gap-1.5">
                                    <MapPin className="w-3 h-3" /> {report.address || report.city || 'Location Logged'}
                                    {userLocation && (
                                       <>
                                         <span className="mx-1">•</span>
                                         <Navigation className="w-3 h-3" /> {getDistance(userLocation.lat, userLocation.lng, report.latitude, report.longitude)}
                                       </>
                                    )}
                                 </p>
                              </div>
                           </div>
                           <div className={`px-2.5 py-1 flex items-center gap-1.5 rounded-full border text-[10px] font-black tracking-widest uppercase ${getStatusStyle(report.status)}`}>
                              {report.status}
                           </div>
                        </div>

                        <div className="flex justify-between items-end mt-4 pt-4 border-t border-white/5">
                           <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
                              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> {getTimeAgo(report.created_at)}</span>
                              <span className="flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5"/> {report.upvotes || 0}</span>
                              <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5"/> {report.comments_count || 0}</span>
                           </div>
                           <div className="flex items-center gap-1 text-xs text-brand-blue font-bold opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                              View Intel <ChevronRight className="w-4 h-4" />
                           </div>
                        </div>
                     </motion.div>
                  ))
               )}
            </div>
         </div>
      </div>

      {/* DETAILS MODAL / DRAWER */}
      <AnimatePresence>
         {selectedIncident && (
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex justify-end"
               onClick={() => setSelectedIncident(null)}
            >
               <motion.div 
                  initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="w-full max-w-2xl bg-[#080c12] h-full border-l border-white/10 flex flex-col shadow-2xl"
                  onClick={e => e.stopPropagation()}
               >
                  {/* Modal Header */}
                  <div className="p-6 border-b border-white/5 flex justify-between items-start bg-black/40">
                     <div>
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black tracking-widest uppercase mb-3 ${getStatusStyle(selectedIncident.status)}`}>
                           {selectedIncident.status}
                        </div>
                        <h2 className="text-2xl font-black text-white">{selectedIncident.title}</h2>
                        <p className="text-xs text-gray-400 font-mono mt-2 flex items-center gap-2">
                           <MapPin className="w-3.5 h-3.5" /> {selectedIncident.address || selectedIncident.city}
                        </p>
                     </div>
                     <button onClick={() => setSelectedIncident(null)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 transition-colors">
                        <X className="w-5 h-5" />
                     </button>
                  </div>

                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                     
                     {/* Image if exists */}
                     {selectedIncident.photo_url && (
                        <div className="w-full h-64 rounded-xl overflow-hidden border border-white/10">
                           <img src={selectedIncident.photo_url} alt="Incident" className="w-full h-full object-cover" />
                        </div>
                     )}

                     {/* Description */}
                     <div>
                        <h4 className="text-[11px] font-mono text-gray-500 uppercase tracking-widest mb-2">Description</h4>
                        <p className="text-sm text-gray-300 leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5">
                           {selectedIncident.description || 'No description provided.'}
                        </p>
                     </div>

                     {/* Stats & Voting */}
                     <div className="flex items-center gap-4 bg-black/40 p-4 rounded-xl border border-white/5">
                        <button 
                           onClick={() => handleVote('confirm')}
                           className={`flex flex-col items-center justify-center px-6 py-2 rounded-lg border transition-colors ${userVote === 'confirm' ? 'bg-brand-blue/20 border-brand-blue text-brand-blue' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
                        >
                           <ThumbsUp className="w-5 h-5 mb-1" />
                           <span className="text-xs font-bold">{selectedIncident.upvotes || 0} Confirm</span>
                        </button>
                        <button 
                           onClick={() => handleVote('reject')}
                           className={`flex flex-col items-center justify-center px-6 py-2 rounded-lg border transition-colors ${userVote === 'reject' ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
                        >
                           <ThumbsDown className="w-5 h-5 mb-1" />
                           <span className="text-xs font-bold">{selectedIncident.downvotes || 0} Not Present</span>
                        </button>
                     </div>

                     {/* Timeline */}
                     <div>
                        <h4 className="text-[11px] font-mono text-gray-500 uppercase tracking-widest mb-4">Action Timeline</h4>
                        {incidentTimeline.length === 0 ? (
                           <p className="text-xs text-gray-500 italic">No updates available yet.</p>
                        ) : (
                           <div className="space-y-4 before:absolute before:inset-0 before:ml-2.5 before:w-px before:bg-gradient-to-b before:from-white/20 before:to-transparent relative pl-8">
                              {incidentTimeline.map((step, idx) => (
                                 <div key={step.id} className="relative">
                                    <div className={`absolute -left-[37px] top-1 w-3 h-3 rounded-full border-2 border-[#080c12] z-10 ${idx === 0 ? 'bg-brand-blue' : 'bg-gray-600'}`}>
                                       {idx === 0 && <div className="absolute inset-[-4px] rounded-full border border-brand-blue/30 animate-ping"></div>}
                                    </div>
                                    <p className="text-sm font-bold text-white">{step.status}</p>
                                    {step.description && <p className="text-xs text-gray-400 mt-1">{step.description}</p>}
                                    <p className="text-[10px] font-mono text-gray-500 mt-1">{new Date(step.created_at).toLocaleString()}</p>
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>

                     {/* Comments */}
                     <div>
                        <h4 className="text-[11px] font-mono text-gray-500 uppercase tracking-widest mb-4">Community Discussion ({incidentComments.length})</h4>
                        
                        <div className="flex gap-2 mb-6">
                           <input 
                              type="text" 
                              value={newComment}
                              onChange={e=>setNewComment(e.target.value)}
                              placeholder="Add a comment or update..." 
                              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white outline-none focus:border-brand-blue transition-colors"
                           />
                           <button onClick={handleComment} disabled={isSubmittingComment} className="bg-brand-blue hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors">
                              Post
                           </button>
                        </div>

                        <div className="space-y-3">
                           {incidentComments.length === 0 ? (
                              <p className="text-xs text-gray-500 italic text-center py-4 bg-white/5 rounded-xl border border-dashed border-white/10">No comments yet. Be the first to provide intel.</p>
                           ) : (
                              incidentComments.map(comment => (
                                 <div key={comment.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                                    <div className="flex justify-between items-center mb-2">
                                       <span className="text-xs font-bold text-brand-blue">Citizen #{comment.user_id.substring(0,5)}</span>
                                       <span className="text-[10px] font-mono text-gray-500">{getTimeAgo(comment.created_at)}</span>
                                    </div>
                                    <p className="text-sm text-gray-300">{comment.content}</p>
                                 </div>
                              ))
                           )}
                        </div>
                     </div>
                  </div>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>

    </div>
  );
}

// Subcomponent for Stats
function StatCard({ label, value, icon, color = 'text-white' }) {
   return (
      <div className="bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col justify-center min-w-[140px] shrink-0">
         <div className="flex items-center gap-2 mb-2">
            {icon}
            <span className="text-[11px] font-mono text-gray-500 uppercase tracking-widest">{label}</span>
         </div>
         <span className={`text-2xl font-black ${color}`}>{value}</span>
      </div>
   );
}
