import React, { useState } from 'react'
import UserView from './components/UserView'
import GovtView from './components/GovtView'

// ─── Pre-seeded mock reports ───────────────────────────────────────────────────
const SEED_REPORTS = [
  {
    id: 1,
    lat: 12.9227, lng: 77.6174,
    type: 'Bad Lighting',
    lux: 3.2,
    description: 'Streetlight broken near metro pillar 45. Complete blackout after 9pm.',
    timestamp: '10 mins ago',
    status: 'Pending',
    severity: 'critical',
  },
  {
    id: 2,
    lat: 12.9258, lng: 77.6241,
    type: 'Broken Infrastructure',
    lux: 1.8,
    description: 'Three consecutive streetlights out on service road stretch.',
    timestamp: '34 mins ago',
    status: 'Pending',
    severity: 'critical',
  },
  {
    id: 3,
    lat: 12.9199, lng: 77.6133,
    type: 'Suspicious Activity',
    lux: 4.5,
    description: 'Group loitering in dark underpass. No CCTV visible.',
    timestamp: '1 hr ago',
    status: 'Pending',
    severity: 'high',
  },
]

export default function App() {
  const [view,        setView]        = useState('user')
  const [userReports, setUserReports] = useState(SEED_REPORTS)
  const [toast,       setToast]       = useState(null)

  // Add a new report from UserView
  const addReport = (report) => {
    setUserReports(prev => [report, ...prev])
    showToast('✓ Report submitted to City Authorities')
  }

  // Resolve a report from GovtView
  const resolveReport = (id) => {
    setUserReports(prev => prev.filter(r => r.id !== id))
    showToast('✓ Report marked as resolved')
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#080c10' }}>

      {/* ── View toggle ──────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 200,
        display: 'flex',
        background: 'rgba(8,12,18,0.90)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: '12px', padding: '3px', gap: '2px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}>
        <button onClick={() => setView('user')} style={{
          padding: '7px 20px', borderRadius: '9px', border: 'none', cursor: 'pointer',
          background: view === 'user' ? 'rgba(59,130,246,0.18)' : 'transparent',
          color: view === 'user' ? '#93c5fd' : 'rgba(148,163,184,0.45)',
          fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '12px',
          letterSpacing: '0.05em', transition: 'all 0.18s',
        }}>USER MOBILITY</button>
        <button onClick={() => setView('govt')} style={{
          padding: '7px 20px', borderRadius: '9px', border: 'none', cursor: 'pointer',
          background: view === 'govt' ? 'rgba(249,115,22,0.18)' : 'transparent',
          color: view === 'govt' ? '#fb923c' : 'rgba(148,163,184,0.45)',
          fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '12px',
          letterSpacing: '0.05em', transition: 'all 0.18s',
          position: 'relative',
        }}>
          GOVT INFRASTRUCTURE
          {/* Live report count badge */}
          {userReports.length > 0 && (
            <span style={{
              position: 'absolute', top: '-6px', right: '-6px',
              background: '#ef4444', color: '#fff',
              borderRadius: '10px', padding: '1px 6px',
              fontSize: '10px', fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              border: '1.5px solid rgba(8,12,18,0.9)',
            }}>{userReports.length}</span>
          )}
        </button>
      </div>

      {/* ── Views ────────────────────────────────────────────────────────── */}
      <div style={{ width: '100%', height: '100%', display: view === 'user' ? 'block' : 'none' }}>
        <UserView onAddReport={addReport} userReports={userReports} />
      </div>
      <div style={{ width: '100%', height: '100%', display: view === 'govt' ? 'block' : 'none' }}>
        <GovtView userReports={userReports} onResolveReport={resolveReport} />
      </div>

      {/* ── Global toast ─────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '32px', left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(34,197,94,0.15)',
          border: '1px solid rgba(34,197,94,0.4)',
          backdropFilter: 'blur(12px)',
          color: '#4ade80', padding: '12px 24px',
          borderRadius: '12px', fontSize: '13px',
          fontFamily: 'Syne, sans-serif', fontWeight: 700,
          zIndex: 999,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'toastIn 0.3s ease forwards',
          whiteSpace: 'nowrap',
        }}>{toast}</div>
      )}

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}
