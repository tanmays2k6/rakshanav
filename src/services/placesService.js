const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const placesService = {
  /**
   * Get nearby safe havens using Overpass API (via our backend proxy)
   */
  getNearbyHavens: async (lat, lng, radius = 2000) => {
    try {
      const response = await fetch(`${API_URL}/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Places service unavailable.');
      }
      return data.places; // Array of { id, lat, lng, name, type }
    } catch (error) {
      if (error.message === 'Failed to fetch') {
        throw new Error('Places API unreachable.');
      }
      console.error('[placesService] getNearbyHavens Error:', error);
      throw error;
    }
  }
};
