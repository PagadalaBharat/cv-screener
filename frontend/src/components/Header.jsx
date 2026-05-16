import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Cpu, User, Users, ShieldCheck } from 'lucide-react'

export default function Header({ onReset, showReset }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isMulti  = location.pathname === '/multi'

  return (
    <header style={{
      borderBottom: '1px solid var(--border)',
      padding: '0 2rem', height: 56,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(13,15,20,0.95)', backdropFilter: 'blur(12px)',
    }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Cpu size={17} color="#0d0f14" />
        </div>
        <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          CV Screener
        </span>
        <span style={{ fontSize: 10, padding: '2px 7px', background: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: 20, border: '1px solid var(--accent-border)', fontWeight: 500 }}>
          AI
        </span>
      </div>

      {/* Mode switcher */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 4 }}>
        <button onClick={() => navigate('/')} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12, fontWeight: 500, padding: '5px 14px',
          borderRadius: 6, border: 'none', cursor: 'pointer',
          background: !isMulti ? 'var(--accent)' : 'transparent',
          color:      !isMulti ? '#0d0f14'       : 'var(--text-muted)',
          fontFamily: 'var(--font)', transition: 'all 0.15s',
        }}>
          <User size={13} /> Single
        </button>
        <button onClick={() => navigate('/multi')} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12, fontWeight: 500, padding: '5px 14px',
          borderRadius: 6, border: 'none', cursor: 'pointer',
          background: isMulti ? 'var(--accent)' : 'transparent',
          color:      isMulti ? '#0d0f14'       : 'var(--text-muted)',
          fontFamily: 'var(--font)', transition: 'all 0.15s',
        }}>
          <Users size={13} /> Bulk Screen
        </button>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#4ade80', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 20, padding: '3px 10px' }}>
          <ShieldCheck size={11} /> Privacy Protected
        </span>
        {showReset && (
          <button onClick={onReset} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 14px', cursor: 'pointer' }}>
            ↺ Reset
          </button>
        )}
      </div>
    </header>
  )
}