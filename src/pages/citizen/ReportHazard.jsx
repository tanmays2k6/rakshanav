import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, AlertTriangle, CheckCircle, Upload, Loader2, Sparkles, 
  LightbulbOff, Zap, Car, Trash2, Droplets, ShieldAlert, Waves, Construction, Camera, X, ImageIcon
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Tooltip, Circle } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { geminiService } from '../../services/geminiService';
import { hazardService } from '../../services/hazardService';
import { useAuth } from '../../contexts/AuthContext';
import { useLocationState } from '../../contexts/LocationContext';
import { optimizeImage } from '../../utils/imageOptimizer';

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
      icon={reportIcon}
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
  const { lat: userLat, lng: userLng, address: userAddress } = useLocationState();
  
  // Form State
  const [position, setPosition] = useState(null); // [lat, lng]
  const [address, setAddress] = useState('Fetching GPS...');
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  
  // Image & AI State
  const [isOptimizingImage, setIsOptimizingImage] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [imageError, setImageError] = useState(null);
  const [isExpandingText, setIsExpandingText] = useState(false);
  const [aiConfidence, setAiConfidence] = useState(null);

  // App State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reportId, setReportId] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  
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
    // 1. Initialize location from context if available
    if (userLat && userLng) {
      setPosition([userLat, userLng]);
      if (userAddress) setAddress(userAddress);
      else reverseGeocode(userLat, userLng, setAddress);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
          reverseGeocode(pos.coords.latitude, pos.coords.longitude, setAddress);
        },
        () => {
          setPosition([12.9716, 77.5946]);
          setAddress('Bengaluru, Karnataka');
        },
        { enableHighAccuracy: true }
      );
    } else {
      setPosition([12.9716, 77.5946]);
      setAddress('Bengaluru, Karnataka');
    }

    // 2. Fetch existing reports & stats
    hazardService.getReports().then(data => setCommunityReports(data));
    fetchStats();

    // 3. Subscribe to real-time reports
    const unsub = hazardService.subscribeToReports((eventType, newRow) => {
      if (eventType === 'INSERT' && newRow && newRow.id) {
        const normalisedRow = {
          ...newRow,
          lat: newRow.lat ?? newRow.latitude,
          lng: newRow.lng ?? newRow.longitude,
        };
        setCommunityReports(prev => [normalisedRow, ...prev]);
      }
      fetchStats();
    });

    return () => unsub();
  }, [userLat, userLng, userAddress]);


  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError(null);
    setIsOptimizingImage(true);
    setIsAnalyzingImage(false);
    setAiConfidence(null);

    try {
      // Step 1: Client-side validation, resize & compression
      const optimized = await optimizeImage(file, {
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.8
      });

      // Save optimized File object for Supabase Storage
      setPhoto(optimized.file);
      setPhotoPreview(optimized.dataUrl);
      setIsOptimizingImage(false);

      // Step 2: Send optimized base64 to Gemini Vision API
      setIsAnalyzingImage(true);
      try {
        const analysis = await geminiService.analyzeHazardImage(optimized.base64, optimized.mimeType);
        if (analysis?.category) {
          const matchedCategory = CATEGORIES.find(c => c.id.toLowerCase() === analysis.category.toLowerCase());
          if (matchedCategory) {
            setCategory(matchedCategory.id);
          } else {
            setCategory(analysis.category);
          }
        }
        if (analysis?.priority) {
          const matchedPriority = PRIORITIES.find(p => p.id === analysis.priority.toLowerCase());
          if (matchedPriority) {
            setPriority(matchedPriority.id);
          }
        }
        setAiConfidence(analysis?.confidenceScore || 85);
      } catch (aiErr) {
        console.warn('[ReportHazard] AI Vision classification skipped/failed:', aiErr);
        // AI analysis failure does not block the citizen from submitting
      } finally {
        setIsAnalyzingImage(false);
      }
    } catch (err) {
      console.error('[ReportHazard] Image optimization error:', err);
      setIsOptimizingImage(false);
      setIsAnalyzingImage(false);
      setImageError(err.message || 'Failed to process image. Please choose another file.');
    }
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
    if (isSubmitting) return;

    if (!position || isNaN(parseFloat(position[0])) || isNaN(parseFloat(position[1]))) {
      setSubmitError('Please select or pin a valid location on the map.');
      return;
    }

    const lat = parseFloat(position[0]);
    const lng = parseFloat(position[1]);

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setSubmitError('Coordinates are outside valid geographic range.');
      return;
    }

    setSubmitError(null);
    
    if (!user) {
      setSubmitError('Please sign in before submitting a hazard report.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Upload optimized photo if present
      let photoUrl = null;
      if (photo) {
        try {
          photoUrl = await hazardService.uploadPhoto(photo, user.id);
          if (!photoUrl) {
            console.warn('[ReportHazard] Photo upload failed — proceeding without photo URL.');
          }
        } catch (uploadErr) {
          console.warn('[ReportHazard] Photo storage error:', uploadErr);
        }
      }

      // Step 2: Determine impact score
      let impactScore = 'Low';
      const pLower = (priority || '').toLowerCase();
      if (pLower === 'high' || pLower === 'critical') impactScore = 'High';
      else if (pLower === 'medium') impactScore = 'Medium';

      const formattedPriority = pLower.charAt(0).toUpperCase() + pLower.slice(1);

      // Step 3: Build normalized payload matching PostgreSQL schema
      const reportData = {
        user_id: user.id,
        title: `${category || 'Hazard'} Report`,
        category: category || 'Other',
        priority: formattedPriority,
        latitude: lat,
        longitude: lng,
        address: (address || 'Bengaluru, Karnataka').trim(),
        city: 'Bengaluru',
        description: (description || '').trim() || null,
        photo_url: photoUrl || null,
        severity: impactScore,
        is_anonymous: Boolean(isAnonymous)
      };

      if (import.meta.env.DEV) {
        console.log('[ReportHazard] Submitting validated report:', reportData);
      }

      // Step 4: Insert into Supabase incident_reports
      const res = await hazardService.submitReport(reportData);

      if (res.success) {
        setReportId(res.id);
        setSubmitError(null);
        setSubmitted(true);
        fetchStats();
      } else {
        const code = res.code || '';
        const msg = (res.error || '').toLowerCase();

        if (code === 'SESSION_EXPIRED') {
          setSubmitError('Your session has expired. Please sign in again to submit reports.');
        } else if (code === '42501' || msg.includes('permission denied')) {
          setSubmitError(
            'Your account is authenticated but the database rejected the report. ' +
            'Please verify database permissions and migrations.'
          );
        } else if (msg.includes('null value in column') || msg.includes('violates not-null constraint')) {
          setSubmitError(`Missing required field: ${res.details || res.error}. Please fill all required fields.`);
        } else if (msg.includes('foreign key') || msg.includes('violates foreign key')) {
          setSubmitError('Your account profile could not be verified. Please contact support.');
        } else {
          setSubmitError(res.error || 'Unable to submit hazard report. Please try again.');
        }
      }
    } catch (err) {
      console.error('[ReportHazard] Unexpected error:', err);
      setSubmitError('An unexpected error occurred. Please try again.');
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
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageUpload} disabled={isOptimizingImage || isAnalyzingImage} />
                  {isOptimizingImage ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin text-brand-blue mb-2" />
                      <span className="text-xs font-bold text-brand-blue">Preparing image...</span>
                      <span className="text-[10px] text-gray-400">Compressing & optimizing resolution</span>
                    </>
                  ) : isAnalyzingImage ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin text-brand-neonGreen mb-2" />
                      <span className="text-xs font-bold text-brand-neonGreen">Analyzing image with AI...</span>
                      <span className="text-[10px] text-gray-400">Classifying hazard & priority</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-6 h-6 mb-2 text-gray-400" />
                      <span className="text-xs font-bold text-gray-300">Tap to upload or take photo</span>
                      <span className="text-[10px] text-gray-500">Auto-compressed • JPG, PNG, WebP</span>
                    </>
                  )}
                </label>
              ) : (
                <div className="relative h-36 w-full rounded-xl overflow-hidden group border border-white/10">
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-white/80 font-mono">Optimized for upload</span>
                    <button 
                      type="button" 
                      onClick={() => { setPhoto(null); setPhotoPreview(null); setAiConfidence(null); setImageError(null); }} 
                      className="bg-red-500/90 hover:bg-red-600 p-2 rounded-full text-white shadow-lg transition-colors"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {isAnalyzingImage && (
                    <div className="absolute bottom-2 left-2 right-2 bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-blue" />
                      <span className="text-[11px] text-brand-blue font-mono">Analyzing with Gemini Vision...</span>
                    </div>
                  )}
                </div>
              )}

              {imageError && (
                <p className="text-xs text-red-400 mt-2 font-mono flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {imageError}
                </p>
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

            {/* Submit Error Banner */}
            {submitError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-red-400">Unable to submit hazard report</p>
                  <p className="text-xs text-red-400/80 mt-1 leading-relaxed">{submitError}</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setSubmitError(null)} 
                  className="text-red-400/60 hover:text-red-400 transition-colors shrink-0"
                  aria-label="Dismiss error"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

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
            {communityReports.map(report => {
              // public_incident_view returns lat/lng aliases.
              // Guard against any report missing coordinates to prevent Leaflet crash.
              const lat = report.lat ?? report.latitude;
              const lng = report.lng ?? report.longitude;
              if (!lat || !lng) return null;
              return (
                <Marker 
                  key={report.id} 
                  position={[lat, lng]}
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
              );
            })}
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
