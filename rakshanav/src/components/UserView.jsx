import React, { useState, useRef, useEffect, useCallback } from 'react'
import Map, { Source, Layer, Marker, useMap } from 'react-map-gl/maplibre'
import { generateSafetyData, geocode, getRoutes } from '../data/bangaloreData'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const luxColor = (l) => l < 5 ? '#ef4444' : l < 15 ? '#f97316' : '#22c55e'
const luxLabel = (l) => l < 5 ? 'CRITICAL' : l < 15 ? 'LOW' : 'SAFE'

const glass = (extra = {}) => ({
  background: 'rgba(8,12,18,0.84)',
  backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '16px', ...extra,
})
const glassLight = (extra = {}) => ({
  background: 'rgba(255,255,255,0.92)',
  backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
  border: '1px solid rgba(0,0,0,0.09)',
  borderRadius: '16px', ...extra,
})

const toGeoJSON = (coords) => ({
  type: 'FeatureCollection',
  features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} }]
})
const toHeatGeoJSON = (coords) => ({
  type: 'FeatureCollection',
  features: coords.filter((_, i) => i % 2 === 0).map(c => ({
    type: 'Feature', geometry: { type: 'Point', coordinates: c }, properties: {}
  }))
})
const getBounds = (a, b) => {
  const all = [...a, ...b]
  const lngs = all.map(c => c[0]), lats = all.map(c => c[1])
  return [[Math.min(...lngs) - 0.003, Math.min(...lats) - 0.003],
          [Math.max(...lngs) + 0.003, Math.max(...lats) + 0.003]]
}
const midOf = (coords) => coords[Math.floor(coords.length / 2)]

const REPORT_TYPES = ['Bad Lighting', 'Broken Infrastructure', 'Suspicious Activity', 'Harassment']

// ─── MapFitter ────────────────────────────────────────────────────────────────
function MapFitter({ bounds }) {
  const { current: map } = useMap()
  useEffect(() => {
    if (!bounds || !map) return
    const t = setTimeout(() => map.fitBounds(bounds, { padding: 90, duration: 1200 }), 300)
    return () => clearTimeout(t)
  }, [bounds, map])
  return null
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UserView({ onAddReport, userReports = [] }) {
  const [darkMode,     setDarkMode]     = useState(true)
  const [phase,        setPhase]        = useState('idle')
  const [fromVal,      setFromVal]      = useState('Silk Board Junction')
  const [toVal,        setToVal]        = useState('Koramangala 5th Block')
  const [statusMsg,    setStatusMsg]    = useState('')
  const [errorMsg,     setErrorMsg]     = useState('')
  const [activeRoute,  setActiveRoute]  = useState('both')
  const [routeData,    setRouteData]    = useState(null)
  const [blink,        setBlink]        = useState(true)
  const [sensorLux,    setSensorLux]    = useState(null)
  const [sensorOk,     setSensorOk]     = useState(false)
  const [simLux,       setSimLux]       = useState(18.4)
  const sensorRef  = useRef(null)

  // Reporting state
  const [reportMode,   setReportMode]   = useState(false)
  const [reportCoords, setReportCoords] = useState(null)
  const [showModal,    setShowModal]    = useState(false)
  const [reportType,   setReportType]   = useState('Bad Lighting')
  const [reportLux,    setReportLux]    = useState('3.2')
  const [reportDesc,   setReportDesc]   = useState('')
  const reportIdRef = useRef(200)

  // Blink
  useEffect(() => {
    const t = setInterval(() => setBlink(b => !b), 900)
    return () => clearInterval(t)
  }, [])

  // Simulated sensor
  useEffect(() => {
    if (sensorOk) return
    const t = setInterval(() =>
      setSimLux(p => Math.max(0, Math.round((p + (Math.random() - 0.5) * 5) * 10) / 10)), 1200)
    return () => clearInterval(t)
  }, [sensorOk])

  // Real sensor
  useEffect(() => {
    if (!('AmbientLightSensor' in window)) return
    setSensorOk(true)
    try {
      const s = new window.AmbientLightSensor({ frequency: 2 })
      s.addEventListener('reading', () => setSensorLux(Math.round(s.illuminance)))
      s.addEventListener('error', () => setSensorOk(false))
      s.start(); sensorRef.current = s
    } catch { setSensorOk(false) }
    return () => { if (sensorRef.current) sensorRef.current.stop() }
  }, [])

  const lux  = sensorOk ? (sensorLux ?? simLux) : simLux
  const luxC = luxColor(lux)

  // ── Route search ─────────────────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    if (!fromVal.trim() || !toVal.trim()) return
    setPhase('searching'); setErrorMsg(''); setActiveRoute('both')

    try {
      setStatusMsg('📍 Locating start point...')
      const startCoord = await geocode(fromVal)
      setStatusMsg('📍 Locating destination...')
      const endCoord = await geocode(toVal)
      setStatusMsg('🗺 Fetching real routes...')
      const routes = await getRoutes(startCoord, endCoord)
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
      const routeQuality = (route) => {
        const mins = (route.duration || 0) / 60
        const km = (route.distance || 0) / 1000
        const complexity = routeComplexity(route)
        // Lower score = better commuter route quality.
        return (mins * 1.1) + (km * 2.2) + (complexity * 0.6)
      }

      const primaryRoute = routes[0]
      const secondaryRoute = routes[1] || null
      const hasTwoRoutes = Boolean(secondaryRoute)
      const safeRoute = hasTwoRoutes && routeQuality(secondaryRoute) < routeQuality(primaryRoute)
        ? secondaryRoute
        : primaryRoute
      const dangerRoute = hasTwoRoutes
        ? (safeRoute === primaryRoute ? secondaryRoute : primaryRoute)
        : null

      const safeCoords = safeRoute.geometry.coordinates
      const dangerCoords = dangerRoute?.geometry.coordinates || safeCoords
      setStatusMsg('🛡 Calculating safety scores...')
      await new Promise(r => setTimeout(r, 600))
      const safeData = generateSafetyData(false, safeRoute.distance, safeRoute.duration)
      const dangerData = dangerRoute ? generateSafetyData(true, dangerRoute.distance, dangerRoute.duration) : null
      const fromShort  = fromVal.split(',')[0].trim()
      const toShort    = toVal.split(',')[0].trim()
      setRouteData({
        dangerous: dangerRoute ? { name: `Alternate: ${fromShort} → ${toShort}`, ...dangerData, geoJSON: toGeoJSON(dangerCoords), heatJSON: toHeatGeoJSON(dangerCoords), mid: midOf(dangerCoords) } : null,
        safe:      { name: `Safe: ${fromShort} → ${toShort}`,   ...safeData,   geoJSON: toGeoJSON(safeCoords),  mid: midOf(safeCoords)  },
        bounds: getBounds(dangerCoords, safeCoords),
        start: startCoord, end: endCoord,
        startLabel: startCoord.label, endLabel: endCoord.label,
        hasSingleRoute: !dangerRoute,
        isHero: false,
      })
      setPhase('results')
    } catch (err) {
      setErrorMsg(err.message.includes('not found')
        ? `⚠ ${err.message}. Try "Whitefield" or "HSR Layout".`
        : `⚠ Routing failed. Please try nearby landmark names.`)
      setPhase('error')
    }
  }, [fromVal, toVal])

  const handleClearResults = useCallback(() => {
    setPhase('idle')
    setRouteData(null)
    setActiveRoute('both')
    setStatusMsg('')
    setErrorMsg('')
  }, [])

  // ── Report mode — map click handler ─────────────────────────────────────
  const handleMapClick = useCallback((e) => {
    if (!reportMode) return
    const { lng, lat } = e.lngLat
    // Pre-fill lux with current live reading (simulates passive telemetry)
    setReportLux((sensorOk ? (sensorLux ?? simLux) : simLux).toFixed(1))
    setReportCoords({ lng, lat })
    setReportMode(false)
    setShowModal(true)
  }, [reportMode, sensorOk, sensorLux, simLux])

  // ── Submit report ────────────────────────────────────────────────────────
  const handleSubmitReport = () => {
    if (!reportCoords) return
    reportIdRef.current += 1
    const severity = parseFloat(reportLux) < 5 ? 'critical' : parseFloat(reportLux) < 10 ? 'high' : 'medium'
    onAddReport({
      id:          reportIdRef.current,
      lat:         reportCoords.lat,
      lng:         reportCoords.lng,
      type:        reportType,
      lux:         parseFloat(reportLux),
      description: reportDesc || `${reportType} reported by citizen.`,
      timestamp:   'Just now',
      status:      'Pending',
      severity,
    })
    setShowModal(false)
    setReportCoords(null)
    setReportDesc('')
    setReportType('Bad Lighting')
  }

  const dp    = routeData?.dangerous
  const sp    = routeData?.safe
  const hasBothRoutes = Boolean(dp && sp)
  const showD = hasBothRoutes && activeRoute !== 'safe'
  const showS = hasBothRoutes ? activeRoute !== 'dangerous' : Boolean(sp)
  const card  = darkMode ? glass : glassLight
  const txt   = (a, b) => darkMode ? a : b
  const sub   = darkMode ? '#64748b' : '#6b7280'

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>

      {/* ── FULL-SCREEN MAP ───────────────────────────────────────────────── */}
      <Map
        id="mainMap"
        initialViewState={{ longitude: 77.617, latitude: 12.923, zoom: 13 }}
        style={{ position: 'absolute', inset: 0, cursor: reportMode ? 'crosshair' : 'grab' }}
        mapStyle={darkMode ? 'https://tiles.openfreemap.org/styles/dark' : 'https://tiles.openfreemap.org/styles/positron'}
        attributionControl={false}
        onClick={handleMapClick}
      >
        <MapFitter bounds={phase === 'results' ? routeData?.bounds : null} />

        {/* Route layers */}
        {phase === 'results' && showD && dp && (
          <Source id="heat" type="geojson" data={dp.heatJSON}>
            <Layer id="heat-blur" type="circle" paint={{ 'circle-radius': 42, 'circle-color': '#ef4444', 'circle-opacity': 0.08, 'circle-blur': 1 }} />
          </Source>
        )}
        {phase === 'results' && showD && dp && (
          <Source id="dangerous" type="geojson" data={dp.geoJSON}>
            <Layer id="d-glow2" type="line" paint={{ 'line-color': '#ef4444', 'line-width': 28, 'line-opacity': 0.05 }} />
            <Layer id="d-glow1" type="line" paint={{ 'line-color': '#ef4444', 'line-width': 13, 'line-opacity': 0.20 }} />
            <Layer id="d-core"  type="line" paint={{ 'line-color': '#ff6b6b', 'line-width': 5,  'line-opacity': 1    }} />
          </Source>
        )}
        {phase === 'results' && showS && sp && (
          <Source id="safe" type="geojson" data={sp.geoJSON}>
            <Layer id="s-glow2" type="line" paint={{ 'line-color': '#22c55e', 'line-width': 28, 'line-opacity': 0.05 }} />
            <Layer id="s-glow1" type="line" paint={{ 'line-color': '#22c55e', 'line-width': 13, 'line-opacity': 0.20 }} />
            <Layer id="s-core"  type="line" paint={{ 'line-color': '#4ade80', 'line-width': 5,  'line-opacity': 1    }} />
          </Source>
        )}

        {/* Start / End markers */}
        {phase === 'results' && routeData && (
          <>
            <Marker longitude={routeData.start.lng} latitude={routeData.start.lat}>
              <div style={pinStyle('#1e3a5f', '#93c5fd', 'rgba(59,130,246,0.6)')}>📍 {routeData.startLabel}</div>
            </Marker>
            <Marker longitude={routeData.end.lng} latitude={routeData.end.lat}>
              <div style={pinStyle('#14532d', '#4ade80', 'rgba(34,197,94,0.6)')}>🏠 {routeData.endLabel}</div>
            </Marker>
          </>
        )}

        {/* Route floating labels */}
        {phase === 'results' && showD && dp?.mid && (
          <Marker longitude={dp.mid[0]} latitude={dp.mid[1]}>
            <div style={floatLabel('#ef4444')}>⚠ DANGER ZONE — AVOID • {dp.eta}</div>
          </Marker>
        )}
        {phase === 'results' && showS && sp?.mid && (
          <Marker longitude={sp.mid[0]} latitude={sp.mid[1]}>
            <div style={floatLabel('#22c55e')}>✦ GREEN CORRIDOR — RECOMMENDED • {sp.eta}</div>
          </Marker>
        )}

        {/* ── User report pins on the map ────────────────────────────── */}
        {userReports.map(r => (
          <Marker key={r.id} longitude={r.lng} latitude={r.lat}>
            <div style={{
              width: '14px', height: '14px', borderRadius: '50%',
              background: r.severity === 'critical' ? '#ef4444' : r.severity === 'high' ? '#f97316' : '#eab308',
              border: '2px solid rgba(255,255,255,0.3)',
              boxShadow: `0 0 10px ${r.severity === 'critical' ? '#ef444488' : '#f9731688'}`,
              cursor: 'pointer',
              animation: r.timestamp === 'Just now' ? 'pulse 1.5s infinite' : 'none',
            }} title={`${r.type} — ${r.lux} lux`} />
          </Marker>
        ))}
      </Map>

      {/* ── Report mode banner ───────────────────────────────────────────── */}
      {reportMode && (
        <div style={{
          position: 'absolute', top: '70px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 50,
          background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.5)',
          backdropFilter: 'blur(12px)', borderRadius: '12px',
          padding: '10px 20px', color: '#fca5a5',
          fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px',
          display: 'flex', alignItems: 'center', gap: '10px',
          boxShadow: '0 4px 20px rgba(239,68,68,0.2)',
          animation: 'fadeUp 0.3s ease',
        }}>
          <span style={{ fontSize: '18px' }}>📍</span>
          Click anywhere on the map to pin a safety issue
          <button onClick={() => setReportMode(false)} style={{
            background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '6px', color: '#fca5a5', padding: '3px 9px',
            cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '11px',
          }}>Cancel</button>
        </div>
      )}

      {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: '70px', left: '20px',
        width: '370px', maxHeight: 'calc(100vh - 90px)',
        zIndex: 30, display: 'flex', flexDirection: 'column', gap: '10px',
      }}>

        {/* Search form */}
        <div style={{ ...card({ padding: '20px' }), flexShrink: 0 }}>
          {/* Logo row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.72)',
              border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
            }}>
              <img
                src="/rakshanav-logo.png"
                alt="RakshaNav logo"
                style={{ width: '34px', height: '34px', objectFit: 'contain' }}
              />
            </div>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '16px', color: txt('#fff', '#111'), letterSpacing: '-0.01em' }}>RakshaNav</div>
              <div style={{ fontSize: '10px', color: '#4a7aab', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em' }}>SAFE URBAN NAVIGATION</div>
            </div>
            <div style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px',
              background: luxC + '18', border: `1px solid ${luxC}44`,
              borderRadius: '20px', padding: '4px 10px',
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: luxC, boxShadow: `0 0 6px ${luxC}`, opacity: blink ? 1 : 0.2, transition: 'opacity 0.3s' }} />
              <span style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: luxC }}>{lux.toFixed(1)} lx</span>
            </div>
          </div>

          {/* Inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
            <InputField value={fromVal} onChange={setFromVal} placeholder="Start location..." dot="#3b82f6" dark={darkMode} />
            <InputField value={toVal}   onChange={setToVal}   placeholder="Destination..."    dot="#22c55e" dark={darkMode} />
          </div>

          {/* Find Safe Route button */}
          <button onClick={handleSearch} disabled={phase === 'searching'} style={{
            width: '100%', padding: '12px',
            background: phase === 'searching' ? 'rgba(34,197,94,0.35)' : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
            border: 'none', borderRadius: '11px', color: '#fff',
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', letterSpacing: '0.04em',
            cursor: phase === 'searching' ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
            {phase === 'searching' ? <><Spinner />{statusMsg || 'Analyzing...'}</> : '🛡 Find Safe Route'}
          </button>

          {(phase === 'results' || phase === 'error') && (
            <button onClick={handleClearResults} style={{
              width: '100%', marginTop: '8px', padding: '10px',
              background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              border: `1px solid ${darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
              borderRadius: '11px', color: txt('#cbd5e1', '#374151'),
              fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '12px',
              cursor: 'pointer',
            }}>
              Clear Search Results
            </button>
          )}

          {phase === 'error' && errorMsg && (
            <div style={{ marginTop: '10px', padding: '10px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', fontSize: '11px', color: '#fca5a5', lineHeight: 1.6 }}>{errorMsg}</div>
          )}

          {phase === 'results' && (
            <div style={{ marginTop: '12px', padding: '9px 12px', background: darkMode ? 'rgba(59,130,246,0.07)' : 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: '10px' }}>
              <div style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", color: '#4a7aab', marginBottom: '3px' }}>SAFETY INDEX</div>
              <div style={{ fontSize: '11px', color: sub }}>
                <span style={{ color: '#60a5fa' }}>Lux×0.4</span> + <span style={{ color: '#34d399' }}>Activity×0.4</span> − <span style={{ color: '#f87171' }}>Risk×0.2</span>
              </div>
              {routeData?.hasSingleRoute && (
                <div style={{ marginTop: '6px', fontSize: '10px', color: '#94a3b8' }}>
                  One drivable street route found for this search.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results cards */}
        {phase === 'results' && sp && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'thin', scrollbarColor: 'rgba(30,58,95,0.5) transparent', animation: 'fadeUp 0.4s ease forwards' }}>
            {hasBothRoutes && (
              <div style={{ ...card({ padding: '4px' }), display: 'flex', gap: '4px', flexShrink: 0 }}>
                {[{ key: 'both', label: 'Both Routes' }, { key: 'dangerous', label: '🔴 Danger' }, { key: 'safe', label: '🟢 Safe' }].map(({ key, label }) => {
                const active = activeRoute === key
                return (
                  <button key={key} onClick={() => setActiveRoute(key)} style={{
                    flex: 1, padding: '8px 4px',
                    background: active ? (darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)') : 'transparent',
                    border: 'none', borderRadius: '10px',
                    color: active ? txt('#fff', '#111') : sub,
                    fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '11px',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>{label}</button>
                )
              })}
              </div>
            )}
            {dp && <RouteCard data={dp} type="dangerous" active={showD} darkMode={darkMode} sub={sub} card={card} txt={txt} />}
            <RouteCard data={sp} type="safe"      active={showS} darkMode={darkMode} sub={sub} card={card} txt={txt} />
          </div>
        )}
      </div>

      {/* ── RIGHT CONTROLS ───────────────────────────────────────────────── */}
      <div style={{ position: 'absolute', top: '70px', right: '20px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 30 }}>
        <button onClick={() => setDarkMode(d => !d)} style={{ ...card({ padding: '10px 14px' }), border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: txt('#e2e8f0', '#374151'), fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '12px' }}>
          {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>

        {phase === 'results' && (
          <div style={{ ...card({ padding: '14px' }), animation: 'fadeUp 0.5s ease forwards', maxWidth: '220px' }}>
            <div style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", color: '#4a7aab', letterSpacing: '0.1em', marginBottom: '10px' }}>SAFETY INDEX</div>
            {[
              { label: 'Luminosity',      weight: '40%',  icon: '💡', color: '#60a5fa' },
              { label: 'Activity/Crowd',  weight: '40%',  icon: '👥', color: '#34d399' },
              { label: 'Historical Risk', weight: '−20%', icon: '⚠️', color: '#f87171' },
            ].map(({ label, weight, icon, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '7px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px' }}>{icon}</span>
                  <span style={{ fontSize: '11px', color: sub }}>{label}</span>
                </div>
                <span style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color }}>{weight}</span>
              </div>
            ))}
            <div style={{ height: '1px', background: 'rgba(30,58,95,0.3)', margin: '8px 0' }} />
            <div style={{ fontSize: '10px', color: sub, lineHeight: 1.6 }}>Telemetry + Places API + Crime data</div>
          </div>
        )}
      </div>

      {/* ── REPORT FAB ───────────────────────────────────────────────────── */}
      <button
        onClick={() => { setReportMode(true); setShowModal(false) }}
        title="Report a safety issue"
        style={{
          position: 'absolute', bottom: '32px', right: '24px', zIndex: 40,
          width: '58px', height: '58px', borderRadius: '50%',
          background: reportMode
            ? 'rgba(239,68,68,0.9)'
            : 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
          border: '2px solid rgba(255,255,255,0.15)',
          boxShadow: '0 4px 24px rgba(239,68,68,0.5)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '24px',
          transition: 'all 0.2s',
          transform: reportMode ? 'scale(1.1)' : 'scale(1)',
        }}
      >⚠</button>

      {/* FAB label */}
      <div style={{
        position: 'absolute', bottom: '44px', right: '90px', zIndex: 40,
        background: 'rgba(8,12,18,0.9)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px',
        padding: '5px 10px', fontSize: '11px', fontWeight: 600,
        color: '#fca5a5', fontFamily: 'Syne, sans-serif',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}>Report Issue</div>

      {/* ── REPORT MODAL ─────────────────────────────────────────────────── */}
      {showModal && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeUp 0.25s ease',
        }}>
          <div style={{
            background: '#0d1117', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '20px', padding: '28px', width: '380px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
          }}>
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '17px', color: '#fff', marginBottom: '2px' }}>Report Safety Concern</div>
                <div style={{ fontSize: '11px', color: '#4a7aab', fontFamily: "'JetBrains Mono', monospace" }}>
                  📍 {reportCoords ? `${reportCoords.lat.toFixed(4)}, ${reportCoords.lng.toFixed(4)}` : ''}
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#64748b', padding: '6px 10px', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>

            {/* Issue type */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", color: '#4a7aab', letterSpacing: '0.08em', marginBottom: '6px' }}>ISSUE TYPE</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
                {REPORT_TYPES.map(t => (
                  <button key={t} onClick={() => setReportType(t)} style={{
                    padding: '9px 10px', borderRadius: '10px', cursor: 'pointer',
                    background: reportType === t ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${reportType === t ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    color: reportType === t ? '#fca5a5' : '#64748b',
                    fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '12px',
                    transition: 'all 0.15s',
                  }}>{t}</button>
                ))}
              </div>
            </div>

            {/* Lux reading */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", color: '#4a7aab', letterSpacing: '0.08em', marginBottom: '6px' }}>
                LUX READING <span style={{ color: '#22c55e' }}>← auto-filled from live sensor</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="number" min="0" max="100" step="0.1"
                  value={reportLux} onChange={e => setReportLux(e.target.value)}
                  style={{
                    flex: 1, padding: '10px 12px',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px', color: luxColor(parseFloat(reportLux)),
                    fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '20px',
                    outline: 'none',
                  }}
                />
                <div style={{ fontSize: '13px', color: '#4a7aab', fontFamily: "'JetBrains Mono', monospace" }}>lux</div>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", color: '#4a7aab', letterSpacing: '0.08em', marginBottom: '6px' }}>DESCRIPTION (optional)</div>
              <textarea
                value={reportDesc} onChange={e => setReportDesc(e.target.value)}
                placeholder="Brief description of the issue..."
                rows={3}
                style={{
                  width: '100%', padding: '10px 12px', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: '10px', color: '#94a3b8', fontSize: '13px',
                  fontFamily: "'Inter', sans-serif", outline: 'none', resize: 'none',
                }}
              />
            </div>

            {/* Submit */}
            <button onClick={handleSubmitReport} style={{
              width: '100%', padding: '13px',
              background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
              border: 'none', borderRadius: '12px', color: '#fff',
              fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px',
              cursor: 'pointer', letterSpacing: '0.04em',
              boxShadow: '0 4px 16px rgba(239,68,68,0.3)',
            }}>
              Submit Report to City Authorities →
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:none } }
        @keyframes spin   { to { transform: rotate(360deg) } }
        @keyframes pulse  { 0%,100% { box-shadow: 0 0 6px #ef444488 } 50% { box-shadow: 0 0 18px #ef4444cc } }
        input::placeholder, textarea::placeholder { color: #334155; opacity: 1; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(30,58,95,0.6); border-radius: 2px; }
        ::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  )
}

// ─── Route Card ───────────────────────────────────────────────────────────────
function RouteCard({ data, type, active, darkMode, sub, card, txt }) {
  const isDanger = type === 'dangerous'
  const color    = isDanger ? '#ef4444' : '#22c55e'
  return (
    <div style={{ ...card({ padding: '16px' }), border: `1px solid ${isDanger ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.35)'}`, opacity: active ? 1 : 0.35, transition: 'opacity 0.2s', flexShrink: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div>
          <div style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", color, letterSpacing: '0.07em', marginBottom: '3px' }}>
            {isDanger ? 'AVOID — DANGER ZONE' : 'RECOMMENDED — GREEN CORRIDOR'}
          </div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: txt('#fff', '#111'), maxWidth: '185px', lineHeight: 1.3 }}>{data.name}</div>
        </div>
        <ScoreRing score={data.safetyIndex} color={color} />
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
        <Pill label={data.eta}      icon="🕐" color={color} />
        <Pill label={data.distance} icon="📏" color={isDanger ? '#f97316' : '#10b981'} />
        <Pill label={`${data.lux} lux`} icon={isDanger ? '🌑' : '☀️'} color={color} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
        {data.tags?.map((t, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: t.color, flexShrink: 0 }} />
            <span style={{ fontSize: '11px', color: sub }}>{t.label}</span>
          </div>
        ))}
      </div>
      <ScoreBar label="Luminosity"     value={data.luxScore}       max={10} color={isDanger ? '#ef4444' : '#22c55e'} darkMode={darkMode} />
      <ScoreBar label="Activity"        value={data.activityScore}  max={10} color={isDanger ? '#f97316' : '#10b981'} darkMode={darkMode} />
      <ScoreBar label="Historical Risk" value={data.historicalRisk} max={10} color={isDanger ? '#ef4444' : '#22c55e'} darkMode={darkMode} invert />
    </div>
  )
}

function InputField({ value, onChange, placeholder, dot, dark }) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '8px', height: '8px', borderRadius: '50%', background: dot, boxShadow: `0 0 6px ${dot}`, pointerEvents: 'none' }} />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '11px 12px 11px 30px', background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)'}`, borderRadius: '10px', color: dark ? '#e2e8f0' : '#111', fontSize: '13px', outline: 'none', fontFamily: "'Inter', sans-serif", transition: 'border-color 0.2s', boxSizing: 'border-box' }}
      />
    </div>
  )
}

function ScoreRing({ score, color }) {
  const r = 22, stroke = 4, circ = 2 * Math.PI * r
  const pct = Math.min(1, score / 10) * circ
  return (
    <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0 }}>
      <svg width="56" height="56" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={circ - pct} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '15px', fontWeight: 700, color, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: '8px', color: '#4a7aab', fontFamily: "'JetBrains Mono', monospace" }}>/10</div>
      </div>
    </div>
  )
}

function Pill({ label, icon, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: color + '15', border: `1px solid ${color}30`, borderRadius: '20px', padding: '4px 9px' }}>
      <span style={{ fontSize: '11px' }}>{icon}</span>
      <span style={{ fontSize: '11px', color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{label}</span>
    </div>
  )
}

function ScoreBar({ label, value, max, color, darkMode, invert }) {
  const barColor = invert && value > 5 ? '#ef4444' : color
  return (
    <div style={{ marginTop: '7px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
        <span style={{ fontSize: '10px', color: darkMode ? '#475569' : '#6b7280' }}>{label}</span>
        <span style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", color: barColor, fontWeight: 600 }}>{value}/{max}</span>
      </div>
      <div style={{ height: '4px', background: darkMode ? 'rgba(30,58,95,0.35)' : 'rgba(0,0,0,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(value / max) * 100}%`, background: barColor, borderRadius: '2px', transition: 'width 1.1s ease' }} />
      </div>
    </div>
  )
}

function Spinner() {
  return <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
}

const pinStyle = (bg, color, shadow) => ({
  background: bg, color, border: `1.5px solid ${shadow}`, borderRadius: '10px',
  padding: '5px 11px', fontSize: '11px', fontWeight: 700,
  fontFamily: "'JetBrains Mono', monospace", boxShadow: `0 0 16px ${shadow}`, whiteSpace: 'nowrap',
})

const floatLabel = (color) => ({
  background: color + 'ec', color: '#fff', borderRadius: '8px', padding: '5px 10px',
  fontSize: '10px', fontWeight: 800, fontFamily: 'Syne, sans-serif', letterSpacing: '0.06em',
  boxShadow: `0 4px 20px ${color}44`, whiteSpace: 'nowrap',
})
