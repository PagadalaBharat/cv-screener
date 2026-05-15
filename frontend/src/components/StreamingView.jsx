import React from 'react'

export default function StreamingView({ tokens }) {
  return (
    <div style={{
      background: 'var(--bg-input)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '1rem 1.25rem',
      fontFamily: 'var(--mono)',
      fontSize: 12,
      color: 'var(--text-secondary)',
      lineHeight: 1.7,
      maxHeight: 300,
      overflowY: 'auto',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-all',
    }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
        <span style={{
          display: 'inline-block', width:8, height:8,
          borderRadius:'50%', background:'var(--accent)',
          animation:'pulse 1s infinite'
        }} />
        <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font)' }}>
          Live stream · Groq · Llama 3 70B
        </span>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>

      {/* Streaming tokens */}
      {tokens}

      {/* Blinking cursor */}
      <span style={{
        display:'inline-block', width:2, height:'1em',
        background:'var(--accent)', verticalAlign:'text-bottom',
        animation:'blink 0.8s step-end infinite'
      }} />
    </div>
  )
}