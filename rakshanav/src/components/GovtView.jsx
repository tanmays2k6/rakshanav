import React, { useState } from 'react'
import Map, { Marker } from 'react-map-gl/maplibre'
import { DARK_SPOTS, CITY_STATS, WARD_ALERTS } from '../data/bangaloreData'

const severityColor = { critical: '#ef4444', high: '#f97316', medium: '#eab308' }
const severitySize  = { critical: 20, high: 14, medium: 10 }

function Divider() {
  return <div style={{ height: '1px', background: 'rgba(30,58,95,0.25)', margin: '14px 0' }} />
}
function Label({ children }) {
  return <div style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", color: '#4a7aab', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>{children}</div>
}

export default function GovtView({ userReports = [], onResolveReport }) {
  const [selectedSpot,   setSelectedSpot]   = useState(null)
  const [selectedReport, setSelectedReport] = useState(null)
  const [filterSeverity, setFilterSeverity] = useState('all')
  const [activeTab,      setActiveTab]      = useState('reports') // 'reports' | 'infrastructure'

  const filteredStatic = filterSeverity === 'all'
    ? DARK_SPOTS
    : DARK_SPOTS.filter(s => s.severity === filterSeverity)

  // Aggregate stats from live user reports
  const avgLux      = userReports.length
    ? (userReports.reduce((s, r) => s + r.lux, 0) / userReports.length).toFixed(1)
    : '—'
  const criticalCount = userReports.filter(r => r.severity === 'critical').length

  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: "'Inter', sans-serif" }}>

      {/* ── FULL MAP ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Map
          initialViewState={{ longitude: 77.6080, latitude: 12.9464, zoom: 11.5 }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="https://tiles.openfreemap.org/styles/dark"
          attributionControl={false}
        >
          {/* Static infrastructure deficit zones */}
          {filteredStatic.map((spot, i) => (
            <Marker key={`static-${i}`} longitude={spot.lng} latitude={spot.lat}
              onClick={() => { setSelectedSpot(spot); setSelectedReport(null) }}>
              <div style={{
                width: severitySize[spot.severity], height: severitySize[spot.severity],
                borderRadius: '50%', background: severityColor[spot.severity], opacity: 0.7,
                border: `2px solid ${severityColor[spot.severity]}`,
                boxShadow: `0 0 ${severitySize[spot.severity] + 6}px ${severityColor[spot.severity]}55`,
                cursor: 'pointer',
              }} />
            </Marker>
          ))}

          {/* ── LIVE USER REPORTS — glowing, pulsing pins ─────────────── */}
          {userReports.map(r => (
            <Marker key={`report-${r.id}`} longitude={r.lng} latitude={r.lat}
              onClick={() => { setSelectedReport(r); setSelectedSpot(null) }}>
              <div style={{ position: 'relative', cursor: 'pointer' }}>
                {/* Outer pulse ring */}
                <div style={{
                  position: 'absolute', inset: '-6px', borderRadius: '50%',
                  background: severityColor[r.severity] + '22',
                  animation: 'ringPulse 2s infinite',
                }} />
                {/* Inner dot */}
                <div style={{
                  width: '18px', height: '18px', borderRadius: '50%',
                  background: severityColor[r.severity],
                  border: '2.5px solid #fff',
                  boxShadow: `0 0 14px ${severityColor[r.severity]}aa`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '9px',
                }}>!</div>
                {/* "NEW" badge for just-submitted reports */}
                {r.timestamp === 'Just now' && (
                  <div style={{
                    position: 'absolute', top: '-8px', left: '50%', transform: 'translateX(-50%)',
                    background: '#ef4444', color: '#fff', borderRadius: '4px',
                    padding: '1px 4px', fontSize: '8px', fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap',
                    boxShadow: '0 2px 8px rgba(239,68,68,0.5)',
                  }}>NEW</div>
                )}
              </div>
            </Marker>
          ))}
        </Map>

        {/* Filter bar */}
        <div style={{
          position: 'absolute', top: '70px', left: '1rem', zIndex: 10,
          background: 'rgba(8,12,16,0.92)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(30,58,95,0.45)', borderRadius: '12px', padding: '10px 14px',
        }}>
          <div style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", color: '#4a7aab', letterSpacing: '0.08em', marginBottom: '8px' }}>FILTER DEFICIT ZONES</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {['all', 'critical', 'high', 'medium'].map(s => {
              const active = filterSeverity === s
              const col = s === 'all' ? '#60a5fa' : severityColor[s]
              return (
                <button key={s} onClick={() => setFilterSeverity(s)} style={{
                  padding: '5px 12px', borderRadius: '7px', cursor: 'pointer',
                  border: `1px solid ${active ? col + '66' : 'rgba(30,58,95,0.3)'}`,
                  background: active ? col + '20' : 'transparent',
                  color: active ? col : '#475569',
                  fontSize: '11px', fontFamily: 'Syne, sans-serif', fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'all 0.15s',
                }}>{s}</button>
              )
            })}
          </div>
        </div>

        {/* Legend */}
        <div style={{
          position: 'absolute', bottom: '1.5rem', left: '1rem', zIndex: 10,
          background: 'rgba(8,12,16,0.92)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(30,58,95,0.4)', borderRadius: '11px', padding: '12px 14px',
        }}>
          <div style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", color: '#4a7aab', marginBottom: '8px', letterSpacing: '0.08em' }}>MAP LEGEND</div>
          {[
            { label: 'Critical (<5 lux)',   color: '#ef4444', size: 10 },
            { label: 'High (5–10 lux)',     color: '#f97316', size: 7  },
            { label: 'Medium (10–15 lux)',  color: '#eab308', size: 5  },
          ].map(({ label, color, size }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{ width: size*2, height: size*2, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}88`, flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: '#64748b' }}>{label}</span>
            </div>
          ))}
          <div style={{ height: '1px', background: 'rgba(30,58,95,0.3)', margin: '8px 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#ef4444', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#fff', fontWeight: 700 }}>!</div>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Live citizen report</span>
          </div>
        </div>

        {/* Selected static spot popup */}
        {selectedSpot && (
          <div style={{
            position: 'absolute', top: '70px', right: '10px', zIndex: 20,
            background: 'rgba(8,12,16,0.96)', border: `1px solid ${severityColor[selectedSpot.severity]}44`,
            borderRadius: '14px', padding: '1.25rem', minWidth: '240px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff' }}>{selectedSpot.area}</div>
              <button onClick={() => setSelectedSpot(null)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '18px' }}>×</button>
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '36px', fontWeight: 700, color: severityColor[selectedSpot.severity], lineHeight: 1, marginBottom: '8px' }}>
              {selectedSpot.lux} <span style={{ fontSize: '14px', color: '#4a7aab' }}>lux</span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>Complaints: <span style={{ color: '#fff', fontWeight: 600 }}>{selectedSpot.complaints}</span></div>
            <button style={{ width: '100%', padding: '9px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '9px', color: '#60a5fa', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}>
              RAISE WORK ORDER ↗
            </button>
          </div>
        )}

        {/* Selected live report popup */}
        {selectedReport && (
          <div style={{
            position: 'absolute', top: '70px', right: '10px', zIndex: 20,
            background: 'rgba(8,12,16,0.96)', border: `1px solid ${severityColor[selectedReport.severity]}55`,
            borderRadius: '14px', padding: '1.25rem', minWidth: '260px',
            boxShadow: `0 0 30px ${severityColor[selectedReport.severity]}22`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div>
                <div style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", color: severityColor[selectedReport.severity], letterSpacing: '0.08em', marginBottom: '3px' }}>CITIZEN REPORT</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff' }}>{selectedReport.type}</div>
              </div>
              <button onClick={() => setSelectedReport(null)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '18px' }}>×</button>
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '36px', fontWeight: 700, color: severityColor[selectedReport.severity], lineHeight: 1, marginBottom: '4px' }}>
              {selectedReport.lux} <span style={{ fontSize: '14px', color: '#4a7aab' }}>lux</span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>{selectedReport.description}</div>
            <div style={{ fontSize: '11px', color: '#334155', marginBottom: '12px', fontFamily: "'JetBrains Mono', monospace" }}>{selectedReport.timestamp}</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{ flex: 1, padding: '9px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '9px', color: '#60a5fa', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}>
                RAISE WORK ORDER
              </button>
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
        background: 'rgba(10,14,20,0.98)',
        borderLeft: '1px solid rgba(30,58,95,0.3)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(30,58,95,0.3)' }}>
          <div style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", color: '#fb923c', letterSpacing: '0.08em', marginBottom: '4px' }}>BRUHAT BENGALURU MAHANAGARA PALIKE</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '17px', fontWeight: 800, color: '#fff', marginBottom: '2px' }}>City Safety Deficit Dashboard</div>
          <div style={{ fontSize: '12px', color: '#475569' }}>Real-time infrastructure intelligence</div>
        </div>

        <div style={{ padding: '16px 20px', flex: 1 }}>

          {/* Aggregate stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
            {[
              { label: 'Active Reports',  value: userReports.length,             color: '#ef4444' },
              { label: 'Critical',        value: criticalCount,                  color: '#ef4444' },
              { label: 'Avg Lux',         value: avgLux,                         color: '#f97316' },
              { label: 'Dark Zones',      value: CITY_STATS.totalDarkZones,      color: '#ef4444' },
              { label: 'Response Avg',    value: `${CITY_STATS.avgResponseDays}d`,color: '#eab308' },
              { label: 'Light Deficit',   value: `${CITY_STATS.streetlightDeficit}%`, color: '#f97316' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'rgba(13,21,31,0.7)', border: '1px solid rgba(30,58,95,0.28)', borderRadius: '10px', padding: '10px 10px' }}>
                <div style={{ fontSize: '9px', color: '#334155', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{label}</div>
                <div style={{ fontSize: '20px', fontFamily: 'Syne, sans-serif', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Deficit bar */}
          <div style={{ background: 'rgba(13,21,31,0.6)', border: '1px solid rgba(30,58,95,0.28)', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", color: '#4a7aab', letterSpacing: '0.08em' }}>INFRASTRUCTURE DEFICIT</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#f97316', fontFamily: 'Syne, sans-serif' }}>{CITY_STATS.streetlightDeficit}%</div>
            </div>
            <div style={{ height: '7px', background: 'rgba(30,58,95,0.3)', borderRadius: '4px', overflow: 'hidden', marginBottom: '5px' }}>
              <div style={{ height: '100%', width: `${CITY_STATS.streetlightDeficit}%`, background: 'linear-gradient(90deg, #f97316, #ef4444)', borderRadius: '4px' }} />
            </div>
            <div style={{ fontSize: '11px', color: '#334155' }}>Only 38% of streetlights operational in flagged wards</div>
          </div>

          {/* Tab switcher */}
          <div style={{ display: 'flex', background: 'rgba(13,21,31,0.5)', borderRadius: '10px', padding: '3px', gap: '3px', marginBottom: '14px' }}>
            {[
              { key: 'reports',        label: `Live Reports (${userReports.length})` },
              { key: 'infrastructure', label: 'Ward Alerts' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setActiveTab(key)} style={{
                flex: 1, padding: '7px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                background: activeTab === key ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: activeTab === key ? '#fff' : '#475569',
                fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '11px',
                transition: 'all 0.15s',
              }}>{label}</button>
            ))}
          </div>

          {/* LIVE REPORTS TAB */}
          {activeTab === 'reports' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {userReports.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#334155', fontSize: '13px', border: '1px dashed rgba(30,58,95,0.3)', borderRadius: '12px' }}>
                  No reports yet. Switch to User Mobility view and tap the <span style={{ color: '#ef4444' }}>⚠ Report Issue</span> button to add one.
                </div>
              ) : userReports.map(r => (
                <div key={r.id} style={{
                  background: `${severityColor[r.severity]}08`,
                  border: `1px solid ${severityColor[r.severity]}28`,
                  borderRadius: '12px', padding: '12px 14px',
                  animation: r.timestamp === 'Just now' ? 'fadeUp 0.4s ease' : 'none',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '5px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        {r.timestamp === 'Just now' && (
                          <span style={{ background: '#ef4444', color: '#fff', borderRadius: '4px', padding: '1px 5px', fontSize: '9px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>NEW</span>
                        )}
                        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: '#e2e8f0' }}>{r.type}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#475569' }}>{r.description}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '10px' }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '20px', fontWeight: 700, color: severityColor[r.severity], lineHeight: 1 }}>{r.lux}</div>
                      <div style={{ fontSize: '9px', color: '#4a7aab', fontFamily: "'JetBrains Mono', monospace" }}>lux</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <span style={{ fontSize: '10px', color: '#334155', fontFamily: "'JetBrains Mono', monospace" }}>{r.timestamp}</span>
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
              {WARD_ALERTS.map((ward) => (
                <div key={ward.ward} style={{
                  background: `${severityColor[ward.status]}08`,
                  border: `1px solid ${severityColor[ward.status]}25`,
                  borderRadius: '11px', padding: '12px 14px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: '#e2e8f0' }}>{ward.ward}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '18px', fontWeight: 700, color: severityColor[ward.status], lineHeight: 1 }}>
                      {ward.lux}<span style={{ fontSize: '10px', color: '#4a7aab', fontWeight: 400 }}>lx</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      <span style={{ color: '#ef4444', fontWeight: 600 }}>{ward.lights} streetlights</span> need maintenance
                    </div>
                    <div style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", color: '#ef4444', fontWeight: 700 }}>{ward.change}% this week</div>
                  </div>
                </div>
              ))}
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
