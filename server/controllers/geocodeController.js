

// Hardcoded fallback cache for fast demo performance
const DEMO_CACHE = {
  'majestic': {
    success: true,
    source: 'cache',
    results: [{
      display_name: 'Majestic, Bengaluru, Karnataka, India',
      lat: 12.9767,
      lon: 77.5713,
      boundingbox: [12.97, 12.98, 77.56, 77.58]
    }]
  },
  'koramangala': {
    success: true,
    source: 'cache',
    results: [{
      display_name: 'Koramangala, Bengaluru, Karnataka, India',
      lat: 12.9279,
      lon: 77.6271,
      boundingbox: [12.91, 12.94, 77.61, 77.64]
    }]
  },
  'whitefield': {
    success: true,
    source: 'cache',
    results: [{
      display_name: 'Whitefield, Bengaluru, Karnataka, India',
      lat: 12.9698,
      lon: 77.7499,
      boundingbox: [12.95, 12.98, 77.73, 77.76]
    }]
  },
  'indiranagar': {
    success: true,
    source: 'cache',
    results: [{
      display_name: 'Indiranagar, Bengaluru, Karnataka, India',
      lat: 12.9784,
      lon: 77.6408,
      boundingbox: [12.96, 12.99, 77.63, 77.65]
    }]
  },
  'electronic city': {
    success: true,
    source: 'cache',
    results: [{
      display_name: 'Electronic City, Bengaluru, Karnataka, India',
      lat: 12.8399,
      lon: 77.6770,
      boundingbox: [12.82, 12.85, 77.66, 77.69]
    }]
  },
  'yelahanka': {
    success: true,
    source: 'cache',
    results: [{
      display_name: 'Yelahanka, Bengaluru, Karnataka, India',
      lat: 13.1007,
      lon: 77.5963,
      boundingbox: [13.08, 13.12, 77.58, 77.61]
    }]
  },
  'kempegowda airport': {
    success: true,
    source: 'cache',
    results: [{
      display_name: 'Kempegowda International Airport, Bengaluru, Karnataka, India',
      lat: 13.1986,
      lon: 77.7066,
      boundingbox: [13.18, 13.21, 77.69, 77.72]
    }]
  },
  'sir mvit': {
    success: true,
    source: 'cache',
    results: [{
      display_name: 'Sir M Visvesvaraya Institute of Technology, Bengaluru, Karnataka, India',
      lat: 13.1517,
      lon: 77.6074,
      boundingbox: [13.14, 13.16, 77.59, 77.62]
    }]
  },
  'mg road': {
    success: true,
    source: 'cache',
    results: [{
      display_name: 'MG Road, Bengaluru, Karnataka, India',
      lat: 12.9733,
      lon: 77.6074,
      boundingbox: [12.96, 12.98, 77.59, 77.62]
    }]
  },
  'hsr layout': {
    success: true,
    source: 'cache',
    results: [{
      display_name: 'HSR Layout, Bengaluru, Karnataka, India',
      lat: 12.9121,
      lon: 77.6446,
      boundingbox: [12.90, 12.93, 77.63, 77.66]
    }]
  }
};

const memoryCache = new Map();

// Helper to standardise BMR bounding box if missing
const DEFAULT_BBOX = [12.5, 13.4, 77.2, 77.9]; 

const executeProvider = async (name, url, parser) => {
  const startTime = Date.now();
  console.log(`[GEOCODE] Provider: ${name}`);
  console.log(`[GEOCODE] Generated URL: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RakshaNav-UrbanSafetyApp/1.0 (tanmay@rakshanav.app)'
      },
      timeout: 5000
    });
    
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }
    
    const data = await response.json();
    const responseTime = Date.now() - startTime;
    console.log(`[GEOCODE] HTTP Status: 200 OK`);
    console.log(`[GEOCODE] Response Time: ${responseTime}ms`);
    
    const results = parser(data);
    
    if (!results || results.length === 0) {
      throw new Error('Zero results returned');
    }
    
    console.log(`[GEOCODE] Returned Coordinates: ${results.length} results`);
    console.log(`          Top match: ${results[0].lat}, ${results[0].lon}`);
    return { success: true, source: name.toLowerCase(), results };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log(`[GEOCODE] HTTP Status: FAILED`);
    console.log(`[GEOCODE] Response Time: ${responseTime}ms`);
    console.log(`[GEOCODE] Error: ${error.message}`);
    throw error;
  }
};

const photonProvider = async (q) => {
  // Biasing towards Bengaluru coordinates
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=12.97&lon=77.59&limit=5`;
  return executeProvider('Photon', url, (data) => {
    if (!data.features) return [];
    return data.features.map(f => {
      // Photon returns [lon, lat]
      const lon = f.geometry.coordinates[0];
      const lat = f.geometry.coordinates[1];
      const props = f.properties;
      const display_name = [props.name, props.street, props.district, props.city, props.state, props.country]
                           .filter(Boolean).join(', ');
      
      let boundingbox = DEFAULT_BBOX;
      if (props.extent) {
         // Photon extent is [minLon, maxLon, minLat, maxLat] typically. But we need [minLat, maxLat, minLon, maxLon]
         // Actually photon doesn't standardize extent well, so we'll fallback to DEFAULT_BBOX.
         boundingbox = [lat - 0.01, lat + 0.01, lon - 0.01, lon + 0.01]; 
      } else {
         boundingbox = [lat - 0.01, lat + 0.01, lon - 0.01, lon + 0.01];
      }

      return {
        display_name,
        lat,
        lon,
        boundingbox
      };
    });
  });
};

const nominatimProvider = async (q) => {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&country=India&state=Karnataka&viewbox=77.2,13.4,77.9,12.5&bounded=1&limit=5`;
  return executeProvider('Nominatim', url, (data) => {
    return data.map(item => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      boundingbox: item.boundingbox.map(coord => parseFloat(coord))
    }));
  });
};

exports.forwardGeocode = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, reason: 'Query string is required.' });
    }

    const queryLower = q.toLowerCase().trim();
    console.log(`\n==================================================`);
    console.log(`[GEOCODE] Search Query: ${q}`);

    // 1. Check Predefined Demo Cache
    for (const [key, cachedData] of Object.entries(DEMO_CACHE)) {
      if (queryLower.includes(key)) {
        console.log(`[GEOCODE] Provider: Cache`);
        console.log(`[GEOCODE] Returned Coordinates: 1 result`);
        console.log(`==================================================\n`);
        return res.json(cachedData);
      }
    }

    // 2. Check Memory Cache
    const cacheKey = `fwd_${queryLower}`;
    if (memoryCache.has(cacheKey)) {
      console.log(`[GEOCODE] Provider: Cache (Memory)`);
      console.log(`==================================================\n`);
      return res.json(memoryCache.get(cacheKey));
    }

    let resultPayload;
    let errors = [];

    // 3. Try Primary Provider (Photon)
    try {
      resultPayload = await photonProvider(q);
    } catch (e) {
      errors.push(`Photon failed: ${e.message}`);
      console.log(`[GEOCODE] Primary provider failed. Attempting fallback...`);
      
      // 4. Try Fallback Provider (Nominatim)
      try {
        resultPayload = await nominatimProvider(q);
      } catch (e2) {
        errors.push(`Nominatim fallback failed: ${e2.message}`);
        console.log(`[GEOCODE] All providers failed.`);
      }
    }

    console.log(`==================================================\n`);

    if (resultPayload) {
      // Store in memory cache
      memoryCache.set(cacheKey, resultPayload);
      if (memoryCache.size > 1000) memoryCache.delete(memoryCache.keys().next().value);
      return res.json(resultPayload);
    } else {
      return res.json({ 
        success: false, 
        reason: `Geocoding unavailable. ${errors.join(' | ')}`
      });
    }

  } catch (error) {
    console.error(`[GEOCODE] Fatal Error:`, error);
    return res.json({ success: false, reason: 'Geocoding service encountered a fatal error.' });
  }
};
