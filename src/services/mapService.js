import { SafetyEngine } from '../lib/SafetyEngine';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

/**
 * Format duration string from seconds
 */
function formatDuration(seconds) {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} mins`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs} hr ${remMins} mins` : `${hrs} hr`;
}

/**
 * Format distance string from meters
 */
function formatDistance(meters) {
  const km = (meters / 1000).toFixed(1);
  return `${km} km`;
}

/**
 * Helper: Client-side OSRM routing fallback using public OSRM server
 */
async function osrmPublicRouteFallback(startLat, startLng, endLat, endLng, signal) {
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true&alternatives=true`;
    const response = await fetch(osrmUrl, { signal });
    if (!response.ok) throw new Error(`OSRM HTTP ${response.status}`);
    const data = await response.json();
    
    if (!data.routes || data.routes.length === 0) {
      throw new Error("No road connections found.");
    }

    const routes = data.routes.map((r, idx) => {
      const type = idx === 0 ? 'safest' : (idx === 1 ? 'fastest' : 'balanced');
      return {
        id: `route_${idx + 1}_${Date.now()}`,
        type,
        distance: formatDistance(r.distance),
        duration: formatDuration(r.duration),
        distanceRaw: r.distance,
        durationRaw: r.duration,
        geometry: r.geometry,
        score: null,
        confidence: 85,
        breakdown: null,
        infrastructure: null,
        reports: null,
        metricsLoaded: false
      };
    });

    return {
      success: true,
      routes,
      diagnostics: {
        osrm: { status: 'success', routes: routes.length, time: 200 }
      }
    };
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.error('[mapService] OSRM public fallback error:', err);
    throw new Error("Unable to calculate this route right now. Please try again.");
  }
}

export const mapService = {
  /**
   * Get route instructions and geometry using OSRM (backend proxy with public server fallback)
   */
  getRoute: async (startLat, startLng, endLat, endLng, profile = 'driving', signal = null) => {
    try {
      const response = await fetch(
        `${API_URL}/route?startLat=${startLat}&startLng=${startLng}&endLat=${endLat}&endLng=${endLng}&profile=${profile}`,
        { signal }
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.routes && data.routes.length > 0) {
          return data;
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      console.warn('[mapService] Backend getRoute unavailable, falling back to public OSRM:', error.message);
    }

    // Direct public OSRM API fallback
    return osrmPublicRouteFallback(startLat, startLng, endLat, endLng, signal);
  },
  
  /**
   * Get dynamic route safety metrics for a specific geometry
   */
  getRouteMetrics: async (geometry, distanceRaw, durationRaw, signal = null) => {
    const distKm = typeof distanceRaw === 'number' && distanceRaw > 100 ? (distanceRaw / 1000) : (parseFloat(distanceRaw) || 5);
    const durMins = typeof durationRaw === 'number' && durationRaw > 500 ? Math.ceil(durationRaw / 60) : (parseInt(durationRaw) || 15);

    try {
      const response = await fetch(`${API_URL}/route/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geometry, distanceRaw: distKm, durationRaw: durMins }),
        signal
      });
      if (response.ok) {
        const data = await response.json();
        if (data && (data.score !== undefined || data.infrastructure !== undefined)) {
          return data;
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      console.warn('[mapService] Backend getRouteMetrics unavailable or failed:', error.message);
    }

    // Return explicit unavailable status object instead of generating synthetic mock counts
    return {
      infrastructure: null,
      infrastructureStatus: 'unavailable',
      reports: null,
      score: null,
      confidence: 50,
      breakdown: null,
      weather: null,
      jurisdictions: [],
      nearestSafeHaven: null
    };
  }
};
