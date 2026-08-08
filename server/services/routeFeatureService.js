const { samplePolyline } = require('../utils/geoUtils');

/**
 * Route Feature Extraction Service
 * Implements 100m Polyline Sampling & Overpass 'around' Buffer Query
 */
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const featureCache = new Map();

const getNullInfrastructure = () => ({
  police: null,
  hospitals: null,
  metro: null,
  commercial: null,
  busStops: null,
  pharmacies: null,
  fireStations: null,
  petrolPumps: null,
  trafficSignals: null,
  schools: null,
  banks: null,
  streetlights: null,
  cctv: null,
  highwayTags: []
});

exports.extractFeaturesForPolyline = async (polylineCoords) => {
  // 1. Sample polyline every 400 metres
  const sampledCoords = samplePolyline(polylineCoords, 400);
  
  // Create a cache key using first, middle, last coords and length to approximate route identity
  const midPoint = sampledCoords[Math.floor(sampledCoords.length / 2)];
  const cacheKey = `${sampledCoords[0].join(',')}_${midPoint.join(',')}_${sampledCoords[sampledCoords.length-1].join(',')}_${sampledCoords.length}`;
  
  if (featureCache.has(cacheKey)) {
    console.log(`[Feature Service] Returning cached features for route.`);
    return featureCache.get(cacheKey);
  }

  // Generate around string: (around:radius,lat1,lon1,lat2,lon2...)
  const coordString = sampledCoords.map(c => `${c[1]},${c[0]}`).join(',');
  const aroundClause = `(around:150,${coordString})`;

  console.log(`[Feature Service] Fetching Overpass using 150m buffer on ${sampledCoords.length} sampled coordinates...`);

  const query = `
    [out:json][timeout:60];
    (
      node["amenity"~"police|hospital|clinic|bus_station|fire_station|fuel|bank|atm|restaurant|school|college|university|parking|toilets"]${aroundClause};
      node["office"="government"]${aroundClause};
      node["shop"]${aroundClause};
      node["landuse"="commercial"]${aroundClause};
      node["railway"="station"]${aroundClause};
      node["leisure"="park"]${aroundClause};
      node["highway"~"crossing|traffic_signals"]${aroundClause};
      node["man_made"="surveillance"]${aroundClause};
      way["highway"]${aroundClause};
    );
    out center;
  `;

  console.log(`[Feature Service] Overpass Request Generated (Length: ${query.length} chars)`);

  try {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: query,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'RakshaNavApp/1.0'
      }
    });

    if (!response.ok) {
      console.log(`[Feature Service] Overpass Error Response: ${response.status} ${response.statusText}`);
      throw new Error(`Overpass API Error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[Feature Service] Overpass Response Received. Elements count: ${data.elements ? data.elements.length : 0}`);
    
    let infrastructure = getNullInfrastructure();

    if (!data.elements || data.elements.length === 0) {
      console.log(`No OSM infrastructure found`);
      infrastructure.rawOverpassJSON = data;
      infrastructure.sampledCoordinatesCount = sampledCoords.length;
      return infrastructure;
    }

    // Process nodes
    infrastructure = {
      police: 0, hospitals: 0, metro: 0, commercial: 0,
      busStops: 0, pharmacies: 0, fireStations: 0, petrolPumps: 0,
      trafficSignals: 0, schools: 0, banks: 0, streetlights: 0, cctv: 0, highwayTags: []
    };

    data.elements.forEach(el => {
      const tags = el.tags || {};
      const am = tags.amenity;
      
      if (am === 'police') infrastructure.police++;
      else if (am === 'hospital' || am === 'clinic') infrastructure.hospitals++;
      else if (am === 'bus_station') infrastructure.busStops++;
      else if (am === 'fire_station') infrastructure.fireStations++;
      else if (am === 'fuel') infrastructure.petrolPumps++;
      else if (am === 'bank' || am === 'atm') infrastructure.banks++;
      else if (am === 'school' || am === 'college' || am === 'university') infrastructure.schools++;
      else if (tags.railway === 'station') infrastructure.metro++;
      else if (tags.leisure === 'park') infrastructure.parks++;
      else if (tags.highway === 'traffic_signals' || tags.highway === 'crossing') infrastructure.trafficSignals++;
      else if (tags.highway === 'street_lamp') infrastructure.streetlights++;
      else if (tags.man_made === 'surveillance') infrastructure.cctv++;
      
      if (tags.shop || tags.landuse === 'commercial' || am === 'restaurant') {
        infrastructure.commercial++;
      }
      
      if (el.type === 'way' && tags.highway) {
        infrastructure.highwayTags.push(tags.highway);
      }
    });
    
    // Pass raw elements if needed for debug panel
    infrastructure.rawOverpassJSON = data;
    infrastructure.sampledCoordinatesCount = sampledCoords.length;

    console.log(`[Feature Service] Feature counts computed:`, JSON.stringify({
      police: infrastructure.police,
      hospitals: infrastructure.hospitals,
      metro: infrastructure.metro,
      commercial: infrastructure.commercial,
      busStops: infrastructure.busStops
    }));

    featureCache.set(cacheKey, infrastructure);
    if (featureCache.size > 200) featureCache.delete(featureCache.keys().next().value);

    return infrastructure;

  } catch (error) {
    console.error('[Feature Service] Error fetching infrastructure:', error.message);
    const fallback = getNullInfrastructure();
    fallback.rawOverpassJSON = { error: error.message };
    fallback.sampledCoordinatesCount = sampledCoords.length;
    return fallback;
  }
};
