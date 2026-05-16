import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Cpu, User, Users, ShieldCheck, Menu, X } from 'lucide-react'

export default function Header({ onReset, showReset }) {
  const navigate    = useNavigate()
  const location    = useLocation()
  const isMulti     = location.pathname === '/multi'
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <style>{`
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:none} }
        .nav-btn { transition: all 0.15s; }
        .nav-btn:hover { opacity: 0.85; }
        .mode-btn { transition: all 0.15s; border: none; cursor: pointer; font-family: inherit; }

        /* Desktop */
        .header-logo-text { display: flex; }
        .header-center    { display: flex; }
        .header-right     { display: flex; }
        .header-menu-btn  { display: none; }
        .mobile-dropdown  { display: none; }

        /* Mobile — hide center and right, show hamburger */
        @media (max-width: 640px) {
          .header-logo-text { font-size: 14px !important; }
          .header-center    { display: none; }
          .header-right     { display: none; }
          .header-menu-btn  { display: flex !important; }
          .mobile-dropdown  { display: block; }
          .header-pad       { padding: 0 1rem !important; }
        }
      `}</style>

      {/* ── Main header bar ── */}
      <header className="header-pad" style={{
        borderBottom: '1px solid var(--border)',
        padding: '0 2rem', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 200,
        background: 'rgba(13,15,20,0.97)', backdropFilter: 'blur(12px)',
      }}>

        {/* ── Left — Logo ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 30, height: 30, background: 'var(--accent)',
            borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Cpu size={15} color="#0d0f14" />
          </div>
          <span className="header-logo-text" style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            CV Screener
          </span>
          <span style={{
            fontSize: 9, padding: '2px 6px',
            background: 'var(--accent-dim)', color: 'var(--accent)',
            borderRadius: 20, border: '1px solid var(--accent-border)', fontWeight: 600,
          }}>
            AI
          </span>
        </div>

        {/* ── Center — Mode switcher (desktop only) ── */}
        <div className="header-center" style={{
          gap: 4, background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: 4,
        }}>
          <button onClick={() => navigate('/')} className="mode-btn" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 500, padding: '5px 14px', borderRadius: 6,
            background: !isMulti ? 'var(--accent)' : 'transparent',
            color:      !isMulti ? '#0d0f14'       : 'var(--text-muted)',
          }}>
            <User size={13} /> Single
          </button>
          <button onClick={() => navigate('/multi')} className="mode-btn" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 500, padding: '5px 14px', borderRadius: 6,
            background: isMulti ? 'var(--accent)' : 'transparent',
            color:      isMulti ? '#0d0f14'       : 'var(--text-muted)',
          }}>
            <Users size={13} /> Bulk Screen
          </button>
        </div>

        {/* ── Right — Privacy badge + reset (desktop only) ── */}
        <div className="header-right" style={{ alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 11, color: '#4ade80',
            background: 'rgba(74,222,128,0.08)',
            border: '1px solid rgba(74,222,128,0.15)',
            borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap',
          }}>
            <ShieldCheck size={11} /> Privacy Protected
          </span>
          {showReset && (
            <button onClick={onReset} className="nav-btn" style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, color: 'var(--text-secondary)',
              background: 'none', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '5px 12px', cursor: 'pointer',
              whiteSpace: 'nowrap', fontFamily: 'inherit',
            }}>
              ↺ Reset
            </button>
          )}
        </div>

        {/* ── Hamburger button (mobile only) ── */}
        <button
          className="header-menu-btn"
          onClick={() => setMenuOpen(prev => !prev)}
          style={{
            display: 'none', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, background: 'var(--bg-card)',
            border: '1px solid var(--border)', borderRadius: 8,
            cursor: 'pointer', color: 'var(--text-primary)', flexShrink: 0,
          }}
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>

      {/* ── Mobile dropdown menu ── */}
      {menuOpen && (
        <div className="mobile-dropdown" style={{
          position: 'sticky', top: 56, zIndex: 199,
          background: 'rgba(13,15,20,0.98)',
          borderBottom: '1px solid var(--border)',
          backdropFilter: 'blur(12px)',
          animation: 'slideDown 0.2s ease',
          padding: '0.75rem 1rem',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>

          {/* Mode switcher — full width on mobile */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => { navigate('/'); setMenuOpen(false) }}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: !isMulti ? 'var(--accent)' : 'var(--bg-card)',
                color:      !isMulti ? '#0d0f14'       : 'var(--text-muted)',
                fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
                border: `1px solid ${!isMulti ? 'transparent' : 'var(--border)'}`,
              }}
            >
              <User size={14} /> Single Screen
            </button>
            <button
              onClick={() => { navigate('/multi'); setMenuOpen(false) }}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: isMulti ? 'var(--accent)' : 'var(--bg-card)',
                color:      isMulti ? '#0d0f14'       : 'var(--text-muted)',
                fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
                border: `1px solid ${isMulti ? 'transparent' : 'var(--border)'}`,
              }}
            >
              <Users size={14} /> Bulk Screen
            </button>
          </div>

          {/* Privacy + reset row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 11, color: '#4ade80',
              background: 'rgba(74,222,128,0.08)',
              border: '1px solid rgba(74,222,128,0.15)',
              borderRadius: 20, padding: '4px 10px',
            }}>
              <ShieldCheck size={11} /> Privacy Protected
            </span>
            {showReset && (
              <button onClick={() => { onReset(); setMenuOpen(false) }} style={{
                fontSize: 12, color: 'var(--text-secondary)',
                background: 'none', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', padding: '5px 12px',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                ↺ Reset
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}