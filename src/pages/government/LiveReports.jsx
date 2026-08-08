import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Search, Filter, MapPin, Clock, ShieldAlert, ChevronRight, CheckCircle2,
  AlertTriangle, Info
} from 'lucide-react';
import { governmentService } from '../../services/governmentService';

export default function LiveReports() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = searchParams.get('filter') || 'all';
  
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [activeFilter, setActiveFilter] = useState(initialFilter); // all, new, critical, resolved
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) return;
    
    const loadReports = async () => {
      setLoading(true);
      try {
        let filters = {};
        if (activeFilter === 'new') filters.status = 'Pending';
        if (activeFilter === 'critical') filters.priority = ['High', 'Critical'];
        if (activeFilter === 'resolved') filters.status = 'Resolved';
        
        const data = await governmentService.getLiveReports(filters);
        setReports(data || []);
      } catch (err) {
        console.error("Failed to load reports", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadReports();
    
    const sub = governmentService.subscribeToReports(() => {
      loadReports();
    });
    
    return () => {
      if (sub) sub.unsubscribe();
    };
  }, [user, activeFilter]);

  const handleFilterClick = (filterId) => {
    setActiveFilter(filterId);
    if (filterId === 'all') {
      searchParams.delete('filter');
    } else {
      searchParams.set('filter', filterId);
    }
    setSearchParams(searchParams);
  };

  const filteredReports = reports.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.id.toLowerCase().includes(q) || 
      r.category.toLowerCase().includes(q) || 
      r.address.toLowerCase().includes(q)
    );
  });

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'resolved': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'in progress': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'assigned': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'verified': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'rejected': return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      default: return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'; // Pending
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority?.toLowerCase()) {
      case 'critical': return 'text-red-500 bg-red-500/10';
      case 'high': return 'text-orange-500 bg-orange-500/10';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10';
      default: return 'text-blue-500 bg-blue-500/10';
    }
  };

  return (
    <div className="w-full h-full flex flex-col gap-6 animate-fade-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-brand-blue" />
            Live Citizen Reports
          </h1>
          <p className="text-sm text-gray-400 mt-1">Real-time overview of infrastructure and safety complaints.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search reports..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-brand-blue/50 transition-colors"
            />
          </div>
          <button className="p-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-white/10 pb-4 shrink-0 overflow-x-auto custom-scrollbar">
        {[
          { id: 'all', label: 'All Reports' },
          { id: 'new', label: 'New / Pending' },
          { id: 'critical', label: 'High / Critical' },
          { id: 'resolved', label: 'Resolved' }
        ].map(filter => (
          <button
            key={filter.id}
            onClick={() => handleFilterClick(filter.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              activeFilter === filter.id 
                ? 'bg-brand-blue text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="flex-1 glass-panel rounded-xl border border-white/10 overflow-hidden flex flex-col shadow-2xl">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin"></div>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <CheckCircle2 className="w-16 h-16 text-gray-600 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No Reports Found</h3>
              <p className="text-gray-400 max-w-md">There are no citizen reports matching your current filters. Everything looks good!</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-black/40">
                  <th className="p-4 text-xs font-mono text-gray-500 font-medium tracking-wider whitespace-nowrap">REPORT ID</th>
                  <th className="p-4 text-xs font-mono text-gray-500 font-medium tracking-wider">CATEGORY & LOCATION</th>
                  <th className="p-4 text-xs font-mono text-gray-500 font-medium tracking-wider">PRIORITY</th>
                  <th className="p-4 text-xs font-mono text-gray-500 font-medium tracking-wider">STATUS</th>
                  <th className="p-4 text-xs font-mono text-gray-500 font-medium tracking-wider">SUBMITTED</th>
                  <th className="p-4 text-xs font-mono text-gray-500 font-medium tracking-wider text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredReports.map(report => (
                  <tr key={report.id} onClick={() => navigate(`/government/reports/${report.id}`)} className="hover:bg-white/5 transition-colors cursor-pointer group">
                    <td className="p-4">
                      <span className="text-xs font-mono text-brand-blue bg-brand-blue/10 px-2 py-1 rounded">
                        #{report.id.substring(0, 8)}
                      </span>
                    </td>
                    <td className="p-4 min-w-[250px]">
                      <p className="font-bold text-white text-sm mb-1">{report.category}</p>
                      <div className="flex items-start gap-1 text-xs text-gray-400">
                        <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-500" />
                        <span className="line-clamp-1">{report.address}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-sm uppercase tracking-wider ${getPriorityColor(report.priority)}`}>
                        {report.priority}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider whitespace-nowrap ${getStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                      {report.assigned_department && (
                        <p className="text-[10px] text-gray-500 mt-1">{report.assigned_department}</p>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-xs text-gray-300">
                        <Clock className="w-3.5 h-3.5 text-gray-500" />
                        {new Date(report.created_at).toLocaleDateString()}
                      </div>
                      <p className="text-[10px] text-gray-500 ml-5 mt-0.5">
                        {new Date(report.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </td>
                    <td className="p-4 text-right">
                      <button className="p-2 rounded-lg bg-white/5 text-gray-400 group-hover:bg-brand-blue group-hover:text-white transition-all shadow-sm">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
