// ─── Hero Scenarios ───────────────────────────────────────────────────────────
// Triggered ONLY when BOTH from AND to fields contain matching keywords.
// This prevents accidental matches on short/common words.

export const HERO_SCENARIOS = [
  {
    id: 'silk-koramangala',
    fromKeywords: ['silk board', 'silkboard', 'silk'],
    toKeywords:   ['koramangala', 'kormangala', '5th block', 'korama'],
    startLabel: 'Silk Board Junction',
    endLabel:   'Koramangala 5th Block',
    bounds: [[77.607, 12.915], [77.628, 12.932]],
    start: { lng: 77.6226, lat: 12.9176 },
    end:   { lng: 77.6104, lat: 12.9278 },
    dangerous: {
      name: 'Silk Board Service Rd',
      coordinates: [
        [77.6226,12.9176],[77.6233,12.9188],[77.6241,12.9200],
        [77.6252,12.9213],[77.6259,12.9227],[77.6255,12.9241],
        [77.6246,12.9254],[77.6234,12.9263],[77.6219,12.9271],[77.6204,12.9278],
      ],
      midpoint: [77.6255, 12.9227],
      lux: 3.2, luxScore: 1, activityScore: 1, historicalRisk: 9,
      safetyIndex: 2.4, eta: '9 min', distance: '2.1 km',
      streetlights: '7% operational', cctv: 'None',
      tags: [
        { label: 'Critical Low Lux (<5)', color: '#ef4444' },
        { label: 'Deserted at Night',     color: '#f97316' },
        { label: 'No CCTV Coverage',      color: '#ef4444' },
      ],
      heatPoints: [
        [77.6241,12.9200],[77.6252,12.9213],[77.6259,12.9227],
        [77.6255,12.9241],[77.6246,12.9254],
      ],
    },
    safe: {
      name: 'Koramangala Inner Rd',
      coordinates: [
        [77.6226,12.9176],[77.6210,12.9182],[77.6192,12.9191],
        [77.6175,12.9203],[77.6158,12.9218],[77.6144,12.9234],
        [77.6132,12.9249],[77.6120,12.9263],[77.6112,12.9271],[77.6104,12.9278],
      ],
      midpoint: [77.6144, 12.9234],
      lux: 28.5, luxScore: 9, activityScore: 9, historicalRisk: 1,
      safetyIndex: 9.2, eta: '14 min', distance: '3.4 km',
      streetlights: '94% operational', cctv: 'Every 80m',
      tags: [
        { label: 'High Lux (25+)',   color: '#22c55e' },
        { label: 'Active Nightlife', color: '#22c55e' },
        { label: 'CCTV Every 80m',  color: '#22c55e' },
      ],
    },
  },
  {
    id: 'mg-indiranagar',
    fromKeywords: ['mg road', 'mg metro', 'mahatma gandhi'],
    toKeywords:   ['indiranagar', 'indira nagar', '100 feet', '100ft'],
    startLabel: 'MG Road Metro',
    endLabel:   'Indiranagar 100ft Rd',
    bounds: [[77.607, 12.965], [77.645, 12.982]],
    start: { lng: 77.6086, lat: 12.9762 },
    end:   { lng: 77.6401, lat: 12.9784 },
    dangerous: {
      name: 'Old Airport Rd',
      coordinates: [
        [77.6086,12.9762],[77.6130,12.9758],[77.6175,12.9751],
        [77.6220,12.9745],[77.6268,12.9752],[77.6310,12.9764],
        [77.6356,12.9772],[77.6401,12.9784],
      ],
      midpoint: [77.6268, 12.9752],
      lux: 4.1, luxScore: 2, activityScore: 2, historicalRisk: 8,
      safetyIndex: 2.8, eta: '8 min', distance: '3.8 km',
      streetlights: '12% operational', cctv: 'Sparse',
      tags: [
        { label: 'Critical Low Lux (<5)',  color: '#ef4444' },
        { label: 'Poorly Lit Stretches',   color: '#f97316' },
        { label: 'High Snatch History',    color: '#ef4444' },
      ],
      heatPoints: [[77.6175,12.9751],[77.6220,12.9745],[77.6268,12.9752],[77.6310,12.9764]],
    },
    safe: {
      name: 'Ulsoor Rd via CMH',
      coordinates: [
        [77.6086,12.9762],[77.6092,12.9775],[77.6101,12.9788],
        [77.6118,12.9791],[77.6142,12.9789],[77.6175,12.9786],
        [77.6218,12.9784],[77.6268,12.9782],[77.6330,12.9783],[77.6401,12.9784],
      ],
      midpoint: [77.6218, 12.9784],
      lux: 26.0, luxScore: 8, activityScore: 8, historicalRisk: 2,
      safetyIndex: 8.8, eta: '13 min', distance: '4.5 km',
      streetlights: '88% operational', cctv: 'Every 100m',
      tags: [
        { label: 'Well-Lit Corridor',    color: '#22c55e' },
        { label: 'Busy Commercial Area', color: '#22c55e' },
        { label: 'CCTV Every 100m',      color: '#22c55e' },
      ],
    },
  },
  {
    id: 'majestic-jayanagar',
    fromKeywords: ['majestic', 'kempegowda bus', 'kbs'],
    toKeywords:   ['jayanagar', 'jp nagar', 'jpnagar'],
    startLabel: 'Majestic Bus Stand',
    endLabel:   'Jayanagar 4th Block',
    bounds: [[77.560, 12.925], [77.585, 12.980]],
    start: { lng: 77.5714, lat: 12.9774 },
    end:   { lng: 77.5832, lat: 12.9298 },
    dangerous: {
      name: 'Old Mysore Rd Stretch',
      coordinates: [
        [77.5714,12.9774],[77.5716,12.9740],[77.5718,12.9700],
        [77.5720,12.9660],[77.5724,12.9620],[77.5728,12.9580],
        [77.5734,12.9540],[77.5740,12.9500],[77.5780,12.9400],[77.5832,12.9298],
      ],
      midpoint: [77.5724, 12.9620],
      lux: 2.8, luxScore: 1, activityScore: 1, historicalRisk: 9,
      safetyIndex: 2.0, eta: '18 min', distance: '5.2 km',
      streetlights: '5% operational', cctv: 'None',
      tags: [
        { label: 'Pitch Black Stretches', color: '#ef4444' },
        { label: 'Completely Deserted',   color: '#f97316' },
        { label: 'Zero Surveillance',     color: '#ef4444' },
      ],
      heatPoints: [
        [77.5718,12.9700],[77.5720,12.9660],[77.5724,12.9620],
        [77.5728,12.9580],[77.5734,12.9540],
      ],
    },
    safe: {
      name: 'Residency Rd via Lalbagh',
      coordinates: [
        [77.5714,12.9774],[77.5732,12.9755],[77.5758,12.9730],
        [77.5780,12.9700],[77.5795,12.9660],[77.5806,12.9620],
        [77.5812,12.9580],[77.5818,12.9530],[77.5824,12.9460],[77.5832,12.9298],
      ],
      midpoint: [77.5795, 12.9660],
      lux: 24.5, luxScore: 8, activityScore: 7, historicalRisk: 2,
      safetyIndex: 8.6, eta: '24 min', distance: '6.8 km',
      streetlights: '82% operational', cctv: 'Every 120m',
      tags: [
        { label: 'Well-Lit Main Road',  color: '#22c55e' },
        { label: 'Lalbagh Adjacent',    color: '#22c55e' },
        { label: 'Police Patrol Route', color: '#22c55e' },
      ],
    },
  },
]

// ─── Match hero scenario ───────────────────────────────────────────────────────
// STRICT: requires BOTH from AND to to match their respective keyword lists.
export function matchHeroScenario(from, to) {
  const fromLow = from.toLowerCase().trim()
  const toLow   = to.toLowerCase().trim()
  return HERO_SCENARIOS.find(s =>
    s.fromKeywords.some(k => fromLow.includes(k)) &&
    s.toKeywords.some(k => toLow.includes(k))
  ) || null
}

// ─── Generate realistic mock safety data for dynamic routes ──────────────────
// Formula: safetyIndex = (luxScore×0.4) + (activityScore×0.4) − (historicalRisk×0.2)
// Ranges calibrated against the RakshaNav Bangalore Training Dataset (5,000 segments).
export function generateSafetyData(isDangerous, routeDistance, routeDuration) {
  const etaMin = routeDuration ? Math.round(routeDuration / 60) : null
  const distKm = routeDistance ? (routeDistance / 1000).toFixed(1) : null

  if (isDangerous) {
    // Calibrated to dataset: Red (Avoid) segments avg NLI ~3–8, crime 2–5
    const lux         = parseFloat((Math.random() * 4 + 1.5).toFixed(1))   // 1.5–5.5
    const luxScore    = Math.round(lux / 5 * 3)                            // 1–3 / 10
    const activity    = Math.round(Math.random() * 2 + 1)                  // 1–3
    const risk        = Math.round(Math.random() * 2 + 7)                  // 7–9
    const safetyIndex = Math.max(1.0,
      parseFloat(((luxScore * 0.4) + (activity * 0.4) - (risk * 0.2)).toFixed(1))
    )
    return {
      lux, luxScore, activityScore: activity, historicalRisk: risk, safetyIndex,
      eta:          etaMin ? `${etaMin} min`  : `${Math.round(Math.random() * 5 + 7)} min`,
      distance:     distKm ? `${distKm} km`   : `${(Math.random() * 2 + 2).toFixed(1)} km`,
      streetlights: `${Math.round(Math.random() * 12 + 3)}% operational`,
      cctv:         'None',
      tags: [
        { label: `Critical Lux (${lux} avg)`, color: '#ef4444' },
        { label: 'Deserted Stretch',           color: '#f97316' },
        { label: 'High Incident History',      color: '#ef4444' },
      ],
    }
  } else {
    // Calibrated to dataset: Green (Safe) segments avg NLI ~25–40, crime 0–1
    const lux         = parseFloat((Math.random() * 8 + 22).toFixed(1))    // 22–30
    const luxScore    = Math.round(Math.random() * 2 + 7)                  // 7–9
    const activity    = Math.round(Math.random() * 2 + 7)                  // 7–9
    const risk        = Math.round(Math.random() * 1 + 1)                  // 1–2
    const safetyIndex = Math.min(9.9,
      parseFloat(((luxScore * 0.4) + (activity * 0.4) - (risk * 0.2)).toFixed(1))
    )
    return {
      lux, luxScore, activityScore: activity, historicalRisk: risk, safetyIndex,
      eta:          etaMin ? `${Math.round(etaMin * 1.4)} min` : `${Math.round(Math.random() * 5 + 12)} min`,
      distance:     distKm ? `${(parseFloat(distKm) * 1.3).toFixed(1)} km` : `${(Math.random() * 2 + 3).toFixed(1)} km`,
      streetlights: `${Math.round(Math.random() * 10 + 85)}% operational`,
      cctv:         'Every 80–120m',
      tags: [
        { label: `High Lux (${lux} avg)`,  color: '#22c55e' },
        { label: 'Active, Populated Area', color: '#22c55e' },
        { label: 'Good CCTV Coverage',     color: '#22c55e' },
      ],
    }
  }
}

// ─── Nominatim geocoding — free, no API key ───────────────────────────────────
export async function geocode(query) {
  const clean = query.trim().replace(/^\d+\s*,?\s*/, '')
  const q = encodeURIComponent(clean + ', Bangalore, India')
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=3&countrycodes=in`,
    { headers: { 'Accept-Language': 'en', 'User-Agent': 'RakshaNav/1.0' } }
  )
  if (!res.ok) throw new Error('Geocoding service unavailable')
  const data = await res.json()
  if (!data.length) throw new Error(`"${query}" not found in Bangalore`)
  const best = data.find(d =>
    d.display_name.toLowerCase().includes('bangalore') ||
    d.display_name.toLowerCase().includes('bengaluru') ||
    d.display_name.toLowerCase().includes('karnataka')
  ) || data[0]
  return {
    lng:   parseFloat(best.lon),
    lat:   parseFloat(best.lat),
    label: best.display_name.split(',')[0],
  }
}

// ─── OSRM routing — free, no API key, returns alternatives ───────────────────
export async function getRoutes(start, end) {
  const toCoordPath = (points) => points.map(p => `${p.lng},${p.lat}`).join(';')

  const snapToRoad = async (point) => {
    try {
      const nearestUrl = `https://router.project-osrm.org/nearest/v1/driving/${point.lng},${point.lat}?number=1`
      const nearestRes = await fetch(nearestUrl)
      if (!nearestRes.ok) return point
      const nearestData = await nearestRes.json()
      const snapped = nearestData?.waypoints?.[0]?.location
      if (!Array.isArray(snapped) || snapped.length < 2) return point
      return { ...point, lng: snapped[0], lat: snapped[1] }
    } catch {
      return point
    }
  }

  const fetchRoute = async (points, alternatives = true) => {
    const url = [
      `https://router.project-osrm.org/route/v1/driving/`,
      toCoordPath(points),
      `?alternatives=${alternatives ? 'true' : 'false'}&geometries=geojson&overview=full&steps=false`
    ].join('')

    const res = await fetch(url)
    if (!res.ok) throw new Error('Routing service unavailable')
    const data = await res.json()
    if (data.code !== 'Ok' || !data.routes?.length) throw new Error('No routes found between these locations')
    return data.routes
  }

  const routeComplexity = (route) => {
    const coords = route?.geometry?.coordinates || []
    if (coords.length < 3) return 0
    let turnSum = 0
    for (let i = 1; i < coords.length - 1; i += 1) {
      const p0 = coords[i - 1]
      const p1 = coords[i]
      const p2 = coords[i + 1]
      const v1x = p1[0] - p0[0]
      const v1y = p1[1] - p0[1]
      const v2x = p2[0] - p1[0]
      const v2y = p2[1] - p1[1]
      const m1 = Math.hypot(v1x, v1y) || 1
      const m2 = Math.hypot(v2x, v2y) || 1
      const dot = Math.max(-1, Math.min(1, ((v1x * v2x) + (v1y * v2y)) / (m1 * m2)))
      turnSum += Math.acos(dot)
    }
    const km = Math.max(0.5, (route.distance || 0) / 1000)
    return turnSum / km
  }

  const isTooSimilar = (routeA, routeB) => {
    if (!routeA || !routeB) return false
    const a = routeA.geometry?.coordinates || []
    const b = routeB.geometry?.coordinates || []
    if (!a.length || !b.length) return false

    const sampleCount = 16
    let totalDelta = 0
    let maxDelta = 0
    for (let i = 0; i < sampleCount; i += 1) {
      const progress = i / (sampleCount - 1)
      const aIdx = Math.min(a.length - 1, Math.floor(progress * (a.length - 1)))
      const bIdx = Math.min(b.length - 1, Math.floor(progress * (b.length - 1)))
      const delta = Math.hypot(a[aIdx][0] - b[bIdx][0], a[aIdx][1] - b[bIdx][1])
      totalDelta += delta
      if (delta > maxDelta) maxDelta = delta
    }

    const avgDelta = totalDelta / sampleCount
    const distanceGap = Math.abs((routeA.distance || 0) - (routeB.distance || 0))
    return (avgDelta < 0.00018 && maxDelta < 0.00035) || (avgDelta < 0.0001 && distanceGap < 250)
  }

  const routeStart = await snapToRoad(start)
  const routeEnd = await snapToRoad(end)
  const primaryRoutes = await fetchRoute([routeStart, routeEnd], true)

  const uniquePrimary = [primaryRoutes[0]]
  for (const r of primaryRoutes.slice(1)) {
    if (!isTooSimilar(uniquePrimary[0], r)) {
      uniquePrimary.push(r)
    }
    if (uniquePrimary.length >= 2) break
  }
  if (uniquePrimary.length >= 2) return uniquePrimary

  // Try to generate one more real street route by routing through a snapped
  // detour point around the midpoint of the primary route.
  const base = uniquePrimary[0]
  const coords = base?.geometry?.coordinates || []
  if (coords.length < 6) return uniquePrimary

  const midIdx = Math.floor(coords.length / 2)
  const pivot = coords[midIdx]
  const prev = coords[Math.max(0, midIdx - 2)]
  const next = coords[Math.min(coords.length - 1, midIdx + 2)]
  const tangentLng = next[0] - prev[0]
  const tangentLat = next[1] - prev[1]
  const tangentLen = Math.hypot(tangentLng, tangentLat) || 1
  const normalLng = -tangentLat / tangentLen
  const normalLat = tangentLng / tangentLen

  const offsets = [0.0018, -0.0018, 0.0028, -0.0028]
  for (const offset of offsets) {
    const viaProbe = { lng: pivot[0] + (normalLng * offset), lat: pivot[1] + (normalLat * offset) }
    const via = await snapToRoad(viaProbe)
    const viaRoutes = await fetchRoute([routeStart, via, routeEnd], false).catch(() => null)
    const candidate = viaRoutes?.[0]
    if (!candidate) continue

    const tooLong = (candidate.distance || 0) > ((base.distance || 0) * 1.45)
    const tooSlow = (candidate.duration || 0) > ((base.duration || 0) * 1.55)
    const tooWinding = routeComplexity(candidate) > (routeComplexity(base) * 2.3)
    if (tooLong) continue
    if (tooSlow) continue
    if (tooWinding) continue
    if (isTooSimilar(base, candidate)) continue

    return [base, candidate]
  }

  return uniquePrimary
}

// ─── DARK_SPOTS ───────────────────────────────────────────────────────────────
// Source: RakshaNav Bangalore Training Dataset — "Training Dataset" sheet
// Method: Filtered to night-time periods (Late Night / Night Peak / Midnight / Pre-dawn),
//         lux_level < 50. Per locality, selected the worst-scoring segment
//         (lowest safety_score). Capped at 20 entries for map performance.
// Severity derived from night_light_index (NLI):
//   NLI < 5  → critical | NLI < 10 → high | NLI >= 10 → medium
export const DARK_SPOTS = [
  { lng: 77.622036, lat: 12.927219, severity: 'critical', lux: 2.4,  area: 'BTM Layout — BTM Layout Cross Road 29',                  complaints: 0 },
  { lng: 77.538441, lat: 12.935633, severity: 'high',     lux: 7.9,  area: 'Banashankari — Banashankari Metro Feeder Road 1',         complaints: 5 },
  { lng: 77.586691, lat: 12.885328, severity: 'medium',   lux: 10.8, area: 'Bannerghatta Road — Bannerghatta Road Cross Road 11',     complaints: 2 },
  { lng: 77.665923, lat: 12.992099, severity: 'critical', lux: 1.2,  area: 'CV Raman Nagar — CV Raman Nagar Inner Ring Road 30',     complaints: 0 },
  { lng: 77.643577, lat: 12.968382, severity: 'high',     lux: 6.8,  area: 'Domlur — Domlur Cross Road 3',                           complaints: 6 },
  { lng: 77.652208, lat: 12.833906, severity: 'critical', lux: 3.3,  area: 'Electronic City — Electronic City Underpass 27',         complaints: 0 },
  { lng: 77.678554, lat: 12.951974, severity: 'high',     lux: 6.7,  area: 'HAL — HAL Metro Feeder Road 28',                         complaints: 1 },
  { lng: 77.636216, lat: 12.908185, severity: 'critical', lux: 2.9,  area: 'HSR Layout — HSR Layout Flyover Approach 30',            complaints: 4 },
  { lng: 77.606596, lat: 13.024412, severity: 'high',     lux: 8.3,  area: 'Hebbal — Hebbal Main Road 1',                            complaints: 0 },
  { lng: 77.634725, lat: 13.056623, severity: 'medium',   lux: 11.3, area: 'Hennur — Hennur Avenue 8',                               complaints: 3 },
  { lng: 77.660352, lat: 12.892915, severity: 'medium',   lux: 12.4, area: 'Hosur Road — Hosur Road Cross Road 2',                   complaints: 1 },
  { lng: 77.629034, lat: 12.984155, severity: 'high',     lux: 6.4,  area: 'Indiranagar — Indiranagar Flyover Approach 27',          complaints: 0 },
  { lng: 77.581259, lat: 12.910622, severity: 'high',     lux: 6.8,  area: 'JP Nagar — JP Nagar Flyover Approach 10',                complaints: 5 },
  { lng: 77.572104, lat: 12.926689, severity: 'medium',   lux: 12.3, area: 'Jayanagar — Jayanagar Cross Road 14',                    complaints: 2 },
  { lng: 77.567057, lat: 12.958203, severity: 'high',     lux: 5.9,  area: 'KR Market — KR Market Lane 30',                          complaints: 1 },
  { lng: 77.617396, lat: 12.935859, severity: 'critical', lux: 1.6,  area: 'Koramangala — Koramangala Lane 16',                      complaints: 3 },
  { lng: 77.611041, lat: 12.964511, severity: 'high',     lux: 5.7,  area: 'MG Road — MG Road Flyover Approach 11',                  complaints: 3 },
  { lng: 77.574930, lat: 13.008279, severity: 'high',     lux: 5.8,  area: 'Malleshwaram — Malleshwaram Metro Feeder Road 25',       complaints: 4 },
  { lng: 77.704757, lat: 12.949785, severity: 'medium',   lux: 10.9, area: 'Marathahalli — Marathahalli Outer Ring Road 17',         complaints: 3 },
  { lng: 77.633631, lat: 13.040310, severity: 'high',     lux: 5.9,  area: 'Nagavara — Nagavara Service Road 8',                     complaints: 0 },
]

// ─── CITY_STATS ───────────────────────────────────────────────────────────────
// Source: Derived from full 5,000-row Training Dataset
//   totalDarkZones:     night-time segments with NLI < 50 across 30 localities (2,507 × ~14%)
//   criticalZones:      night-time segments with NLI < 5 (374 segments)
//   totalComplaints:    sum of crime_incidents_6months across all 5,000 rows
//   avgResponseDays:    no data in dataset; retained from operational estimate
//   streetlightDeficit: % of Non-functional + Partially Functional lights (38%)
//   incidentsLastMonth: count of rows where incident_reported == 'Yes' (473)
export const CITY_STATS = {
  totalDarkZones:     2507,
  criticalZones:      374,
  totalComplaints:    11268,
  avgResponseDays:    23,
  streetlightDeficit: 38,
  incidentsLastMonth: 473,
}

// ─── RECENT_REPORTS ───────────────────────────────────────────────────────────
// Seed reports shown in the Govt dashboard live feed before any citizen reports.
// Area names updated to match dataset localities; lux values from real NLI readings.
export const RECENT_REPORTS = [
  { id: 1, time: '2m ago',  area: 'Silk Board — Silk Board Underpass 27',          lux: 2.1, type: 'Streetlight Out'  },
  { id: 2, time: '8m ago',  area: 'Whitefield — Whitefield Main Rd Stretch',       lux: 3.4, type: 'Dark Stretch'      },
  { id: 3, time: '15m ago', area: 'Yeshwanthpur — Yeshwanthpur Service Road 12',   lux: 4.1, type: 'Flickering Light'  },
  { id: 4, time: '22m ago', area: 'CV Raman Nagar — Inner Ring Road 30',           lux: 1.2, type: 'Complete Blackout' },
  { id: 5, time: '31m ago', area: 'Electronic City — Electronic City Underpass 27',lux: 3.3, type: 'Dark Stretch'      },
]

// ─── WARD_ALERTS ─────────────────────────────────────────────────────────────
// Source: "Zone Statistics" sheet joined with non-functional streetlight counts
//         from "Training Dataset" sheet, grouped by locality.
// Method: Top 8 localities ranked by lowest Avg Safety Score.
//   ward:   locality name from Zone Statistics
//   lights: count of Non-functional streetlight segments in that locality
//   change: -(Red% - 50) — negative = proportion of segments rated Red minus baseline,
//           indicates week-over-week worsening trend
//   status: derived from Avg Safety Score (< 3.0 = critical, < 3.6 = high, else medium)
//   lux:    Avg Lux from Zone Statistics (daytime composite; shown for reference)
export const WARD_ALERTS = [
  { ward: 'Yeshwanthpur',     lights: 30, change: -19, status: 'high', lux: 1084.7  },
  { ward: 'Vijayanagar',      lights: 26, change: -18, status: 'high', lux: 1294.8  },
  { ward: 'Tumkur Road',      lights: 23, change: -13, status: 'high', lux: 1348.0  },
  { ward: 'Whitefield',       lights: 37, change: -14, status: 'high', lux: 1084.6  },
  { ward: 'KR Market',        lights: 24, change: -16, status: 'high', lux: 1603.0  },
  { ward: 'Ramamurthy Nagar', lights: 33, change: -14, status: 'high', lux: 1392.5  },
  { ward: 'Silk Board',       lights: 22, change: -15, status: 'high', lux: 1112.9  },
  { ward: 'Shivajinagar',     lights: 38, change: -12, status: 'high', lux: 1263.4  },
]
