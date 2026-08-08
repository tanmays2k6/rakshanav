import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { emergencyService } from '../../services/emergencyService';
import { 
  PhoneCall, MapPin, Share2, AlertOctagon, HeartPulse, FileText, 
  Plus, Edit, Trash2, X, Check, Clock, User, Info, AlertTriangle, 
  Crosshair, Battery, Activity, ShieldAlert, Zap, QrCode, Navigation, Shield, Users
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

// Fix leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const hospitalIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2966/2966327.png',
  iconSize: [28, 28],
});

const policeIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2569/2569176.png',
  iconSize: [28, 28],
});

export default function Emergency() {
  const location = useLocation();

  const { user, profile } = useAuth();
  
  const [medicalInfo, setMedicalInfo] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [sosHistory, setSosHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // SOS State
  const [isSosActive, setIsSosActive] = useState(false);
  const [sosLocation, setSosLocation] = useState(null);
  const [activeSosEvent, setActiveSosEvent] = useState(null);
  const [shareToken, setShareToken] = useState(null);
  const [nearbyFacilities, setNearbyFacilities] = useState([]);
  const [batteryLevel, setBatteryLevel] = useState(100);
  
  // Countdown State
  const [countdown, setCountdown] = useState(null);
  const countdownTimer = useRef(null);

  // Modals
  const [isMedicalModalOpen, setIsMedicalModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 3000);
  };
  const [editingContact, setEditingContact] = useState(null);

  useEffect(() => {
    if (!user) return;
    loadData();
    trackBattery();

    const unsubContacts = emergencyService.subscribeToContacts(user.id, loadContacts);
    const unsubMedical = emergencyService.subscribeToMedicalProfile(user.id, loadMedicalInfo);
    const unsubHistory = emergencyService.subscribeToActiveSOS(user.id, loadHistory);

    // Initial GPS fetch for the dashboard
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
         setSosLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy
         });
         fetchNearbyFacilities(pos.coords.latitude, pos.coords.longitude);
      }, () => {}, { enableHighAccuracy: true });
    }

    return () => {
      unsubContacts();
      unsubMedical();
      unsubHistory();
    };
  }, [user]);

  const trackBattery = async () => {
     try {
       if (navigator.getBattery) {
         const bat = await navigator.getBattery();
         setBatteryLevel(Math.round(bat.level * 100));
         bat.addEventListener('levelchange', () => setBatteryLevel(Math.round(bat.level * 100)));
       }
     } catch (e) { /* ignore */ }
  };

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([loadMedicalInfo(), loadContacts(), loadHistory()]);
    setIsLoading(false);
  };

  const loadMedicalInfo = async () => {
    if (user) setMedicalInfo(await emergencyService.getMedicalProfile(user.id));
  };
  const loadContacts = async () => {
    if (user) setContacts(await emergencyService.getContacts());
  };
  const loadHistory = async () => {
    if (user) {
      const history = await emergencyService.getSOSHistory();
      setSosHistory(history);
      
      const active = history.find(h => h.status === 'active');
      if (active) {
        setIsSosActive(true);
        setActiveSosEvent(active);
        setSosLocation({ lat: active.latitude, lng: active.longitude, accuracy: active.accuracy });
        fetchNearbyFacilities(active.latitude, active.longitude);
      }
    }
  };

  const fetchNearbyFacilities = async (lat, lng) => {
    try {
      const query = `
        [out:json];
        (
          node["amenity"="hospital"](around:3000,${lat},${lng});
          node["amenity"="police"](around:3000,${lat},${lng});
          node["amenity"="pharmacy"](around:3000,${lat},${lng});
          node["amenity"="fire_station"](around:3000,${lat},${lng});
        );
        out;
      `;
      const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
      const data = await response.json();
      const facilities = data.elements.map(e => ({
        id: e.id,
        lat: e.lat,
        lng: e.lon,
        type: e.tags.amenity,
        name: e.tags.name || (e.tags.amenity === 'police' ? 'Police Station' : e.tags.amenity === 'hospital' ? 'Hospital' : e.tags.amenity === 'pharmacy' ? 'Pharmacy' : 'Fire Station')
      }));
      setNearbyFacilities(facilities);
    } catch (err) {
      console.error("Failed to fetch nearby facilities", err);
    }
  };

  
  useEffect(() => {
    if (location.state?.autoTrigger && !isSosActive && countdown === null) {
      // Clear the state so it doesn't trigger again on re-renders
      window.history.replaceState({}, document.title)
      startSOSCountdown();
    }
  }, [location.state, isSosActive, countdown]);

  const startSOSCountdown = () => {
    if (isSosActive) return;
    if (contacts.length === 0) {
      if(!window.confirm("You have no emergency contacts added. Activate SOS anyway?")) return;
    }
    
    setCountdown(5);
    countdownTimer.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownTimer.current);
          triggerSOSSequence();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelSOS = () => {
    clearInterval(countdownTimer.current);
    setCountdown(null);
  };

  const triggerSOSSequence = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.', 'error');
      return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const locData = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        speed: pos.coords.speed,
        heading: pos.coords.heading,
        battery: batteryLevel
      };
      setSosLocation(locData);
      setIsSosActive(true);
      fetchNearbyFacilities(locData.lat, locData.lng);
      
      const res = await emergencyService.triggerSOS(user.id, locData);
      if (res.success) {
        setActiveSosEvent(res.data);
        setShareToken(res.shareToken);
      } else {
        showToast('Failed to trigger SOS on server. Please call emergency services manually.', 'error');
      }
    }, (err) => {
      showToast('Failed to get location. Please enable GPS.', 'error');
      setCountdown(null);
    }, { enableHighAccuracy: true });
  };

  const handleEndSOS = async () => {
    if (activeSosEvent) {
      await emergencyService.resolveSOS(activeSosEvent.id);
    }
    setIsSosActive(false);
    setActiveSosEvent(null);
    setShareToken(null);
    setCountdown(null);
  };

  const generateShareMessage = () => {
    if (!sosLocation) return '';
    const link = shareToken ? `https://rakshanav.app/live/${shareToken}` : `https://www.google.com/maps?q=${sosLocation.lat},${sosLocation.lng}`;
    return `🚨 EMERGENCY SOS 🚨\n\n${profile?.full_name || 'User'} has activated SOS.\n\nTrack Live Location: ${link}`;
  };

  const deleteContact = async (id) => {
    if (window.confirm("Delete this emergency contact?")) {
      await emergencyService.deleteContact(id);
    }
  };

  const calculateMedicalCompletion = () => {
    if (!medicalInfo) return 0;
    const fields = ['blood_group', 'allergies', 'medical_conditions', 'current_medications', 'doctor_name', 'insurance_provider'];
    const filled = fields.filter(f => medicalInfo[f] && medicalInfo[f].trim() !== '').length;
    return Math.round((filled / fields.length) * 100);
  };

  if (!user) return null;

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-up max-w-[1400px] mx-auto w-full relative pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-4">
        <div>
           <h1 className="text-32 font-display font-black text-white tracking-tight">Emergency Dashboard</h1>
           <p className="text-gray-400 mt-1">Personal Safety & SOS Management System</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono uppercase tracking-wider">
           <div className="flex items-center gap-2">
             <div className={`w-2 h-2 rounded-full ${sosLocation ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
             <span className={sosLocation ? 'text-green-400' : 'text-gray-500'}>GPS: {sosLocation ? 'LOCKED' : 'SEARCHING'}</span>
           </div>
           <div className="flex items-center gap-2">
             <div className={`w-2 h-2 rounded-full ${isSosActive ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`}></div>
             <span className={isSosActive ? 'text-red-400' : 'text-brand-blue'}>MODE: {isSosActive ? 'EMERGENCY' : 'STANDBY'}</span>
           </div>
        </div>
      </div>

      {/* 12-COLUMN DASHBOARD GRID */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
         
         {/* ------------------------------------------------------------- */}
         {/* ROW 1: TOP SECTION (4-4-4) */}
         {/* ------------------------------------------------------------- */}
         
         {/* Left: Emergency Status */}
         <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="col-span-1 md:col-span-4 glass-panel p-6 flex flex-col justify-between">
            <div>
               <h2 className="text-18 font-bold text-white mb-6 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-brand-blue" /> System Status
               </h2>
               <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                     <span className="text-13 text-gray-400 flex items-center gap-2"><MapPin className="w-4 h-4"/> Location</span>
                     <span className="text-13 text-white font-mono">{sosLocation ? `${sosLocation.lat.toFixed(4)}, ${sosLocation.lng.toFixed(4)}` : 'Acquiring...'}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                     <span className="text-13 text-gray-400 flex items-center gap-2"><Crosshair className="w-4 h-4"/> Accuracy</span>
                     <span className="text-13 text-white font-mono">{sosLocation?.accuracy ? `±${Math.round(sosLocation.accuracy)}m` : '--'}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                     <span className="text-13 text-gray-400 flex items-center gap-2"><Battery className="w-4 h-4"/> Battery</span>
                     <span className={`text-13 font-bold ${batteryLevel <= 20 ? 'text-red-500' : 'text-green-500'}`}>{batteryLevel}%</span>
                  </div>
               </div>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5 text-[11px] text-gray-500 font-mono text-center uppercase tracking-widest">
               Last Sync: {new Date().toLocaleTimeString()}
            </div>
         </motion.div>

         {/* Center: Massive SOS Button */}
         <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className={`col-span-1 md:col-span-4 glass-panel p-6 flex flex-col items-center justify-center text-center relative overflow-hidden transition-colors duration-500 ${isSosActive ? 'border-red-500 bg-red-950/20' : countdown !== null ? 'border-orange-500 bg-orange-950/20' : 'border-white/5'}`}>
            {isSosActive && <div className="absolute inset-0 bg-red-500/10 animate-pulse"></div>}
            
            <AnimatePresence mode="wait">
               {isSosActive ? (
                  <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10 flex flex-col items-center w-full">
                     <div className="w-24 h-24 rounded-full bg-red-600 flex items-center justify-center mb-4 animate-pulse shadow-[0_0_50px_rgba(239,68,68,0.8)] border-4 border-white/20">
                        <ShieldAlert className="w-10 h-10 text-white" />
                     </div>
                     <h3 className="text-24 font-black text-red-500 mb-1 uppercase tracking-widest">SOS Active</h3>
                     <p className="text-13 text-red-300 mb-6 font-mono">Location Broadcasting</p>
                     <button onClick={handleEndSOS} className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-bold border border-white/20 transition-colors uppercase tracking-widest text-sm">
                        End Emergency
                     </button>
                  </motion.div>
               ) : countdown !== null ? (
                  <motion.div key="countdown" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="relative z-10 flex flex-col items-center w-full">
                     <AlertTriangle className="w-10 h-10 text-orange-500 mb-2 animate-pulse" />
                     <h3 className="text-18 font-bold text-orange-400 uppercase tracking-widest mb-2">Activating SOS</h3>
                     <div className="text-[80px] font-black font-mono leading-none text-orange-500 mb-6 drop-shadow-[0_0_30px_rgba(249,115,22,0.8)]">
                        {countdown}
                     </div>
                     <button onClick={cancelSOS} className="w-full bg-white hover:bg-gray-200 text-orange-600 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-transform active:scale-95 shadow-lg">
                        Cancel
                     </button>
                  </motion.div>
               ) : (
                  <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10 flex flex-col items-center justify-center h-full w-full">
                     <button onClick={startSOSCountdown} className="w-36 h-36 rounded-full bg-gradient-to-br from-red-500 to-red-700 shadow-[0_0_50px_rgba(239,68,68,0.4)] hover:shadow-[0_0_80px_rgba(239,68,68,0.6)] flex items-center justify-center text-white font-black text-[40px] tracking-widest transition-all hover:scale-105 active:scale-95 border-[6px] border-white/20 mb-6 relative group">
                        <span className="group-hover:scale-110 transition-transform">SOS</span>
                     </button>
                     <p className="text-13 text-gray-400 font-medium max-w-[200px]">
                        Press to trigger emergency protocol and notify contacts.
                     </p>
                  </motion.div>
               )}
            </AnimatePresence>
         </motion.div>

         {/* Right: Quick Emergency Numbers */}
         <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="col-span-1 md:col-span-4 glass-panel p-6">
            <h2 className="text-18 font-bold text-white mb-6 flex items-center gap-2">
               <PhoneCall className="w-5 h-5 text-brand-green" /> Quick Dial
            </h2>
            <div className="grid grid-cols-2 gap-3 h-[calc(100%-40px)]">
               <a href="tel:100" className="bg-white/5 hover:bg-blue-500/20 border border-white/5 hover:border-blue-500/30 rounded-xl p-3 flex flex-col items-center justify-center gap-2 transition-all group">
                 <div className="w-10 h-10 rounded-full bg-blue-500/10 text-brand-blue flex items-center justify-center group-hover:scale-110 transition-transform">
                   <Shield className="w-5 h-5" />
                 </div>
                 <div className="text-center">
                    <h4 className="font-bold text-white text-13">Police</h4>
                    <p className="text-[11px] text-gray-400 font-mono mt-0.5">100</p>
                 </div>
               </a>
               <a href="tel:108" className="bg-white/5 hover:bg-red-500/20 border border-white/5 hover:border-red-500/30 rounded-xl p-3 flex flex-col items-center justify-center gap-2 transition-all group">
                 <div className="w-10 h-10 rounded-full bg-red-500/10 text-brand-neonRed flex items-center justify-center group-hover:scale-110 transition-transform">
                   <HeartPulse className="w-5 h-5" />
                 </div>
                 <div className="text-center">
                    <h4 className="font-bold text-white text-13">Ambulance</h4>
                    <p className="text-[11px] text-gray-400 font-mono mt-0.5">108</p>
                 </div>
               </a>
               <a href="tel:101" className="bg-white/5 hover:bg-orange-500/20 border border-white/5 hover:border-orange-500/30 rounded-xl p-3 flex flex-col items-center justify-center gap-2 transition-all group">
                 <div className="w-10 h-10 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                   <AlertOctagon className="w-5 h-5" />
                 </div>
                 <div className="text-center">
                    <h4 className="font-bold text-white text-13">Fire</h4>
                    <p className="text-[11px] text-gray-400 font-mono mt-0.5">101</p>
                 </div>
               </a>
               <a href="tel:1091" className="bg-white/5 hover:bg-purple-500/20 border border-white/5 hover:border-purple-500/30 rounded-xl p-3 flex flex-col items-center justify-center gap-2 transition-all group">
                 <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                   <User className="w-5 h-5" />
                 </div>
                 <div className="text-center">
                    <h4 className="font-bold text-white text-[12px]">Women Helpline</h4>
                    <p className="text-[11px] text-gray-400 font-mono mt-0.5">1091</p>
                 </div>
               </a>
            </div>
         </motion.div>

         {/* ------------------------------------------------------------- */}
         {/* ROW 2: CONTACTS (7) & MEDICAL (5) */}
         {/* ------------------------------------------------------------- */}
         
         {/* Emergency Contacts (7 cols) */}
         <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="col-span-1 md:col-span-7 glass-panel p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-18 font-bold text-white flex items-center gap-2">
                 <Users className="w-5 h-5 text-brand-blue" /> Emergency Contacts
              </h2>
              {contacts.length >= 5 ? (
                <button disabled className="text-13 text-gray-500 flex items-center gap-1 cursor-not-allowed opacity-50" title="You can save up to 5 emergency contacts."><Plus className="w-4 h-4"/> Add</button>
              ) : (
                <button onClick={() => { setEditingContact(null); setIsContactModalOpen(true); }} className="text-13 text-brand-blue hover:text-white flex items-center gap-1 transition-colors">
                   <Plus className="w-4 h-4"/> Add
                </button>
              )}
            </div>

            <div className="flex-1 flex flex-col gap-3">
               {contacts.length === 0 && !isLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center bg-white/5 rounded-xl border border-dashed border-white/10 p-8">
                     <div className="w-16 h-16 rounded-full bg-brand-blue/10 flex items-center justify-center mb-4">
                        <Users className="w-8 h-8 text-brand-blue opacity-80" />
                     </div>
                     <h4 className="text-lg font-bold text-white mb-2">No Contacts Added</h4>
                     <p className="text-13 text-gray-400 mb-6 max-w-sm">Build your safety net. Add trusted family or friends to notify instantly during emergencies.</p>
                     <button onClick={() => { setEditingContact(null); setIsContactModalOpen(true); }} className="bg-brand-blue hover:bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-brand-blue/20">
                        Add Emergency Contact
                     </button>
                  </div>
               ) : (
                  contacts.map(contact => (
                     <div key={contact.id} className="bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-white font-bold text-lg border border-white/10 shadow-inner">
                              {contact.name.charAt(0).toUpperCase()}
                           </div>
                           <div>
                              <div className="flex items-center gap-2">
                                 <h4 className="font-bold text-white text-[15px]">{contact.name}</h4>
                                 {contact.priority === 'Primary' && (
                                    <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-black tracking-widest uppercase border border-red-500/20">PRIMARY</span>
                                 )}
                              </div>
                              <p className="text-13 text-gray-400 mt-0.5">{contact.relationship} <span className="mx-1">•</span> <span className="font-mono">{contact.phone}</span></p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                           <a href={`tel:${contact.phone}`} className="w-9 h-9 rounded-full bg-blue-500/10 hover:bg-blue-500/30 text-brand-blue flex items-center justify-center transition-colors">
                              <PhoneCall className="w-4 h-4" />
                           </a>
                           <a href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-green-500/10 hover:bg-green-500/30 text-green-400 flex items-center justify-center transition-colors">
                              <Share2 className="w-4 h-4" />
                           </a>
                           <div className="w-[1px] h-6 bg-white/10 mx-1"></div>
                           <button onClick={() => { setEditingContact(contact); setIsContactModalOpen(true); }} className="w-8 h-8 rounded-full hover:bg-white/10 text-gray-400 flex items-center justify-center transition-colors">
                              <Edit className="w-3.5 h-3.5" />
                           </button>
                           <button onClick={() => deleteContact(contact.id)} className="w-8 h-8 rounded-full hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                           </button>
                        </div>
                     </div>
                  ))
               )}
            </div>
         </motion.div>

         {/* Medical Profile (5 cols) */}
         <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="col-span-1 md:col-span-5 glass-panel p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-18 font-bold text-white flex items-center gap-2">
                 <HeartPulse className="w-5 h-5 text-brand-neonRed" /> Medical Profile
              </h2>
              {medicalInfo && (
                <button onClick={() => setIsMedicalModalOpen(true)} className="text-13 text-brand-neonRed hover:text-white flex items-center gap-1 transition-colors">
                   <Edit className="w-4 h-4"/> Edit
                </button>
              )}
            </div>

            <div className="flex-1 flex flex-col">
               {!medicalInfo && !isLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center bg-white/5 rounded-xl border border-dashed border-white/10 p-8">
                     <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                        <FileText className="w-8 h-8 text-brand-neonRed opacity-80" />
                     </div>
                     <h4 className="text-lg font-bold text-white mb-2">Profile Incomplete</h4>
                     <p className="text-13 text-gray-400 mb-4 max-w-[220px]">Critical data for first responders. Completion is highly recommended.</p>
                     
                     <div className="w-full bg-black/50 h-2 rounded-full mb-6 overflow-hidden border border-white/5">
                        <div className="bg-brand-neonRed h-full w-[0%]"></div>
                     </div>

                     <button onClick={() => setIsMedicalModalOpen(true)} className="bg-white/10 hover:bg-white/20 border border-white/10 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-colors">
                        Create Medical ID
                     </button>
                  </div>
               ) : medicalInfo ? (
                  <div className="flex-1 bg-black/40 border border-white/5 rounded-xl p-5 flex flex-col justify-between">
                     <div className="space-y-4">
                        <div className="flex justify-between items-center">
                           <span className="text-13 text-gray-400">Blood Group</span>
                           <span className="text-24 font-black text-brand-neonRed">{medicalInfo.blood_group || '--'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                           <div>
                              <span className="block text-[11px] text-gray-500 uppercase tracking-wider mb-1">Allergies</span>
                              <span className="text-13 text-white font-medium">{medicalInfo.allergies || 'None listed'}</span>
                           </div>
                           <div>
                              <span className="block text-[11px] text-gray-500 uppercase tracking-wider mb-1">Conditions</span>
                              <span className="text-13 text-white font-medium">{medicalInfo.medical_conditions || 'None listed'}</span>
                           </div>
                        </div>
                        <div className="border-t border-white/5 pt-4">
                           <span className="block text-[11px] text-gray-500 uppercase tracking-wider mb-1">Primary Physician</span>
                           <span className="text-13 text-white font-medium">{medicalInfo.doctor_name || 'Not provided'} {medicalInfo.doctor_phone ? `• ${medicalInfo.doctor_phone}` : ''}</span>
                        </div>
                        <div className="border-t border-white/5 pt-4">
                           <span className="block text-[11px] text-gray-500 uppercase tracking-wider mb-1">Insurance</span>
                           <span className="text-13 text-white font-medium">{medicalInfo.insurance_provider || 'Not provided'}</span>
                        </div>
                     </div>
                     
                     <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                              <Check className="w-4 h-4 text-green-500" />
                           </div>
                           <div className="text-[11px] text-gray-400 uppercase tracking-wider">
                              Profile <span className="text-white font-bold">{calculateMedicalCompletion()}%</span> Complete
                           </div>
                        </div>
                        {medicalInfo.organ_donor && (
                           <span className="text-[10px] bg-brand-neonRed/20 text-red-400 border border-red-500/20 px-2 py-1 rounded font-black tracking-widest uppercase">DONOR</span>
                        )}
                     </div>
                  </div>
               ) : null}
            </div>
         </motion.div>

         {/* ------------------------------------------------------------- */}
         {/* ROW 3: HISTORY (6) & LIVE SHARING (6) */}
         {/* ------------------------------------------------------------- */}
         
         {/* SOS History (6 cols) */}
         <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="col-span-1 md:col-span-6 glass-panel p-6 flex flex-col h-[400px]">
            <h2 className="text-18 font-bold text-white mb-6 flex items-center gap-2">
               <Clock className="w-5 h-5 text-gray-400" /> SOS Timeline
            </h2>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 relative">
               {sosHistory.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center opacity-50">
                     <Clock className="w-12 h-12 text-gray-600 mb-3" />
                     <p className="text-sm text-gray-400">No emergency events recorded.</p>
                  </div>
               ) : (
                  <div className="space-y-6 before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-white/20 before:to-transparent">
                     {sosHistory.map((event, index) => (
                        <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                           {/* Icon */}
                           <div className={`flex items-center justify-center w-6 h-6 rounded-full border-2 border-[#0a0f16] ${event.status === 'active' ? 'bg-red-500 animate-pulse' : 'bg-gray-600'} shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 ml-0 md:ml-auto md:mr-auto`}></div>
                           {/* Card */}
                           <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-white/5 border border-white/10 hover:border-white/20 rounded-xl p-4 transition-colors">
                              <div className="flex justify-between items-start mb-2">
                                 <span className="text-[11px] text-gray-400 font-mono bg-black/50 px-2 py-0.5 rounded">{new Date(event.triggered_at).toLocaleDateString()}</span>
                                 <span className={`text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded ${event.status === 'active' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/10 text-green-500'}`}>
                                    {event.status}
                                 </span>
                              </div>
                              <p className="text-13 text-white font-bold mb-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-gray-400"/> {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}</p>
                              <p className="text-[11px] text-gray-500">Triggered at {new Date(event.triggered_at).toLocaleTimeString()}</p>
                              {event.resolved_at && <p className="text-[11px] text-gray-500">Resolved at {new Date(event.resolved_at).toLocaleTimeString()}</p>}
                           </div>
                        </div>
                     ))}
                  </div>
               )}
            </div>
         </motion.div>

         {/* Live Sharing (6 cols) */}
         <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="col-span-1 md:col-span-6 glass-panel p-6 flex flex-col h-[400px]">
            <h2 className="text-18 font-bold text-white mb-6 flex items-center gap-2">
               <Navigation className="w-5 h-5 text-brand-green" /> Live Sharing
            </h2>
            
            <div className="flex-1 bg-black/40 border border-white/5 rounded-xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
               {isSosActive && shareToken ? (
                  <>
                     <div className="absolute top-4 right-4 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-[10px] text-green-400 font-mono tracking-widest uppercase">Broadcasting</span>
                     </div>
                     <div className="w-24 h-24 bg-white rounded-xl p-2 mb-6 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                        <QrCode className="w-full h-full text-black" />
                     </div>
                     <h3 className="text-lg font-bold text-white mb-2">Secure Tracking Link Generated</h3>
                     <p className="text-13 text-gray-400 mb-6 max-w-xs">Share this secure URL with authorities or contacts to let them track your real-time location.</p>
                     
                     <div className="flex items-center w-full max-w-sm bg-black/60 border border-white/10 rounded-lg p-1">
                        <input type="text" readOnly value={`https://rakshanav.app/live/${shareToken}`} className="flex-1 bg-transparent text-gray-300 text-sm font-mono px-3 outline-none" />
                        <button onClick={() => { navigator.clipboard.writeText(`https://rakshanav.app/live/${shareToken}`); showToast('Copied!', 'success'); }} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-md transition-colors">
                           <Share2 className="w-4 h-4" />
                        </button>
                     </div>
                  </>
               ) : (
                  <>
                     <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                        <Navigation className="w-8 h-8 text-gray-600" />
                     </div>
                     <h3 className="text-lg font-bold text-white mb-2">No Active Session</h3>
                     <p className="text-13 text-gray-500 max-w-xs">Live tracking links are automatically generated when SOS is triggered.</p>
                  </>
               )}
            </div>
         </motion.div>

         {/* ------------------------------------------------------------- */}
         {/* ROW 4: BOTTOM MAP (12) */}
         {/* ------------------------------------------------------------- */}
         
         <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="col-span-1 md:col-span-12 glass-panel p-6">
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-18 font-bold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-brand-blue" /> Nearest Infrastructure
               </h2>
               <div className="flex gap-4">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                     <img src="https://cdn-icons-png.flaticon.com/512/2569/2569176.png" className="w-4 h-4 opacity-70" alt="police" /> Police
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                     <img src="https://cdn-icons-png.flaticon.com/512/2966/2966327.png" className="w-4 h-4 opacity-70" alt="hospital" /> Hospital
                  </div>
               </div>
            </div>

            <div className="w-full h-[400px] rounded-2xl overflow-hidden border border-white/10 relative bg-[#050505]">
               {sosLocation ? (
                  <MapContainer center={[sosLocation.lat, sosLocation.lng]} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                    
                    {/* User Location */}
                    <Marker position={[sosLocation.lat, sosLocation.lng]}>
                      <Popup>Your Location</Popup>
                    </Marker>
                    <Circle center={[sosLocation.lat, sosLocation.lng]} radius={sosLocation.accuracy || 100} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1 }} />
                    
                    {/* Facilities */}
                    {nearbyFacilities.map(fac => (
                      <Marker key={fac.id} position={[fac.lat, fac.lng]} icon={fac.type === 'hospital' ? hospitalIcon : policeIcon}>
                        <Popup className="custom-popup">
                           <div className="font-bold text-gray-800">{fac.name}</div>
                           <div className="text-xs text-gray-500 uppercase mt-1">{fac.type}</div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
               ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                     <Crosshair className="w-10 h-10 text-gray-600 mb-3 animate-pulse" />
                     <span className="text-sm text-gray-500 font-mono">Fetching Map Data...</span>
                  </div>
               )}
            </div>
         </motion.div>

      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[10000] px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl border ${toast.type === 'error' ? 'bg-red-950/90 border-red-500/50 text-red-200' : 'bg-green-950/90 border-green-500/50 text-green-200'}`}
          >
            {toast.type === 'error' ? <AlertTriangle className="w-5 h-5 text-red-500" /> : <Check className="w-5 h-5 text-green-500" />}
            <span className="text-sm font-semibold tracking-wide">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      {isMedicalModalOpen && <MedicalProfileModal isOpen={isMedicalModalOpen} onClose={() => setIsMedicalModalOpen(false)} user={user} existingData={medicalInfo} showToast={showToast} />}
      {isContactModalOpen && <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} user={user} editingContact={editingContact} contacts={contacts} loadContacts={loadContacts} showToast={showToast} />}

    </div>
  );
}

// ─── Medical Profile Modal ──────────────────────────────────────────────────
// (Preserved functionality, updated styling to match cyber-dark)
function MedicalProfileModal({ isOpen, onClose, user, existingData, showToast }) {
  const [formData, setFormData] = useState({
    blood_group: existingData?.blood_group || '',
    allergies: existingData?.allergies || '',
    medical_conditions: existingData?.medical_conditions || '',
    current_medications: existingData?.current_medications || '',
    organ_donor: existingData?.organ_donor || false,
    doctor_name: existingData?.doctor_name || '',
    doctor_phone: existingData?.doctor_phone || '',
    insurance_provider: existingData?.insurance_provider || '',
    insurance_number: existingData?.insurance_number || ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const res = await emergencyService.upsertMedicalProfile({ user_id: user.id, ...formData });
    setIsSaving(false);
    if (res.success) {
      showToast("Medical profile updated successfully.");
      onClose();
    } else {
      showToast(res.error, "error");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-fade-in">
       <div className="glass-panel w-full max-w-2xl border border-white/10 shadow-2xl overflow-hidden bg-[#080c12]/90">
          <div className="flex justify-between items-center p-5 border-b border-white/10">
            <h3 className="text-xl font-bold text-white flex items-center gap-2"><HeartPulse className="w-5 h-5 text-brand-neonRed"/> Edit Medical Profile</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
          </div>
          
          <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1.5 uppercase tracking-widest">Blood Group</label>
                <select value={formData.blood_group} onChange={e=>setFormData({...formData, blood_group: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white text-13 outline-none focus:border-brand-neonRed transition-colors">
                  <option value="">Unknown</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg} className="bg-[#080c12]">{bg}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1.5 uppercase tracking-widest">Allergies</label>
                <input type="text" value={formData.allergies} onChange={e=>setFormData({...formData, allergies: e.target.value})} placeholder="e.g. Penicillin, Peanuts" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white text-13 outline-none focus:border-brand-neonRed transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1.5 uppercase tracking-widest">Medical Conditions</label>
                <input type="text" value={formData.medical_conditions} onChange={e=>setFormData({...formData, medical_conditions: e.target.value})} placeholder="e.g. Asthma, Diabetes" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white text-13 outline-none focus:border-brand-neonRed transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1.5 uppercase tracking-widest">Current Medications</label>
                <input type="text" value={formData.current_medications} onChange={e=>setFormData({...formData, current_medications: e.target.value})} placeholder="e.g. Albuterol" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white text-13 outline-none focus:border-brand-neonRed transition-colors" />
              </div>
            </div>

            <div className="pt-4 border-t border-white/5">
               <h4 className="text-sm font-bold text-white mb-4">Physician & Insurance</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                 <div>
                   <label className="block text-[11px] font-mono text-gray-400 mb-1.5 uppercase tracking-widest">Primary Doctor</label>
                   <input type="text" value={formData.doctor_name} onChange={e=>setFormData({...formData, doctor_name: e.target.value})} placeholder="Dr. John Doe" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white text-13 outline-none focus:border-brand-neonRed transition-colors" />
                 </div>
                 <div>
                   <label className="block text-[11px] font-mono text-gray-400 mb-1.5 uppercase tracking-widest">Doctor Phone</label>
                   <input type="tel" value={formData.doctor_phone} onChange={e=>setFormData({...formData, doctor_phone: e.target.value})} placeholder="+91..." className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white text-13 outline-none focus:border-brand-neonRed transition-colors" />
                 </div>
                 <div>
                   <label className="block text-[11px] font-mono text-gray-400 mb-1.5 uppercase tracking-widest">Insurance Provider</label>
                   <input type="text" value={formData.insurance_provider} onChange={e=>setFormData({...formData, insurance_provider: e.target.value})} placeholder="e.g. Star Health" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white text-13 outline-none focus:border-brand-neonRed transition-colors" />
                 </div>
                 <div>
                   <label className="block text-[11px] font-mono text-gray-400 mb-1.5 uppercase tracking-widest">Policy No.</label>
                   <input type="text" value={formData.insurance_number} onChange={e=>setFormData({...formData, insurance_number: e.target.value})} placeholder="..." className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white text-13 outline-none focus:border-brand-neonRed transition-colors" />
                 </div>
               </div>
            </div>
            
            <div className="flex gap-6 pt-4 border-t border-white/5">
               <label className="flex items-center gap-3 text-13 text-white cursor-pointer select-none group">
                 <div className="relative flex items-center justify-center">
                    <input type="checkbox" checked={formData.organ_donor} onChange={e=>setFormData({...formData, organ_donor: e.target.checked})} className="peer appearance-none w-5 h-5 border-2 border-white/20 rounded bg-black/50 checked:bg-brand-neonRed checked:border-brand-neonRed transition-colors cursor-pointer" />
                    <Check className="w-3.5 h-3.5 text-white absolute opacity-0 peer-checked:opacity-100 pointer-events-none" />
                 </div>
                 Registered Organ Donor
               </label>
            </div>
          </div>
          
          <div className="p-5 border-t border-white/10 bg-black/40 flex justify-end gap-3">
             <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-13 font-bold text-gray-300 hover:bg-white/5 hover:text-white transition-colors">Cancel</button>
             <button onClick={handleSave} disabled={isSaving} className="px-8 py-2.5 rounded-xl text-13 font-bold text-white bg-brand-neonRed hover:bg-red-500 flex items-center gap-2 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                {isSaving ? 'Saving...' : 'Save Profile'}
             </button>
          </div>
       </div>
    </div>
  )
}

// ─── Contact Modal ─────────────────────────────────────────────────────────
// (Preserved functionality, updated styling to match cyber-dark)
function ContactModal({ isOpen, onClose, user, editingContact, contacts, loadContacts, showToast }) {
    const [formData, setFormData] = useState({
      name: editingContact?.name || '',
      relationship: editingContact?.relationship || '',
      phone: editingContact?.phone || '',
      priority: editingContact?.priority || 'Secondary'
    });
    const [isSaving, setIsSaving] = useState(false);
  
    const validateIndianPhone = (phone) => {
      // Remove all non-digits
      const digits = phone.replace(/\D/g, '');
      // E.164 for India is +91 followed by 10 digits
      if (digits.length === 10) return '+91' + digits;
      if (digits.length === 12 && digits.startsWith('91')) return '+' + digits;
      if (digits.length === 13 && digits.startsWith('091')) return '+91' + digits.substring(3);
      return null;
    };
  
    const handleSave = async () => {
      // 6. User Verification
      if (!user) {
         showToast("You must be signed in.", "error");
         return;
      }
      
      // 8. Required fields
      if (!formData.name || !formData.relationship || !formData.phone || !formData.priority) {
         showToast("All fields are required.", "error");
         return;
      }

      // 13. Validate phone number
      const formattedPhone = validateIndianPhone(formData.phone);
      if (!formattedPhone) {
         showToast("Please enter a valid 10-digit Indian mobile number.", "error");
         return;
      }

      // 12. Prevent duplicate phone numbers
      if (!editingContact && contacts.some(c => c.phone === formattedPhone)) {
         showToast("This phone number is already in your emergency contacts.", "error");
         return;
      }

      // 11. Max Limit Verification (Backend safety)
      if (!editingContact && contacts.length >= 5) {
         showToast("You can save up to 5 emergency contacts.", "error");
         return;
      }

      setIsSaving(true);
      
      // 5. Always explicitly send user_id = auth.uid()
      const payload = { 
        user_id: user.id, 
        name: formData.name,
        relationship: formData.relationship,
        phone: formattedPhone,
        priority: formData.priority
      };
      
      // 14. Log Supabase request in development
      if (process.env.NODE_ENV === 'development') {
         console.log("Supabase Request Payload (Emergency Contact):", payload);
      }
      
      let res;
      if (editingContact) {
        res = await emergencyService.updateContact(editingContact.id, payload);
      } else {
        res = await emergencyService.addContact(payload);
      }
      
      if (process.env.NODE_ENV === 'development') {
         console.log("Supabase Response (Emergency Contact):", res);
      }
      
      setIsSaving(false);
      
      if (res.success) {
        showToast("Contact added successfully.");
        // 10. Refresh immediately
        if (loadContacts) await loadContacts();
        onClose();
      } else {
        showToast(res.error || "Permission denied. Unable to save contact.", "error");
      }
    };
  
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-fade-in">
         <div className="glass-panel w-full max-w-md border border-white/10 shadow-2xl overflow-hidden bg-[#080c12]/90">
            <div className="flex justify-between items-center p-5 border-b border-white/10">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 <Users className="w-5 h-5 text-brand-blue"/> {editingContact ? 'Edit Contact' : 'Add Contact'}
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1.5 uppercase tracking-widest">Contact Name</label>
                <input type="text" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} placeholder="e.g. Jane Doe" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white text-13 outline-none focus:border-brand-blue transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1.5 uppercase tracking-widest">Relationship</label>
                <input type="text" value={formData.relationship} onChange={e=>setFormData({...formData, relationship: e.target.value})} placeholder="e.g. Mother, Partner" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white text-13 outline-none focus:border-brand-blue transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1.5 uppercase tracking-widest">Phone Number</label>
                <input type="tel" value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} placeholder="10-digit Indian Mobile" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white text-13 outline-none focus:border-brand-blue transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1.5 uppercase tracking-widest">Priority</label>
                <select value={formData.priority} onChange={e=>setFormData({...formData, priority: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white text-13 outline-none focus:border-brand-blue transition-colors">
                  <option value="Primary" className="bg-[#080c12]">Primary (First to contact)</option>
                  <option value="Secondary" className="bg-[#080c12]">Secondary</option>
                </select>
              </div>
            </div>
            
            <div className="p-5 border-t border-white/10 bg-black/40 flex justify-end gap-3">
               <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-13 font-bold text-gray-300 hover:bg-white/5 hover:text-white transition-colors">Cancel</button>
               <button onClick={handleSave} disabled={isSaving} className="px-8 py-2.5 rounded-xl text-13 font-bold text-white bg-brand-blue hover:bg-blue-600 flex items-center gap-2 transition-colors shadow-[0_0_15px_rgba(59,130,246,0.3)] disabled:opacity-50">
                  {isSaving ? 'Saving...' : 'Save'}
               </button>
            </div>
         </div>
      </div>
    );
}
