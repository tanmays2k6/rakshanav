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

/**
 * Calculates geographic area of bounding box in km²
 */
function calculateBBoxAreaKm2(minLat, minLng, maxLat, maxLng) {
  const midLat = (minLat + maxLat) / 2;
  const latKm = Math.abs(maxLat - minLat) * 111.0;
  const lngKm = Math.abs(maxLng - minLng) * 111.0 * Math.cos(midLat * Math.PI / 180);
  return Math.max(0.1, latKm * lngKm);
}

/**
 * Generates a normalized spatial bounding box cache key
 */
function getBoundingBoxCacheKey(minLat, minLng, maxLat, maxLng) {
  const round = (num) => (Math.floor(num * 50) / 50).toFixed(2); // ~2km tile precision
  return `tile_${round(minLat)}_${round(maxLat)}_${round(minLng)}_${round(maxLng)}_v3`;
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
  
  // Standard Query: Lightweight nodes only (No way["highway"] dumps!)
  return `[out:json][timeout:15];(
    node["amenity"~"police|hospital|clinic|pharmacy|fire_station|bank|atm|fuel|bus_station"](${bboxStr});
    node["railway"="station"](${bboxStr});
    node["highway"~"traffic_signals|crossing"](${bboxStr});
    node["man_made"="surveillance"](${bboxStr});
    node["shop"](${bboxStr});
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
 * Split a bounding box into smaller geographic grid chunks if area exceeds MAX_QUERY_AREA_SQ_KM
 */
function chunkBoundingBox(minLat, minLng, maxLat, maxLng) {
  const area = calculateBBoxAreaKm2(minLat, minLng, maxLat, maxLng);
  if (area <= CONFIG.MAX_QUERY_AREA_SQ_KM) {
    return [{ minLat, minLng, maxLat, maxLng }];
  }

  // Split into 2 or 4 geographic quadrants
  const midLat = (minLat + maxLat) / 2;
  const midLng = (minLng + maxLng) / 2;

  const chunks = [
    { minLat, minLng, maxLat: midLat, maxLng: midLng },
    { minLat: midLat, minLng, maxLat, maxLng: midLng },
    { minLat, minLng: midLng, maxLat: midLat, maxLng },
    { minLat: midLat, minLng: midLng, maxLat, maxLng }
  ];

  return chunks.slice(0, CONFIG.MAX_QUERY_CHUNKS);
}

/**
 * Main Service API: Retrieves POIs for a geographic Bounding Box
 * Supports Caching, In-flight Deduplication, and Spatial Chunking for Large Boxes
 */
async function getPOIsForBoundingBox(minLat, minLng, maxLat, maxLng) {
  const area = calculateBBoxAreaKm2(minLat, minLng, maxLat, maxLng);
  const cacheKey = getBoundingBoxCacheKey(minLat, minLng, maxLat, maxLng);

  console.log(`[Infrastructure] Candidate bbox: ${minLat.toFixed(4)},${minLng.toFixed(4)} to ${maxLat.toFixed(4)},${maxLng.toFixed(4)}`);
  console.log(`[Infrastructure] BBox area: ${area.toFixed(1)} km²`);
  console.log(`[Infrastructure] Query categories: police,hospital,pharmacy,fire_station,atm,fuel,bus_station,metro,signals,cctv`);

  // 1. Check Server-Side Tile Cache
  const cached = spatialCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CONFIG.CACHE_TTL_MS)) {
    console.log(`[Infrastructure] Cache hit: true (key: ${cacheKey})`);
    console.log(`[Infrastructure] POIs returned: ${cached.pois.length}`);
    return { status: 'available', data: cached.pois, cacheHit: true };
  }

  // 2. Check In-flight Request Cache (Deduplication)
  if (inFlightRequests.has(cacheKey)) {
    console.log(`[Infrastructure] Request reused from in-flight cache (key: ${cacheKey})`);
    return inFlightRequests.get(cacheKey);
  }

  // 3. Determine Chunks
  const chunks = chunkBoundingBox(minLat, minLng, maxLat, maxLng);
  console.log(`[Infrastructure] Query chunks: ${chunks.length}`);

  const fetchPromise = (async () => {
    let combinedPOIs = [];
    let successfulChunks = 0;
    let failedChunks = 0;

    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      const bMinLat = (c.minLat - 0.003).toFixed(4);
      const bMinLng = (c.minLng - 0.003).toFixed(4);
      const bMaxLat = (c.maxLat + 0.003).toFixed(4);
      const bMaxLng = (c.maxLng + 0.003).toFixed(4);
      const bboxStr = `${bMinLat},${bMinLng},${bMaxLat},${bMaxLng}`;

      try {
        const rawData = await fetchOverpassWithFailover(bboxStr);
        const chunkPois = normalizeOverpassElements(rawData.elements);
        combinedPOIs.push(...chunkPois);
        successfulChunks++;
      } catch (err) {
        console.warn(`[Infrastructure] Chunk ${i + 1}/${chunks.length} failed: ${err.message}`);
        failedChunks++;
      }
    }

    // Deduplicate merged POIs across chunks
    const seen = new Set();
    const uniquePOIs = combinedPOIs.filter(p => {
      const k = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}-${p.category}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    if (successfulChunks === 0) {
      console.error(`[Infrastructure] All ${chunks.length} query chunks failed. Returning structured unavailable state.`);
      return {
        status: 'unavailable',
        reason: 'infrastructure_query_timeout',
        data: [],
        cacheHit: false
      };
    }

    const isPartial = failedChunks > 0;
    const finalStatus = isPartial ? 'partial' : 'available';

    console.log(`[Infrastructure] POIs returned: ${uniquePOIs.length} (${successfulChunks}/${chunks.length} chunks succeeded, status: ${finalStatus})`);
    
    // Store in spatial cache
    spatialCache.set(cacheKey, { pois: uniquePOIs, timestamp: Date.now() });
    if (spatialCache.size > 150) spatialCache.delete(spatialCache.keys().next().value);

    return {
      status: finalStatus,
      data: uniquePOIs,
      cacheHit: false
    };
  })();

  inFlightRequests.set(cacheKey, fetchPromise);

  try {
    const res = await fetchPromise;
    inFlightRequests.delete(cacheKey);
    return res;
  } catch (err) {
    inFlightRequests.delete(cacheKey);
    return {
      status: 'unavailable',
      reason: err.message,
      data: [],
      cacheHit: false
    };
  }
}

module.exports = {
  getPOIsForBoundingBox,
  normalizeOverpassElements,
  CONFIG
};
