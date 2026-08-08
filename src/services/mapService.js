const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const mapService = {
  /**
   * Get route instructions and geometry using OSRM (via our backend proxy)
   */
  getRoute: async (startLat, startLng, endLat, endLng, profile = 'foot') => {
    try {
      const response = await fetch(
        `${API_URL}/route?startLat=${startLat}&startLng=${startLng}&endLat=${endLat}&endLng=${endLng}&profile=${profile}`
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Route service unavailable.');
      }
      return data;
    } catch (error) {
      if (error.message === 'Failed to fetch') {
        throw new Error('Backend route service is offline.');
      }
      console.error('[mapService] getRoute Error:', error);
      throw error;
    }
  },
  
  /**
   * Get dynamic route safety metrics for a specific geometry
   */
  getRouteMetrics: async (geometry, distanceRaw, durationRaw) => {
    try {
      const response = await fetch(`${API_URL}/route/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geometry, distanceRaw, durationRaw })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Metrics service unavailable.');
      }
      return data;
    } catch (error) {
      console.error('[mapService] getRouteMetrics Error:', error);
      throw error;
    }
  }
};
