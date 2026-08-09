import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Battery, Navigation2, Activity, Clock, MapPin } from 'lucide-react';
import Logo from '../components/Logo';

// Fix for Leaflet default icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to auto-center map when location updates
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
}

export default function PublicTracking() {
  const { token } = useParams();
  const [session, setSession] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('connecting');

  useEffect(() => {
    let subscription = null;

        const fetchSession = async () => {
      // 1. Fetch Session
      const { data: sessionDataArray, error: sessionError } = await supabase
        .rpc('get_live_session_by_token', { p_token: token });
      const sessionData = sessionDataArray?.[0];

      if (sessionError) {
        if (process.env.NODE_ENV === 'development') {
          console.error("Live Tracking Error [live_sessions]:", sessionError);
        }
        // PGRST116 is thrown when .single() finds no rows.
        if (sessionError.code === 'PGRST116') {
           setError('Tracking Inactive – Link expired or invalid');
        } else {
           setError(`Backend Error: ${sessionError.message} (${sessionError.code})`);
        }
        setLoading(false);
        return;
      }
      
      if (!sessionData) {
        setError('Link expired or invalid');
        setLoading(false);
        return;
      }

      if (!sessionData.is_active || new Date(sessionData.expires_at) < new Date()) {
        setError('This live tracking session has ended or expired.');
        setLoading(false);
        return;
      }

      setSession(sessionData);

      // 2. Fetch last 100 historical locations
      const { data: locData, error: locError } = await supabase
        .rpc('get_live_locations_by_session', { p_session_id: sessionData.id });

      if (locError && process.env.NODE_ENV === 'development') {
        console.error("Live Tracking Error [live_locations]:", locError);
      }

      if (locData && locData.length > 0) {
        setLocations(locData.reverse()); // old to new for polyline
      } else if (sessionData.last_location) {
        // Fallback to last known location if history is missing
        setLocations([sessionData.last_location]);
      }

      // 3. Subscribe to Realtime Updates
      setStatus('live');
      setLoading(false);

      subscription = supabase
        .channel(`public:live_locations:${sessionData.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'live_locations',
            filter: `session_id=eq.${sessionData.id}`
          },
          (payload) => {
            setLocations((prev) => {
              const updated = [...prev, payload.new];
              if (updated.length > 100) updated.shift();
              return updated;
            });
          }
        )
        // Also listen for session updates in case it gets disabled
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'live_sessions',
            filter: `id=eq.${sessionData.id}`
          },
          (payload) => {
            if (payload.new.is_active === false) {
               setError('This live tracking session was ended by the user.');
            }
          }
        )
        .subscribe();
    };

    fetchSession();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080c12] flex items-center justify-center font-mono text-brand-blue">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-brand-blue border-t-transparent animate-spin"></div>
          Securing Connection...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#080c12] flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-6 opacity-50 grayscale">
          <Logo size="xl" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Tracking Inactive</h2>
        <p className="text-gray-400">{error}</p>
      </div>
    );
  }

  const latest = locations[locations.length - 1];
  const center = latest ? [latest.latitude, latest.longitude] : [12.9716, 77.5946];
  const path = locations.map(l => [l.latitude, l.longitude]);

  return (
    <div className="h-screen w-full relative flex flex-col bg-[#080c12]">
      {/* HUD Header */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pointer-events-none">
        <div className="max-w-2xl mx-auto flex justify-between items-start gap-4">
          <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 pointer-events-auto flex-1 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3 mb-3">
              <Logo size="sm" />
              <div className="relative flex h-3 w-3 ml-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-neonGreen opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-neonGreen"></span>
              </div>
              <span className="text-white font-bold tracking-tight">Live Tracker</span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] font-mono text-gray-500 mb-1 flex items-center gap-1"><Activity className="w-3 h-3" /> SPEED</p>
                <p className="text-lg font-bold text-white">{latest ? (latest.speed * 3.6).toFixed(1) : '--'} <span className="text-xs font-normal text-gray-400">km/h</span></p>
              </div>
              <div>
                <p className="text-[10px] font-mono text-gray-500 mb-1 flex items-center gap-1"><Navigation2 className="w-3 h-3" /> HEADING</p>
                <p className="text-lg font-bold text-white">{latest ? Math.round(latest.heading) : '--'}°</p>
              </div>
              <div>
                <p className="text-[10px] font-mono text-gray-500 mb-1 flex items-center gap-1"><Battery className="w-3 h-3" /> BATTERY</p>
                <p className="text-lg font-bold text-white">{latest ? latest.battery : '--'}%</p>
              </div>
              <div>
                <p className="text-[10px] font-mono text-gray-500 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> UPDATED</p>
                <p className="text-sm font-bold text-white">Live via WebSockets</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Leaflet Map */}
      <div className="flex-1 w-full z-0">
        <MapContainer 
          center={center} 
          zoom={15} 
          style={{ height: '100%', width: '100%', background: '#080c12' }}
          zoomControl={false}
        >
          {/* Using a sleek dark OSM variant, CartoDB Dark Matter */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          <MapUpdater center={latest ? [latest.latitude, latest.longitude] : null} />

          {latest && (
            <>
              <Marker position={[latest.latitude, latest.longitude]} />
              <Circle 
                center={[latest.latitude, latest.longitude]} 
                radius={latest.accuracy || 20} 
                pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.2, weight: 1 }}
              />
            </>
          )}

          {path.length > 1 && (
            <Polyline 
              positions={path} 
              pathOptions={{ color: '#22c55e', weight: 4, opacity: 0.8 }} 
            />
          )}
        </MapContainer>
      </div>
      
    </div>
  );
}
