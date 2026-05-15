import React, { useState, useRef } from 'react'
import { useScreening } from './hooks/useScreening.js'
import ResultsPanel from './components/ResultsPanel.jsx'
import StreamingView from './components/StreamingView.jsx'
import { Cpu, RefreshCw, Upload, FileText, X, Zap } from 'lucide-react'

const inputStyle = {
  width: '100%',
  height: 220,
  resize: 'vertical',
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font)',
  fontSize: 13,
  lineHeight: 1.65,
  padding: '12px 14px',
  outline: 'none',
  transition: 'border-color 0.15s',
}

export default function App() {
  const [jd, setJd]             = useState('')
  const [cv, setCv]             = useState('')
  const [cvTab, setCvTab]       = useState('paste')
  const [fileName, setFileName] = useState(null)
  const fileRef                 = useRef()
  const { status, result, rawTokens, error, screen, reset } = useScreening()

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)
    const text = await file.text()
    setCv(text)
  }

  const clearFile = () => {
    setFileName(null)
    setCv('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const isStreaming = status === 'streaming'
  const isDone      = status === 'done'
  const isError     = status === 'error'
  const canScreen   = jd.trim().length > 10 && cv.trim().length > 10 && !isStreaming

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>

      {/* ── Topbar ── */}
      <header style={{
        borderBottom:'1px solid var(--border)',
        padding:'0 2rem', height:56,
        display:'flex', alignItems:'center', justifyContent:'space-between'
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            width:32, height:32, background:'var(--accent)',
            borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center'
          }}>
            <Cpu size={17} color="#0d0f14" />
          </div>
          <span style={{ fontWeight:600, fontSize:15, color:'var(--text-primary)', letterSpacing:'-0.02em' }}>
            CV Screener
          </span>
          <span style={{
            fontSize:11, padding:'2px 8px',
            background:'var(--accent-dim)', color:'var(--accent)',
            borderRadius:20, border:'1px solid var(--accent-border)'
          }}>
            Groq · Llama 3 70B
          </span>
        </div>
        {(isDone || isError) && (
          <button onClick={reset} style={{
            display:'flex', alignItems:'center', gap:6,
            fontSize:13, color:'var(--text-secondary)',
            background:'none', border:'1px solid var(--border)',
            borderRadius:'var(--radius)', padding:'6px 14px', cursor:'pointer'
          }}>
            <RefreshCw size={13} /> New Screening
          </button>
        )}
      </header>

      <main style={{ maxWidth:1200, margin:'0 auto', padding:'2rem' }}>

        {/* ── Input Grid ── */}
        {!isDone && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.25rem', marginBottom:'1.25rem' }}>

            {/* JD Panel */}
            <div style={{ background:'var(--bg-panel)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'1.25rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:'0.875rem' }}>
                <FileText size={14} color="var(--text-muted)" />
                <span style={{ fontSize:13, fontWeight:500, color:'var(--text-primary)' }}>Job Description</span>
                <span style={{ marginLeft:'auto', fontSize:11, color:'var(--text-muted)' }}>{jd.length} chars</span>
              </div>
              <textarea
                style={inputStyle}
                value={jd}
                onChange={e => setJd(e.target.value)}
                placeholder="Paste the full job description — role title, responsibilities, required skills, experience..."
                onFocus={e => e.target.style.borderColor = 'var(--border-hover)'}
                onBlur={e  => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            {/* CV Panel */}
            <div style={{ background:'var(--bg-panel)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'1.25rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:'0.875rem' }}>
                <FileText size={14} color="var(--text-muted)" />
                <span style={{ fontSize:13, fontWeight:500, color:'var(--text-primary)' }}>Candidate CV</span>
                <div style={{ marginLeft:'auto', display:'flex', gap:4 }}>
                  {['paste','upload'].map(t => (
                    <button key={t} onClick={() => setCvTab(t)} style={{
                      fontSize:11, padding:'3px 10px', borderRadius:20,
                      border:'1px solid var(--border)',
                      background: cvTab === t ? 'var(--accent-dim)' : 'transparent',
                      color: cvTab === t ? 'var(--accent)' : 'var(--text-muted)',
                      cursor:'pointer', textTransform:'capitalize'
                    }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {cvTab === 'upload' && (
                <div style={{ marginBottom:10 }}>
                  {fileName ? (
                    <div style={{
                      display:'flex', alignItems:'center', gap:8,
                      padding:'6px 10px', background:'var(--bg-input)',
                      borderRadius:'var(--radius)', border:'1px solid var(--border)',
                      fontSize:12, color:'var(--text-secondary)', marginBottom:8
                    }}>
                      <Upload size={12} />
                      <span style={{ flex:1 }}>{fileName}</span>
                      <button onClick={clearFile} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex' }}>
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <label style={{
                      display:'block', border:'1px dashed var(--border-hover)',
                      borderRadius:'var(--radius)', padding:'12px',
                      textAlign:'center', cursor:'pointer', marginBottom:8
                    }}>
                      <Upload size={18} color="var(--text-muted)" style={{ margin:'0 auto 4px' }} />
                      <p style={{ fontSize:12, color:'var(--text-secondary)' }}>Click to upload PDF, Word or TXT</p>
                      <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display:'none' }} onChange={handleFile} />
                    </label>
                  )}
                </div>
              )}

              <textarea
                style={{ ...inputStyle, height: cvTab === 'upload' ? 165 : 220 }}
                value={cv}
                onChange={e => setCv(e.target.value)}
                placeholder="Paste the full CV — work experience, skills, education, certifications..."
                onFocus={e => e.target.style.borderColor = 'var(--border-hover)'}
                onBlur={e  => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
          </div>
        )}

        {/* ── Action Button ── */}
        {!isDone && (
          <div style={{ marginBottom:'1.5rem', display:'flex', gap:10 }}>
            <button
              onClick={() => screen(jd, cv)}
              disabled={!canScreen}
              style={{
                flex:1, padding:'12px 24px',
                background: canScreen ? 'var(--accent)' : 'rgba(200,240,96,0.15)',
                color: canScreen ? '#0d0f14' : 'var(--text-muted)',
                border:'none', borderRadius:'var(--radius)',
                fontSize:14, fontWeight:600,
                cursor: canScreen ? 'pointer' : 'not-allowed',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                transition:'all 0.15s', fontFamily:'var(--font)',
              }}
            >
              {isStreaming ? (
                <>
                  <span style={{
                    display:'inline-block', width:14, height:14,
                    border:'2px solid rgba(0,0,0,0.2)', borderTopColor:'#0d0f14',
                    borderRadius:'50%', animation:'spin 0.7s linear infinite'
                  }} />
                  Analyzing...
                </>
              ) : (
                <><Zap size={15} /> Screen Candidate</>
              )}
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </button>

            {(jd || cv) && !isStreaming && (
              <button
                onClick={() => { setJd(''); setCv(''); clearFile(); reset() }}
                style={{
                  padding:'12px 20px', background:'transparent',
                  color:'var(--text-muted)', border:'1px solid var(--border)',
                  borderRadius:'var(--radius)', fontSize:13, cursor:'pointer', fontFamily:'var(--font)'
                }}
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* ── Streaming View ── */}
        {isStreaming && (
          <div style={{ marginBottom:'1.25rem' }}>
            <StreamingView tokens={rawTokens} />
          </div>
        )}

        {/* ── Error ── */}
        {isError && (
          <div style={{
            padding:'1rem 1.25rem',
            background:'rgba(248,113,113,0.08)',
            border:'1px solid rgba(248,113,113,0.2)',
            borderRadius:'var(--radius)', color:'#f87171',
            fontSize:13, marginBottom:'1rem'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── Results ── */}
        {isDone && result && <ResultsPanel result={result} />}

      </main>
    </div>
  )
}