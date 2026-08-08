const express = require('express')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// ─── Static data (replace with MongoDB in production) ────────────────────────

const DARK_SPOTS = [
  { id: 1, lng: 77.5946, lat: 12.9716, severity: 'critical', lux: 1.2, area: 'Cubbon Park North Gate', complaints: 23, timestamp: new Date() },
  { id: 2, lng: 77.6226, lat: 12.9176, severity: 'critical', lux: 2.8, area: 'Silk Board Junction', complaints: 41, timestamp: new Date() },
  { id: 3, lng: 77.6401, lat: 12.9784, severity: 'critical', lux: 0.9, area: 'Indiranagar 80ft Rd', complaints: 18, timestamp: new Date() },
  { id: 4, lng: 77.5512, lat: 12.9698, severity: 'high', lux: 6.1, area: 'Rajajinagar 3rd Block', complaints: 12, timestamp: new Date() },
  { id: 5, lng: 77.6088, lat: 13.0297, severity: 'high', lux: 7.4, area: 'Hebbal Flyover', complaints: 9, timestamp: new Date() },
  { id: 6, lng: 77.6245, lat: 12.9352, severity: 'high', lux: 8.2, area: 'BTM Layout 2nd Stage', complaints: 15, timestamp: new Date() },
  { id: 7, lng: 77.5998, lat: 12.9560, severity: 'medium', lux: 11.3, area: 'Vasanth Nagar', complaints: 6, timestamp: new Date() },
  { id: 8, lng: 77.6523, lat: 12.9122, severity: 'medium', lux: 13.7, area: 'Electronic City Phase 1', complaints: 8, timestamp: new Date() },
  { id: 9, lng: 77.6714, lat: 12.9590, severity: 'critical', lux: 1.7, area: 'Whitefield Main Rd', complaints: 29, timestamp: new Date() },
  { id: 10, lng: 77.6150, lat: 12.9650, severity: 'high', lux: 9.3, area: 'Richmond Circle', complaints: 10, timestamp: new Date() },
]

const ROUTES = {
  dangerous: {
    name: 'Silk Board Service Rd',
    coordinates: [
      [77.6226, 12.9176], [77.6237, 12.9182], [77.6249, 12.9190],
      [77.6258, 12.9201], [77.6262, 12.9215], [77.6258, 12.9228],
      [77.6249, 12.9240], [77.6238, 12.9248], [77.6225, 12.9252],
    ],
    lux: 3.2,
    riskScore: 91,
    incidents: 14,
    streetlights: '7% operational',
    cctv: 'None',
  },
  safe: {
    name: 'Church Street',
    coordinates: [
      [77.5945, 12.9752], [77.5958, 12.9748], [77.5971, 12.9741],
      [77.5983, 12.9736], [77.5996, 12.9731], [77.6008, 12.9727],
      [77.6021, 12.9722], [77.6033, 12.9717],
    ],
    lux: 28.5,
    riskScore: 12,
    incidents: 1,
    streetlights: '94% operational',
    cctv: 'Every 80m',
  }
}

let sensorReports = []
let reportIdCounter = 100

// ─── Routes ──────────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() })
})

// Get all dark spots (optionally filter by severity)
app.get('/api/dark-spots', (req, res) => {
  const { severity } = req.query
  const data = severity ? DARK_SPOTS.filter(s => s.severity === severity) : DARK_SPOTS
  res.json({ count: data.length, spots: data })
})

// Get city aggregate stats
app.get('/api/stats', (req, res) => {
  const critical = DARK_SPOTS.filter(s => s.severity === 'critical').length
  const totalComplaints = DARK_SPOTS.reduce((sum, s) => sum + s.complaints, 0)
  res.json({
    totalDarkZones: DARK_SPOTS.length + 332,
    criticalZones: critical + 83,
    totalComplaints: totalComplaints + 2634,
    avgResponseDays: 23,
    streetlightDeficit: 62,
    incidentsLastMonth: 156,
  })
})

// Get route data
app.get('/api/routes', (req, res) => {
  res.json(ROUTES)
})

// Accept a new sensor reading from a citizen device
app.post('/api/sensor-report', (req, res) => {
  const { lat, lng, lux, timestamp } = req.body

  if (!lat || !lng || lux === undefined) {
    return res.status(400).json({ error: 'lat, lng, and lux are required' })
  }

  const report = {
    id: ++reportIdCounter,
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    lux: parseFloat(lux),
    severity: lux < 5 ? 'critical' : lux < 15 ? 'high' : 'medium',
    timestamp: timestamp || new Date(),
    source: 'citizen_sensor',
  }

  sensorReports.push(report)
  // Keep only last 500 reports in memory
  if (sensorReports.length > 500) sensorReports = sensorReports.slice(-500)

  console.log(`[Sensor] New report: ${lux} lux at (${lat}, ${lng}) — ${report.severity}`)

  res.status(201).json({ success: true, report })
})

// Get recent sensor reports (last 50)
app.get('/api/sensor-reports', (req, res) => {
  const recent = sensorReports.slice(-50).reverse()
  res.json({ count: recent.length, reports: recent })
})

// Raise a work order for a dark spot
app.post('/api/work-orders', (req, res) => {
  const { spotId, area, priority, notes } = req.body
  const workOrder = {
    id: `WO-${Date.now()}`,
    spotId,
    area,
    priority: priority || 'high',
    notes,
    status: 'raised',
    createdAt: new Date(),
    assignedTo: 'BBMP Electrical Division',
  }
  console.log(`[WorkOrder] Raised: ${workOrder.id} for ${area}`)
  res.status(201).json({ success: true, workOrder })
})

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🛡  RakshaNav API running on http://localhost:${PORT}`)
  console.log(`   GET  /api/health`)
  console.log(`   GET  /api/dark-spots?severity=critical|high|medium`)
  console.log(`   GET  /api/stats`)
  console.log(`   GET  /api/routes`)
  console.log(`   POST /api/sensor-report  { lat, lng, lux }`)
  console.log(`   GET  /api/sensor-reports`)
  console.log(`   POST /api/work-orders    { spotId, area, priority, notes }\n`)
})
