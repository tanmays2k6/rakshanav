const { samplePolyline } = require('../utils/geoUtils');
const overpassService = require('./overpassService');

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
  highwayTags: [],
  status: 'unavailable'
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

/**
 * Extracts features for a polyline by fetching (or pulling from spatial cache)
 * the POIs for the polyline's bounding box, then filtering locally within a 500m corridor.
 */
exports.extractFeaturesForPolyline = async (polylineCoords) => {
  if (!polylineCoords || !Array.isArray(polylineCoords) || polylineCoords.length === 0) {
    return getNullInfrastructure();
  }

  // 1. Sample polyline every 400 metres
  const sampledCoords = samplePolyline(polylineCoords, 400);

  // 2. Compute bounding box and approximate total route length
  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;
  let totalDistKm = 0;

  for (let i = 0; i < polylineCoords.length; i++) {
    const c = polylineCoords[i];
    const lng = c[0];
    const lat = c[1];
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;

    if (i > 0) {
      const prev = polylineCoords[i - 1];
      totalDistKm += getDistance(prev[1], prev[0], lat, lng) / 1000;
    }
  }

  console.log(`[Infrastructure] Route length: ${totalDistKm.toFixed(1)} km`);

  // 3. Fetch POIs via Overpass Service (Handles Bounding Box Chunking, Spatial Caching, and 504 Fallback)
  const poiResult = await overpassService.getPOIsForBoundingBox(minLat, minLng, maxLat, maxLng);

  if (poiResult.status === 'unavailable' || !poiResult.data) {
    console.warn(`[Infrastructure] POIs unavailable for route bounding box: ${poiResult.reason || 'Unknown'}`);
    return getNullInfrastructure();
  }

  const allPOIs = poiResult.data;
  const isPartial = poiResult.status === 'partial';

  console.log(`[Infrastructure] Filtering ${allPOIs.length} region POIs locally against 500m polyline corridor (${sampledCoords.length} points)...`);

  const infrastructure = {
    police: [], hospitals: [], pharmacies: [], fireStations: [], banks: [],
    metro: 0, commercial: 0, busStops: 0, petrolPumps: 0, parks: 0,
    trafficSignals: 0, schools: 0, streetlights: 0, cctv: 0, highwayTags: [],
    status: isPartial ? 'partial' : 'available'
  };

  const CORRIDOR_BUFFER_KM = overpassService.CONFIG?.DEFAULT_CORRIDOR_KM || 0.5;

  allPOIs.forEach(poi => {
    const distKm = getMinDistanceToPolyline(poi.lat, poi.lng, sampledCoords);
    if (distKm <= CORRIDOR_BUFFER_KM) {
      const poiObj = {
        id: poi.id,
        name: poi.name,
        type: poi.type,
        category: poi.category,
        lat: poi.lat,
        lng: poi.lng,
        distanceKm: Number(distKm.toFixed(2)),
        source: 'OSM'
      };

      if (poi.category === 'police') infrastructure.police.push(poiObj);
      else if (poi.category === 'hospital') infrastructure.hospitals.push(poiObj);
      else if (poi.category === 'pharmacy') infrastructure.pharmacies.push(poiObj);
      else if (poi.category === 'fire_station') infrastructure.fireStations.push(poiObj);
      else if (poi.category === 'atm') infrastructure.banks.push(poiObj);

      if (poi.category === 'bus_stop') infrastructure.busStops++;
      else if (poi.category === 'fuel') infrastructure.petrolPumps++;
      else if (poi.tags?.amenity === 'school' || poi.tags?.amenity === 'college' || poi.tags?.amenity === 'university') infrastructure.schools++;
      else if (poi.category === 'metro') infrastructure.metro++;
      else if (poi.category === 'park') infrastructure.parks++;
      else if (poi.tags?.highway === 'traffic_signals' || poi.tags?.highway === 'crossing') infrastructure.trafficSignals++;
      else if (poi.category === 'streetlight') infrastructure.streetlights++;
      else if (poi.category === 'cctv') infrastructure.cctv++;
      
      if (poi.category === 'commercial') {
        infrastructure.commercial++;
      }

      if (poi.tags?.highway) {
        infrastructure.highwayTags.push(poi.tags.highway);
      }
    }
  });

  const sortByDist = (a, b) => a.distanceKm - b.distanceKm;
  infrastructure.police.sort(sortByDist);
  infrastructure.hospitals.sort(sortByDist);
  infrastructure.pharmacies.sort(sortByDist);
  infrastructure.fireStations.sort(sortByDist);
  infrastructure.banks.sort(sortByDist);

  infrastructure.sampledCoordinatesCount = sampledCoords.length;

  console.log(`[Infrastructure] Local corridor filter computed for route:`, JSON.stringify({
    police: infrastructure.police.length,
    hospitals: infrastructure.hospitals.length,
    pharmacies: infrastructure.pharmacies.length,
    fireStations: infrastructure.fireStations.length,
    commercial: infrastructure.commercial,
    status: infrastructure.status
  }));

  return infrastructure;
};

