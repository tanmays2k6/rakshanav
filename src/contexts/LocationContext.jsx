import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { locationService } from '../services/locationService';

const LocationContext = createContext(null);

// Bengaluru Metropolitan Region bounding box
export const BENGALURU_BOUNDS = {
  minLat: 12.5,
  maxLat: 13.4,
  minLng: 77.2,
  maxLng: 77.9
};

export const isWithinBengaluru = (lat, lng) => {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  return (
    lat >= BENGALURU_BOUNDS.minLat &&
    lat <= BENGALURU_BOUNDS.maxLat &&
    lng >= BENGALURU_BOUNDS.minLng &&
    lng <= BENGALURU_BOUNDS.maxLng
  );
};

export const calculateFreshness = (timestamp) => {
  if (!timestamp) return 'UNAVAILABLE';
  const ageMs = Date.now() - timestamp;
  if (ageMs < 30 * 1000) return 'LIVE'; // < 30 seconds
  if (ageMs < 5 * 60 * 1000) return 'RECENT'; // < 5 minutes
  return 'STALE';
};

export function LocationProvider({ children }) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'requesting' | 'success' | 'error' | 'denied' | 'unavailable' | 'timeout'
  const [coordinates, setCoordinates] = useState(null); // { latitude, longitude }
  const [accuracy, setAccuracy] = useState(null);
  const [heading, setHeading] = useState(null);
  const [speed, setSpeed] = useState(null);
  const [altitude, setAltitude] = useState(null);
  const [timestamp, setTimestamp] = useState(null);
  
  const [address, setAddress] = useState(null);
  const [addressDetails, setAddressDetails] = useState(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState(null);

  const [error, setError] = useState(null);
  const [errorCode, setErrorCode] = useState(null);

  const watchIdRef = useRef(null);
  const lastGeocodedCoordsRef = useRef(null);
  const isMountedRef = useRef(true);

  // Helper: map GeolocationPositionError to clear user-friendly messages
  const mapGeolocationError = (err) => {
    let msg = 'Unable to acquire location.';
    let code = err?.code || 0;

    switch (code) {
      case 1: // PERMISSION_DENIED
        msg = 'Location permission is disabled. Please enable location access in your browser settings.';
        break;
      case 2: // POSITION_UNAVAILABLE
        msg = 'Unable to determine your GPS position. Retrying...';
        break;
      case 3: // TIMEOUT
        msg = 'GPS signal request timed out. Retrying...';
        break;
      default:
        if (err?.message) msg = err.message;
    }
    return { message: msg, code };
  };

  // Reverse geocode asynchronously without blocking GPS coordinates
  const performReverseGeocode = useCallback(async (lat, lng) => {
    // Avoid spamming reverse geocoding if moved less than ~50 meters
    if (lastGeocodedCoordsRef.current) {
      const dLat = Math.abs(lastGeocodedCoordsRef.current.lat - lat);
      const dLng = Math.abs(lastGeocodedCoordsRef.current.lng - lng);
      if (dLat < 0.0005 && dLng < 0.0005 && address) {
        return;
      }
    }

    setAddressLoading(true);
    setAddressError(null);

    try {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[Location] Reverse geocoding started:', lat, lng);
      }
      const data = await locationService.reverseGeocode(lat, lng);
      if (!isMountedRef.current) return;

      const addrObj = data?.address || {};
      const suburb = addrObj.suburb || addrObj.neighbourhood || addrObj.city_district || addrObj.residential || addrObj.quarter || addrObj.subdivision;
      const road = addrObj.road || addrObj.street || addrObj.pedestrian;
      const city = addrObj.city || addrObj.town || addrObj.municipality || 'Bengaluru';
      const state = addrObj.state || 'Karnataka';

      const shortDisplay = [suburb || road, city].filter(Boolean).join(', ') || data?.displayName || 'Current Location';

      setAddress(shortDisplay);
      setAddressDetails({
        suburb,
        road,
        city,
        state,
        city_district: addrObj.city_district,
        raw: addrObj,
        displayName: data?.displayName
      });
      lastGeocodedCoordsRef.current = { lat, lng };

      if (process.env.NODE_ENV !== 'production') {
        console.debug('[Location] Address resolved:', shortDisplay);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      console.warn('[Location] Reverse geocoding failed (GPS remains active):', err);
      setAddressError('Address lookup unavailable');
      // Do NOT erase coordinates or mark GPS as unavailable!
      if (!address) {
        setAddress('Location detected');
      }
    } finally {
      if (isMountedRef.current) {
        setAddressLoading(false);
      }
    }
  }, [address]);

  // Handle successful position update from browser GPS
  const handlePositionSuccess = useCallback((pos) => {
    if (!pos?.coords) return;
    const { latitude, longitude, accuracy: acc, heading: hd, speed: sp, altitude: alt } = pos.coords;
    const time = pos.timestamp || Date.now();

    if (process.env.NODE_ENV !== 'production') {
      console.debug('[Location] Position received:', { latitude, longitude, accuracy: acc });
    }

    setStatus('success');
    setError(null);
    setErrorCode(null);
    setCoordinates({ latitude, longitude });
    setAccuracy(acc);
    setHeading(hd ?? null);
    setSpeed(sp ?? null);
    setAltitude(alt ?? null);
    setTimestamp(time);

    // Asynchronously trigger reverse geocode
    performReverseGeocode(latitude, longitude);
  }, [performReverseGeocode]);

  // Handle position error
  const handlePositionError = useCallback((err) => {
    console.warn('[Location] Geolocation error:', err);
    const { message, code } = mapGeolocationError(err);
    
    // If we already have a previous valid coordinate, do NOT destroy it permanently on a transient timeout
    setErrorCode(code);
    if (code === 1) {
      setStatus('denied');
      setError(message);
    } else if (code === 2) {
      setStatus(prev => prev === 'success' ? 'success' : 'unavailable');
      setError(message);
    } else if (code === 3) {
      setStatus(prev => prev === 'success' ? 'success' : 'timeout');
      setError(message);
    } else {
      setStatus(prev => prev === 'success' ? 'success' : 'error');
      setError(message);
    }
  }, []);

  // Request / refresh location with high accuracy
  const refreshLocation = useCallback(async (options = {}) => {
    if (!navigator.geolocation) {
      setStatus('unavailable');
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setStatus('requesting');
    setError(null);

    const geoOptions = {
      enableHighAccuracy: options.highAccuracy !== false,
      timeout: options.timeout || 12000,
      maximumAge: options.maximumAge !== undefined ? options.maximumAge : 5000
    };

    if (process.env.NODE_ENV !== 'production') {
      console.debug('[Location] Requesting fresh location...');
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handlePositionSuccess(pos);
          resolve(pos);
        },
        (err) => {
          handlePositionError(err);
          resolve(null);
        },
        geoOptions
      );
    });
  }, [handlePositionSuccess, handlePositionError]);

  // Initialize single watcher on mount
  useEffect(() => {
    isMountedRef.current = true;

    if (!navigator.geolocation) {
      setStatus('unavailable');
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setStatus('requesting');

    // First do a fast high-accuracy getCurrentPosition
    navigator.geolocation.getCurrentPosition(
      handlePositionSuccess,
      (err) => {
        // If initial high accuracy fails, retry with cached/standard accuracy before giving up
        console.warn('[Location] Initial high-accuracy GPS failed, falling back to standard accuracy:', err);
        navigator.geolocation.getCurrentPosition(
          handlePositionSuccess,
          handlePositionError,
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 }
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    // Then establish continuous watcher
    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        handlePositionSuccess,
        (err) => {
          // Log watcher error softly without tearing down existing coordinates
          console.warn('[Location] Geolocation watch error:', err);
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
      );
    } catch (e) {
      console.warn('[Location] Unable to establish watchPosition:', e);
    }

    return () => {
      isMountedRef.current = false;
      if (watchIdRef.current !== null && navigator.geolocation?.clearWatch) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [handlePositionSuccess, handlePositionError]);

  const lat = coordinates?.latitude ?? null;
  const lng = coordinates?.longitude ?? null;
  const isWithinSupportedRegion = lat !== null && lng !== null ? isWithinBengaluru(lat, lng) : true;
  const freshness = calculateFreshness(timestamp);

  const contextValue = {
    // Coordinates & Telemetry
    coordinates,
    lat,
    lng,
    latitude: lat,
    longitude: lng,
    accuracy,
    heading,
    speed,
    altitude,
    timestamp,
    freshness,

    // Reverse Geocoded Address
    address,
    addressDetails,
    addressLoading,
    addressError,

    // Status & Error
    status,
    isLoading: status === 'requesting' || (status === 'idle' && !coordinates),
    isAvailable: status === 'success' || coordinates !== null,
    isDenied: status === 'denied',
    isTimeout: status === 'timeout',
    error,
    errorCode,

    // Geographic boundary
    isWithinSupportedRegion,

    // Action
    refreshLocation
  };

  return (
    <LocationContext.Provider value={contextValue}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationState() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocationState must be used within a LocationProvider');
  }
  return context;
}
