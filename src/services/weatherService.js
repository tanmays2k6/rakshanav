// In production, if VITE_API_URL is not set, we use an empty string or log a warning rather than falling back to localhost
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001/api');

export const weatherService = {
  /**
   * Get current weather from Open-Meteo (via our backend proxy)
   */
  getWeather: async (lat, lng) => {
    try {
      const response = await fetch(`${API_URL}/weather?lat=${lat}&lng=${lng}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Weather service unavailable.');
      }
      return data.current; 
    } catch (error) {
      if (error.message === 'Failed to fetch') {
        throw new Error('Weather API unreachable.');
      }
      console.error('[weatherService] getWeather Error:', error);
      throw error;
    }
  }
};
