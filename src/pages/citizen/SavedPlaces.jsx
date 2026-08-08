import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { placeService } from '../../services/placeService';
import { locationService } from '../../services/locationService';
import { 
  MapPin, Navigation, Star, Plus, Briefcase, Home, Dumbbell, 
  Search, Filter, Map as MapIcon, List, MoreVertical, Edit, 
  Trash2, Share2, Activity, GraduationCap, X, Check, Eye
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

// Utility: Haversine distance
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
            Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  const d = R * c; 
  return d;
}

const CATEGORIES = ['Home', 'Office', 'School', 'College', 'Hospital', 'Gym', 'Metro', 'Bus Stop', 'Favourite', 'Custom'];
const CATEGORY_ICONS = {
  Home: Home,
  Office: Briefcase,
  Gym: Dumbbell,
  School: GraduationCap,
  College: GraduationCap,
  Hospital: Activity,
  default: MapPin
};
const CATEGORY_COLORS = {
  Home: '#3b82f6',
  Office: '#8b5cf6',
  Gym: '#f97316',
  Hospital: '#ef4444',
  Favourite: '#eab308',
  default: '#10b981'
};

export default function SavedPlaces() {
  const { user } = useAuth();
  
  // Data State
  const [places, setPlaces] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [safetyScores, setSafetyScores] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  
  // UI State
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'map'
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState('nearest');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState(null);

  useEffect(() => {
    if (!user) return;
    
    // 1. Get GPS for distance calc
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        err => console.warn('GPS denied, distances will be hidden')
      );
    }

    // 2. Fetch Places
    loadPlaces();

    // 3. Subscribe to changes
    const unsub = placeService.subscribeToPlaces(user.id, () => {
      loadPlaces();
    });

    return () => unsub();
  }, [user]);

  const loadPlaces = async () => {
    setIsLoading(true);
    const data = await placeService.getPlaces();
    setPlaces(data);
    setIsLoading(false);
    
    // Fetch safety scores asynchronously
    data.forEach(place => fetchSafetyScore(place));
  };

  const fetchSafetyScore = async (place) => {
    if (safetyScores[place.id]) return; // Already fetched
    try {
      const res = await fetch(`/api/routes/safety/point?lat=${place.latitude}&lng=${place.longitude}`);
      if (res.ok) {
        const data = await res.json();
        setSafetyScores(prev => ({ ...prev, [place.id]: data.score }));
      } else {
        setSafetyScores(prev => ({ ...prev, [place.id]: 'N/A' }));
      }
    } catch(e) {
      setSafetyScores(prev => ({ ...prev, [place.id]: 'N/A' }));
    }
  };

  const handleToggleFavorite = async (e, place) => {
    e.stopPropagation();
    await placeService.updatePlace(place.id, { favorite: !place.favorite });
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this place?")) {
      await placeService.deletePlace(id);
    }
  };

  const handleNavigate = (e, place) => {
    e.stopPropagation();
    placeService.recordVisit(place.id, place.visit_count);
    // Ideally redirect to Navigation engine:
    window.location.href = `/dashboard/navigation?to=${place.latitude},${place.longitude}`;
  };

  const handleEdit = (e, place) => {
    e.stopPropagation();
    setEditingPlace(place);
    setIsModalOpen(true);
  };

  // Processing Data for Display
  const processedPlaces = places.map(p => {
    let distanceKm = null;
    if (currentLocation) {
      distanceKm = getDistanceFromLatLonInKm(currentLocation.lat, currentLocation.lng, p.latitude, p.longitude);
    }
    return { ...p, distanceKm };
  });

  let filteredPlaces = processedPlaces.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter || (categoryFilter === 'Favourite' && p.favorite);
    return matchesSearch && matchesCategory;
  });

  if (sortOrder === 'nearest' && currentLocation) {
    filteredPlaces.sort((a, b) => a.distanceKm - b.distanceKm);
  } else if (sortOrder === 'alphabetical') {
    filteredPlaces.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortOrder === 'safest') {
    filteredPlaces.sort((a, b) => (safetyScores[b.id] || 0) - (safetyScores[a.id] || 0));
  } else if (sortOrder === 'most_used') {
    filteredPlaces.sort((a, b) => (b.visit_count || 0) - (a.visit_count || 0));
  } else { // recently added
    filteredPlaces.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  // Group favourites if sorting by recently added
  if (sortOrder === 'recently_added') {
      filteredPlaces.sort((a, b) => (b.favorite === a.favorite) ? 0 : b.favorite ? 1 : -1);
  }

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-up relative">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2">
            <MapPin className="w-6 h-6 text-brand-blue" />
            Saved Places
          </h2>
          <p className="text-sm text-gray-400 mt-1">Manage and navigate to your frequent destinations.</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={() => setViewMode(viewMode === 'grid' ? 'map' : 'grid')} className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-gray-300 transition-colors hidden md:flex items-center gap-2">
            {viewMode === 'grid' ? <MapIcon className="w-4 h-4" /> : <List className="w-4 h-4" />}
            <span className="text-sm font-medium">{viewMode === 'grid' ? 'Map View' : 'Grid View'}</span>
          </button>
          
          <button onClick={() => { setEditingPlace(null); setIsModalOpen(true); }} className="bg-brand-blue hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-brand-blue/20 flex-1 md:flex-none justify-center">
            <Plus className="w-4 h-4" />
            Add New Place
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-white/5 border border-white/10 p-2 rounded-xl">
         <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by name or address..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none text-sm text-white pl-9 pr-4 py-2 outline-none"
            />
         </div>
         <div className="w-px h-6 bg-white/10"></div>
         <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-transparent border-none text-sm text-gray-300 outline-none cursor-pointer">
           <option value="All" className="bg-[#080c12]">All Categories</option>
           <option value="Favourite" className="bg-[#080c12]">Favourites</option>
           {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#080c12]">{c}</option>)}
         </select>
         <div className="w-px h-6 bg-white/10"></div>
         <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="bg-transparent border-none text-sm text-gray-300 outline-none cursor-pointer">
           <option value="recently_added" className="bg-[#080c12]">Recently Added</option>
           {currentLocation && <option value="nearest" className="bg-[#080c12]">Nearest First</option>}
           <option value="safest" className="bg-[#080c12]">Safest</option>
           <option value="most_used" className="bg-[#080c12]">Most Used</option>
           <option value="alphabetical" className="bg-[#080c12]">Alphabetical</option>
         </select>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin"></div>
          </div>
        ) : places.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 animate-fade-in">
             <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                <MapPin className="w-8 h-8 text-gray-500" />
             </div>
             <h3 className="text-xl font-bold text-white mb-2">No saved places yet</h3>
             <p className="text-gray-400 text-sm max-w-sm mb-6">
                Save your home, office, and frequent destinations for 1-tap safe routing and offline access.
             </p>
             <button onClick={() => { setEditingPlace(null); setIsModalOpen(true); }} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors border border-white/10">
                Add your first place
             </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pb-10">
            {filteredPlaces.map(place => {
              const IconComp = CATEGORY_ICONS[place.category] || CATEGORY_ICONS.default;
              const color = CATEGORY_COLORS[place.category] || CATEGORY_COLORS.default;
              const distance = place.distanceKm !== null ? (place.distanceKm < 1 ? Math.round(place.distanceKm * 1000) + ' m' : place.distanceKm.toFixed(1) + ' km') : 'Unknown';
              const safety = safetyScores[place.id];
              
              return (
                <div key={place.id} onClick={(e) => handleNavigate(e, place)} className="glass-panel p-5 flex flex-col gap-4 group hover:border-brand-blue/40 transition-all cursor-pointer relative overflow-hidden ring-1 ring-black/5 hover:shadow-xl hover:shadow-brand-blue/5">
                  
                  {/* Glow effect */}
                  <div className="absolute -right-12 -top-12 w-28 h-28 blur-3xl rounded-full opacity-20 transition-all group-hover:opacity-40" style={{ backgroundColor: color }}></div>
                  
                  {/* Top Row: Icon, Name, Actions */}
                  <div className="flex justify-between items-start relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center border border-white/10" style={{ backgroundColor: `${color}15`, color }}>
                        <IconComp className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                           {place.name}
                           {place.favorite && <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />}
                        </h3>
                        <p className="text-xs font-mono font-medium opacity-80" style={{ color }}>{place.category.toUpperCase()}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => handleToggleFavorite(e, place)} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-yellow-400 transition-colors">
                        <Star className={`w-4 h-4 ${place.favorite ? 'text-yellow-400 fill-yellow-400' : ''}`} />
                      </button>
                      <button onClick={(e) => handleEdit(e, place)} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => handleDelete(e, place.id)} className="p-1.5 hover:bg-red-500/20 rounded text-gray-400 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="relative z-10">
                    <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{place.address}</p>
                  </div>

                  {/* Metrics & Navigate */}
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5 relative z-10">
                    <div className="flex gap-4">
                      <div>
                        <p className="text-[9px] text-gray-500 font-mono mb-0.5 uppercase tracking-wider">Distance</p>
                        <p className="text-sm font-semibold text-white">{distance}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-500 font-mono mb-0.5 uppercase tracking-wider">Safety</p>
                        <div className="flex items-center gap-1">
                          {safety === undefined ? (
                            <div className="w-3 h-3 border-2 border-brand-neonGreen/30 border-t-brand-neonGreen rounded-full animate-spin"></div>
                          ) : safety === 'N/A' ? (
                            <span className="text-sm font-medium text-gray-400">N/A</span>
                          ) : (
                            <>
                              <Star className="w-3.5 h-3.5 text-brand-neonGreen fill-brand-neonGreen" />
                              <span className="text-sm font-bold text-brand-neonGreen">{safety}<span className="text-[10px] text-brand-neonGreen/50">/100</span></span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <button onClick={(e) => handleNavigate(e, place)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-brand-blue border border-white/10 text-white flex items-center justify-center transition-all group-hover:scale-110">
                      <Navigation className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-full rounded-2xl overflow-hidden border border-white/10 relative z-0">
             <MapContainer 
                center={currentLocation ? [currentLocation.lat, currentLocation.lng] : [12.9716, 77.5946]}
                zoom={12}
                style={{ height: '100%', width: '100%', background: '#080c12' }}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                
                {currentLocation && (
                   <Marker position={[currentLocation.lat, currentLocation.lng]}>
                      <Popup className="custom-popup">Current Location</Popup>
                   </Marker>
                )}

                {filteredPlaces.map(place => (
                   <Marker key={place.id} position={[place.latitude, place.longitude]}>
                      <Popup className="custom-popup">
                         <div className="p-1">
                            <h4 className="font-bold text-sm mb-1">{place.name}</h4>
                            <p className="text-xs text-gray-600 mb-2">{place.category}</p>
                            <button onClick={() => window.location.href=`/dashboard/navigation?to=${place.latitude},${place.longitude}`} className="bg-brand-blue text-white text-xs px-3 py-1 rounded w-full">Navigate</button>
                         </div>
                      </Popup>
                   </Marker>
                ))}
             </MapContainer>
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <PlaceModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          editingPlace={editingPlace}
          user={user}
        />
      )}
    </div>
  );
}

// ─── Modal Component ────────────────────────────────────────────────────────
function PlaceModal({ isOpen, onClose, editingPlace, user }) {
  const [name, setName] = useState(editingPlace ? editingPlace.name : '');
  const [category, setCategory] = useState(editingPlace ? editingPlace.category : 'Home');
  const [notes, setNotes] = useState(editingPlace ? editingPlace.notes || '' : '');
  const [search, setSearch] = useState(editingPlace ? editingPlace.address : '');
  const [lat, setLat] = useState(editingPlace ? editingPlace.latitude : 12.9716);
  const [lng, setLng] = useState(editingPlace ? editingPlace.longitude : 77.5946);
  const [address, setAddress] = useState(editingPlace ? editingPlace.address : '');
  
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Search Address -> Lat/Lng
  const handleSearch = async () => {
    if (!search.trim()) return;
    setIsSearching(true);
    try {
      const res = await locationService.forwardGeocode(search);
      if (res && res.length > 0) {
        setLat(res[0].lat);
        setLng(res[0].lng);
        setAddress(res[0].display_name);
      } else {
        alert("Location not found.");
      }
    } catch(e) {
      alert("Error searching location.");
    }
    setIsSearching(false);
  };

  // Map Click -> Reverse Geocode
  const LocationPicker = () => {
    const map = useMapEvents({
      async click(e) {
        const { lat, lng } = e.latlng;
        setLat(lat);
        setLng(lng);
        try {
          const rev = await locationService.reverseGeocode(lat, lng);
          if (rev.display_name) {
            setSearch(rev.display_name);
            setAddress(rev.display_name);
          }
        } catch(err) {}
      }
    });
    
    useEffect(() => {
       map.flyTo([lat, lng], 15);
    }, [lat, lng, map]);

    return <Marker position={[lat, lng]} />;
  };

  const handleSave = async () => {
    if (!name.trim() || !address.trim()) {
      alert("Name and valid location are required.");
      return;
    }

    setIsSaving(true);
    const data = {
      user_id: user.id,
      name,
      category,
      address,
      latitude: lat,
      longitude: lng,
      notes
    };

    let res;
    if (editingPlace) {
      res = await placeService.updatePlace(editingPlace.id, data);
    } else {
      res = await placeService.addPlace(data);
    }

    setIsSaving(false);
    if (res.success) {
      onClose();
    } else {
      alert("Failed to save: " + res.error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
       <div className="glass-panel w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-white/10 shadow-2xl">
          
          {/* Header */}
          <div className="flex justify-between items-center p-5 border-b border-white/10 bg-white/5">
            <h3 className="text-xl font-bold text-white">{editingPlace ? 'Edit Saved Place' : 'Add New Place'}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
               <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col md:flex-row overflow-y-auto">
             
             {/* Left: Form */}
             <div className="p-5 flex-1 flex flex-col gap-4 border-r border-white/5">
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1.5 uppercase">Place Name</label>
                  <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g., Mom's House" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-brand-blue transition-colors" />
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1.5 uppercase">Category</label>
                  <select value={category} onChange={e=>setCategory(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-brand-blue cursor-pointer">
                    {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#080c12]">{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1.5 uppercase">Location Search</label>
                  <div className="flex gap-2">
                     <input type="text" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter' && handleSearch()} placeholder="Search area or address..." className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-brand-blue" />
                     <button onClick={handleSearch} disabled={isSearching} className="bg-brand-blue text-white px-3 py-2 rounded-lg text-sm font-medium">
                       {isSearching ? '...' : 'Find'}
                     </button>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">Or click anywhere on the map to pin.</p>
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1.5 uppercase">Notes (Optional)</label>
                  <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Gate code, landmark..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-brand-blue h-16 resize-none custom-scrollbar"></textarea>
                </div>
             </div>

             {/* Right: Map */}
             <div className="flex-1 min-h-[300px] relative z-0">
                <MapContainer center={[lat, lng]} zoom={14} style={{ height: '100%', width: '100%', background: '#080c12' }}>
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                  <LocationPicker />
                </MapContainer>
             </div>
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-white/10 bg-black/40 flex justify-end gap-3">
             <button onClick={onClose} className="px-5 py-2 rounded-xl text-sm font-medium text-white border border-white/10 hover:bg-white/5 transition-colors">Cancel</button>
             <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 rounded-xl text-sm font-medium text-white bg-brand-blue hover:bg-blue-600 transition-colors flex items-center gap-2">
                {isSaving ? 'Saving...' : <><Check className="w-4 h-4" /> Save Place</>}
             </button>
          </div>

       </div>
    </div>
  )
}
