import React, { useState, useRef, useEffect, useCallback } from 'react'
import Map, { Source, Layer, Marker, Popup, useMap } from 'react-map-gl/maplibre'
import { locationService } from '../services/locationService'
import { mapService } from '../services/mapService'
import { geminiService } from '../services/geminiService'
import { tripService } from '../services/tripService'
import { useAuth } from '../contexts/AuthContext'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const luxColor = (l) => l < 5 ? '#ef4444' : l < 15 ? '#f97316' : '#22c55e'
const luxLabel = (l) => l < 5 ? 'CRITICAL' : l < 15 ? 'LOW' : 'SAFE'

const glass = (extra = {}) => ({
  background: 'rgba(8,12,18,0.84)',
  backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '16px', ...extra,
})
const glassLight = (extra = {}) => ({
  background: 'rgba(255,255,255,0.92)',
  backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
  border: '1px solid rgba(0,0,0,0.09)',
  borderRadius: '16px', ...extra,
})

const toGeoJSON = (coords) => ({
  type: 'FeatureCollection',
  features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} }]
})
const getBounds = (routes) => {
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  routes.forEach(r => {
    r.geometry.coordinates.forEach(c => {
      minLng = Math.min(minLng, c[0]); maxLng = Math.max(maxLng, c[0]);
      minLat = Math.min(minLat, c[1]); maxLat = Math.max(maxLat, c[1]);
    });
  });
  return [[minLng - 0.005, minLat - 0.005], [maxLng + 0.005, maxLat + 0.005]]
}

// Bengaluru BBMP Rough Bounds
const BBMP_BOUNDS = { minLat: 12.5, maxLat: 13.4, minLng: 77.2, maxLng: 77.9 };
const BENGALURU_MAX_BOUNDS = [
  [BBMP_BOUNDS.minLng - 0.1, BBMP_BOUNDS.minLat - 0.1], // Southwest
  [BBMP_BOUNDS.maxLng + 0.1, BBMP_BOUNDS.maxLat + 0.1]  // Northeast
];
const isWithinBengaluru = (lat, lng) => (lat >= BBMP_BOUNDS.minLat && lat <= BBMP_BOUNDS.maxLat && lng >= BBMP_BOUNDS.minLng && lng <= BBMP_BOUNDS.maxLng);

const midOf = (coords) => coords[Math.floor(coords.length / 2)]

// ─── MapFitter ────────────────────────────────────────────────────────────────
function MapFitter({ bounds }) {
  const { current: map } = useMap()
  useEffect(() => {
    if (!bounds || !map) return
    const t = setTimeout(() => map.fitBounds(bounds, { padding: 90, duration: 1200 }), 300)
    return () => clearTimeout(t)
  }, [bounds, map])
  return null
}

function GpsTracker({ currentCoords, useGps, phase }) {
  const { current: map } = useMap()
  useEffect(() => {
    if (useGps && currentCoords && map && phase === 'idle') {
      const t = setTimeout(() => map.flyTo({ center: [currentCoords.lng, currentCoords.lat], zoom: 15, duration: 1200 }), 100);
      return () => clearTimeout(t);
    }
  }, [currentCoords, useGps, map, phase])
  return null
}


// ─── Main Component ───────────────────────────────────────────────────────────
export default function UserView({ onAddReport, userReports = [], initialOrigin = '', initialDestination = '', autoTrigger = false, isDashboard = false, liveLocation = null, showTraffic = false, showCommunity = false, showStreetlights = false, showJurisdictions = false, communityReports = [] }) {
  const { user } = useAuth()
  const [darkMode,     setDarkMode]     = useState(true)
  const [phase,        setPhase]        = useState('idle')
  const [activeLocationField, setActiveLocationField] = useState(null)
  
  // GPS State
  const [useGps,       setUseGps]       = useState(true)
  const [gpsStatus,    setGpsStatus]    = useState('pending')
  const [currentCoords, setCurrentCoords] = useState(null)
  const [currentAddress, setCurrentAddress] = useState('')
  const [gpsAccuracy,  setGpsAccuracy]  = useState(null)
  
  // Form State
  const [fromVal,      setFromVal]      = useState('')
  const [toVal,        setToVal]        = useState('') // Explicitly empty default per instructions
  const [fromOpt,      setFromOpt]      = useState(null)
  const [toOpt,        setToOpt]        = useState(null)
  const [statusMsg,    setStatusMsg]    = useState('')
  const [errorMsg,     setErrorMsg]     = useState('')
  const [swapAnim,     setSwapAnim]     = useState(false)
  
  const [activeRouteId, setActiveRouteId] = useState('all')
  const [routeData,    setRouteData]    = useState(null)
  const [routeAnalyses, setRouteAnalyses] = useState({})
  const [routeFallbacks, setRouteFallbacks] = useState({})
  const [isAiLoading,  setIsAiLoading]  = useState(false)
  const [devDiagnostics, setDevDiagnostics] = useState(null)
  const [showDevDiagnostics, setShowDevDiagnostics] = useState(false)
  
  // Navigation & Session State
  const [activeTrip, setActiveTrip] = useState(null)
  const [isEndingTrip, setIsEndingTrip] = useState(false)
  const [selectedPoi, setSelectedPoi] = useState(null)
  const activeRequestIdRef = useRef(null)
  const abortControllerRef = useRef(null)
  
  // Jurisdictions State
  const [jurisdictionsData, setJurisdictionsData] = useState(null)

  // ── Auto GPS Initialization ──────────────────────────────────────────────
  const requestGPS = useCallback(() => {
    setGpsStatus('locating')
    if (!navigator.geolocation) {
      setGpsStatus('error')
      setUseGps(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setCurrentCoords({ lat, lng })
        setGpsAccuracy(pos.coords.accuracy)
        
        try {
          const rev = await locationService.reverseGeocode(lat, lng)
          const address = rev.displayName || 'Current Location'
          setCurrentAddress(address)
          
          if (!isWithinBengaluru(lat, lng)) {
            setGpsStatus('out_of_bounds')
            setUseGps(true) // DO NOT disable GPS just because we are outside Bengaluru routing area
            if (isDashboard) {
               setErrorMsg(`Location detected outside supported region. RakshaNav is currently optimized for Bengaluru.`)
               setPhase('error')
            }
          } else {
            setGpsStatus('granted')
            setUseGps(true)
          }
        } catch (e) {
          setCurrentAddress('Current Location (Unknown Address)')
          if (isWithinBengaluru(lat, lng)) {
             setGpsStatus('granted')
             setUseGps(true)
          } else {
             setGpsStatus('out_of_bounds')
             setUseGps(true)
             if (isDashboard) {
                setErrorMsg(`Location detected outside supported region. RakshaNav is currently optimized for Bengaluru.`)
                setPhase('error')
             }
          }
        }
      },
      (err) => {
        console.warn('GPS Denied or Error:', err)
        setGpsStatus(err.code === 1 ? 'denied' : 'error')
        setUseGps(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }, [])

  useEffect(() => {
    requestGPS()
  }, [requestGPS])

  useEffect(() => {
    if (showJurisdictions && !jurisdictionsData) {
      fetch('/data/bengaluru_police_jurisdictions.geojson')
        .then(res => res.json())
        .then(data => setJurisdictionsData(data))
        .catch(err => console.warn('Failed to load jurisdictions geojson:', err));
    }
  }, [showJurisdictions, jurisdictionsData]);

  // ── Route search (One Deterministic Pipeline) ────────────────────────────
  const handleSearch = useCallback(async (forcedFrom, forcedTo, isGpsActive) => {
    const fVal = forcedFrom !== undefined ? forcedFrom : fromVal;
    const tVal = forcedTo !== undefined ? forcedTo : toVal;
    const gpsActive = isGpsActive !== undefined ? isGpsActive : useGps;

    if (!tVal.trim()) {
      setErrorMsg("Please enter a destination.");
      setPhase('error');
      return;
    }
    if (!gpsActive && !fVal.trim()) {
      setErrorMsg("Please enter a starting location or enable GPS.");
      setPhase('error');
      return;
    }

    // Cancel any previous in-flight search requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const currentRequestId = crypto.randomUUID();
    activeRequestIdRef.current = currentRequestId;

    setPhase('searching'); 
    setErrorMsg(''); 
    setActiveRouteId('all');
    setDevDiagnostics({
      geocodingOrigin: 'pending', geocodingDest: 'pending', boundary: 'pending',
      osrm: 'pending', overpass: 'pending', safety: 'pending', gemini: 'pending'
    });
    
    console.log(`\n==================================================`);
    console.log(`[RouteScan] requestId=${currentRequestId}`);
    console.log(`[RouteScan] Origin Search: "${fVal}"`);
    console.log(`[RouteScan] Destination Search: "${tVal}"`);

    try {
      let startCoord;
      let fromShort;

      if (gpsActive && currentCoords) {
        startCoord = currentCoords;
        fromShort = 'Current Location';
      } else {
        setStatusMsg('📍 Resolving origin...');
        if (fromOpt && fromOpt.display_name === fVal) {
          startCoord = fromOpt;
          fromShort = fromOpt.display_name.split(',')[0];
        } else {
          const res = await locationService.forwardGeocode(fVal);
          if (res.length === 0) throw new Error("Origin location not found.");
          startCoord = res[0];
          fromShort = startCoord.display_name.split(',')[0];
        }
      }
      
      if (activeRequestIdRef.current !== currentRequestId) return;
      console.log(`[RouteScan] Origin Coordinates: ${startCoord.lat}, ${startCoord.lng} (${fromShort})`);
      setDevDiagnostics(prev => ({ ...prev, geocodingOrigin: 'success' }));

      setStatusMsg('📍 Resolving destination...');
      let endCoord;
      let toShort;
      try {
        if (toOpt && toOpt.display_name === tVal) {
          endCoord = toOpt;
          toShort = toOpt.display_name.split(',')[0];
        } else {
          const res = await locationService.forwardGeocode(tVal);
          if (res.length === 0) throw new Error("Destination location not found.");
          endCoord = res[0];
          toShort = endCoord.display_name.split(',')[0];
        }
        if (activeRequestIdRef.current !== currentRequestId) return;
        console.log(`[RouteScan] Destination Coordinates: ${endCoord.lat}, ${endCoord.lng} (${toShort})`);
        setDevDiagnostics(prev => ({ ...prev, geocodingDest: 'success' }));
      } catch (err) {
        setDevDiagnostics(prev => ({ ...prev, geocodingDest: 'error' }));
        throw err;
      }
      
      const isBoundaryValid = isWithinBengaluru(endCoord.lat, endCoord.lng) && isWithinBengaluru(startCoord.lat, startCoord.lng);
      if (!isBoundaryValid) {
        setDevDiagnostics(prev => ({ ...prev, boundary: 'error' }));
        throw new Error("Outside supported area.");
      }
      setDevDiagnostics(prev => ({ ...prev, boundary: 'success' }));

      setStatusMsg('🚀 Generating route alternatives...');
      let response;
      try {
        response = await mapService.getRoute(startCoord.lat, startCoord.lng, endCoord.lat, endCoord.lng, 'driving', abortController.signal);
        if (activeRequestIdRef.current !== currentRequestId) return;
        
        setDevDiagnostics(prev => ({ ...prev, 
          osrm: response.diagnostics?.osrm?.status || 'success',
          overpass: response.diagnostics?.overpass?.status || 'success',
          safety: response.diagnostics?.safety?.status || 'success'
        }));
      } catch (err) {
        if (err.name === 'AbortError') return;
        setDevDiagnostics(prev => ({ ...prev, osrm: 'error' }));
        throw err;
      }
      
      if (!response.routes || response.routes.length === 0) {
        throw new Error("No practical road connection exists between these locations.");
      }

      if (activeRequestIdRef.current !== currentRequestId) return;

      setStatusMsg('🚀 Rendering routes...');

      // 1. Initial Candidate Setup (Skeleton metrics)
      let routesWithTypes = [...response.routes];
      
      routesWithTypes.forEach(r => { r.type = 'candidate'; });

      const initialRoutes = routesWithTypes.map(r => ({
          ...r,
          distanceRaw: r.distanceRaw || parseFloat(r.distance),
          durationRaw: r.durationRaw || parseInt(r.duration),
          infrastructure: null,
          infrastructureStatus: 'loading',
          reports: null,
          score: null,
          confidence: null,
          breakdown: null,
          weather: null,
          jurisdictions: [],
          nearestSafeHaven: null,
          metricsLoaded: false
      }));

      console.log(`[RouteScan] Rendered ${initialRoutes.length} initial route candidates`);

      // 2. Render route geometries immediately
      setRouteData({
        candidates: initialRoutes,
        bounds: getBounds(initialRoutes),
        start: { lat: startCoord.lat, lng: startCoord.lng, label: fromShort }, 
        end: { lat: endCoord.lat, lng: endCoord.lng, label: toShort },
        startLabel: fromShort, 
        endLabel: toShort,
        requestId: currentRequestId
      });
      setPhase('results');
      setIsAiLoading(true);
      setRouteAnalyses({});
      setRouteFallbacks({});
      
      // 3. Asynchronously fetch metrics for each route
      let metricsPromises = initialRoutes.map(async (route) => {
        if (activeRequestIdRef.current !== currentRequestId) return;
        
        let metrics;
        try {
          // Hard timeout for infrastructure request (15s)
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("infrastructure_timeout")), 15000)
          );
          
          metrics = await Promise.race([
            mapService.getRouteMetrics(route.geometry, route.distanceRaw, route.durationRaw, abortController.signal),
            timeoutPromise
          ]);
        } catch (err) {
          if (err.name === 'AbortError') return;
          console.warn(`[RouteScan] Metric timeout/error for route ${route.id}:`, err.message);
          metrics = {
            infrastructure: null,
            infrastructureStatus: err.message === 'infrastructure_timeout' ? 'unavailable' : 'unavailable',
            reports: null,
            score: null,
            confidence: 50,
            breakdown: null,
            weather: null,
            jurisdictions: [],
            nearestSafeHaven: null,
          };
        }

        if (activeRequestIdRef.current !== currentRequestId) return;

        const updatedRouteData = {
          ...metrics,
          infrastructureStatus: metrics.infrastructureStatus || (metrics.infrastructure ? 'available' : 'unavailable'),
          metricsLoaded: true
        };

        // 4. Progressive State Update for this specific route
        setRouteData(prev => {
          if (!prev || prev.requestId !== currentRequestId) return prev;
          
          let updatedCandidates = prev.candidates.map(c => 
            c.id === route.id ? { ...c, ...updatedRouteData } : c
          );

          // Check if all metrics are loaded
          const allLoaded = updatedCandidates.every(c => c.metricsLoaded);
          if (allLoaded) {
            // Sort by score (descending), fallback to distance (ascending)
            updatedCandidates.sort((a, b) => {
              const scoreDiff = (b.score || 0) - (a.score || 0);
              if (scoreDiff !== 0) return scoreDiff;
              return (a.distanceRaw || 0) - (b.distanceRaw || 0);
            });

            updatedCandidates.forEach(c => { c.type = 'balanced'; });
            
            if (updatedCandidates.length > 0) {
              updatedCandidates[0].type = 'safest';
            }
            
            let fastest = [...updatedCandidates].sort((a, b) => (a.durationRaw || 0) - (b.durationRaw || 0))[0];
            if (fastest && fastest.id !== updatedCandidates[0].id) {
              fastest.type = 'fastest';
            }
          }

          return { ...prev, candidates: updatedCandidates };
        });

        // 5. Trigger AI for this specific route now that metrics are available
        try {
           const aiRes = await geminiService.analyzeSingleRoute({
             source: fromShort,
             destination: toShort,
             type: route.type,
             distance: route.distance,
             duration: route.duration,
             safetyScore: metrics.score ?? 'Unknown',
             lighting: metrics.breakdown?.lighting !== undefined && metrics.breakdown?.lighting !== null ? Math.round(metrics.breakdown.lighting) + '/100' : 'Unknown',
             hospitals: Array.isArray(metrics.infrastructure?.hospitals) ? metrics.infrastructure.hospitals.length : (metrics.infrastructure?.hospitals ?? 'Unknown'),
             police: Array.isArray(metrics.infrastructure?.police) ? metrics.infrastructure.police.length : (metrics.infrastructure?.police ?? 'Unknown'),
             commercial: metrics.infrastructure?.commercial ?? 'Unknown',
             communityReports: metrics.reports ?? 'Unknown',
             weather: metrics.weather && metrics.weather.isRaining ? 'Raining' : (metrics.weather && metrics.weather.isFoggy ? 'Foggy' : 'Clear')
           });
           
           if (activeRequestIdRef.current === currentRequestId) {
             setRouteAnalyses(prev => ({ ...prev, [route.id]: aiRes.analysis }));
             setRouteFallbacks(prev => ({ ...prev, [route.id]: aiRes.isFallback }));
             if (!aiRes.isFallback) {
               setDevDiagnostics(prev => ({ ...prev, gemini: 'success' }));
             }
           }
        } catch (e) {
           if (activeRequestIdRef.current === currentRequestId) {
             setRouteAnalyses(prev => ({ ...prev, [route.id]: "AI Analysis temporarily unavailable." }));
             setRouteFallbacks(prev => ({ ...prev, [route.id]: true }));
           }
        }
      });

      // Turn off overall AI loading spinner when all routes finish their AI calls
      Promise.all(metricsPromises).finally(() => {
         if (activeRequestIdRef.current === currentRequestId) {
             setIsAiLoading(false);
         }
      });

    } catch (err) {
      if (err.name === 'AbortError') return;
      console.log(`[RouteScan] Error: ${err.message}`);
      setErrorMsg(`⚠ ${err.message || 'Routing failed.'}`);
      setPhase('error');
    }
  }, [fromVal, toVal, useGps, currentCoords, fromOpt, toOpt])

  // ── Auto-Trigger from Gemini AI Navigation ────────────────────────────────
  const hasAutoTriggered = useRef(false);
  useEffect(() => {
    // Only run if autoTrigger is requested and hasn't been triggered yet
    if (autoTrigger && !hasAutoTriggered.current && (initialOrigin || initialDestination)) {
      hasAutoTriggered.current = true;
      
      // Wait for map to settle
      setTimeout(() => {
        let actualFrom = initialOrigin;
        let actualTo = initialDestination;
        let gpsActive = false;

        // "Current Location" mapping
        if (initialOrigin.toLowerCase() === 'current location') {
           gpsActive = true;
           actualFrom = '';
        }

        setFromVal(actualFrom);
        setToVal(actualTo);
        setUseGps(gpsActive);

        // Safely invoke handleSearch if destination exists
        if (actualTo) {
          handleSearch(actualFrom, actualTo, gpsActive).catch(err => {
            console.error('[UserView] Auto-trigger search failed:', err);
            // Error is already caught by handleSearch, but we catch here just in case.
          });
        }
      }, 800);
    }
  }, [autoTrigger, initialOrigin, initialDestination, handleSearch]);


  const handleClearResults = useCallback(() => {
    setPhase('idle')
    setRouteData(null)
    setRouteAnalyses({})
    setActiveRouteId('all')
    setStatusMsg('')
    setErrorMsg('')
    setToVal('')
  }, [])

  const handleSwap = () => {
    setSwapAnim(true);
    setTimeout(() => setSwapAnim(false), 300);

    let newFrom = toVal;
    let newTo = useGps ? currentAddress : fromVal;
    let newGpsStatus = false; // When swapping away from GPS, we disable live tracking

    setFromVal(newFrom);
    setToVal(newTo);
    setUseGps(newGpsStatus);

    if (newFrom && newTo) {
      handleSearch(newFrom, newTo, newGpsStatus);
    }
  }

  const card  = darkMode ? glass : glassLight
  const txt   = (a, b) => darkMode ? a : b
  const sub   = darkMode ? '#64748b' : '#6b7280'

  const getRouteColor = (type) => {
    if (type === 'safest') return '#22c55e'; // Green
    if (type === 'fastest') return '#f97316'; // Orange
    return '#3b82f6'; // Blue for balanced
  }

  // Restore Active Navigation Trip Session on Reload / Navigation
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem('rakshanav_active_trip');
      if (savedSession) {
        const sessionData = JSON.parse(savedSession);
        if (sessionData && sessionData.activeTrip && sessionData.routeData) {
          setActiveTrip(sessionData.activeTrip);
          setRouteData(sessionData.routeData);
          setPhase('navigating');
        }
      }
    } catch (e) {
      console.warn('[UserView] Failed to restore active trip session:', e);
    }
  }, []);

  const handleStartNavigation = async (route) => {
    const startedAt = new Date().toISOString();
    
    // Create initial trip record in Supabase with status 'in_progress'
    let dbTripId = null;
    if (user && routeData) {
      try {
        const initialTripPayload = {
          user_id: user.id,
          origin_name: routeData.startLabel || 'Current Location',
          origin_lat: routeData.start?.lat || (currentCoords ? currentCoords.lat : 12.9716),
          origin_lng: routeData.start?.lng || (currentCoords ? currentCoords.lng : 77.5946),
          destination_name: routeData.endLabel || 'Destination',
          destination_lat: routeData.end?.lat || 12.9716,
          destination_lng: routeData.end?.lng || 77.5946,
          distance_km: parseFloat(route.distance?.replace(/[^\d.]/g, '')) || 0,
          duration_minutes: parseInt(route.duration?.replace(/[^\d]/g, '')) || 0,
          route_type: route.type || 'safest',
          safety_score: route.score || 85,
          route_geometry: { coordinates: route.geometry?.coordinates || [] },
          lighting_score: route.breakdown?.lighting !== undefined ? `${Math.round(route.breakdown.lighting)}/100` : 'Unknown',
          hospital_count: Array.isArray(route.infrastructure?.hospitals) ? route.infrastructure.hospitals.length : (route.infrastructure?.hospitals || 0),
          police_count: Array.isArray(route.infrastructure?.police) ? route.infrastructure.police.length : (route.infrastructure?.police || 0),
          commercial_count: route.infrastructure?.commercial || 0,
          weather: route.weather?.isRaining ? 'Raining' : 'Clear',
          started_at: startedAt,
          status: 'in_progress'
        };

        const res = await tripService.startTrip(initialTripPayload);
        if (res.success && res.data) {
          dbTripId = res.data.id;
        }
      } catch (err) {
        console.warn('[UserView] Non-blocking error creating start trip record:', err);
      }
    }

    const tripState = {
      ...route,
      dbTripId,
      started_at: startedAt
    };

    setActiveTrip(tripState);
    setPhase('navigating');

    try {
      localStorage.setItem('rakshanav_active_trip', JSON.stringify({
        activeTrip: tripState,
        routeData
      }));
    } catch (e) {
      console.warn('[UserView] Could not store active trip in localStorage:', e);
    }
  };

  const handleEndTrip = async () => {
    if (!activeTrip) return;
    setIsEndingTrip(true);
    
    try {
      let dbTripId = activeTrip.dbTripId;
      if (!dbTripId) {
        try {
          const stored = localStorage.getItem('rakshanav_active_trip');
          if (stored) dbTripId = JSON.parse(stored)?.activeTrip?.dbTripId;
        } catch(e) {}
      }

      const endedAt = new Date().toISOString();
      const finalPayload = {
        ended_at: endedAt,
        status: 'completed',
        distance_km: parseFloat(activeTrip.distance?.replace(/[^\d.]/g, '')) || 0,
        duration_minutes: parseInt(activeTrip.duration?.replace(/[^\d]/g, '')) || 0,
        safety_score: activeTrip.score || 85
      };

      if (dbTripId) {
        await tripService.completeTrip(dbTripId, finalPayload);
      } else if (user && routeData) {
        // Fallback: create & complete full record
        await tripService.saveTrip({
          user_id: user.id,
          origin_name: routeData.startLabel || 'Current Location',
          origin_lat: routeData.start?.lat || 12.9716,
          origin_lng: routeData.start?.lng || 77.5946,
          destination_name: routeData.endLabel || 'Destination',
          destination_lat: routeData.end?.lat || 12.9716,
          destination_lng: routeData.end?.lng || 77.5946,
          distance_km: finalPayload.distance_km,
          duration_minutes: finalPayload.duration_minutes,
          route_type: activeTrip.type || 'safest',
          safety_score: finalPayload.safety_score,
          route_geometry: { coordinates: activeTrip.geometry?.coordinates || [] },
          lighting_score: activeTrip.breakdown?.lighting ? `${Math.round(activeTrip.breakdown.lighting)}/100` : 'Unknown',
          hospital_count: Array.isArray(activeTrip.infrastructure?.hospitals) ? activeTrip.infrastructure.hospitals.length : (activeTrip.infrastructure?.hospitals || 0),
          police_count: Array.isArray(activeTrip.infrastructure?.police) ? activeTrip.infrastructure.police.length : (activeTrip.infrastructure?.police || 0),
          commercial_count: activeTrip.infrastructure?.commercial || 0,
          weather: activeTrip.weather?.isRaining ? 'Raining' : 'Clear',
          started_at: activeTrip.started_at || new Date().toISOString(),
          ended_at: endedAt,
          status: 'completed'
        });
      }
    } catch (err) {
      console.error('[UserView] Error completing trip:', err);
    } finally {
      setIsEndingTrip(false);
      try {
        localStorage.removeItem('rakshanav_active_trip');
      } catch (e) {}
      handleClearResults(); // Reset view to idle
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>
      
      {/* ── MAP LAYER ─────────────────────────────────────────────────── */}
      <Map
        id="mainMap"
        initialViewState={{ longitude: 77.5946, latitude: 12.9716, zoom: 12 }}
        maxBounds={BENGALURU_MAX_BOUNDS}
        minZoom={10}
        maxZoom={18}
        style={{ position: 'absolute', inset: 0 }}
        mapStyle={darkMode ? 'https://tiles.openfreemap.org/styles/dark' : 'https://tiles.openfreemap.org/styles/positron'}
        attributionControl={false}
      >
        {/* Developer Diagnostics Overlay (Dev Mode Only) */}
        {showDevDiagnostics && devDiagnostics && (
          <div style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(15,23,42,0.95)', border: '1px solid #334155', borderRadius: '12px', padding: '16px', color: '#e2e8f0', zIndex: 100, fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", boxShadow: '0 10px 25px rgba(0,0,0,0.5)', width: '220px' }}>
            <div style={{ fontWeight: 'bold', color: '#60a5fa', marginBottom: '8px', borderBottom: '1px solid #334155', paddingBottom: '4px' }}>⚙ Developer Diagnostics</div>
            <DiagnosticRow label="Geocoding Origin" status={devDiagnostics.geocodingOrigin} />
            <DiagnosticRow label="Geocoding Dest" status={devDiagnostics.geocodingDest} />
            <DiagnosticRow label="Boundary" status={devDiagnostics.boundary} />
            <DiagnosticRow label="OSRM Routing" status={devDiagnostics.osrm} />
            <DiagnosticRow label="Infrastructure" status={devDiagnostics.overpass} />
            <DiagnosticRow label="Safety Score" status={devDiagnostics.safety} />
            <DiagnosticRow label="Gemini AI" status={devDiagnostics.gemini} />
          </div>
        )}

        <MapFitter bounds={phase === 'results' ? routeData?.bounds : null} />

        {/* Current Location Marker (Idle) */}
        {phase === 'idle' && currentCoords && (
          <Marker longitude={currentCoords.lng} latitude={currentCoords.lat}>
            <div style={pinStyle('#1e3a5f', '#93c5fd', 'rgba(59,130,246,0.8)')}>
              <div style={{width: 8, height: 8, borderRadius: '50%', background: '#60a5fa', display: 'inline-block', marginRight: 4, animation: 'pulse 2s infinite'}} />
              You
            </div>
          </Marker>
        )}

          {/* Infrastructure Debug Panel (Dev Mode Only) */}
          {showDevDiagnostics && activeRouteId !== 'all' && routeData && (
            <div id="debug-panel" style={{ 
              position: 'fixed', bottom: '20px', right: '20px', width: 'min(360px, 90vw)',
              backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid #4ade80', 
              borderRadius: '8px', padding: '16px', zIndex: 9999, color: '#4ade80',
              fontFamily: 'monospace', fontSize: '12px', maxHeight: '500px', overflowY: 'auto',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
            }}>
              <div style={{ color: '#4ade80', fontWeight: 'bold', marginBottom: '12px', borderBottom: '1px solid #4ade80', paddingBottom: '6px', fontSize: '13px' }}>
                🔧 INFRASTRUCTURE DEBUG PANEL
              </div>
              
              {(() => {
                const f = routeData.candidates.find(r => r.id === activeRouteId)?.infrastructure;
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px', color: '#e2e8f0' }}>
                    <div><strong>Hospitals Found:</strong> {f?.hospitals ?? 0}</div>
                    <div><strong>Police Found:</strong> {f?.police ?? 0}</div>
                    <div><strong>Metro Found:</strong> {f?.metro ?? 0}</div>
                    <div><strong>Commercial Found:</strong> {f?.commercial ?? 0}</div>
                    <div><strong>Fire Stations:</strong> {f?.fireStations ?? 0}</div>
                    <div><strong>ATMs/Banks:</strong> {(f?.atms ?? 0) + (f?.banks ?? 0)}</div>
                    <div><strong>Schools/Unis:</strong> {(f?.schools ?? 0) + (f?.universities ?? 0)}</div>
                    <div><strong>Traffic Signals:</strong> {f?.trafficSignals ?? 0}</div>
                    <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #334155', paddingTop: '8px', marginTop: '4px', color: '#60a5fa', fontWeight: 'bold' }}>
                      Sampled Coordinates: {f?.sampledCoordinatesCount ?? 0} (100m intervals)
                    </div>
                  </div>
                );
              })()}
              
              <div style={{ color: '#fbbf24', fontWeight: 'bold', marginBottom: '4px', borderTop: '1px solid #334155', paddingTop: '8px' }}>
                Raw Overpass JSON
              </div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '10px', color: '#94a3b8', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                {JSON.stringify(routeData.candidates.find(r => r.id === activeRouteId)?.infrastructure?.rawOverpassJSON || { error: "Data unavailable" }, null, 2)}
              </pre>
            </div>
          )}

        {/* Route layers */}
        {(phase === 'results' || phase === 'navigating') && routeData.candidates.map((route) => {
          if (phase === 'navigating' && activeTrip?.id !== route.id) return null;
          
          const isVisible = activeRouteId === 'all' || activeRouteId === route.id || phase === 'navigating';
          if (!isVisible) return null;
          
          const color = getRouteColor(route.type);
          const isSafest = route.type === 'safest';
          
          return (
            <React.Fragment key={route.id}>
              <Source id={`src-${route.id}`} type="geojson" data={toGeoJSON(route.geometry.coordinates)}>
                <Layer 
                  id={`glow2-${route.id}`} 
                  type="line" 
                  paint={{ 'line-color': color, 'line-width': isSafest ? 28 : 20, 'line-opacity': 0.05 }} 
                />
                <Layer 
                  id={`glow1-${route.id}`} 
                  type="line" 
                  paint={{ 'line-color': color, 'line-width': 13, 'line-opacity': 0.20 }} 
                />
                <Layer 
                  id={`core-${route.id}`}  
                  type="line" 
                  paint={{ 'line-color': color, 'line-width': isSafest ? 6 : 4,  'line-opacity': 1 }} 
                />
              </Source>
              
              {phase === 'results' && (
                <Marker longitude={midOf(route.geometry.coordinates)[0]} latitude={midOf(route.geometry.coordinates)[1]}>
                  <div style={floatLabel(color)}>
                    {route.type.toUpperCase()} • {route.duration}
                  </div>
                </Marker>
              )}
            </React.Fragment>
          );
        })}

        {/* Start / End markers */}
        {(phase === 'results' || phase === 'navigating') && routeData && (
          <>
            <Marker longitude={routeData.start.lng} latitude={routeData.start.lat}>
              <div style={pinStyle('#1e3a5f', '#93c5fd', 'rgba(59,130,246,0.6)')}>📍 {routeData.startLabel}</div>
            </Marker>
            <Marker longitude={routeData.end.lng} latitude={routeData.end.lat}>
              <div style={pinStyle('#14532d', '#4ade80', 'rgba(34,197,94,0.6)')}>🏠 {routeData.endLabel}</div>
            </Marker>
          </>
        )}

        {/* POI Markers for Active Route */}
        {(phase === 'results' || phase === 'navigating') && routeData && (
          (() => {
            const currentActiveId = phase === 'navigating' && activeTrip ? activeTrip.id : (activeRouteId !== 'all' ? activeRouteId : routeData.candidates[0].id);
            const activeRoute = routeData.candidates.find(r => r.id === currentActiveId);
            if (!activeRoute || !activeRoute.infrastructure) return null;
            
            const renderPOIs = (poiArray, icon, bg, text, shadow, categoryName) => {
              if (!poiArray || !Array.isArray(poiArray)) return null;
              return poiArray.map((poi, idx) => {
                const poiId = poi.id || `${categoryName}-${idx}-${poi.lat}-${poi.lng}`;
                const isSelected = selectedPoi && selectedPoi.id === poiId;
                return (
                  <Marker 
                    key={`${poi.type || categoryName}-${idx}-${poiId}`} 
                    longitude={poi.lng} 
                    latitude={poi.lat}
                  >
                    <div 
                      title={poi.name}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPoi({
                          ...poi,
                          id: poiId,
                          icon,
                          categoryName,
                          bg,
                          text
                        });
                      }}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: bg,
                        border: `2px solid ${text}`,
                        boxShadow: shadow,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transform: isSelected ? 'scale(1.25)' : 'scale(1)',
                        transition: 'transform 0.15s ease',
                        zIndex: isSelected ? 100 : 1
                      }}
                    >
                      {icon}
                    </div>
                  </Marker>
                );
              });
            };

            return (
              <>
                {renderPOIs(activeRoute.infrastructure.police, '👮', '#1e3a8a', '#93c5fd', '0 0 12px rgba(59,130,246,0.6)', 'Police Station')}
                {renderPOIs(activeRoute.infrastructure.hospitals, '🏥', '#7f1d1d', '#fca5a5', '0 0 12px rgba(239,68,68,0.6)', 'Hospital')}
                {renderPOIs(activeRoute.infrastructure.fireStations, '🚒', '#7c2d12', '#ffedd5', '0 0 12px rgba(249,115,22,0.6)', 'Fire Station')}
                {renderPOIs(activeRoute.infrastructure.pharmacies, '💊', '#14532d', '#86efac', '0 0 12px rgba(34,197,94,0.6)', 'Pharmacy')}
              </>
            );
          })()
        )}

        {/* POI Details Popup */}
        {selectedPoi && (
          <Popup
            longitude={selectedPoi.lng}
            latitude={selectedPoi.lat}
            closeButton={true}
            closeOnClick={false}
            onClose={() => setSelectedPoi(null)}
            anchor="bottom"
            offset={16}
          >
            <div style={{ padding: '8px 10px', minWidth: '180px', maxWidth: '260px', color: '#0f172a', fontFamily: "'Inter', sans-serif" }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: selectedPoi.text === '#93c5fd' ? '#2563eb' : selectedPoi.text === '#fca5a5' ? '#dc2626' : selectedPoi.text === '#86efac' ? '#16a34a' : '#ea580c', textTransform: 'uppercase', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>{selectedPoi.icon}</span> {selectedPoi.categoryName || 'Safety Facility'}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '4px', lineHeight: 1.2 }}>
                {selectedPoi.name || 'Safety Infrastructure'}
              </div>
              {selectedPoi.distanceKm !== undefined && (
                <div style={{ fontSize: '11px', color: '#475569', marginBottom: '2px' }}>
                  📍 {selectedPoi.distanceKm} km from route
                </div>
              )}
              {selectedPoi.address && (
                <div style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedPoi.address}
                </div>
              )}
            </div>
          </Popup>
        )}

        {/* Layer: Community */}
        {showCommunity && communityReports && communityReports.length > 0 && communityReports.map((report) => (
          <Marker key={report.id} longitude={report.lng} latitude={report.lat}>
            <div style={pinStyle('#450a0a', '#fca5a5', 'rgba(248,113,113,0.4)')}>
               ⚠️ {report.category ? report.category.replace(/_/g, ' ') : 'Alert'}
            </div>
          </Marker>
        ))}
        
        {/* Layer: Police Jurisdictions */}
        {showJurisdictions && jurisdictionsData && (
          <Source id="jurisdictions-src" type="geojson" data={jurisdictionsData}>
            <Layer 
              id="jurisdictions-fill" 
              type="fill" 
              paint={{
                'fill-color': '#3b82f6',
                'fill-opacity': 0.1
              }} 
            />
            <Layer 
              id="jurisdictions-line" 
              type="line" 
              paint={{
                'line-color': '#60a5fa',
                'line-width': 2,
                'line-dasharray': [2, 2]
              }} 
            />
            <Layer 
              id="jurisdictions-label"
              type="symbol"
              layout={{
                'text-field': ['get', 'Name'],
                'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                'text-size': 11,
                'text-anchor': 'center'
              }}
              paint={{
                'text-color': '#93c5fd',
                'text-halo-color': 'rgba(15, 23, 42, 0.9)',
                'text-halo-width': 2
              }}
            />
          </Source>
        )}

        {/* Layer Overlays (Empty States) */}
        <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '10px', zIndex: 10, pointerEvents: 'none' }}>
          {showTraffic && (
            <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '8px', color: '#94a3b8', fontSize: '11px', backdropFilter: 'blur(10px)', fontFamily: "'Inter', sans-serif" }}>
              Live traffic data unavailable
            </div>
          )}
          {showStreetlights && (
            <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '8px', color: '#94a3b8', fontSize: '11px', backdropFilter: 'blur(10px)', fontFamily: "'Inter', sans-serif" }}>
              Lighting data unavailable
            </div>
          )}
        </div>
      </Map>

      {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
      <div className={`absolute left-2 right-2 md:left-4 md:right-auto md:w-[380px] max-h-[calc(100dvh-130px)] md:max-h-[calc(100dvh-90px)] z-30 flex flex-col gap-3 ${isDashboard ? 'top-[64px]' : 'top-4'} pb-[80px] md:pb-0 overflow-y-auto custom-scrollbar`}>

        {/* Search form */}
        <div style={{ ...card({ padding: '20px' }), flexShrink: 0, position: 'relative', zIndex: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '16px', color: txt('#fff', '#111') }}>Safe Route Engine</div>
            {phase === 'results' && (
              <button onClick={handleClearResults} style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>Reset</button>
            )}
          </div>

          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', transition: 'transform 0.3s', transform: swapAnim ? 'translateY(48px)' : 'translateY(0)', zIndex: activeLocationField === 'origin' ? 50 : 1 }}>
              <div style={{ flex: 1 }}>
                {useGps ? (
                  <div style={{ background: darkMode ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '12px', padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <div style={{width: 10, height: 10, borderRadius: '50%', background: '#3b82f6'}} />
                      <span style={{ fontSize: '12px', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>Current Location</span>
                    </div>
                    <div style={{ fontSize: '13px', color: txt('#fff', '#111'), marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {gpsStatus === 'locating' ? 'Locating...' : currentAddress}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={requestGPS} style={smallBtn(darkMode)}>↻ Refresh</button>
                      <button onClick={() => setUseGps(false)} style={smallBtn(darkMode)}>✎ Override</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <AutocompleteField value={fromVal} onChange={setFromVal} onSelect={setFromOpt} placeholder="Origin..." dot="#3b82f6" dark={darkMode} onFocus={() => setActiveLocationField('origin')} onBlur={() => setActiveLocationField(null)} />
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => { if(gpsStatus !== 'denied') setUseGps(true); else requestGPS(); }} style={smallBtn(darkMode)}>
                        📍 My Location
                      </button>
                      <button onClick={() => setFromVal('Home')} style={smallBtn(darkMode)}>🏠 Home</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Swap Button Overlay */}
            <div style={{ position: 'absolute', right: '-16px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
              <button 
                onClick={handleSwap}
                style={{ 
                  background: darkMode ? '#1e293b' : '#fff', border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`, 
                  borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: txt('#fff', '#111')
                }}
              >
                ⇅
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', transition: 'transform 0.3s', transform: swapAnim ? 'translateY(-48px)' : 'translateY(0)', zIndex: activeLocationField === 'destination' ? 50 : 1 }}>
              <div style={{ flex: 1 }}>
                <AutocompleteField value={toVal} onChange={setToVal} onSelect={setToOpt} placeholder="Search Destination..." dot="#22c55e" dark={darkMode} onFocus={() => setActiveLocationField('destination')} onBlur={() => setActiveLocationField(null)} />
                {toVal === '' && (
                   <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                     <button onClick={() => setToVal('Airport')} style={smallBtn(darkMode)}>✈ Airport</button>
                     <button onClick={() => setToVal('Railway Station')} style={smallBtn(darkMode)}>🚆 Station</button>
                   </div>
                )}
              </div>
            </div>
          </div>

          <button onClick={() => handleSearch()} disabled={phase === 'searching' || phase === 'analyzing'} style={{
            width: '100%', padding: '12px',
            background: (phase === 'searching' || phase === 'analyzing') ? 'rgba(34,197,94,0.35)' : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
            border: 'none', borderRadius: '11px', color: '#fff',
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px',
            cursor: (phase === 'searching' || phase === 'analyzing') ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
          }}>
            {(phase === 'searching' || phase === 'analyzing') ? <><Spinner /> <span style={{ marginLeft: '6px' }}>{statusMsg || 'Analyzing...'}</span></> : '🛡 Scan Safe Routes'}
          </button>

          {phase === 'error' && errorMsg && (
            <div style={{ marginTop: '10px', padding: '10px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', fontSize: '11px', color: '#fca5a5' }}>
              {errorMsg}
              {(gpsStatus === 'out_of_bounds' || errorMsg.includes('outside RakshaNav')) && (
                 <button onClick={() => { setUseGps(false); setFromVal('Majestic, Bengaluru'); setToVal('Koramangala, Bengaluru'); setPhase('idle'); setErrorMsg(''); }} style={{ display: 'block', width: '100%', padding: '8px', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '6px', marginTop: '10px', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: 600 }}>Explore Bengaluru Routes</button>
              )}
            </div>
          )}
        </div>

        {/* Loading Skeletons when analyzing before routeData is populated */}
        {phase === 'analyzing' && !routeData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
            <RouteSkeleton darkMode={darkMode} card={card} />
            <RouteSkeleton darkMode={darkMode} card={card} />
          </div>
        )}

        {/* Safety Intelligence Header & Results cards */}
        {(phase === 'results' || (phase === 'analyzing' && routeData)) && routeData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
            {/* Main Title & Action */}
            <div style={{ ...card({ padding: '16px' }), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 2px 0', letterSpacing: '-0.5px', color: txt('#fff', '#111') }}>
                  Safety Intelligence
                </h1>
                <div style={{ fontSize: '12px', color: sub, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#60a5fa' }}>📍</span> 
                  <span style={{ color: txt('#fff', '#334155'), fontWeight: 600 }}>{routeData?.startLabel}</span>
                  <span>→</span>
                  <span style={{ color: txt('#fff', '#334155'), fontWeight: 600 }}>{routeData?.endLabel}</span>
                </div>
              </div>
              <button 
                onClick={handleClearResults}
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', color: txt('#e2e8f0', '#475569'), fontSize: '12px', fontWeight: 600 }}
              >
                ✕ Clear
              </button>
            </div>
            
            {/* Route Switcher */}
            <div style={{ ...card({ padding: '4px' }), display: 'flex', gap: '4px', flexShrink: 0 }}>
              <button onClick={() => setActiveRouteId('all')} style={switchStyle('all', activeRouteId, darkMode)}>All Options</button>
              {routeData.candidates.map(r => (
                <button key={r.id} onClick={() => setActiveRouteId(r.id)} style={switchStyle(r.id, activeRouteId, darkMode)}>
                  {r.type === 'safest' ? '🛡 Safest' : r.type === 'fastest' ? '⚡ Fast' : r.type === 'candidate' ? '⏳ Analyzing...' : '⚖ Balanced'}
                </button>
              ))}
            </div>

            {/* Candidate Route Cards */}
            {routeData.candidates.map(r => {
              const isActive = activeRouteId === 'all' || activeRouteId === r.id;
              if (!isActive) return null;
              if (phase === 'analyzing') return <RouteSkeleton key={r.id} darkMode={darkMode} card={card} />;
              return <RouteCard key={r.id} data={r} darkMode={darkMode} sub={sub} card={card} txt={txt} color={getRouteColor(r.type)} routeAnalyses={routeAnalyses} routeFallbacks={routeFallbacks} onStart={() => handleStartNavigation(r)} />
            })}

          </div>
        )}

        {/* Navigation Mode */}
        {phase === 'navigating' && activeTrip && (
          <div style={{ ...card({ padding: '24px' }), flexShrink: 0, border: `1px solid ${getRouteColor(activeTrip.type)}`, boxShadow: `0 10px 40px ${getRouteColor(activeTrip.type)}30` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '20px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444', animation: 'pulse 1.5s infinite' }}></span>
                Live Navigation
              </div>
            </div>
            
            <div style={{ fontSize: '13px', color: '#e2e8f0', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
               <span style={{ color: 'transparent' }}>📍</span> 
               <span style={{ color: 'white', fontWeight: 600 }}>{routeData?.startLabel}</span>
               <span>→</span>
               <span style={{ color: 'white', fontWeight: 600 }}>{routeData?.endLabel}</span>
            </div>
            
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
               <div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }}>Est. Arrival</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{activeTrip.duration}</div>
               </div>
               <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
               <div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }}>Distance</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{activeTrip.distance}</div>
               </div>
            </div>
            
            <button 
              onClick={handleEndTrip} 
              disabled={isEndingTrip}
              style={{
                width: '100%', padding: '14px',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                border: 'none', borderRadius: '11px', color: '#fff',
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px',
                cursor: isEndingTrip ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                boxShadow: '0 4px 15px rgba(239,68,68,0.4)',
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
              }}
            >
              {isEndingTrip ? <Spinner /> : '⏹ End Trip & Save'}
            </button>
          </div>
        )}
      </div>

    </div>
  )
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

const smallBtn = (darkMode) => ({
  background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
  border: 'none', borderRadius: '6px', color: darkMode ? '#e2e8f0' : '#475569',
  fontSize: '10px', padding: '5px 8px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontWeight: 600
})

function getPoiLabel(poiArray, typeName) {
  if (poiArray === null || poiArray === undefined) return `Data unavailable`;
  if (typeof poiArray === 'number') {
    return poiArray === 0 ? `0 ${typeName}` : `${poiArray} ${typeName}`;
  }
  if (Array.isArray(poiArray)) {
    return poiArray.length === 0 ? `0 ${typeName}` : `${poiArray.length} ${typeName}`;
  }
  return `Data unavailable`;
}

function RouteCard({ data, darkMode, sub, card, txt, color, routeAnalyses, routeFallbacks, onStart }) {
  // Never hardcoded strings, always generated from real data
  return (
    <div style={{ ...card({ padding: '16px' }), border: `1px solid ${color}66`, flexShrink: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div>
          <div style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", color, letterSpacing: '0.07em', marginBottom: '3px', textTransform: 'uppercase' }}>
            {data.type} ROUTE
          </div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: txt('#fff', '#111') }}>
            {data.duration} • {data.distance}
          </div>
        </div>
        <ScoreRing score={data.score} color={color} />
      </div>
      
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <Pill label={getPoiLabel(data.infrastructure?.police, 'Police')} icon="👮" color={color} />
        <Pill label={getPoiLabel(data.infrastructure?.hospitals, 'Hospitals')} icon="🏥" color={color} />
        <Pill label={data.breakdown?.lighting !== undefined && data.breakdown?.lighting !== null ? `${Math.round(data.breakdown.lighting)}/100 Light` : 'Lighting data unavailable'} icon="💡" color={color} />
        <Pill label={data.reports !== null && data.reports !== undefined ? `${data.reports} Reports` : 'Reports unavailable'} icon="⚠️" color={color} />
        <Pill label={`${data.confidence ?? 0}% Conf`} icon="📊" color={color} />
        {data.jurisdictions && data.jurisdictions.length > 0 && (
          <Pill label={`${data.jurisdictions.length} Police Jurisdictions`} icon="🛡" color={color} />
        )}
      </div>

      {data.infrastructure?.status === 'partial' && (
        <div style={{ padding: '8px 12px', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: '8px', marginBottom: '12px', fontSize: '11px', color: '#fde047' }}>
          ⚠️ Some infrastructure data is temporarily unavailable
        </div>
      )}
      {data.infrastructure?.status === 'unavailable' && (
        <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', marginBottom: '12px', fontSize: '11px', color: '#fca5a5' }}>
          🛡 Safety infrastructure data temporarily unavailable
        </div>
      )}

      {data.nearestSafeHaven && (
        <div style={{ padding: '8px 12px', background: `${color}10`, border: `1px solid ${color}30`, borderRadius: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>
            {data.nearestSafeHaven.type === 'police' ? '👮' : data.nearestSafeHaven.type === 'hospital' ? '🏥' : '🚒'}
          </span>
          <div>
            <div style={{ fontSize: '10px', color: color, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', fontWeight: 600 }}>Nearest Safe Haven</div>
            <div style={{ fontSize: '13px', color: txt('#fff', '#111'), fontWeight: 600 }}>
              {data.nearestSafeHaven.name} <span style={{ color: sub, fontWeight: 400 }}>({data.nearestSafeHaven.distanceKm} km)</span>
            </div>
          </div>
        </div>
      )}

      <div style={{ fontSize: '12px', color: sub, marginBottom: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '14px' }}>✨</span> {routeFallbacks && routeFallbacks[data.id] ? 'Deterministic Safety Summary:' : 'AI Safety Analysis:'}
      </div>
      <div style={{ padding: '10px 12px', background: 'rgba(15,23,42,0.4)', borderRadius: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.9)', lineHeight: 1.5, marginBottom: '16px', borderLeft: `2px solid ${routeFallbacks && routeFallbacks[data.id] ? '#94a3b8' : '#60a5fa'}` }}>
        {routeAnalyses[data.id] ? (
          routeAnalyses[data.id]
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid rgba(96,165,250,0.3)', borderTopColor: '#60a5fa', animation: 'spin 1s linear infinite' }} />
             <span style={{ color: sub }}>Analyzing...</span>
          </div>
        )}
      </div>

      <button 
        onClick={onStart}
        style={{
          width: '100%', padding: '12px',
          background: color, color: '#fff',
          border: 'none', borderRadius: '8px',
          fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px',
          cursor: 'pointer', transition: 'all 0.2s', marginTop: 'auto'
        }}
        onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
        onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
      >
        Start Navigation
      </button>
    </div>
  )
}

const switchStyle = (id, activeId, darkMode) => {
  const active = id === activeId;
  return {
    flex: 1, padding: '8px 4px',
    background: active ? (darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)') : 'transparent',
    border: 'none', borderRadius: '10px',
    color: active ? (darkMode ? '#fff' : '#111') : '#6b7280',
    fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '11px',
    cursor: 'pointer', transition: 'all 0.15s',
  }
}

function AutocompleteField({ value, onChange, onSelect, placeholder, dot, dark, onFocus, onBlur }) {
  const [options, setOptions] = useState([]);
  const [showOptions, setShowOptions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceRef = useRef(null);
  const abortControllerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowOptions(false);
        if (onBlur) onBlur();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [onBlur]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [options]);

  const fetchOptions = async (query) => {
    if (!query || query.trim().length < 2) {
      setOptions([]);
      setIsSearching(false);
      setShowOptions(false);
      return;
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsSearching(true);
    setSearchError('');
    setShowOptions(true);

    try {
      const results = await locationService.forwardGeocode(query);
      if (results && results.length > 0) {
        const uniqueResults = [];
        const seenKeys = new Set();
        
        results.forEach(res => {
          const primaryName = res.display_name ? res.display_name.split(',')[0].trim() : '';
          const latKey = parseFloat(res.lat).toFixed(4);
          const lngKey = parseFloat(res.lng).toFixed(4);
          const key = `${primaryName}_${latKey}_${lngKey}`.toLowerCase();
          
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            uniqueResults.push(res);
          }
        });

        setOptions(uniqueResults.slice(0, 8));
      } else {
        setOptions([]);
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.warn('[AutocompleteField] Geocoding warning:', e.message);
        setOptions([]);
        setSearchError("Location search temporarily unavailable.");
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (val) => {
    onChange(val);
    setShowOptions(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchOptions(val), 350);
  };

  const handleSelect = (opt) => {
    const selectedName = opt.display_name;
    onChange(selectedName);
    setShowOptions(false);
    if (onBlur) onBlur();
    onSelect(opt);
  };

  const handleKeyDown = (e) => {
    if (!showOptions || options.length === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < options.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < options.length) {
        handleSelect(options[selectedIndex]);
      } else {
        handleSelect(options[0]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowOptions(false);
      if (onBlur) onBlur();
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', zIndex: showOptions ? 9999 : 1 }}>
      <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '8px', height: '8px', borderRadius: '50%', background: dot, pointerEvents: 'none', zIndex: 2 }} />
      <input 
        value={value} 
        onChange={e => handleInputChange(e.target.value)} 
        onFocus={() => { 
          if (onFocus) onFocus();
          if (value && value.trim().length >= 2) fetchOptions(value); 
        }}
        onBlur={() => {
          if (onBlur) onBlur();
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck="false"
        style={{ 
          width: '100%', padding: '11px 12px 11px 30px', 
          background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', 
          border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)'}`, 
          borderRadius: '10px', color: dark ? '#e2e8f0' : '#111', 
          fontSize: '13px', outline: 'none', boxSizing: 'border-box' 
        }}
      />
      {showOptions && (
        <div 
          style={{ 
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, 
            background: dark ? '#0f172a' : '#ffffff', 
            border: `1px solid ${dark ? '#334155' : '#cbd5e1'}`, 
            borderRadius: '12px', zIndex: 9999, overflow: 'hidden', 
            boxShadow: '0 12px 32px rgba(0,0,0,0.5)', 
            maxHeight: window.innerWidth < 768 ? '260px' : '300px', 
            overflowY: 'auto' 
          }}
        >
          {isSearching ? (
             <div style={{ padding: '12px 14px', fontSize: '13px', color: dark ? '#94a3b8' : '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <Spinner /> Searching locations...
             </div>
          ) : options.length > 0 ? (
            options.map((opt, i) => {
              const parts = opt.display_name ? opt.display_name.split(',') : ['Location'];
              const primaryName = parts[0].trim();
              const secondaryName = parts.slice(1).join(',').trim();
              const isSelected = i === selectedIndex;
              return (
                <div 
                  key={i} 
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(opt); }} 
                  onTouchStart={(e) => { e.preventDefault(); handleSelect(opt); }}
                  onMouseEnter={() => setSelectedIndex(i)}
                  style={{ 
                    padding: '10px 12px', minHeight: '56px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
                    cursor: 'pointer', borderBottom: i === options.length - 1 ? 'none' : `1px solid ${dark ? '#1e293b' : '#f1f5f9'}`, 
                    background: isSelected ? (dark ? '#1e293b' : '#f8fafc') : (dark ? '#0f172a' : '#ffffff') 
                  }} 
                >
                  <div style={{ fontWeight: 600, fontSize: '14px', color: dark ? '#f8fafc' : '#0f172a', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '16px' }}>📍</span> 
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{primaryName}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: dark ? '#94a3b8' : '#64748b', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginLeft: '22px' }}>
                    {secondaryName || 'Bengaluru, Karnataka'}
                  </div>
                </div>
              );
            })
          ) : searchError ? (
            <div style={{ padding: '12px 14px', fontSize: '13px', color: '#f87171' }}>
              {searchError}
            </div>
          ) : (
            <div style={{ padding: '12px 14px', fontSize: '13px', color: dark ? '#94a3b8' : '#64748b' }}>
              No matching locations found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScoreRing({ score, color }) {
  if (score === null || score === undefined) {
    return (
      <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', border: `1px solid ${color}30` }}>
        <div style={{ fontSize: '9px', color: '#94a3b8', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace" }}>N/A</div>
      </div>
    );
  }
  const rawScore = typeof score === 'number' ? score : (parseFloat(score) || 0);
  const normalizedTen = rawScore > 10 ? rawScore / 10 : rawScore;
  const displayScore = normalizedTen.toFixed(1);
  const r = 22, stroke = 4, circ = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, normalizedTen / 10)) * circ;
  return (
    <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0 }}>
      <svg width="56" height="56" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={circ - pct} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', fontWeight: 700, color, lineHeight: 1 }}>{displayScore}</div>
        <div style={{ fontSize: '8px', color: '#4a7aab', fontFamily: "'JetBrains Mono', monospace" }}>/10</div>
      </div>
    </div>
  );
}

function Pill({ label, icon, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: color + '15', border: `1px solid ${color}30`, borderRadius: '20px', padding: '4px 9px' }}>
      <span style={{ fontSize: '11px' }}>{icon}</span>
      <span style={{ fontSize: '11px', color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{label}</span>
    </div>
  )
}

function Spinner() {
  return <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
}

const pinStyle = (bg, color, shadow) => ({
  background: bg, color, border: `1.5px solid ${shadow}`, borderRadius: '10px',
  padding: '5px 11px', fontSize: '11px', fontWeight: 700,
  fontFamily: "'JetBrains Mono', monospace", boxShadow: `0 0 16px ${shadow}`, whiteSpace: 'nowrap',
})

const floatLabel = (color) => ({
  background: color + 'ec', color: '#fff', borderRadius: '8px', padding: '5px 10px',
  fontSize: '10px', fontWeight: 800, fontFamily: 'Syne, sans-serif', letterSpacing: '0.06em',
  boxShadow: `0 4px 20px ${color}44`, whiteSpace: 'nowrap',
})

function DiagnosticRow({ label, status }) {
  let icon = '⏳';
  let color = '#94a3b8';
  if (status === 'success') { icon = '✓'; color = '#4ade80'; }
  if (status === 'error') { icon = '❌'; color = '#f87171'; }
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
      <span>{label}</span>
      <span style={{ color, fontWeight: 'bold' }}>{icon}</span>
    </div>
  )
}

function RouteSkeleton({ darkMode, card }) {
  const bg = darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  return (
    <div style={{ ...card({ padding: '16px' }), border: '1px dashed rgba(156,163,175,0.3)', flexShrink: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <div style={{ width: '80px', height: '12px', background: bg, borderRadius: '4px', marginBottom: '8px', animation: 'pulse 1.5s infinite' }}></div>
          <div style={{ width: '120px', height: '18px', background: bg, borderRadius: '4px', animation: 'pulse 1.5s infinite' }}></div>
        </div>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: bg, animation: 'pulse 1.5s infinite' }}></div>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
         <div style={{ width: '70px', height: '24px', background: bg, borderRadius: '12px', animation: 'pulse 1.5s infinite' }}></div>
         <div style={{ width: '80px', height: '24px', background: bg, borderRadius: '12px', animation: 'pulse 1.5s infinite' }}></div>
         <div style={{ width: '90px', height: '24px', background: bg, borderRadius: '12px', animation: 'pulse 1.5s infinite' }}></div>
      </div>
      <div style={{ width: '100%', height: '60px', background: bg, borderRadius: '8px', animation: 'pulse 1.5s infinite' }}></div>
    </div>
  )
}
