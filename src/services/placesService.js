const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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
  getNearbyHavens: async (lat, lng) => {
    const radii = [1000, 3000, 5000, 10000];
    let allPlaces = [];

    for (const radius of radii) {
      try {
        const response = await fetch(`${API_URL}/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Places service unavailable.');
        }
        
        if (data.places && data.places.length > 0) {
          allPlaces = data.places;
          break; // Found places, stop expanding radius
        }
      } catch (error) {
        if (error.message === 'Failed to fetch') {
          throw new Error('Places API unreachable.');
        }
        console.error(`[placesService] getNearbyHavens (radius ${radius}) Error:`, error);
        throw error;
      }
    }

    if (allPlaces.length === 0) return [];

    // Prioritize emergency relevance: lower penalty is better.
    // Penalty is effectively added as equivalent km to distance.
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

    // Sort by relevance score (lowest score = highest relevance/closest)
    allPlaces.sort((a, b) => a.score - b.score);

    return allPlaces;
  }
};
