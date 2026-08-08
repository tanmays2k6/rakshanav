import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { governmentService } from '../../services/governmentService';
import { hazardService } from '../../services/hazardService';
import { 
  ArrowLeft, MapPin, Clock, ShieldAlert, CheckCircle2, AlertTriangle, 
  User, Image as ImageIcon, Briefcase, MessageSquare, History, Edit3, Star
} from 'lucide-react';
import Map, { Marker } from 'react-map-gl/maplibre';

export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [updating, setUpdating] = useState(false);
  
  // Action state
  const [newStatus, setNewStatus] = useState('');
  const [assignDept, setAssignDept] = useState('');
  const [notes, setNotes] = useState('');

  const DEPARTMENTS = [
    'Traffic Police',
    'Public Works (PWD)',
    'Water Board (BWSSB)',
    'Electricity Board (BESCOM)',
    'Municipal Corporation (BBMP)',
    'Emergency Services'
  ];

  const STATUSES = ['Verified', 'Assigned', 'In Progress', 'Resolved', 'Rejected'];

  const fetchReportDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('incident_reports')
        .select(`*, auth_users:user_id(id)`)
        .eq('id', id)
        .single();
        
      if (error) throw error;
      setReport(data);
      setNewStatus(data.status);
      setAssignDept(data.assigned_department || '');
      
      const updates = await hazardService.getIncidentTimeline(id);
      setTimeline(updates || []);
    } catch (err) {
      console.error("Error fetching report", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportDetails();
  }, [id]);

  const handleUpdate = async () => {
    if (!newStatus) return;
    setUpdating(true);
    try {
      const res = await governmentService.updateReportStatus(id, newStatus, assignDept, notes, user.id);
      if (res.success) {
        setNotes('');
        await fetchReportDetails(); // reload timeline and status
      } else {
        alert("Failed to update report: " + res.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Loading report details...</div>;
  }

  if (!report) {
    return <div className="p-8 text-center text-gray-400">Report not found.</div>;
  }

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'resolved': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'in progress': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'assigned': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'verified': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'rejected': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority?.toLowerCase()) {
      case 'critical': return 'text-red-500 bg-red-500/20 border border-red-500/30';
      case 'high': return 'text-orange-500 bg-orange-500/20 border border-orange-500/30';
      case 'medium': return 'text-yellow-500 bg-yellow-500/20 border border-yellow-500/30';
      default: return 'text-blue-500 bg-blue-500/20 border border-blue-500/30';
    }
  };

  return (
    <div className="w-full h-full flex flex-col gap-6 animate-fade-up overflow-y-auto custom-scrollbar">
      
      {/* Header */}
      <div className="flex items-center gap-4 shrink-0">
        <button onClick={() => navigate('/government/reports')} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors border border-white/10">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-bold text-white">Report #{report.id.substring(0, 8)}</h1>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${getStatusColor(report.status)}`}>
              {report.status}
            </span>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-sm uppercase tracking-wider ${getPriorityColor(report.priority)}`}>
              {report.priority}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
            <Clock className="w-4 h-4" /> 
            Submitted on {new Date(report.created_at).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-[600px]">
        
        {/* Left Col: Details & Image */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          
          {/* Main Info */}
          <div className="glass-panel rounded-xl border border-white/10 p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-brand-blue" />
              Incident Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-xs text-gray-500 font-mono mb-1">CATEGORY</p>
                <p className="text-white font-medium">{report.category}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-mono mb-1">LOCATION</p>
                <div className="flex items-start gap-1">
                  <MapPin className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
                  <p className="text-white font-medium">{report.address}</p>
                </div>
              </div>
              <div className="md:col-span-2 bg-black/20 p-4 rounded-xl border border-white/5">
                <p className="text-xs text-gray-500 font-mono mb-2">CITIZEN DESCRIPTION</p>
                <p className="text-gray-300 text-sm leading-relaxed">{report.description || 'No description provided by the citizen.'}</p>
              </div>
            </div>

            {report.photo_url && (
              <div>
                <p className="text-xs text-gray-500 font-mono mb-2 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> ATTACHED EVIDENCE
                </p>
                <div className="rounded-xl overflow-hidden border border-white/10">
                  <img src={report.photo_url} alt="Report Evidence" className="w-full max-h-[400px] object-cover" />
                </div>
              </div>
            )}

            {/* Citizen Feedback */}
            {report.feedback_rating && (
              <div className="mt-6 bg-brand-neonGreen/10 border border-brand-neonGreen/30 p-4 rounded-xl">
                 <h4 className="text-[11px] font-mono text-brand-neonGreen uppercase tracking-widest mb-2 flex items-center gap-1">
                   <Star className="w-3 h-3" /> Citizen Resolution Feedback
                 </h4>
                 <div className="flex gap-1 mb-2">
                    {[1,2,3,4,5].map(star => (
                      <span key={star} className={`text-lg ${star <= report.feedback_rating ? 'text-yellow-400' : 'text-gray-600'}`}>★</span>
                    ))}
                 </div>
                 {report.feedback_comment && (
                    <p className="text-sm text-gray-300 italic">"{report.feedback_comment}"</p>
                 )}
              </div>
            )}
          </div>

          {/* Map View */}
          <div className="glass-panel rounded-xl border border-white/10 flex flex-col overflow-hidden shadow-xl h-[300px]">
            <div className="px-5 py-3 border-b border-white/10 bg-black/40 shrink-0">
               <h3 className="font-semibold text-white text-sm">GEOLOCATION</h3>
            </div>
            <div className="flex-1 relative z-0">
               <Map 
                initialViewState={{ longitude: report.longitude, latitude: report.latitude, zoom: 15 }}
                style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
                mapStyle="https://tiles.openfreemap.org/styles/dark"
                attributionControl={false}
              >
                <Marker longitude={report.longitude} latitude={report.latitude} anchor="center">
                  <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.8)]">
                    <AlertTriangle className="w-3 h-3 text-white" />
                  </div>
                </Marker>
              </Map>
            </div>
          </div>
          
        </div>

        {/* Right Col: Actions & Timeline */}
        <div className="flex flex-col gap-6">
          
          {/* Government Actions */}
          <div className="glass-panel rounded-xl border border-brand-blue/30 p-6 shadow-[0_0_20px_rgba(59,130,246,0.05)] bg-[#080c10]/80">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-brand-blue" />
              Update Status
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-gray-500 mb-2">NEW STATUS</label>
                <select 
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-brand-blue outline-none"
                >
                  <option value="Pending">Pending</option>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-500 mb-2">ASSIGN DEPARTMENT</label>
                <select 
                  value={assignDept}
                  onChange={(e) => setAssignDept(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-brand-blue outline-none"
                >
                  <option value="">Select Department...</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-mono text-gray-500 mb-2">INTERNAL NOTES / RESOLUTION</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows="3"
                  placeholder="Notes for the citizen or internal record..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-brand-blue outline-none resize-none"
                ></textarea>
                <p className="text-[10px] text-brand-blue mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3" /> Citizen will be notified of this status change.
                </p>
              </div>

              <button 
                onClick={handleUpdate}
                disabled={updating}
                className="w-full bg-brand-blue hover:bg-blue-600 text-white font-bold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {updating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Save Update'}
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="glass-panel rounded-xl border border-white/10 flex flex-col flex-1 shadow-xl max-h-[500px]">
            <div className="px-5 py-4 border-b border-white/10 bg-black/40 shrink-0">
               <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                 <History className="w-4 h-4 text-brand-neonGreen" />
                 ACTION TIMELINE
               </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar relative">
              <div className="absolute left-[31px] top-5 bottom-5 w-px bg-white/10"></div>
              
              <div className="space-y-6 relative">
                {timeline.map((update, i) => (
                  <div key={update.id} className="flex gap-4 relative z-10">
                    <div className="w-8 h-8 rounded-full bg-[#080c10] border border-white/20 flex items-center justify-center shrink-0 mt-1">
                      <CheckCircle2 className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white mb-1">{update.status}</p>
                      <p className="text-xs text-gray-400 leading-relaxed bg-white/5 p-3 rounded-lg border border-white/5 mt-2">
                        {update.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500 font-mono">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(update.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Initial Submit */}
                <div className="flex gap-4 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-[#080c10] border border-brand-blue/50 flex items-center justify-center shrink-0 mt-1">
                    <User className="w-4 h-4 text-brand-blue" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white mb-1">Citizen Submitted</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500 font-mono">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(report.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
