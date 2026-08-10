import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Battery, Navigation2, Activity, Clock } from 'lucide-react';
import Logo from '../components/Logo';

// Fix for Leaflet default icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to auto-center map when location updates
function MapUpdater({ center, autoFollow, onDrag }) {
  const map = useMap();
  useEffect(() => {
    if (center && autoFollow) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, autoFollow, map]);

  useEffect(() => {
    const handleDragStart = () => onDrag();
    map.on('dragstart', handleDragStart);
    return () => {
      map.off('dragstart', handleDragStart);
    };
  }, [map, onDrag]);

  return null;
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("PublicTracking Error Boundary Caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#080c12] flex flex-col items-center justify-center p-6 text-center">
          <div className="mb-6 opacity-50 grayscale">
            <Logo size="xl" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">RakshaNav Live Tracking</h2>
          <p className="text-gray-400 mb-6">Something went wrong while loading this tracking session.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-brand-blue hover:bg-blue-600 text-white px-6 py-2 rounded-full font-bold shadow-lg transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function PublicTrackingInner() {
  const { trackingToken } = useParams();
  const [session, setSession] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [autoFollow, setAutoFollow] = useState(true);

  useEffect(() => {
    let subscription = null;

    if (!trackingToken) {
      setError('Tracking Link Invalid');
      setLoading(false);
      return;
    }

    const fetchSession = async () => {
      let sessionData = null;

      try {
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_live_session_by_token', { p_token: trackingToken });
        if (!rpcError && rpcData && rpcData.length > 0) {
          sessionData = rpcData[0];
        }
      } catch (e) {
        console.warn('[PublicTracking] RPC lookup warning, trying table fallback:', e);
      }

      if (!sessionData) {
        // Fallback SELECT directly from live_sessions table
        const { data: directData } = await supabase
          .from('live_sessions')
          .select('*')
          .eq('share_token', trackingToken)
          .maybeSingle();
        sessionData = directData;
      }
      
      if (!sessionData) {
        setError('Tracking Link Invalid');
        setLoading(false);
        return;
      }

      if (!sessionData.is_active) {
        setError('Tracking Ended');
        setLoading(false);
        return;
      }
      
      if (sessionData.expires_at && new Date(sessionData.expires_at) <= new Date()) {
        setError('Tracking Session Expired');
        setLoading(false);
        return;
      }

      setSession(sessionData);

      // 2. Fetch last 100 historical locations
      let locData = null;
      try {
        const { data: rpcLocs } = await supabase
          .rpc('get_live_locations_by_session', { p_session_id: sessionData.id });
        locData = rpcLocs;
      } catch(e) {}

      if (!locData || locData.length === 0) {
        const { data: directLocs } = await supabase
          .from('live_locations')
          .select('*')
          .eq('session_id', sessionData.id)
          .order('timestamp', { ascending: false })
          .limit(100);
        locData = directLocs;
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
               setError('Tracking Ended');
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
  }, [trackingToken]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080c12] flex flex-col items-center justify-center p-6 text-center font-mono text-brand-blue">
        <div className="mb-6 opacity-50 grayscale">
          <Logo size="xl" />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-brand-blue border-t-transparent animate-spin"></div>
          Connecting to RakshaNav Live Tracking...
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
        <h2 className="text-2xl font-bold text-white mb-2">{error}</h2>
        <p className="text-gray-400 text-sm max-w-md mb-6">
          {error === 'Tracking Session Expired' ? 'The live sharing period has ended.' :
           error === 'Tracking Ended' ? 'The owner has stopped live sharing.' :
           'This tracking link does not exist or is no longer available.'}
        </p>
        <button onClick={() => window.location.href = '/'} className="px-6 py-2 bg-brand-blue hover:bg-blue-600 text-white rounded-full font-bold text-sm transition-colors shadow-lg shadow-brand-blue/20">
          Go to RakshaNav
        </button>
      </div>
    );
  }

  const latest = locations[locations.length - 1];
  
  // Safe checks for map rendering
  const hasValidLocation = latest && typeof latest.latitude === 'number' && typeof latest.longitude === 'number';
  const center = hasValidLocation ? [latest.latitude, latest.longitude] : null;
  const path = locations.filter(l => l && typeof l.latitude === 'number' && typeof l.longitude === 'number').map(l => [l.latitude, l.longitude]);
  
  // Safe accessors for HUD
  const speedDisplay = (latest && typeof latest.speed === 'number') ? (latest.speed * 3.6).toFixed(1) : '--';
  const headingDisplay = (latest && typeof latest.heading === 'number') ? Math.round(latest.heading) + '°' : '--';
  const batteryDisplay = (latest && typeof latest.battery === 'number') ? latest.battery + '%' : '--';
  const accuracyDisplay = (latest && typeof latest.accuracy === 'number') ? `±${Math.round(latest.accuracy)}m` : '';

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
              <span className="text-white font-bold tracking-tight">Live Tracking Active</span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] font-mono text-gray-500 mb-1 flex items-center gap-1"><Activity className="w-3 h-3" /> SPEED</p>
                <p className="text-lg font-bold text-white">{speedDisplay} <span className="text-xs font-normal text-gray-400">km/h</span></p>
              </div>
              <div>
                <p className="text-[10px] font-mono text-gray-500 mb-1 flex items-center gap-1"><Navigation2 className="w-3 h-3" /> HEADING</p>
                <p className="text-lg font-bold text-white">{headingDisplay}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono text-gray-500 mb-1 flex items-center gap-1"><Battery className="w-3 h-3" /> BATTERY</p>
                <p className="text-lg font-bold text-white">{batteryDisplay}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono text-gray-500 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> UPDATED</p>
                <p className="text-sm font-bold text-white">Live <span className="text-xs font-normal text-gray-400">{accuracyDisplay}</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full z-0 relative flex items-center justify-center bg-[#080c12]">
        {!hasValidLocation ? (
          <div className="text-white opacity-80 font-mono flex flex-col items-center gap-4">
            <div className="w-8 h-8 rounded-full border-2 border-brand-blue border-t-transparent animate-spin"></div>
            Waiting for the user's GPS location...
          </div>
        ) : (
          <MapContainer 
            center={center} 
            zoom={15} 
            style={{ height: '100%', width: '100%', background: '#080c12' }}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            <MapUpdater 
              center={center} 
              autoFollow={autoFollow}
              onDrag={() => setAutoFollow(false)}
            />

            {!autoFollow && (
              <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
                <button 
                  onClick={() => setAutoFollow(true)}
                  className="bg-brand-blue hover:bg-blue-600 text-white px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 pointer-events-auto transition-colors"
                >
                  <Navigation2 className="w-4 h-4" /> Recenter
                </button>
              </div>
            )}

            <Marker position={center} />
            <Circle 
              center={center} 
              radius={latest.accuracy || 20} 
              pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.2, weight: 1 }}
            />

            {path.length > 1 && (
              <Polyline 
                positions={path} 
                pathOptions={{ color: '#22c55e', weight: 4, opacity: 0.8 }} 
              />
            )}
          </MapContainer>
        )}
      </div>
      
    </div>
  );
}

export default function PublicTracking() {
  return (
    <ErrorBoundary>
      <PublicTrackingInner />
    </ErrorBoundary>
  );
}
