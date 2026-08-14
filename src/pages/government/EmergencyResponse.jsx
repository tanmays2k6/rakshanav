import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldAlert, MapPin, Clock, CheckCircle, Navigation, AlertTriangle } from 'lucide-react';
import { governmentService } from '../../services/governmentService';
import CommandMap from '../../components/government/maps/CommandMap';
import { Marker } from 'react-map-gl/maplibre';

export default function EmergencyResponse() {
  const { user } = useAuth();
  const [sosEvents, setSosEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    fetchSosEvents();
    // In a real scenario, we'd add a Realtime subscription here
    const interval = setInterval(fetchSosEvents, 10000); // Poll every 10s for demo
    return () => clearInterval(interval);
  }, []);

  const fetchSosEvents = async () => {
    try {
      const data = await governmentService.getActiveSosEvents();
      setSosEvents(data || []);
      if (!selectedEvent && data && data.length > 0) {
        setSelectedEvent(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEvent = async (evt) => {
    setSelectedEvent(evt);
    // Audit Log the sensitive action
    await governmentService.logAudit(
      user.id,
      'VIEW_EMERGENCY_LOCATION',
      'sos_events',
      evt.id,
      { reason: 'Active emergency monitoring' }
    );
  };

  const mapCenter = selectedEvent?.latitude && selectedEvent?.longitude 
    ? [selectedEvent.latitude, selectedEvent.longitude] 
    : [12.9716, 77.5946];

  if (loading) {
    return <div className="h-full flex items-center justify-center text-white">Loading Emergency Data...</div>;
  }

  return (
    <div className="w-full h-full flex flex-col gap-6 animate-fade-up">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-display text-white flex items-center gap-3">
            <ShieldAlert className="text-red-500 w-8 h-8 animate-pulse" />
            Emergency Response Center
          </h1>
          <p className="text-gray-400 mt-1">Real-time SOS and Critical Incident Tracking</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-lg flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <span className="font-mono text-red-400 font-bold uppercase tracking-wider text-sm">
            {sosEvents.length} Active Emergencies
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* Left List */}
        <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          {sosEvents.length === 0 ? (
            <div className="glass-panel p-8 text-center text-gray-500 rounded-xl border border-white/5">
              No active emergencies at this time.
            </div>
          ) : (
            sosEvents.map(evt => (
              <div 
                key={evt.id}
                onClick={() => handleSelectEvent(evt)}
                className={`glass-panel p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedEvent?.id === evt.id 
                    ? 'bg-red-500/10 border-red-500/50' 
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-red-500/30'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                    SOS ALERT
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {new Date(evt.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <h3 className="font-bold text-white font-mono text-sm truncate">Session #{evt.id.substring(0,8)}</h3>
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <UserIcon className="w-3 h-3" /> Anonymous Citizen
                </p>
              </div>
            ))
          )}
        </div>

        {/* Right Map & Details */}
        <div className="lg:col-span-8 flex flex-col gap-6 h-full">
          {selectedEvent ? (
            <>
              <div className="h-[400px] rounded-xl overflow-hidden shadow-2xl relative border border-white/10">
                 <CommandMap center={mapCenter} zoom={15}>
                    {selectedEvent.latitude && (
                      <Marker longitude={selectedEvent.longitude} latitude={selectedEvent.latitude}>
                        <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-pulse flex items-center justify-center">
                          <ShieldAlert className="w-3 h-3 text-white" />
                        </div>
                      </Marker>
                    )}
                 </CommandMap>
              </div>

              <div className="glass-panel p-6 rounded-xl border border-white/10 bg-[#080c10]/80">
                <h2 className="text-lg font-bold text-white mb-4">Emergency Details</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase text-gray-500 font-mono">Status</span>
                    <span className="text-red-400 font-bold uppercase">{selectedEvent.status}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase text-gray-500 font-mono">Time Since Alert</span>
                    <span className="text-white font-bold">{Math.floor((new Date() - new Date(selectedEvent.created_at)) / 60000)} mins</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase text-gray-500 font-mono">Accuracy</span>
                    <span className="text-white font-bold">±{selectedEvent.accuracy ? Math.round(selectedEvent.accuracy) : '?'} m</span>
                  </div>
                </div>

                <div className="flex gap-4 border-t border-white/10 pt-4">
                  <button className="flex-1 bg-brand-blue hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                    <Navigation className="w-4 h-4" /> Dispatch Responder
                  </button>
                  <button className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Mark Resolved
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full glass-panel rounded-xl border border-white/10 flex flex-col items-center justify-center text-gray-500 gap-4">
               <ShieldAlert className="w-12 h-12 text-gray-600" />
               <p>Select an emergency to view details</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function UserIcon(props) {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
