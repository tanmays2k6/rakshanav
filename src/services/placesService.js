const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

export const placesService = {
  /**
   * Haversine distance calculator between two coordinates
   */
  calculateDistance: (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  },

  /**
   * Get nearby safe havens using progressive searching and relevance sorting
   */
  getNearbyHavens: async (lat, lng, radius = 3000) => {
    try {
      const response = await fetch(`${API_URL}/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Places service unavailable.');
      }
      
      const allPlaces = data.places || [];
      if (allPlaces.length === 0) return [];

      const priorityPenalty = {
        'police': 0.0,
        'hospital': 0.2,
        'fire_station': 0.3,
        'clinic': 0.8,
        'pharmacy': 1.5,
        'atm': 3.0
      };

      allPlaces.forEach(p => {
        p.distanceKm = placesService.calculateDistance(lat, lng, p.lat, p.lng);
        const penalty = priorityPenalty[p.type] !== undefined ? priorityPenalty[p.type] : 5.0;
        p.score = p.distanceKm + penalty;
      });

      allPlaces.sort((a, b) => a.score - b.score);

      return allPlaces;
    } catch (error) {
      console.error(`[placesService] getNearbyHavens Error:`, error);
      return [];
    }
  }
};
