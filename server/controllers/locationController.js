const nodeCache = new Map();

exports.reverseGeocode = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      const err = new Error('Latitude and Longitude are required.');
      err.status = 400;
      throw err;
    }

    console.log(`[Location Controller] Reverse geocoding: ${lat}, ${lng}`);
    
    // Nominatim Reverse Geocoding
    const cacheKey = `rev_${lat}_${lng}`;
    if (nodeCache.has(cacheKey)) {
      return res.json(nodeCache.get(cacheKey));
    }

    // Important: Nominatim requires a User-Agent header for usage.
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
      headers: {
        'User-Agent': 'RakshaNav-UrbanSafetyApp/1.0 (tanmay@rakshanav.app)'
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim API Error: ${response.statusText}`);
    }

    const data = await response.json();
    
    const result = {
      success: true,
      address: data.address,
      displayName: data.display_name,
      lat: data.lat,
      lng: data.lon
    };

    nodeCache.set(cacheKey, result);
    if (nodeCache.size > 1000) nodeCache.delete(nodeCache.keys().next().value);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.forwardGeocode = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) {
      const err = new Error('Query string is required.');
      err.status = 400;
      throw err;
    }

    console.log(`\n==================================================`);
    console.log(`[DEBUG] NOMINATIM SEARCH REQUEST`);
    console.log(`Query: ${q}`);

    const cacheKey = `fwd_${q}`;
    if (nodeCache.has(cacheKey)) {
      console.log(`[DEBUG] Returning cached Nominatim response`);
      return res.json(nodeCache.get(cacheKey));
    }

    // Nominatim Forward Geocoding - limited to Bengaluru Metropolitan Region
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&country=India&state=Karnataka&viewbox=77.2,13.4,77.9,12.5&bounded=1&limit=5`;
    console.log(`[DEBUG] URL: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RakshaNav-UrbanSafetyApp/1.0 (tanmay@rakshanav.app)'
      }
    });

    if (!response.ok) {
      console.log(`[DEBUG] Nominatim Fetch Failed: ${response.statusText}`);
      throw new Error(`Unable to connect to geocoding service.`);
    }

    const data = await response.json();
    console.log(`[DEBUG] Nominatim returned ${data.length} results.`);
    console.log(`==================================================\n`);
    
    if (!data || data.length === 0) {
      throw new Error('Location not found.');
    }
    
    // Map to array of results
    const results = data.map(item => ({
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      label: item.name || q
    }));

    const result = {
      success: true,
      results: results
    };

    nodeCache.set(cacheKey, result);
    if (nodeCache.size > 1000) nodeCache.delete(nodeCache.keys().next().value);

    res.json(result);
  } catch (error) {
    next(error);
  }
};
