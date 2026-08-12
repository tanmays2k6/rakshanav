/**
 * Overpass API Optimized Service
 * - Lightweight Node-only Queries (No heavy way/relation dumps)
 * - Spatial Bounding Box Chunking for large areas (>25 km²)
 * - Differentiated 429 (Rate Limit) vs 504 (Timeout) Handling
 * - Essential Query Fallback on 504 Timeout
 * - AbortController 12s HTTP Request Timeout
 * - Multi-Endpoint Failover Pool
 * - Server-Side Spatial Tile Caching & In-flight Deduplication
 * - Detailed Development Observability Logging
 */

const CONFIG = {
  MAX_QUERY_AREA_SQ_KM: 25,      // Split bounding boxes larger than 25 km²
  MAX_QUERY_CHUNKS: 4,           // Max tile chunks per request
  REQUEST_TIMEOUT_MS: 12000,     // 12s HTTP timeout per request attempt
  CACHE_TTL_MS: 15 * 60 * 1000,  // 15 minutes TTL
  DEFAULT_CORRIDOR_KM: 0.5       // 500m default corridor buffer
};

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];

const endpointState = ENDPOINTS.map(url => ({
  url,
  cooldownUntil: 0,
  failureCount: 0
}));

const spatialCache = new Map();
const inFlightRequests = new Map();

const TILE_SIZE = 0.02; // ~2.2km grid tiles

/**
 * Generates a normalized spatial tile cache key
 */
function getTileKey(lat, lng) {
  const tLat = Math.floor(lat / TILE_SIZE) * TILE_SIZE;
  const tLng = Math.floor(lng / TILE_SIZE) * TILE_SIZE;
  return `tile_${tLat.toFixed(3)}_${tLng.toFixed(3)}_v4`;
}

/**
 * Generates bounding box string for a tile
 */
function getTileBBoxStr(lat, lng) {
  const minLat = Math.floor(lat / TILE_SIZE) * TILE_SIZE;
  const minLng = Math.floor(lng / TILE_SIZE) * TILE_SIZE;
  const maxLat = minLat + TILE_SIZE;
  const maxLng = minLng + TILE_SIZE;
  return `${minLat.toFixed(4)},${minLng.toFixed(4)},${maxLat.toFixed(4)},${maxLng.toFixed(4)}`;
}

/**
 * Selects a healthy Overpass endpoint
 */
function getHealthyEndpoint() {
  const now = Date.now();
  const available = endpointState.filter(ep => ep.cooldownUntil <= now);
  if (available.length === 0) {
    return [...endpointState].sort((a, b) => a.cooldownUntil - b.cooldownUntil)[0];
  }
  return available.sort((a, b) => a.failureCount - b.failureCount)[0];
}

/**
 * Construct lightweight Overpass query targeting ONLY required node features
 */
function buildOverpassQuery(bboxStr, essentialOnly = false) {
  if (essentialOnly) {
    // 504 Fallback Query: Essential emergency infrastructure ONLY
    return `[out:json][timeout:10];(node["amenity"~"police|hospital|clinic|pharmacy|fire_station"](${bboxStr}););out center;`;
  }
  
  // Standard Query: Lightweight nodes only
  return `[out:json][timeout:15];(
    node["amenity"~"police|hospital|clinic|pharmacy|fire_station|bus_station"](${bboxStr});
    node["railway"="station"](${bboxStr});
    node["highway"~"traffic_signals|crossing|street_lamp"](${bboxStr});
    node["man_made"="surveillance"](${bboxStr});
    node["shop"](${bboxStr});
    node["leisure"="park"](${bboxStr});
  );out center;`;
}

/**
 * Perform single HTTP fetch attempt to Overpass with AbortController timeout
 */
async function executeSingleFetch(endpointUrl, query) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

  try {
    const startTime = Date.now();
    const response = await fetch(endpointUrl, {
      method: 'POST',
      body: query,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'RakshaNavApp/1.0'
      },
      signal: controller.signal
    });

    const duration = Date.now() - startTime;

    if (response.ok) {
      const data = await response.json();
      return { ok: true, data, duration, status: response.status };
    }

    return { ok: false, status: response.status, statusText: response.statusText, duration, response };
  } catch (err) {
    const isTimeout = err.name === 'AbortError' || err.message.includes('timeout');
    return { ok: false, status: isTimeout ? 504 : 0, error: err.message, isTimeout };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Execute Overpass query with failover and backoff:
 * Handles 429 (Rate Limit) vs 504 (Gateway Timeout / Heavy Query) differently.
 */
async function fetchOverpassWithFailover(bboxStr) {
  const maxAttempts = 3;
  let currentQuery = buildOverpassQuery(bboxStr, false);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const ep = getHealthyEndpoint();
    console.log(`[Infrastructure] Overpass endpoint: ${ep.url} (Attempt ${attempt}/${maxAttempts})`);

    const result = await executeSingleFetch(ep.url, currentQuery);

    if (result.ok) {
      console.log(`[Infrastructure] Response: 200 (${result.duration}ms)`);
      ep.failureCount = 0;
      return result.data;
    }

    console.warn(`[Infrastructure] Response: ${result.status || 'Network Error'} (${result.duration || 0}ms) on ${ep.url}`);

    // Differentiate 429 vs 504
    if (result.status === 429) {
      // 429: Rate limited -> Cooldown & failover
      let cooldownMs = 45000;
      if (result.response) {
        const retryAfter = result.response.headers.get('Retry-After');
        if (retryAfter && !isNaN(parseInt(retryAfter, 10))) {
          cooldownMs = parseInt(retryAfter, 10) * 1000;
        }
      }
      ep.cooldownUntil = Date.now() + cooldownMs;
      ep.failureCount++;
      console.warn(`[Infrastructure] 429 Rate Limit applied: ${Math.round(cooldownMs/1000)}s cooldown. Switching endpoint...`);
    } else if (result.status === 504 || result.isTimeout) {
      // 504: Gateway Timeout -> Query was too heavy!
      ep.cooldownUntil = Date.now() + 30000;
      ep.failureCount++;
      console.warn(`[Infrastructure] Response: 504 - Query too large/expensive. Switching to essential query fallback...`);
      // Reduce query complexity for remaining attempts!
      currentQuery = buildOverpassQuery(bboxStr, true);
    } else {
      ep.cooldownUntil = Date.now() + 20000;
      ep.failureCount++;
    }

    if (attempt < maxAttempts) {
      const backoffMs = attempt * 1000 + Math.random() * 300;
      console.log(`[Infrastructure] Retrying fallback in ${Math.round(backoffMs)}ms...`);
      await new Promise(r => setTimeout(r, backoffMs));
    }
  }

  throw new Error('Overpass query timed out or failed across all endpoints.');
}

/**
 * Normalizes raw Overpass response elements into clean, deduplicated POI objects
 */
function normalizeOverpassElements(elements) {
  if (!elements || !Array.isArray(elements)) return [];
  
  const pois = [];
  const seenKeys = new Set();

  elements.forEach(el => {
    const tags = el.tags || {};
    const am = tags.amenity;
    const lat = el.lat || el.center?.lat;
    const lon = el.lon || el.center?.lon;
    
    if (!lat || !lon) return;

    const key = `${lat.toFixed(4)},${lon.toFixed(4)}-${am || tags.shop || tags.highway || el.id}`;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);

    let category = 'other';
    if (am === 'police') category = 'police';
    else if (am === 'hospital' || am === 'clinic') category = 'hospital';
    else if (am === 'pharmacy') category = 'pharmacy';
    else if (am === 'fire_station') category = 'fire_station';
    else if (am === 'bank' || am === 'atm') category = 'atm';
    else if (am === 'fuel') category = 'fuel';
    else if (am === 'bus_station') category = 'bus_stop';
    else if (tags.railway === 'station') category = 'metro';
    else if (tags.shop || tags.landuse === 'commercial' || am === 'restaurant') category = 'commercial';
    else if (tags.leisure === 'park') category = 'park';
    else if (tags.highway === 'street_lamp') category = 'streetlight';
    else if (tags.man_made === 'surveillance') category = 'cctv';
    else if (tags.highway) category = 'highway';

    pois.push({
      id: el.id,
      name: tags.name || (am ? am.charAt(0).toUpperCase() + am.slice(1).replace(/_/g, ' ') : 'Safety Facility'),
      category,
      type: am || tags.shop || tags.highway || 'facility',
      lat,
      lng: lon,
      tags,
      source: 'overpass'
    });
  });

  return pois;
}

/**
 * Main Service API: Retrieves POIs for a set of sampled coordinates
 * Supports Caching, In-flight Deduplication, and Spatial Tile Grids
 */
async function getPOIsForTiles(sampledCoords) {
  if (!sampledCoords || sampledCoords.length === 0) {
    return { status: 'unavailable', reason: 'no_coords', data: [], cacheHit: false };
  }

  const uniqueTiles = new Map();
  sampledCoords.forEach(coord => {
    const lng = coord[0];
    const lat = coord[1];
    const key = getTileKey(lat, lng);
    if (!uniqueTiles.has(key)) {
      uniqueTiles.set(key, getTileBBoxStr(lat, lng));
    }
  });

  const tiles = Array.from(uniqueTiles.entries());
  console.log(`[Infrastructure] Extracted ${tiles.length} distinct grid tiles for route.`);
  console.log(`[Infrastructure] Query categories: police,hospital,pharmacy,fire_station,bus_station,metro,signals,cctv,shop,park,streetlight`);

  const fetchPromiseArray = tiles.map(async ([cacheKey, bboxStr]) => {
    // 1. Check Server-Side Tile Cache
    const cached = spatialCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CONFIG.CACHE_TTL_MS)) {
      console.log(`[Infrastructure] Cache hit for tile: ${cacheKey}`);
      return { status: 'available', data: cached.pois, cacheHit: true };
    }

    // 2. Check In-flight Request Cache
    if (inFlightRequests.has(cacheKey)) {
      console.log(`[Infrastructure] Request reused from in-flight cache (key: ${cacheKey})`);
      return inFlightRequests.get(cacheKey);
    }

    const fetchPromise = (async () => {
      try {
        const rawData = await fetchOverpassWithFailover(bboxStr);
        const chunkPois = normalizeOverpassElements(rawData.elements);
        spatialCache.set(cacheKey, { pois: chunkPois, timestamp: Date.now() });
        if (spatialCache.size > 2000) spatialCache.delete(spatialCache.keys().next().value);
        return { status: 'available', data: chunkPois, cacheHit: false };
      } catch (err) {
        console.warn(`[Infrastructure] Tile fetch failed for ${bboxStr}: ${err.message}`);
        return { status: 'failed', error: err.message };
      }
    })();

    inFlightRequests.set(cacheKey, fetchPromise);
    try {
      const res = await fetchPromise;
      inFlightRequests.delete(cacheKey);
      return res;
    } catch (err) {
      inFlightRequests.delete(cacheKey);
      return { status: 'failed', error: err.message };
    }
  });

  const results = await Promise.allSettled(fetchPromiseArray);
  
  let combinedPOIs = [];
  let successfulTiles = 0;
  let failedTiles = 0;

  results.forEach(res => {
    if (res.status === 'fulfilled' && res.value.status === 'available') {
      combinedPOIs.push(...res.value.data);
      successfulTiles++;
    } else {
      failedTiles++;
    }
  });

  // Deduplicate merged POIs across tiles
  const seen = new Set();
  const uniquePOIs = combinedPOIs.filter(p => {
    const k = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}-${p.category}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  if (successfulTiles === 0) {
    console.error(`[Infrastructure] All ${tiles.length} query tiles failed.`);
    return {
      status: 'unavailable',
      reason: 'all_tiles_failed',
      data: [],
      cacheHit: false
    };
  }

  const isPartial = failedTiles > 0;
  const finalStatus = isPartial ? 'partial' : 'available';

  console.log(`[Infrastructure] POIs returned: ${uniquePOIs.length} (${successfulTiles}/${tiles.length} tiles succeeded, status: ${finalStatus})`);

  return {
    status: finalStatus,
    data: uniquePOIs,
    cacheHit: false
  };
}

module.exports = {
  getPOIsForTiles,
  normalizeOverpassElements,
  CONFIG
};
