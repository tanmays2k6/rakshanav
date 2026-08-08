import React from 'react'
import Logo from './Logo'

export default function Header({ view, onViewChange }) {
  const btn = (active, isGovt) => ({
    padding: '7px 22px',
    borderRadius: '7px',
    border: `1px solid ${active
      ? (isGovt ? 'rgba(249,115,22,0.35)' : 'rgba(59,130,246,0.35)')
      : 'transparent'}`,
    background: active
      ? (isGovt ? 'rgba(249,115,22,0.12)' : 'rgba(59,130,246,0.12)')
      : 'transparent',
    color: active
      ? (isGovt ? '#fb923c' : '#93c5fd')
      : 'rgba(148,163,184,0.5)',
    fontFamily: 'Syne, sans-serif', fontWeight: 700,
    fontSize: '12px', letterSpacing: '0.06em',
    cursor: 'pointer', transition: 'all 0.18s ease',
    whiteSpace: 'nowrap',
  })

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: 'rgba(8,12,16,0.94)', backdropFilter: 'blur(14px)',
      borderBottom: '1px solid rgba(30,58,95,0.35)',
      height: '60px', padding: '0 2rem',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Logo size="sm" />
      </div>

      {/* Toggle */}
      <div style={{
        display: 'flex',
        background: 'rgba(13,21,31,0.8)',
        border: '1px solid rgba(30,58,95,0.45)',
        borderRadius: '10px', padding: '3px', gap: '2px',
      }}>
        <button style={btn(view === 'user', false)} onClick={() => onViewChange('user')}>
          USER MOBILITY
        </button>
        <button style={btn(view === 'govt', true)} onClick={() => onViewChange('govt')}>
          GOVT INFRASTRUCTURE
        </button>
      </div>

      {/* Live badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '7px',
        fontSize: '11px', fontFamily: "'JetBrains Mono', monospace",
        color: '#22c55e', background: 'rgba(34,197,94,0.09)',
        border: '1px solid rgba(34,197,94,0.22)', borderRadius: '7px', padding: '5px 12px',
      }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
        LIVE SENSOR DATA
      </div>
    </header>
  )
}
