/**
 * Geospatial Utilities for Polyline Buffering
 */

/**
 * Haversine formula to calculate distance between two points in meters.
 */
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculates the shortest distance from a point to a line segment defined by two points.
 */
function getDistanceToSegment(pLat, pLng, lineLat1, lineLng1, lineLat2, lineLng2) {
  // Simple geometric approximation valid for small distances
  // Convert everything to meters relative to the first line point for Cartesian math
  const x0 = 0, y0 = 0;
  const x1 = getDistance(lineLat1, lineLng1, lineLat1, lineLng2) * (lineLng2 > lineLng1 ? 1 : -1);
  const y1 = getDistance(lineLat1, lineLng1, lineLat2, lineLng1) * (lineLat2 > lineLat1 ? 1 : -1);
  
  const xp = getDistance(lineLat1, lineLng1, lineLat1, pLng) * (pLng > lineLng1 ? 1 : -1);
  const yp = getDistance(lineLat1, lineLng1, pLat, lineLng1) * (pLat > lineLat1 ? 1 : -1);

  const L2 = x1 * x1 + y1 * y1;
  if (L2 === 0) return getDistance(pLat, pLng, lineLat1, lineLng1); // Line is a point

  // Projection of p onto line
  let t = ((xp - x0) * x1 + (yp - y0) * y1) / L2;
  t = Math.max(0, Math.min(1, t)); // clamp to segment

  const projX = x0 + t * x1;
  const projY = y0 + t * y1;

  // Distance from point to projection in local flat cartesian meters
  return Math.sqrt((xp - projX) ** 2 + (yp - projY) ** 2);
}

/**
 * Returns true if a point is within maxDistance (in meters) of ANY segment of the polyline.
 * @param {Array} polyline Array of [lng, lat] coordinates
 * @param {number} pLat Point Latitude
 * @param {number} pLng Point Longitude
 * @param {number} maxDistance Meters
 */
function isPointNearPolyline(polyline, pLat, pLng, maxDistance = 250) {
  if (!polyline || polyline.length < 2) return false;
  
  for (let i = 0; i < polyline.length - 1; i++) {
    const p1 = polyline[i];
    const p2 = polyline[i+1];
    // polyline is [lng, lat]
    const dist = getDistanceToSegment(pLat, pLng, p1[1], p1[0], p2[1], p2[0]);
    if (dist <= maxDistance) return true;
  }
  return false;
}

/**
 * Interpolates points along a polyline at a specific interval.
 * @param {Array} coords Array of [lng, lat]
 * @param {number} interval Meters between samples
 * @returns {Array} Array of sampled [lng, lat]
 */
function samplePolyline(coords, interval = 100) {
  if (!coords || coords.length === 0) return [];
  if (coords.length === 1) return [coords[0]];

  const sampled = [coords[0]];
  let distanceSinceLastSample = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i];
    const p2 = coords[i+1];
    const segmentLength = getDistance(p1[1], p1[0], p2[1], p2[0]);
    
    if (segmentLength === 0) continue;

    let distanceCoveredInSegment = 0;

    while (distanceSinceLastSample + (segmentLength - distanceCoveredInSegment) >= interval) {
      const distanceToNextSample = interval - distanceSinceLastSample;
      distanceCoveredInSegment += distanceToNextSample;
      
      const fraction = distanceCoveredInSegment / segmentLength;
      const newLng = p1[0] + (p2[0] - p1[0]) * fraction;
      const newLat = p1[1] + (p2[1] - p1[1]) * fraction;
      
      sampled.push([newLng, newLat]);
      distanceSinceLastSample = 0;
    }
    
    distanceSinceLastSample += (segmentLength - distanceCoveredInSegment);
  }
  
  sampled.push(coords[coords.length-1]);
  return sampled;
}

module.exports = {
  getDistance,
  getDistanceToSegment,
  isPointNearPolyline,
  samplePolyline
};
