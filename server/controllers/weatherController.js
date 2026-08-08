exports.getWeather = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      const err = new Error('Latitude and Longitude are required.');
      err.status = 400;
      throw err;
    }

    console.log(`[Weather Controller] Fetching Open-Meteo for ${lat}, ${lng}`);
    
    // Open-Meteo API (Free, no API key required)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Open-Meteo API Error: ${response.statusText}`);
    }

    const data = await response.json();
    
    res.json({
      success: true,
      current: data.current
    });
  } catch (error) {
    next(error);
  }
};
