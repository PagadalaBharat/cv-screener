import React from 'react'

const scoreColor = (s) => {
  if (s >= 80) return '#c8f060'
  if (s >= 65) return '#4ade80'
  if (s >= 45) return '#fbbf24'
  return '#f87171'
}

const verdictStyle = (v) => {
  const map = {
    'Strong Match':    { bg: 'rgba(200,240,96,0.12)',  color: '#c8f060' },
    'Good Match':      { bg: 'rgba(74,222,128,0.12)',  color: '#4ade80' },
    'Potential Match': { bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24' },
    'Weak Match':      { bg: 'rgba(248,113,113,0.12)', color: '#f87171' },
  }
  return map[v] || map['Potential Match']
}

export default function ScoreRing({ score, verdict, size = 96 }) {
  const r    = (size / 2) - 7
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const col  = scoreColor(score)
  const vs   = verdictStyle(verdict)

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
      <div style={{ position:'relative', width:size, height:size }}>
        <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
          <circle cx={size/2} cy={size/2} r={r}
            fill="none" stroke={col} strokeWidth={6}
            strokeDasharray={`${dash.toFixed(2)} ${circ.toFixed(2)}`}
            strokeLinecap="round"
            style={{ transition:'stroke-dasharray 0.8s ease' }} />
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontSize: size > 80 ? 26 : 20, fontWeight:600, color:col, lineHeight:1 }}>{score}</span>
          <span style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>/100</span>
        </div>
      </div>
      <span style={{ fontSize:12, fontWeight:500, padding:'3px 12px', borderRadius:20, background:vs.bg, color:vs.color }}>
        {verdict}
      </span>
    </div>
  )
}