import React, { useState } from 'react'
import Map, { Marker } from 'react-map-gl/maplibre'

const severityColor = { critical: '#ef4444', high: '#f97316', medium: '#eab308' }
const severitySize  = { critical: 20, high: 14, medium: 10 }

function Divider() {
  return <div style={{ height: '1px', background: 'rgba(30,58,95,0.25)', margin: '14px 0' }} />
}
function Label({ children }) {
  return <div style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", color: '#4a7aab', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>{children}</div>
}

export default function GovtView({ userReports = [], onResolveReport }) {
  const [selectedReport, setSelectedReport] = useState(null)
  const [filterSeverity, setFilterSeverity] = useState('all')
  const [activeTab,      setActiveTab]      = useState('reports') // 'reports' | 'infrastructure'
  const [darkMode,       setDarkMode]       = useState(true)

  // Aggregate stats from live user reports
  const activeReports = userReports.filter(r => r.status !== 'resolved')
  const avgLux      = activeReports.length
    ? (activeReports.reduce((s, r) => s + (r.lux || 0), 0) / activeReports.length).toFixed(1)
    : '—'
  const criticalCount = activeReports.filter(r => r.severity === 'critical').length
  
  // Calculate dynamic ward alerts from live data
  const wardAlerts = []; // Removing mock ward alerts, replacing with empty state
  
  const panelBg = darkMode ? 'rgba(8,12,16,0.92)' : 'rgba(255,255,255,0.92)'
  const panelBorder = darkMode ? 'rgba(30,58,95,0.4)' : 'rgba(148,163,184,0.4)'
  const sidebarBg = darkMode ? 'rgba(10,14,20,0.98)' : 'rgba(248,250,252,0.98)'
  const sidebarBorder = darkMode ? 'rgba(30,58,95,0.3)' : 'rgba(203,213,225,0.9)'
  const cardBg = darkMode ? 'rgba(13,21,31,0.7)' : 'rgba(255,255,255,0.92)'
  const softCardBg = darkMode ? 'rgba(13,21,31,0.6)' : 'rgba(241,245,249,0.98)'
  const tabBg = darkMode ? 'rgba(13,21,31,0.5)' : 'rgba(226,232,240,0.9)'
  const titleColor = darkMode ? '#fff' : '#0f172a'
  const bodyText = darkMode ? '#64748b' : '#475569'
  const mutedText = darkMode ? '#475569' : '#64748b'
  const subtleText = darkMode ? '#334155' : '#94a3b8'
  const activeTabBg = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)'
  const lightShadow = darkMode ? 'none' : '0 12px 30px rgba(15,23,42,0.08)'

  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: "'Inter', sans-serif" }}>

      {/* ── FULL MAP ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Map
          initialViewState={{ longitude: 77.6080, latitude: 12.9464, zoom: 11.5 }}
          style={{ width: '100%', height: '100%' }}
          mapStyle={darkMode ? 'https://tiles.openfreemap.org/styles/dark' : 'https://tiles.openfreemap.org/styles/positron'}
          attributionControl={false}
        >

          {/* ── LIVE USER REPORTS — glowing, pulsing pins ─────────────── */}
          {activeReports.map(r => (
            <Marker key={`report-${r.id}`} longitude={r.lng} latitude={r.lat}
              onClick={() => { setSelectedReport(r) }}>
              <div style={{ position: 'relative', cursor: 'pointer' }}>
                {/* Outer pulse ring */}
                <div style={{
                  position: 'absolute', inset: '-6px', borderRadius: '50%',
                  background: severityColor[r.severity || 'high'] + '22',
                  animation: 'ringPulse 2s infinite',
                }} />
                {/* Inner dot */}
                <div style={{
                  width: '18px', height: '18px', borderRadius: '50%',
                  background: severityColor[r.severity || 'high'],
                  border: '2.5px solid #fff',
                  boxShadow: `0 0 14px ${severityColor[r.severity || 'high']}aa`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '9px',
                }}>!</div>
              </div>
            </Marker>
          ))}
        </Map>

        {/* Legend */}
        <div style={{
          position: 'absolute', bottom: '1.5rem', left: '1rem', zIndex: 10,
          background: panelBg, backdropFilter: 'blur(12px)',
          border: `1px solid ${panelBorder}`, borderRadius: '11px', padding: '12px 14px',
          boxShadow: lightShadow,
        }}>
          <div style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", color: '#4a7aab', marginBottom: '8px', letterSpacing: '0.08em' }}>MAP LEGEND</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#ef4444', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#fff', fontWeight: 700 }}>!</div>
            <span style={{ fontSize: '11px', color: bodyText }}>Live citizen report</span>
          </div>
        </div>

        {/* Selected live report popup */}
        {selectedReport && (
          <div style={{
            position: 'absolute', top: '70px', right: '10px', zIndex: 20,
            background: darkMode ? 'rgba(8,12,16,0.96)' : 'rgba(255,255,255,0.97)', border: `1px solid ${severityColor[selectedReport.severity || 'high']}55`,
            borderRadius: '14px', padding: '1.25rem', minWidth: '260px',
            boxShadow: darkMode ? `0 0 30px ${severityColor[selectedReport.severity || 'high']}22` : lightShadow,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div>
                <div style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", color: severityColor[selectedReport.severity || 'high'], letterSpacing: '0.08em', marginBottom: '3px' }}>CITIZEN REPORT</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: titleColor }}>{selectedReport.hazard_type || 'General Hazard'}</div>
              </div>
              <button onClick={() => setSelectedReport(null)} style={{ background: 'none', border: 'none', color: mutedText, cursor: 'pointer', fontSize: '18px' }}>×</button>
            </div>
            <div style={{ fontSize: '12px', color: bodyText, marginBottom: '6px' }}>{selectedReport.description || 'No description provided.'}</div>
            <div style={{ fontSize: '11px', color: subtleText, marginBottom: '12px', fontFamily: "'JetBrains Mono', monospace" }}>{new Date(selectedReport.created_at).toLocaleString()}</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { onResolveReport(selectedReport.id); setSelectedReport(null) }} style={{ flex: 1, padding: '9px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '9px', color: '#22c55e', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}>
                RESOLVE ✓
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT SIDEBAR ────────────────────────────────────────────────── */}
      <div style={{
        width: '380px', flexShrink: 0,
        background: sidebarBg,
        borderLeft: `1px solid ${sidebarBorder}`,
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${sidebarBorder}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", color: '#fb923c', letterSpacing: '0.08em', marginBottom: '4px' }}>BRUHAT BENGALURU MAHANAGARA PALIKE</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '17px', fontWeight: 800, color: titleColor, marginBottom: '2px' }}>City Safety Deficit Dashboard</div>
              <div style={{ fontSize: '12px', color: mutedText }}>Real-time infrastructure intelligence</div>
            </div>
            <button
              onClick={() => setDarkMode((d) => !d)}
              style={{
                padding: '8px 12px',
                borderRadius: '9px',
                border: `1px solid ${darkMode ? 'rgba(59,130,246,0.28)' : 'rgba(37,99,235,0.22)'}`,
                background: darkMode ? 'rgba(59,130,246,0.10)' : 'rgba(255,255,255,0.9)',
                color: darkMode ? '#93c5fd' : '#1d4ed8',
                cursor: 'pointer',
                fontFamily: 'Syne, sans-serif',
                fontWeight: 700,
                fontSize: '11px',
                whiteSpace: 'nowrap',
                boxShadow: darkMode ? 'none' : '0 6px 18px rgba(37,99,235,0.08)',
              }}
            >
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>
        </div>

        <div style={{ padding: '16px 20px', flex: 1 }}>

          {/* Aggregate stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
            {[
              { label: 'Active Reports',  value: activeReports.length,           color: '#ef4444' },
              { label: 'Critical Issues', value: criticalCount,                  color: '#ef4444' },
              { label: 'Total Resolved',  value: userReports.filter(r => r.status === 'resolved').length, color: '#22c55e' },
              { label: 'Avg Lux',         value: avgLux,                         color: '#f97316' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: cardBg, border: `1px solid ${darkMode ? 'rgba(30,58,95,0.28)' : 'rgba(203,213,225,0.9)'}`, borderRadius: '10px', padding: '10px 10px', boxShadow: lightShadow }}>
                <div style={{ fontSize: '9px', color: subtleText, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{label}</div>
                <div style={{ fontSize: '20px', fontFamily: 'Syne, sans-serif', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Tab switcher */}
          <div style={{ display: 'flex', background: tabBg, borderRadius: '10px', padding: '3px', gap: '3px', marginBottom: '14px' }}>
            {[
              { key: 'reports',        label: `Live Reports (${activeReports.length})` },
              { key: 'infrastructure', label: 'Ward Alerts' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setActiveTab(key)} style={{
                flex: 1, padding: '7px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                background: activeTab === key ? activeTabBg : 'transparent',
                color: activeTab === key ? titleColor : mutedText,
                fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '11px',
                transition: 'all 0.15s',
                boxShadow: !darkMode && activeTab === key ? '0 6px 16px rgba(15,23,42,0.06)' : 'none',
              }}>{label}</button>
            ))}
          </div>

          {/* LIVE REPORTS TAB */}
          {activeTab === 'reports' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeReports.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: subtleText, fontSize: '13px', border: `1px dashed ${darkMode ? 'rgba(30,58,95,0.3)' : 'rgba(148,163,184,0.55)'}`, borderRadius: '12px' }}>
                  No active reports available.
                </div>
              ) : activeReports.map(r => (
                <div key={r.id} style={{
                  background: darkMode ? `${severityColor[r.severity || 'high']}08` : '#ffffff',
                  border: `1px solid ${darkMode ? `${severityColor[r.severity || 'high']}28` : 'rgba(226,232,240,0.95)'}`,
                  borderRadius: '12px', padding: '12px 14px',
                  boxShadow: lightShadow,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '5px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: titleColor }}>{r.hazard_type || 'Hazard'}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: bodyText }}>{r.description || 'No description'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <span style={{ fontSize: '10px', color: subtleText, fontFamily: "'JetBrains Mono', monospace" }}>{new Date(r.created_at).toLocaleString()}</span>
                    <button onClick={() => onResolveReport(r.id)} style={{
                      padding: '4px 10px', borderRadius: '7px', cursor: 'pointer',
                      background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
                      color: '#22c55e', fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '11px',
                      transition: 'all 0.15s',
                    }}>Mark Resolved ✓</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* WARD ALERTS TAB */}
          {activeTab === 'infrastructure' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {wardAlerts.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: subtleText, fontSize: '13px', border: `1px dashed ${darkMode ? 'rgba(30,58,95,0.3)' : 'rgba(148,163,184,0.55)'}`, borderRadius: '12px' }}>
                  No active infrastructure alerts. Data will populate when regions cross the anomaly threshold.
                </div>
              ) : (
                wardAlerts.map(w => null) // Render alerts if they existed
              )}
            </div>
          )}

        </div>
      </div>

      <style>{`
        @keyframes ringPulse { 0%,100% { transform: scale(1); opacity: 0.6 } 50% { transform: scale(1.8); opacity: 0 } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:none } }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(30,58,95,0.6); border-radius: 2px; }
        ::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  )
}
