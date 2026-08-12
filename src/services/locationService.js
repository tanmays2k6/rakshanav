const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

/**
 * Helper: Client-side Photon forward geocoding fallback
 */
async function photonGeocodeFallback(query) {
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=12.9716&lon=77.5946&limit=6`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.features || data.features.length === 0) return [];
    
    return data.features.map(f => {
      const lon = f.geometry.coordinates[0];
      const lat = f.geometry.coordinates[1];
      const p = f.properties || {};
      const parts = [p.name, p.street, p.district, p.city || 'Bengaluru', p.state, p.country].filter(Boolean);
      const display_name = parts.join(', ');
      return {
        display_name,
        lat,
        lng: lon,
        lon,
        boundingbox: [lat - 0.01, lat + 0.01, lon - 0.01, lon + 0.01]
      };
    });
  } catch (err) {
    console.warn('[locationService] Photon fallback failed:', err);
    return [];
  }
}

/**
 * Helper: Client-side Nominatim forward geocoding fallback
 */
async function nominatimGeocodeFallback(query) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&country=India&state=Karnataka&viewbox=77.2,13.4,77.9,12.5&bounded=1&limit=6`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    
    return data.map(item => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      lon: parseFloat(item.lon),
      boundingbox: item.boundingbox ? item.boundingbox.map(c => parseFloat(c)) : [parseFloat(item.lat)-0.01, parseFloat(item.lat)+0.01, parseFloat(item.lon)-0.01, parseFloat(item.lon)+0.01]
    }));
  } catch (err) {
    console.warn('[locationService] Nominatim fallback failed:', err);
    return [];
  }
}

export const locationService = {
  /**
   * Get current device location via HTML5 Geolocation API
   */
  getCurrentPosition: () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
      } else {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              heading: position.coords.heading,
              speed: position.coords.speed,
              timestamp: position.timestamp
            });
          },
          (error) => {
            reject(error);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }
    });
  },

  /**
   * Reverse geocode coordinates to an address using backend proxy or Nominatim client fallback
   */
  reverseGeocode: async (lat, lng) => {
    try {
      const response = await fetch(`${API_URL}/location/reverse?lat=${lat}&lng=${lng}`);
      if (!response.ok) throw new Error('Backend reverse geocode error');
      const data = await response.json();
      return data;
    } catch (error) {
      console.warn('[locationService] Backend reverseGeocode unreachable, falling back to direct Nominatim:', error);
      try {
        const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
        const res = await fetch(nomUrl, { headers: { 'Accept': 'application/json' } });
        if (res.ok) {
          const data = await res.json();
          return {
            displayName: data.display_name || 'Current Location',
            address: data.address || {}
          };
        }
      } catch (clientErr) {
        console.error('[locationService] Client reverseGeocode fallback error:', clientErr);
      }
      return { displayName: 'Current Location', address: {} };
    }
  },

  /**
   * Forward geocode a query string to coordinates with backend & client-side fallbacks
   */
  forwardGeocode: async (query) => {
    if (!query || !query.trim()) return [];
    
    // Ensure Bengaluru context if query is short or doesn't mention Bengaluru
    let searchQuery = query.trim();
    const queryLower = searchQuery.toLowerCase();
    if (!queryLower.includes('bengaluru') && !queryLower.includes('bangalore') && !queryLower.includes('karnataka')) {
      searchQuery = `${searchQuery}, Bengaluru`;
    }

    try {
      const response = await fetch(`${API_URL}/geocode?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.success !== false && Array.isArray(data.results) && data.results.length > 0) {
          return data.results.map(res => ({
            ...res,
            lat: parseFloat(res.lat),
            lng: parseFloat(res.lon || res.lng),
            lon: parseFloat(res.lon || res.lng)
          }));
        }
      }
    } catch (error) {
      console.warn('[locationService] Backend forwardGeocode unavailable, using client fallbacks:', error.message);
    }

    // 1. Client-Side Fallback: Photon
    let fallbackResults = await photonGeocodeFallback(searchQuery);
    if (fallbackResults.length > 0) return fallbackResults;

    // 2. Client-Side Fallback: Nominatim
    fallbackResults = await nominatimGeocodeFallback(searchQuery);
    if (fallbackResults.length > 0) return fallbackResults;

    // 3. Try raw query without appended city if still empty
    if (searchQuery !== query.trim()) {
      fallbackResults = await photonGeocodeFallback(query.trim());
      if (fallbackResults.length > 0) return fallbackResults;
      fallbackResults = await nominatimGeocodeFallback(query.trim());
      if (fallbackResults.length > 0) return fallbackResults;
    }

    throw new Error("Couldn't find that destination. Try another nearby place.");
  }
};
