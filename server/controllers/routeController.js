const routeFeatureService = require('../services/routeFeatureService');
const SafetyEngine = require('../services/SafetyEngine');

const routeCache = new Map();

// Expanded Bengaluru Metropolitan Region (BMR) Boundaries
const BBMP_BOUNDS = {
  minLat: 12.5,
  maxLat: 13.4,
  minLng: 77.2,
  maxLng: 77.9
};

const isWithinBengaluru = (lat, lng) => {
  return lat >= BBMP_BOUNDS.minLat && lat <= BBMP_BOUNDS.maxLat &&
         lng >= BBMP_BOUNDS.minLng && lng <= BBMP_BOUNDS.maxLng;
};

exports.getRoute = async (req, res, next) => {
  try {
    const { startLat, startLng, endLat, endLng, profile = 'driving' } = req.query;
    if (!startLat || !startLng || !endLat || !endLng) {
      const err = new Error('Start and End coordinates are required.');
      err.status = 400;
      throw err;
    }

    console.log(`\n==================================================`);
    console.log(`[DEBUG] ROUTE REQUEST`);
    console.log(`Origin: ${startLat}, ${startLng}`);
    console.log(`Destination: ${endLat}, ${endLng}`);
    
    const isStartValid = isWithinBengaluru(startLat, startLng);
    const isEndValid = isWithinBengaluru(endLat, endLng);
    
    console.log(`Boundary Validation -> Origin: ${isStartValid}, Destination: ${isEndValid}`);
    console.log(`==================================================\n`);

    if (!isStartValid) {
      const err = new Error('Origin outside Bengaluru.');
      err.status = 400;
      throw err;
    }
    if (!isEndValid) {
      const err = new Error('Destination outside Bengaluru.');
      err.status = 400;
      throw err;
    }

    const cacheKey = `${startLat},${startLng}_${endLat},${endLng}_${profile}`;
    if (routeCache.has(cacheKey)) {
      console.log(`[Route Controller] Returning cached route for ${cacheKey}`);
      return res.json(routeCache.get(cacheKey));
    }

    console.log(`[Route Controller] Fetching OSRM routes...`);
    
    const url = `https://router.project-osrm.org/route/v1/${profile}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&alternatives=3&steps=true`;
    console.log(`[DEBUG] OSRM URL: ${url}`);
    
    const osrmStart = Date.now();
    const response = await fetch(url);
    const osrmTime = Date.now() - osrmStart;

    if (!response.ok) {
      console.log(`[DEBUG] OSRM Fetch Failed: ${response.statusText}`);
      throw new Error(`Route service unavailable.`);
    }

    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.log(`[DEBUG] OSRM Route Error/Empty: ${data.code}`);
      throw new Error(`No drivable route exists between these locations.`);
    }
    console.log(`[DEBUG] OSRM returned ${data.routes.length} candidate routes in ${osrmTime}ms.`);

    const diagnostics = {
      osrm: { status: 'success', time: osrmTime, routes: data.routes.length, url }
    };

    const finalRoutes = data.routes.map((route, index) => {
      const distanceKm = route.distance / 1000;
      const durationMins = route.duration / 60;
      
      return {
        id: `route_${index}`,
        distance: distanceKm.toFixed(1) + ' km',
        duration: Math.ceil(durationMins) + ' min',
        geometry: route.geometry,
        type: 'pending', // Will be re-ranked dynamically by frontend when metrics arrive
        score: null,
        metricsLoaded: false,
        durationRaw: durationMins // for frontend sorting
      };
    });

    const result = {
      success: true,
      routes: finalRoutes,
      diagnostics
    };

    routeCache.set(cacheKey, result);
    if (routeCache.size > 200) routeCache.delete(routeCache.keys().next().value);

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getRouteMetrics = async (req, res, next) => {
  try {
    const { geometry, distanceRaw, durationRaw } = req.body;
    
    if (!geometry || !geometry.coordinates) {
      return res.status(400).json({ error: 'Route geometry is required' });
    }

    const coords = geometry.coordinates;
    const lats = coords.map(c => c[1]);
    const lngs = coords.map(c => c[0]);
    
    const distanceKm = distanceRaw || 0;
    const durationMins = durationRaw || 0;

    const hour = new Date().getHours();
    const isNightTime = hour < 6 || hour > 18;

    const diagnostics = {
      overpass: { status: 'pending', time: 0 },
      safety: { status: 'pending', time: 0 }
    };

    let infrastructure = null;
    const overpassStart = Date.now();
    try {
      infrastructure = await routeFeatureService.extractFeaturesForPolyline(coords);
      diagnostics.overpass = { status: 'success', time: Date.now() - overpassStart };
    } catch (e) {
      console.warn(`[Route Metrics] Overpass API failed: ${e.message}.`);
      diagnostics.overpass = { status: 'error', time: Date.now() - overpassStart, error: e.message };
      infrastructure = null; // Enforce explicit null
    }

    const midLat = lats[Math.floor(lats.length / 2)];
    const midLng = lngs[Math.floor(lngs.length / 2)];
    
    let weatherData = { isRaining: false, isFoggy: false };
    let weatherSuccess = false;
    try {
      const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${midLat}&longitude=${midLng}&current=weather_code`);
      if (wRes.ok) {
        const wJson = await wRes.json();
        const wCode = wJson.current?.weather_code || 0;
        if (wCode >= 50 && wCode <= 69) weatherData.isRaining = true;
        if (wCode === 45 || wCode === 48) weatherData.isFoggy = true;
        weatherSuccess = true;
      }
    } catch (e) {
      console.warn('[Route Metrics] Weather fetch failed.');
    }
    if (!weatherSuccess) weatherData = null;

    let reportsArray = null;
    let supabaseSuccess = false;
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      if (supabaseUrl && supabaseKey) {
         const sRes = await fetch(`${supabaseUrl}/rest/v1/incident_reports?status=eq.pending&select=*`, {
           headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
         });
         if (sRes.ok) {
           supabaseSuccess = true;
           const allReports = await sRes.json();
           const geoUtils = require('../utils/geoUtils');
           reportsArray = allReports.filter(r => geoUtils.isPointNearPolyline(coords, r.lat, r.lng, 300));
         }
      }
    } catch (e) {
      console.warn('[Route Metrics] Supabase fetch failed:', e.message);
    }

    let jurisdictions = [];
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      if (supabaseUrl && supabaseKey) {
        const jRes = await fetch(`${supabaseUrl}/rest/v1/rpc/get_jurisdictions_by_route`, {
           method: 'POST',
           headers: { 
             'apikey': supabaseKey, 
             'Authorization': `Bearer ${supabaseKey}`,
             'Content-Type': 'application/json' 
           },
           body: JSON.stringify({ route_geojson: { type: "LineString", coordinates: coords } })
        });
        if (jRes.ok) {
           jurisdictions = await jRes.json();
        }
      }
    } catch (e) {
      console.warn('[Route Metrics] Jurisdiction fetch failed:', e.message);
    }

    const safetyStart = Date.now();
    const confidenceMetrics = {
      gps: true,
      infrastructure: diagnostics.overpass.status === 'success',
      weather: weatherSuccess, 
      reports: supabaseSuccess,
      routing: true,
      ai: true
    };
    
    let safetyData = { 
      score: null, 
      breakdown: null, 
      explanation: null, 
      confidence: 0 
    };

    try {
      safetyData = SafetyEngine.calculateRouteSafety(
        infrastructure, 
        reportsArray, 
        weatherData, 
        { distanceKm, durationMins, isNightTime },
        confidenceMetrics
      );
      diagnostics.safety = { status: 'success', time: Date.now() - safetyStart };
    } catch (e) {
      console.warn(`[Route Metrics] Safety Engine failed: ${e.message}`);
      diagnostics.safety = { status: 'error', time: Date.now() - safetyStart, error: e.message };
    }

    return res.json({
      success: true,
      score: safetyData.score,
      confidence: safetyData.confidence,
      infrastructure: infrastructure,
      reports: reportsArray ? reportsArray.length : null,
      jurisdictions: jurisdictions,
      breakdown: safetyData.breakdown,
      explanation: safetyData.explanation,
      weather: weatherData,
      diagnostics
    });
  } catch (error) {
    next(error);
  }
};

exports.getPointSafety = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
       return res.status(400).json({ success: false, error: 'Latitude and longitude required.' });
    }

    const radius = 500;
    
    const query = `
      [out:json][timeout:10];
      (
        node["amenity"="police"](around:${radius},${lat},${lng});
        node["amenity"="hospital"](around:${radius},${lat},${lng});
        node["amenity"="clinic"](around:${radius},${lat},${lng});
        node["shop"](around:${radius},${lat},${lng});
        node["amenity"="restaurant"](around:${radius},${lat},${lng});
      );
      out count;
    `;

    let score = 65;
    let reasons = ['Moderate activity area.'];
    let policeCount = 0;
    let hospitalCount = 0;
    let commercialCount = 0;

    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'RakshaNavApp/1.0'
        }
      });
      if (response.ok) {
        const data = await response.json();
        const counts = data.elements[0]?.tags || {};
        policeCount = parseInt(counts.nodes || 0); 
        let totalFeatures = parseInt(counts.nodes || 0) + parseInt(counts.ways || 0);
        
        if (totalFeatures > 20) {
           score = 92;
           reasons = ['Highly active commercial area with good natural surveillance.'];
        } else if (totalFeatures > 5) {
           score = 75;
           reasons = ['Moderate activity area.'];
        } else {
           score = 45;
           reasons = ['Low activity area, limited natural surveillance.'];
        }
      }
    } catch(e) {
      console.warn("Point safety overpass failed:", e.message);
    }

    return res.json({
       success: true,
       score,
       reasons
    });

  } catch (error) {
    next(error);
  }
};
