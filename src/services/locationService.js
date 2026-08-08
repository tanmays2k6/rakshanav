const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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
   * Reverse geocode coordinates to an address using Nominatim (via our backend proxy)
   */
  reverseGeocode: async (lat, lng) => {
    try {
      const response = await fetch(`${API_URL}/location/reverse?lat=${lat}&lng=${lng}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reverse geocode');
      }
      return data;
    } catch (error) {
      if (error.message === 'Failed to fetch') {
        throw new Error('Nominatim geocoding unreachable.');
      }
      console.error('[locationService] reverseGeocode Error:', error);
      throw error;
    }
  },

  /**
   * Forward geocode a string to coordinates using Nominatim
   */
  forwardGeocode: async (query) => {
    try {
      const response = await fetch(`${API_URL}/geocode?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.reason || 'Failed to forward geocode');
      }
      if (data.success === false) {
        throw new Error(data.reason || 'Geocoding failed');
      }
      // Return structured array mapping lon to lng for frontend compatibility
      return (data.results || []).map(res => ({
        ...res,
        lng: res.lon
      }));
    } catch (error) {
      if (error.message === 'Failed to fetch') {
        throw new Error('Geocoding service unavailable.');
      }
      console.error('[locationService] forwardGeocode Error:', error);
      throw error;
    }
  }
};
