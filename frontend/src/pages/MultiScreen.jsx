import React, { useState, useRef } from 'react'
import Header from '../components/Header.jsx'
import { sanitizeCV, extractTextFromFile } from '../utils/sanitize.js'
import { FileText, Upload, X, Zap, Plus, ShieldCheck, AlertCircle, CheckCircle2, Trophy, ChevronDown, ChevronUp, Loader } from 'lucide-react'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

const scoreColor = (s) => s >= 80 ? '#c8f060' : s >= 65 ? '#4ade80' : s >= 45 ? '#fbbf24' : '#f87171'
const verdictStyle = (v) => {
  if (v === 'Strong Match')    return { bg: 'rgba(200,240,96,.12)',  color: '#c8f060' }
  if (v === 'Good Match')      return { bg: 'rgba(74,222,128,.12)',  color: '#4ade80' }
  if (v === 'Potential Match') return { bg: 'rgba(251,191,36,.12)',  color: '#fbbf24' }
  return                              { bg: 'rgba(248,113,113,.12)', color: '#f87171' }
}
const recStyle = (r) => {
  if (r === 'Shortlist') return { bg: 'rgba(74,222,128,.1)',  color: '#4ade80' }
  if (r === 'Reject')    return { bg: 'rgba(248,113,113,.1)', color: '#f87171' }
  return                        { bg: 'rgba(251,191,36,.1)',  color: '#fbbf24' }
}

// ── Screen one candidate against JD — reads SSE stream ──
const screenCandidate = async (jd, cvText) => {
  const res = await fetch(`${BACKEND}/screen`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_description: jd, candidate_cv: cvText }),
  })
  if (!res.ok) throw new Error(`Server error: ${res.status}`)

  const reader  = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = '', full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const payload = line.slice(6).trim()
      if (payload === '[DONE]') break
      try {
        const msg = JSON.parse(payload)
        if (msg.error) throw new Error(msg.error)
        if (msg.token) full += msg.token
      } catch {}
    }
  }

  const clean = full.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

export default function MultiScreen() {
  const [jd, setJd]             = useState('')
  const [candidates, setCandidates] = useState([
    { id: 1, text: '', fileName: null, loading: false, success: false, sanitized: false },
    { id: 2, text: '', fileName: null, loading: false, success: false, sanitized: false },
  ])
  const [results, setResults]   = useState([])
  const [screening, setScreening] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [expanded, setExpanded] = useState(null)
  const [error, setError]       = useState(null)
  const fileRefs                = useRef({})

  const update = (id, patch) => setCandidates(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))

  const addCandidate = () => {
    const id = Date.now()
    setCandidates(prev => [...prev, { id, text: '', fileName: null, loading: false, success: false, sanitized: false }])
  }

  const removeCandidate = (id) => {
    if (candidates.length <= 2) return
    setCandidates(prev => prev.filter(c => c.id !== id))
  }

  const handleUpload = async (id, file) => {
    update(id, { loading: true, fileName: file.name, text: '', success: false })
    try {
      const raw     = await extractTextFromFile(file)
      const cleaned = sanitizeCV(raw)
      const removed = (raw.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}|https?:\/\/[^\s]+/gi) || []).length
      update(id, { text: cleaned, loading: false, success: true, sanitized: removed > 0 })
    } catch (err) {
      update(id, { loading: false, fileName: null })
      alert(err.message || 'Could not read file.')
    }
  }

  const handlePaste = (id, e) => {
    const pasted  = e.clipboardData.getData('text')
    const cleaned = sanitizeCV(pasted)
    if (cleaned !== pasted) {
      e.preventDefault()
      update(id, { text: cleaned, sanitized: true })
    }
  }

  const handleScreen = async () => {
    setError(null)
    if (!jd.trim()) { setError('Please add a job description.'); return }
    const valid = candidates.filter(c => c.text.trim().length > 10)
    if (valid.length < 1) { setError('Please add at least one CV.'); return }

    setScreening(true)
    setResults([])
    setExpanded(null)
    setProgress({ current: 0, total: valid.length })

    const res = []
    for (let i = 0; i < valid.length; i++) {
      const c = valid[i]
      try {
        const data = await screenCandidate(jd, c.text)
        res.push({
          ...data,
          _label: c.fileName ? c.fileName.replace(/\.(pdf|docx|txt)$/i, '') : `Candidate ${i + 1}`
        })
      } catch (err) {
        res.push({
          overall_score: 0,
          candidate_name: c.fileName || `Candidate ${i + 1}`,
          verdict: 'Error',
          verdict_summary: `Could not analyze: ${err.message}`,
          recommendation: 'Consider',
          breakdown: { skills_score: 0, experience_score: 0, education_score: 0 },
          matched_skills: [], missing_skills: [],
          _label: c.fileName || `Candidate ${i + 1}`,
          _error: true,
        })
      }
      setProgress({ current: i + 1, total: valid.length })
    }

    res.sort((a, b) => b.overall_score - a.overall_score)
    setResults(res)
    setScreening(false)
  }

  const handleReset = () => {
    setJd(''); setResults([]); setError(null); setExpanded(null)
    setProgress({ current: 0, total: 0 })
    setCandidates([
      { id: 1, text: '', fileName: null, loading: false, success: false, sanitized: false },
      { id: 2, text: '', fileName: null, loading: false, success: false, sanitized: false },
    ])
  }

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0
  const rankIcon = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <style>{`
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes slideIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:none} }
        * { box-sizing:border-box; }
        .sbtn:hover:not(:disabled){opacity:.88;transform:translateY(-1px)} .sbtn{transition:all .15s}
        textarea:focus{border-color:var(--border-hover)!important;box-shadow:0 0 0 3px rgba(200,240,96,.08);outline:none}
        .uzone:hover{border-color:var(--accent)!important;background:rgba(200,240,96,.04)!important}
        .ccard:hover{border-color:var(--border-hover)!important}
        .rcard:hover{border-color:var(--border-hover)!important}
        @media(max-width:768px){.cgrid{grid-template-columns:1fr!important}.mpad{padding:1rem!important}}
      `}</style>

      <Header onReset={handleReset} showReset={results.length > 0} />

      <main className="mpad" style={{ maxWidth: 1300, margin: '0 auto', padding: '2rem' }}>

        {results.length === 0 && !screening && (
          <div style={{ textAlign: 'center', padding: '1.5rem 0 1rem', animation: 'fadeIn .4s ease' }}>
            <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-.03em' }}>Bulk candidate screening</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto' }}>
              Add one JD and multiple CVs — AI ranks all candidates from best to worst match automatically.
            </p>
          </div>
        )}

        {results.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', marginBottom: '1.25rem', background: 'rgba(74,222,128,.05)', border: '1px solid rgba(74,222,128,.12)', borderRadius: 'var(--radius)', fontSize: 12, color: '#4ade80' }}>
            <ShieldCheck size={13} /> <span><strong>Privacy mode</strong> — Phone, email and addresses auto-removed from all CVs</span>
          </div>
        )}

        {/* JD box */}
        {results.length === 0 && (
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <FileText size={14} color="var(--text-muted)" />
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Job Description</span>
              {jd.length > 0 && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--accent)' }}>{jd.length} chars</span>}
            </div>
            <textarea style={{ width: '100%', height: 150, resize: 'vertical', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontFamily: 'var(--font)', fontSize: 13, lineHeight: 1.65, padding: '12px 14px', transition: 'all .15s' }}
              value={jd} onChange={e => setJd(e.target.value)}
              placeholder="Paste the full job description — role title, required skills, experience level..." />
          </div>
        )}

        {/* Candidates */}
        {results.length === 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Candidates</span>
                <span style={{ fontSize: 11, padding: '2px 8px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, color: 'var(--text-muted)' }}>{candidates.length} added</span>
              </div>
              <button onClick={addCandidate} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 14px', background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius)', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 500 }}>
                <Plus size={13} /> Add Candidate
              </button>
            </div>

            <div className="cgrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              {candidates.map((c, idx) => (
                <div key={c.id} className="ccard" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: 8, transition: 'border-color .15s' }}>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--accent)', flexShrink: 0 }}>{idx + 1}</div>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>Candidate {idx + 1}</span>
                    {c.fileName && <span style={{ fontSize: 10, color: 'var(--text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.fileName}</span>}
                    {candidates.length > 2 && (
                      <button onClick={() => removeCandidate(c.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2, flexShrink: 0 }}><X size={14}/></button>
                    )}
                  </div>

                  {!c.fileName ? (
                    <label className="uzone" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px dashed var(--border-hover)', borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'all .15s' }}>
                      <Upload size={14} color="var(--text-muted)" />
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Upload PDF, DOCX or TXT</span>
                      <input type="file" accept=".pdf,.docx,.txt" style={{ display: 'none' }}
                        ref={el => fileRefs.current[c.id] = el}
                        onChange={e => { if (e.target.files[0]) handleUpload(c.id, e.target.files[0]) }} />
                    </label>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: c.success?'rgba(74,222,128,.06)':'var(--bg-input)', borderRadius: 'var(--radius)', border: `1px solid ${c.success?'rgba(74,222,128,.2)':'var(--border)'}` }}>
                      {c.loading ? <Loader size={12} color="var(--accent)" style={{ animation:'spin 1s linear infinite',flexShrink:0 }}/> : <CheckCircle2 size={12} color="#4ade80" style={{ flexShrink:0 }}/>}
                      <span style={{ flex:1, fontSize:11, color:c.success?'#4ade80':'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.loading?'Processing...':c.fileName}</span>
                      {!c.loading && (
                        <button onClick={() => { update(c.id,{fileName:null,text:'',success:false}); if(fileRefs.current[c.id]) fileRefs.current[c.id].value='' }}
                          style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',flexShrink:0 }}><X size={12}/></button>
                      )}
                    </div>
                  )}

                  <textarea style={{ width:'100%', height:110, resize:'vertical', background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:'var(--radius)', color:'var(--text-primary)', fontFamily:'var(--font)', fontSize:12, lineHeight:1.6, padding:'10px 12px', transition:'all .15s' }}
                    value={c.text}
                    onChange={e => update(c.id, { text: e.target.value })}
                    onPaste={e => handlePaste(c.id, e)}
                    placeholder="Paste CV text or upload file above..." />

                  {c.text && (
                    <p style={{ fontSize:10, color:c.sanitized?'#4ade80':'var(--text-muted)', margin:0, display:'flex', alignItems:'center', gap:4 }}>
                      {c.sanitized ? <><ShieldCheck size={10}/> Sensitive data removed</> : <><CheckCircle2 size={10}/> {c.text.length} chars ready</>}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {error && (
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'rgba(248,113,113,.06)', border:'1px solid rgba(248,113,113,.2)', borderRadius:'var(--radius)', marginBottom:'1rem', fontSize:13, color:'#f87171', animation:'slideIn .3s ease' }}>
                <AlertCircle size={14} style={{ flexShrink:0 }}/> {error}
              </div>
            )}

            <button className="sbtn" onClick={handleScreen} disabled={screening}
              style={{ width:'100%', padding:'14px 24px', background:screening?'rgba(200,240,96,.1)':'var(--accent)', color:screening?'var(--text-muted)':'#0d0f14', border:'none', borderRadius:'var(--radius)', fontSize:14, fontWeight:600, cursor:screening?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontFamily:'var(--font)', marginBottom:'1rem' }}>
              {screening ? (
                <><span style={{ display:'inline-block',width:14,height:14,border:'2px solid rgba(0,0,0,.2)',borderTopColor:'var(--text-muted)',borderRadius:'50%',animation:'spin .7s linear infinite' }}/> Screening candidate {progress.current} of {progress.total}... {pct}%</>
              ) : (
                <><Zap size={15}/> Screen All {candidates.filter(c=>c.text.trim().length>10).length} Candidates</>
              )}
            </button>

            {screening && (
              <div style={{ height:4, background:'var(--bg-card)', borderRadius:2, marginBottom:'2rem', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${pct}%`, background:'var(--accent)', borderRadius:2, transition:'width .4s ease' }}/>
              </div>
            )}
          </>
        )}

        {/* ── Results ── */}
        {results.length > 0 && (
          <div style={{ animation:'fadeIn .4s ease' }}>

            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem', flexWrap:'wrap', gap:10 }}>
              <div>
                <h3 style={{ fontSize:18, fontWeight:600, color:'var(--text-primary)', margin:0, letterSpacing:'-.02em' }}>
                  <Trophy size={18} color="var(--accent)" style={{ verticalAlign:-2, marginRight:8 }}/>
                  {results.length} Candidates Ranked
                </h3>
                <p style={{ fontSize:13, color:'var(--text-secondary)', margin:'4px 0 0' }}>Sorted by match score · Best to worst</p>
              </div>
              <button onClick={handleReset} style={{ fontSize:13, padding:'8px 16px', background:'transparent', border:'1px solid var(--border)', borderRadius:'var(--radius)', color:'var(--text-secondary)', cursor:'pointer', fontFamily:'var(--font)' }}>
                ↺ Screen Again
              </button>
            </div>

            {/* Stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10, marginBottom:'1.5rem' }}>
              {[
                { label:'Total',      value:results.length },
                { label:'Shortlist',  value:results.filter(r=>r.recommendation==='Shortlist').length, color:'#4ade80' },
                { label:'Consider',   value:results.filter(r=>r.recommendation==='Consider').length,  color:'#fbbf24' },
                { label:'Reject',     value:results.filter(r=>r.recommendation==='Reject').length,    color:'#f87171' },
                { label:'Avg Score',  value:Math.round(results.reduce((a,b)=>a+b.overall_score,0)/results.length)+'%' },
              ].map(s => (
                <div key={s.label} style={{ background:'var(--bg-panel)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'12px 14px' }}>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontSize:22, fontWeight:600, color:s.color||'var(--text-primary)' }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Result cards */}
            <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
              {results.map((r, i) => {
                const vs     = verdictStyle(r.verdict)
                const rs     = recStyle(r.recommendation)
                const isOpen = expanded === i
                const col    = scoreColor(r.overall_score)
                const ringR  = 18
                const circ   = 2 * Math.PI * ringR
                const dash   = (r.overall_score / 100) * circ

                return (
                  <div key={i} className="rcard" style={{ background:'var(--bg-panel)', border:`1px solid ${i===0?'rgba(200,240,96,.3)':'var(--border)'}`, borderRadius:'var(--radius-lg)', overflow:'hidden', transition:'border-color .15s', boxShadow:i===0?'0 0 0 1px rgba(200,240,96,.1)':'none' }}>

                    {/* Top row */}
                    <div onClick={() => setExpanded(isOpen?null:i)} style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'1rem 1.25rem', cursor:'pointer' }}>

                      <div style={{ fontSize:i<3?22:14, fontWeight:700, color:'var(--text-secondary)', minWidth:32, textAlign:'center', flexShrink:0 }}>
                        {rankIcon(i)}
                      </div>

                      {/* Score ring */}
                      <div style={{ position:'relative', width:44, height:44, flexShrink:0 }}>
                        <svg width={44} height={44} style={{ transform:'rotate(-90deg)' }}>
                          <circle cx={22} cy={22} r={ringR} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={5}/>
                          <circle cx={22} cy={22} r={ringR} fill="none" stroke={col} strokeWidth={5}
                            strokeDasharray={`${dash.toFixed(1)} ${circ.toFixed(1)}`} strokeLinecap="round"/>
                        </svg>
                        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:col }}>{r.overall_score}</div>
                      </div>

                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:3 }}>
                          <span style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)' }}>{r.candidate_name}</span>
                          {r.years_experience && <span style={{ fontSize:11, color:'var(--text-muted)' }}>{r.years_experience}</span>}
                          <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:vs.bg, color:vs.color, fontWeight:500 }}>{r.verdict}</span>
                          <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:rs.bg, color:rs.color, fontWeight:500 }}>{r.recommendation}</span>
                          {r._error && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'rgba(248,113,113,.1)', color:'#f87171' }}>Error</span>}
                        </div>
                        <p style={{ fontSize:12, color:'var(--text-secondary)', margin:0, lineHeight:1.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:isOpen?'normal':'nowrap' }}>
                          {r.verdict_summary}
                        </p>
                      </div>

                      <div style={{ display:'flex', gap:12, flexShrink:0 }}>
                        {[['Skills',r.breakdown?.skills_score],['Exp',r.breakdown?.experience_score],['Edu',r.breakdown?.education_score]].map(([l,v])=>(
                          <div key={l} style={{ textAlign:'center', minWidth:36 }}>
                            <div style={{ fontSize:13, fontWeight:600, color:scoreColor(v) }}>{v}%</div>
                            <div style={{ fontSize:9, color:'var(--text-muted)' }}>{l}</div>
                          </div>
                        ))}
                      </div>

                      <div style={{ color:'var(--text-muted)', flexShrink:0 }}>
                        {isOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                      </div>
                    </div>

                    {/* Expanded */}
                    {isOpen && (
                      <div style={{ padding:'0 1.25rem 1.25rem', borderTop:'1px solid var(--border)', animation:'slideIn .2s ease' }}>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginTop:'1rem' }}>
                          {r.matched_skills?.length > 0 && (
                            <div>
                              <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6, fontWeight:500 }}>Matched skills</div>
                              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                                {r.matched_skills.map((s,si)=>(
                                  <span key={si} style={{ fontSize:11, padding:'3px 9px', borderRadius:20, background:'rgba(74,222,128,.1)', color:'#4ade80', border:'1px solid rgba(74,222,128,.2)' }}>{s}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {r.missing_skills?.length > 0 && (
                            <div>
                              <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6, fontWeight:500 }}>Missing skills</div>
                              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                                {r.missing_skills.map((s,si)=>(
                                  <span key={si} style={{ fontSize:11, padding:'3px 9px', borderRadius:20, background:'rgba(248,113,113,.1)', color:'#f87171', border:'1px solid rgba(248,113,113,.2)' }}>{s}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginTop:'1rem' }}>
                          {[['Skills',r.breakdown?.skills_score],['Experience',r.breakdown?.experience_score],['Education',r.breakdown?.education_score]].map(([l,v])=>(
                            <div key={l} style={{ background:'var(--bg-card)', padding:'10px 12px', borderRadius:'var(--radius)', border:'1px solid var(--border)' }}>
                              <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{l}</div>
                              <div style={{ fontSize:18, fontWeight:600, color:scoreColor(v) }}>{v}%</div>
                              <div style={{ height:3, background:'rgba(255,255,255,.06)', borderRadius:2, marginTop:6, overflow:'hidden' }}>
                                <div style={{ height:'100%', width:`${v}%`, background:scoreColor(v), borderRadius:2 }}/>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>

      <footer style={{ borderTop:'1px solid var(--border)', padding:'1rem 2rem', textAlign:'center', marginTop:'2rem' }}>
        <p style={{ fontSize:11, color:'var(--text-muted)', margin:0, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
          <ShieldCheck size={11} color="#4ade80"/> CV Screener — Sensitive data removed before AI processing
        </p>
      </footer>
    </div>
  )
}