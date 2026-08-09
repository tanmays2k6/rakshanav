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

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getMinDistanceToPolyline(lat, lng, sampledCoords) {
  let min = Infinity;
  for (const coord of sampledCoords) {
    const d = getDistance(lat, lng, coord[1], coord[0]);
    if (d < min) min = d;
  }
  return min / 1000; // km
}

exports.extractFeaturesForPolyline = async (polylineCoords) => {
  // 1. Sample polyline every 400 metres
  const sampledCoords = samplePolyline(polylineCoords, 400);
  const coordString = sampledCoords.map(c => `${c[1]},${c[0]}`).join(',');
  
  // Use a fully deterministic cache key prefixed with v2 to bust the old integer cache
  const crypto = require('crypto');
  const hash = crypto.createHash('md5').update(coordString).digest('hex');
  const cacheKey = `v2_${hash}`;
  
  if (featureCache.has(cacheKey)) {
    console.log(`[Feature Service] Returning cached features for route.`);
    return featureCache.get(cacheKey);
  }

  // Generate around string: (around:radius,lat1,lon1,lat2,lon2...)
  const aroundClause = `(around:500,${coordString})`;

  console.log(`[Feature Service] Fetching Overpass using 500m buffer on ${sampledCoords.length} sampled coordinates...`);

  const query = `
    [out:json][timeout:60];
    (
      node["amenity"~"police|hospital|clinic|pharmacy|bus_station|fire_station|fuel|bank|atm|restaurant|school|college|university|parking|toilets"]${aroundClause};
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
      police: [], hospitals: [], pharmacies: [], fireStations: [], banks: [],
      metro: 0, commercial: 0, busStops: 0, petrolPumps: 0, parks: 0,
      trafficSignals: 0, schools: 0, streetlights: 0, cctv: 0, highwayTags: []
    };

    const seenPOIs = new Set();

    data.elements.forEach(el => {
      const tags = el.tags || {};
      const am = tags.amenity;
      const lat = el.lat || el.center?.lat;
      const lon = el.lon || el.center?.lon;
      
      const isPolice = am === 'police';
      const isHospital = am === 'hospital' || am === 'clinic';
      const isPharmacy = am === 'pharmacy';
      const isFireStation = am === 'fire_station';
      const isBank = am === 'bank' || am === 'atm';

      if (lat && lon && (isPolice || isHospital || isPharmacy || isFireStation || isBank)) {
        const id = `${lat.toFixed(4)},${lon.toFixed(4)}-${am}`;
        if (!seenPOIs.has(id)) {
          seenPOIs.add(id);
          const name = tags.name || (am ? am.charAt(0).toUpperCase() + am.slice(1) : 'Unknown Facility');
          const distKm = getMinDistanceToPolyline(lat, lon, sampledCoords);
          
          const poiObj = {
            id: el.id,
            name,
            type: am === 'atm' || am === 'bank' ? 'atm' : (isHospital ? 'hospital' : am),
            lat,
            lng: lon,
            distanceKm: Number(distKm.toFixed(2)),
            source: 'OSM'
          };
          
          if (isPolice) infrastructure.police.push(poiObj);
          if (isHospital) infrastructure.hospitals.push(poiObj);
          if (isPharmacy) infrastructure.pharmacies.push(poiObj);
          if (isFireStation) infrastructure.fireStations.push(poiObj);
          if (isBank) infrastructure.banks.push(poiObj);
        }
      }

      if (am === 'bus_station') infrastructure.busStops++;
      else if (am === 'fuel') infrastructure.petrolPumps++;
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

    // Sort arrays by distance
    const sortByDist = (a, b) => a.distanceKm - b.distanceKm;
    infrastructure.police.sort(sortByDist);
    infrastructure.hospitals.sort(sortByDist);
    infrastructure.pharmacies.sort(sortByDist);
    infrastructure.fireStations.sort(sortByDist);
    infrastructure.banks.sort(sortByDist);
    
    // Pass raw elements if needed for debug panel
    infrastructure.rawOverpassJSON = data;
    infrastructure.sampledCoordinatesCount = sampledCoords.length;

    console.log(`[Feature Service] Feature counts computed:`, JSON.stringify({
      police: infrastructure.police.length,
      hospitals: infrastructure.hospitals.length,
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
