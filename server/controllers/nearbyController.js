const overpassService = require('../services/overpassService');

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

exports.getNearbyHavens = async (req, res, next) => {
  try {
    const { lat, lng, radius = 3000 } = req.query; // default 3km
    if (!lat || !lng) {
      const err = new Error('Latitude and Longitude are required.');
      err.status = 400;
      throw err;
    }

    const numericLat = parseFloat(lat);
    const numericLng = parseFloat(lng);
    const numericRadius = parseFloat(radius);

    console.log(`[Nearby Controller] Fetching Safe Havens within ${numericRadius}m of ${numericLat}, ${numericLng}`);

    // Compute bounding box around point based on radius
    const latDelta = numericRadius / 111000;
    const lngDelta = numericRadius / (111000 * Math.cos(numericLat * Math.PI / 180));

    const minLat = numericLat - latDelta;
    const maxLat = numericLat + latDelta;
    const minLng = numericLng - lngDelta;
    const maxLng = numericLng + lngDelta;

    // Generate sampled coordinates from bbox corners and center to fetch necessary tiles
    const sampledCoords = [
      [minLng, minLat],
      [minLng, maxLat],
      [maxLng, minLat],
      [maxLng, maxLat],
      [numericLng, numericLat] // Center
    ];

    const result = await overpassService.getPOIsForTiles(sampledCoords);

    if (result.status === 'unavailable' || !result.data) {
      return res.json({
        success: true,
        count: 0,
        places: [],
        status: 'unavailable',
        warning: result.reason || 'POI service temporarily unavailable'
      });
    }

    // Filter relevant safe havens within radius
    const allowedCategories = new Set(['police', 'hospital', 'pharmacy', 'fire_station', 'atm']);

    const places = result.data
      .filter(p => allowedCategories.has(p.category))
      .map(p => {
        const distM = calculateHaversineDistance(numericLat, numericLng, p.lat, p.lng);
        return {
          id: p.id,
          lat: p.lat,
          lng: p.lng,
          name: p.name,
          category: p.category,
          type: p.category === 'hospital' ? 'hospital' : p.category === 'police' ? 'police' : p.type,
          distance: Math.round(distM),
          distanceKm: Number((distM / 1000).toFixed(2)),
          source: 'overpass'
        };
      })
      .filter(p => p.distance <= numericRadius)
      .sort((a, b) => a.distance - b.distance);

    return res.json({
      success: true,
      count: places.length,
      places: places,
      status: 'available'
    });

  } catch (error) {
    next(error);
  }
};

