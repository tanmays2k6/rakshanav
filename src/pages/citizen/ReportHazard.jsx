import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, AlertTriangle, CheckCircle, Upload, Loader2, Sparkles, 
  LightbulbOff, Zap, Car, Trash2, Droplets, ShieldAlert, Waves, Construction, Camera, X
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Tooltip, Circle } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { geminiService } from '../../services/geminiService';
import { hazardService } from '../../services/hazardService';
import { useAuth } from '../../contexts/AuthContext';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Report Icon
const reportIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const CATEGORIES = [
  { id: 'Broken Streetlight', icon: LightbulbOff },
  { id: 'Road Damage', icon: Car },
  { id: 'Open Manhole', icon: AlertTriangle },
  { id: 'Garbage Dump', icon: Trash2 },
  { id: 'Accident', icon: Car },
  { id: 'Flooding', icon: Waves },
  { id: 'Unsafe Area', icon: ShieldAlert },
  { id: 'Water Leakage', icon: Droplets },
  { id: 'Electric Hazard', icon: Zap },
  { id: 'Construction Hazard', icon: Construction },
];

const PRIORITIES = [
  { id: 'low', label: 'Low', color: 'bg-blue-500' },
  { id: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { id: 'high', label: 'High', color: 'bg-orange-500' },
  { id: 'critical', label: 'Critical', color: 'bg-red-500' },
];

// Helper to auto-pan and sync marker
function LocationMarker({ position, setPosition, setAddress }) {
  const map = useMap();
  
  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom(), { animate: true });
    }
  }, [position, map]);

  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
      reverseGeocode(e.latlng.lat, e.latlng.lng, setAddress);
    },
  });

  return position ? (
    <Marker 
      position={position} 
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const pos = marker.getLatLng();
          setPosition([pos.lat, pos.lng]);
          reverseGeocode(pos.lat, pos.lng, setAddress);
        }
      }}
    />
  ) : null;
}

const reverseGeocode = async (lat, lng, setAddress) => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    const data = await res.json();
    setAddress(data.display_name || 'Unknown Location');
  } catch (err) {
    console.error(err);
    setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  }
};

export default function ReportHazard() {
  const { user } = useAuth();
  
  // Form State
  const [position, setPosition] = useState(null); // [lat, lng]
  const [address, setAddress] = useState('Fetching GPS...');
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  
  // AI State
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [isExpandingText, setIsExpandingText] = useState(false);
  const [aiConfidence, setAiConfidence] = useState(null);

  // App State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reportId, setReportId] = useState(null);
  
  // Stats State
  const [stats, setStats] = useState({ total: 0, today: 0, resolved: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  
  // Map Data
  const [communityReports, setCommunityReports] = useState([]);

  const fetchStats = async () => {
    setStatsError(false);
    const res = await hazardService.getReportStats();
    if (res.success) {
      setStats(res);
    } else {
      setStatsError(true);
    }
    setStatsLoading(false);
  };

  useEffect(() => {
    // 1. Get initial GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
          reverseGeocode(pos.coords.latitude, pos.coords.longitude, setAddress);
        },
        () => {
          // Fallback Bengaluru
          setPosition([12.9716, 77.5946]);
          setAddress('Bengaluru, Karnataka');
        },
        { enableHighAccuracy: true }
      );
    } else {
      setPosition([12.9716, 77.5946]);
    }

    // 2. Fetch existing reports & stats
    hazardService.getReports().then(data => setCommunityReports(data));
    fetchStats();

    // 3. Subscribe to real-time reports
    const unsub = hazardService.subscribeToReports((newReport) => {
      setCommunityReports(prev => [newReport, ...prev]);
      fetchStats();
    });

    return () => unsub();
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPhoto(file);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      setPhotoPreview(base64String);
      
      // Analyze with Gemini
      setIsAnalyzingImage(true);
      setAiConfidence(null);
      const b64Data = base64String.split(',')[1];
      
      try {
        const analysis = await geminiService.analyzeHazardImage(b64Data, file.type);
        if (analysis.category && CATEGORIES.find(c => c.id.toLowerCase() === analysis.category.toLowerCase())) {
           setCategory(CATEGORIES.find(c => c.id.toLowerCase() === analysis.category.toLowerCase()).id);
        } else if (analysis.category) {
           setCategory(analysis.category);
        }
        if (analysis.priority && PRIORITIES.find(p => p.id === analysis.priority.toLowerCase())) {
           setPriority(analysis.priority.toLowerCase());
        }
        setAiConfidence(analysis.confidenceScore || 85);
      } catch (err) {
        console.error("AI Analysis failed", err);
      } finally {
        setIsAnalyzingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAIExpand = async () => {
    if (!description) return;
    setIsExpandingText(true);
    const expanded = await geminiService.expandHazardDescription(description);
    setDescription(expanded);
    setIsExpandingText(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!position) return;
    
    if (!user) {
      alert("Authentication required\n\nPlease log in to submit reports.");
      window.location.href = '/login';
      return;
    }

    setIsSubmitting(true);

    try {
      let photoUrl = null;
      if (photo) {
        photoUrl = await hazardService.uploadPhoto(photo);
      }

      // Calculate simple impact score
      let impactScore = 'Low';
      if (priority === 'high' || priority === 'critical') impactScore = 'High';
      else if (priority === 'medium') impactScore = 'Medium';

      const reportData = {
        user_id: user && !isAnonymous ? user.id : null,
        title: `${category} Report`,
        category,
        priority: priority.charAt(0).toUpperCase() + priority.slice(1),
        latitude: position[0],
        longitude: position[1],
        address,
        city: 'Bengaluru', // Defaulting since reverse geocode might not isolate city easily here
        description,
        photo_url: photoUrl,
        severity: impactScore,
        is_anonymous: isAnonymous
      };

      const res = await hazardService.submitReport(reportData);
      if (res.success) {
        setReportId(res.id);
        setSubmitted(true);
      } else {
        const errorMsg = res.error?.toLowerCase() || '';
        if (res.code === '42501' || errorMsg.includes('rls') || errorMsg.includes('row-level security') || errorMsg.includes('permission denied')) {
           alert("Database Error:\npermission denied");
        } else if (errorMsg.includes('null value in column') || errorMsg.includes('violates not-null constraint')) {
           const match = res.error.match(/column "([^"]+)"/);
           alert(`Missing required field:\n${match ? match[1] : 'unknown field'}`);
        } else {
           alert(`Database Error:\n${res.error}`);
        }
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred during submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-0 overflow-hidden rounded-2xl border border-white/10 animate-fade-up">
      
      {/* LEFT COLUMN: INTERACTIVE FORM (35%) */}
      <div className="w-full lg:w-[400px] xl:w-[450px] shrink-0 bg-[#080c12]/90 backdrop-blur-xl border-r border-white/10 flex flex-col overflow-y-auto custom-scrollbar">
        <div className="p-6">
          <h2 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-brand-orange" />
            Community Safety Reporting
          </h2>
          <p className="text-sm text-gray-400 mt-2">Help improve urban safety by reporting infrastructure issues in your neighbourhood.</p>
          
          {statsLoading ? (
             <div className="flex gap-4 mt-4 p-3 bg-white/5 rounded-xl border border-white/10 animate-pulse">
                <div className="h-10 w-24 bg-white/10 rounded"></div>
                <div className="w-px bg-white/10"></div>
                <div className="h-10 w-24 bg-white/10 rounded"></div>
             </div>
          ) : statsError ? (
             <div className="mt-4 p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-red-400 text-xs text-center font-mono">
                Unable to load reporting statistics
             </div>
          ) : stats.total === 0 ? (
             <div className="mt-4 grid grid-cols-2 gap-2 p-3 bg-brand-blue/5 rounded-xl border border-brand-blue/10">
                <p className="text-[10px] text-brand-blue font-mono flex items-center gap-1"><CheckCircle className="w-3 h-3" /> GPS Connected</p>
                <p className="text-[10px] text-brand-blue font-mono flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Bengaluru Region</p>
                <p className="text-[10px] text-brand-blue font-mono flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Community Ready</p>
                <p className="text-[10px] text-brand-blue font-mono flex items-center gap-1"><CheckCircle className="w-3 h-3" /> AI Active</p>
             </div>
          ) : (
             <div className="flex gap-4 mt-4 p-3 bg-white/5 rounded-xl border border-white/10">
               <div>
                 <p className="text-xs text-gray-500 font-mono">REPORTS TODAY</p>
                 <p className="font-bold text-white text-lg">{stats.today}</p>
               </div>
               <div className="w-px bg-white/10"></div>
               <div>
                 <p className="text-xs text-gray-500 font-mono">RESOLVED</p>
                 <p className="font-bold text-brand-neonGreen text-lg">{stats.resolved}</p>
               </div>
             </div>
          )}
        </div>

        {submitted ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 animate-fade-up">
            <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6 relative">
               <div className="absolute inset-0 rounded-full border-2 border-brand-neonGreen animate-ping opacity-20"></div>
               <CheckCircle className="w-12 h-12 text-brand-neonGreen" />
            </div>
            <h3 className="text-3xl font-display font-bold text-white mb-2">Hazard report submitted successfully.</h3>
            <p className="text-gray-400 mb-6">Authorities have been notified and it is now visible to the community.</p>
            <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-left w-full mb-6">
               <p className="text-xs text-gray-500 font-mono mb-1">REPORT ID</p>
               <p className="text-brand-blue font-mono text-sm break-all">{reportId}</p>
               <p className="text-xs text-gray-500 font-mono mt-3 mb-1">STATUS</p>
               <p className="text-yellow-500 font-bold text-sm">Pending Verification</p>
            </div>
            <button 
              onClick={() => { setSubmitted(false); setDescription(''); setPhoto(null); setPhotoPreview(null); setAiConfidence(null); }}
              className="w-full bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-bold transition-colors"
            >
              Report Another Issue
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-6">
            
            {/* Category Grid */}
            <div>
              <label className="block text-xs font-mono text-gray-500 mb-3">SELECT HAZARD TYPE</label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.slice(0, 9).map(cat => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <div 
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={`cursor-pointer p-3 rounded-xl border flex flex-col items-center text-center gap-2 transition-all ${
                        isSelected 
                          ? 'border-brand-neonGreen bg-brand-neonGreen/10 shadow-[0_0_15px_rgba(34,197,94,0.2)] text-brand-neonGreen' 
                          : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-400'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[10px] font-bold leading-tight">{cat.id}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-mono text-gray-500 mb-3">PRIORITY LEVEL</label>
              <div className="flex gap-2">
                {PRIORITIES.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${
                      priority === p.id 
                        ? `${p.color} text-white border-transparent shadow-lg` 
                        : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Location (Synced with map) */}
            <div>
              <label className="block text-xs font-mono text-gray-500 mb-2">INCIDENT LOCATION (DRAG PIN ON MAP)</label>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex gap-3 items-start">
                <MapPin className="w-5 h-5 text-brand-blue shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-white line-clamp-2">{address}</p>
                  <p className="text-[10px] text-gray-500 font-mono mt-1">
                    {position ? `${position[0].toFixed(5)}, ${position[1].toFixed(5)}` : 'Waiting for GPS...'}
                  </p>
                </div>
              </div>
            </div>

            {/* Photo & AI */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="block text-xs font-mono text-gray-500">PHOTO UPLOAD</label>
                {aiConfidence && (
                  <span className="text-[10px] font-mono bg-brand-neonGreen/20 text-brand-neonGreen px-2 py-1 rounded flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> AI Confidence: {aiConfidence}%
                  </span>
                )}
              </div>
              
              {!photoPreview ? (
                <label className="w-full h-32 border-2 border-dashed border-white/10 hover:border-brand-blue/50 hover:bg-white/5 rounded-xl flex flex-col items-center justify-center text-gray-500 cursor-pointer transition-colors relative">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  {isAnalyzingImage ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin text-brand-blue mb-2" />
                      <span className="text-xs font-bold text-brand-blue">Gemini Vision Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-6 h-6 mb-2" />
                      <span className="text-xs font-bold">Tap to upload or take photo</span>
                    </>
                  )}
                </label>
              ) : (
                <div className="relative h-32 w-full rounded-xl overflow-hidden group">
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => { setPhoto(null); setPhotoPreview(null); setAiConfidence(null); }} className="bg-red-500/80 p-2 rounded-full text-white">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-mono text-gray-500 mb-2">DESCRIPTION</label>
              <div className="relative">
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  rows="3" 
                  placeholder="E.g., One street light broken near the junction..." 
                  className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl text-sm outline-none focus:border-brand-blue/50 custom-scrollbar resize-none"
                ></textarea>
                <button 
                  type="button"
                  onClick={handleAIExpand}
                  disabled={isExpandingText || !description}
                  className="absolute bottom-3 right-3 bg-brand-blue/20 hover:bg-brand-blue/30 text-brand-blue text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                  {isExpandingText ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Generate with AI
                </button>
              </div>
            </div>

            {/* Anonymous Toggle */}
            <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 cursor-pointer" onClick={() => setIsAnonymous(!isAnonymous)}>
              <div className={`w-10 h-6 rounded-full p-1 transition-colors ${isAnonymous ? 'bg-brand-neonGreen' : 'bg-gray-600'}`}>
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isAnonymous ? 'translate-x-4' : 'translate-x-0'}`}></div>
              </div>
              <div>
                <p className="text-sm text-white font-medium">Anonymous Report</p>
                <p className="text-[10px] text-gray-400 font-mono">Your identity will not be shared publicly.</p>
              </div>
            </div>

            {/* Submit */}
            <button 
              type="submit" 
              disabled={isSubmitting || !position}
              className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white p-4 rounded-xl text-sm font-bold shadow-[0_4px_20px_rgba(220,38,38,0.3)] transition-all transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <AlertTriangle className="w-5 h-5" />}
              {isSubmitting ? 'Processing & Uploading...' : 'Submit Hazard Report'}
            </button>

          </form>
        )}
      </div>

      {/* RIGHT COLUMN: LEAFLET MAP (65%) */}
      <div className="flex-1 relative z-0 h-[500px] lg:h-auto">
        <MapContainer 
          center={position || [12.9716, 77.5946]} 
          zoom={14} 
          style={{ height: '100%', width: '100%', background: '#080c12' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          
          <LocationMarker position={position} setPosition={setPosition} setAddress={setAddress} />

          {position && (
            <Circle 
              center={position} 
              radius={100} 
              pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 1 }}
            />
          )}

          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={40}
          >
            {communityReports.map(report => (
              <Marker 
                key={report.id} 
                position={[report.latitude, report.longitude]}
                icon={reportIcon}
              >
                <Tooltip direction="top" offset={[0, -30]} opacity={1}>
                  <div className="font-sans">
                    <p className="font-bold text-gray-800">{report.category}</p>
                    <p className="text-xs text-gray-600">{report.status}</p>
                    <p className="text-[10px] text-gray-500 mt-1">{report.upvotes} Upvotes</p>
                  </div>
                </Tooltip>
              </Marker>
            ))}
          </MarkerClusterGroup>

        </MapContainer>
        
        {/* Map HUD Overlay */}
        <div className="absolute top-4 left-4 z-[1000] glass-panel px-4 py-2 pointer-events-none">
          <span className="text-xs font-mono text-gray-300 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-brand-blue" />
            Drag pin to update location
          </span>
        </div>
      </div>

    </div>
  );
}
