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
// Prevents single-word accidents like "road" or "mg" triggering a scenario.
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
// All scores on 0–10 scale.
export function generateSafetyData(isDangerous, routeDistance, routeDuration) {
  // Format real distance/duration from OSRM if available
  const etaMin  = routeDuration ? Math.round(routeDuration / 60) : null
  const distKm  = routeDistance ? (routeDistance / 1000).toFixed(1) : null

  if (isDangerous) {
    const lux          = parseFloat((Math.random() * 4 + 1.5).toFixed(1))   // 1.5–5.5
    const luxScore     = Math.round(lux / 5 * 3)                            // 1–3 out of 10
    const activity     = Math.round(Math.random() * 2 + 1)                  // 1–3
    const risk         = Math.round(Math.random() * 2 + 7)                  // 7–9
    const safetyIndex  = Math.max(1.0,
      parseFloat(((luxScore * 0.4) + (activity * 0.4) - (risk * 0.2)).toFixed(1))
    )
    return {
      lux, luxScore, activityScore: activity, historicalRisk: risk,
      safetyIndex,
      eta:          etaMin  ? `${etaMin} min`  : `${Math.round(Math.random() * 5 + 7)} min`,
      distance:     distKm  ? `${distKm} km`   : `${(Math.random() * 2 + 2).toFixed(1)} km`,
      streetlights: `${Math.round(Math.random() * 12 + 3)}% operational`,
      cctv:         'None',
      tags: [
        { label: `Critical Lux (${lux} avg)`,  color: '#ef4444' },
        { label: 'Deserted Stretch',            color: '#f97316' },
        { label: 'High Incident History',       color: '#ef4444' },
      ],
    }
  } else {
    const lux         = parseFloat((Math.random() * 8 + 22).toFixed(1))    // 22–30
    const luxScore    = Math.round(Math.random() * 2 + 7)                  // 7–9
    const activity    = Math.round(Math.random() * 2 + 7)                  // 7–9
    const risk        = Math.round(Math.random() * 1 + 1)                  // 1–2
    const safetyIndex = Math.min(9.9,
      parseFloat(((luxScore * 0.4) + (activity * 0.4) - (risk * 0.2)).toFixed(1))
    )
    return {
      lux, luxScore, activityScore: activity, historicalRisk: risk,
      safetyIndex,
      eta:          etaMin  ? `${Math.round(etaMin * 1.4)} min` : `${Math.round(Math.random() * 5 + 12)} min`,
      distance:     distKm  ? `${(parseFloat(distKm) * 1.3).toFixed(1)} km` : `${(Math.random() * 2 + 3).toFixed(1)} km`,
      streetlights: `${Math.round(Math.random() * 10 + 85)}% operational`,
      cctv:         'Every 80–120m',
      tags: [
        { label: `High Lux (${lux} avg)`,   color: '#22c55e' },
        { label: 'Active, Populated Area',  color: '#22c55e' },
        { label: 'Good CCTV Coverage',      color: '#22c55e' },
      ],
    }
  }
}

// ─── Nominatim geocoding — free, no API key ───────────────────────────────────
export async function geocode(query) {
  // Clean up input — strip floor/flat numbers, trailing punctuation
  const clean = query.trim().replace(/^\d+\s*,?\s*/, '')
  const q = encodeURIComponent(clean + ', Bangalore, India')
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=3&countrycodes=in`,
    { headers: { 'Accept-Language': 'en', 'User-Agent': 'RakshaNav/1.0' } }
  )
  if (!res.ok) throw new Error('Geocoding service unavailable')
  const data = await res.json()
  if (!data.length) throw new Error(`"${query}" not found in Bangalore`)
  // Prefer results that mention Bangalore / Karnataka
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
  const url = [
    `https://router.project-osrm.org/route/v1/driving/`,
    `${start.lng},${start.lat};${end.lng},${end.lat}`,
    `?alternatives=true&geometries=geojson&overview=full&steps=false`
  ].join('')

  const res = await fetch(url)
  if (!res.ok) throw new Error('Routing service unavailable')
  const data = await res.json()
  if (data.code !== 'Ok' || !data.routes?.length) throw new Error('No routes found between these locations')

  // If OSRM only returns one route, synthesise a second by nudging midpoints
  if (data.routes.length === 1) {
    const original = data.routes[0]
    const coords   = original.geometry.coordinates
    const nudged   = coords.map((c, i) => {
      // offset every other point slightly to create a visually distinct path
      if (i === 0 || i === coords.length - 1) return c
      const offset = i % 2 === 0 ? 0.003 : -0.002
      return [c[0] + offset, c[1] + offset * 0.5]
    })
    data.routes.push({
      ...original,
      distance: original.distance * 1.28,
      duration: original.duration * 1.35,
      geometry: { type: 'LineString', coordinates: nudged },
    })
  }

  return data.routes
}

// ─── City-wide data for Govt view ─────────────────────────────────────────────
export const DARK_SPOTS = [
  { lng: 77.5946, lat: 12.9716, severity: 'critical', lux: 1.2, area: 'Cubbon Park North Gate',  complaints: 23 },
  { lng: 77.6226, lat: 12.9176, severity: 'critical', lux: 2.8, area: 'Silk Board Junction',     complaints: 41 },
  { lng: 77.6401, lat: 12.9784, severity: 'critical', lux: 0.9, area: 'Indiranagar 80ft Rd',     complaints: 18 },
  { lng: 77.5512, lat: 12.9698, severity: 'high',     lux: 6.1, area: 'Rajajinagar 3rd Block',   complaints: 12 },
  { lng: 77.6088, lat: 13.0297, severity: 'high',     lux: 7.4, area: 'Hebbal Flyover',           complaints: 9  },
  { lng: 77.6245, lat: 12.9352, severity: 'high',     lux: 8.2, area: 'BTM Layout 2nd Stage',    complaints: 15 },
  { lng: 77.5998, lat: 12.9560, severity: 'medium',   lux: 11.3,area: 'Vasanth Nagar',           complaints: 6  },
  { lng: 77.6523, lat: 12.9122, severity: 'medium',   lux: 13.7,area: 'Electronic City Ph.1',    complaints: 8  },
  { lng: 77.5764, lat: 12.9833, severity: 'medium',   lux: 14.2,area: 'Malleshwaram 18th Cross', complaints: 5  },
  { lng: 77.6301, lat: 13.0089, severity: 'medium',   lux: 12.5,area: 'Ulsoor Lake Road',        complaints: 7  },
  { lng: 77.5601, lat: 12.9340, severity: 'high',     lux: 5.8, area: 'JP Nagar 7th Phase',      complaints: 11 },
  { lng: 77.6714, lat: 12.9590, severity: 'critical', lux: 1.7, area: 'Whitefield Main Rd',      complaints: 29 },
  { lng: 77.5820, lat: 13.0100, severity: 'medium',   lux: 15.1,area: 'Sadashivanagar',          complaints: 4  },
  { lng: 77.6150, lat: 12.9650, severity: 'high',     lux: 9.3, area: 'Richmond Circle',         complaints: 10 },
  { lng: 77.6400, lat: 13.0350, severity: 'critical', lux: 3.1, area: 'Manyata Tech Park Rd',    complaints: 22 },
]

export const CITY_STATS = {
  totalDarkZones: 347, criticalZones: 89,
  totalComplaints: 2847, avgResponseDays: 23,
  streetlightDeficit: 62, incidentsLastMonth: 156,
}

export const RECENT_REPORTS = [
  { id: 1, time: '2m ago',  area: 'Silk Board Junction',     lux: 1.8, type: 'Streetlight Out'  },
  { id: 2, time: '8m ago',  area: 'Whitefield Main Rd',      lux: 2.1, type: 'Dark Stretch'      },
  { id: 3, time: '15m ago', area: 'Manyata Tech Park Rd',    lux: 3.4, type: 'Flickering Light'  },
  { id: 4, time: '22m ago', area: 'Indiranagar 80ft Rd',     lux: 0.9, type: 'Complete Blackout' },
  { id: 5, time: '31m ago', area: 'Electronic City Phase 1', lux: 5.2, type: 'Dark Stretch'      },
]

export const WARD_ALERTS = [
  { ward: 'Silk Board Ward 174', lights: 45, change: -40, status: 'critical', lux: 2.1 },
  { ward: 'Whitefield Ward 149', lights: 31, change: -28, status: 'critical', lux: 1.7 },
  { ward: 'Indiranagar Ward 80', lights: 22, change: -15, status: 'high',     lux: 6.2 },
  { ward: 'Manyata Ward 6',      lights: 18, change: -33, status: 'critical', lux: 3.1 },
  { ward: 'BTM Layout Ward 176', lights: 14, change: -12, status: 'high',     lux: 8.2 },
]
