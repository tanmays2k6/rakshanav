exports.getNearbyHavens = async (req, res, next) => {
  try {
    const { lat, lng, radius = 2000 } = req.query; // default 2km
    if (!lat || !lng) {
      const err = new Error('Latitude and Longitude are required.');
      err.status = 400;
      throw err;
    }

    console.log(`[Nearby Controller] Fetching Overpass Safe Havens within ${radius}m of ${lat}, ${lng}`);
    
    // Overpass QL Query for Police, Hospitals, Clinics
    // [out:json];(node["amenity"="police"](around:2000,lat,lng);node["amenity"="hospital"](around:2000,lat,lng););out body;
    const query = `
      [out:json][timeout:10];
      (
        node["amenity"="police"](around:${radius},${lat},${lng});
        way["amenity"="police"](around:${radius},${lat},${lng});
        node["amenity"="hospital"](around:${radius},${lat},${lng});
        way["amenity"="hospital"](around:${radius},${lat},${lng});
        node["amenity"="clinic"](around:${radius},${lat},${lng});
        node["amenity"="pharmacy"](around:${radius},${lat},${lng});
        node["amenity"="fire_station"](around:${radius},${lat},${lng});
      );
      out center;
    `;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'RakshaNavApp/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Overpass API Error: ${response.statusText}`);
    }

    const data = await response.json();
    
    const places = data.elements.map(el => {
      return {
        id: el.id,
        lat: el.lat || el.center.lat,
        lng: el.lon || el.center.lon,
        name: el.tags.name || el.tags.amenity,
        type: el.tags.amenity,
        distance: null // To be calculated on frontend or via turf.js
      };
    });
    
    res.json({
      success: true,
      count: places.length,
      places: places
    });
  } catch (error) {
    next(error);
  }
};
