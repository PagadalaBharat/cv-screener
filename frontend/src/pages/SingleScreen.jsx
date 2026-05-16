import React, { useState, useRef } from 'react'
import { useScreening } from '../hooks/useScreening.js'
import ResultsPanel from '../components/ResultsPanel.jsx'
import StreamingView from '../components/StreamingView.jsx'
import Header from '../components/Header.jsx'
import { sanitizeCV, extractTextFromFile } from '../utils/sanitize.js'
import { Upload, FileText, X, Zap, Loader, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react'

const getErrorMessage = (error) => {
  if (!error) return 'Something went wrong.'
  if (error.includes('ERR_CONNECTION_REFUSED') || error.includes('Failed to fetch'))
    return 'Cannot connect to server. Make sure the backend is running.'
  if (error.includes('429')) return 'Too many requests. Please wait and try again.'
  if (error.includes('500')) return 'Server error. Please try again.'
  if (error.includes('Failed to parse')) return 'AI response error. Please try again.'
  return error.length > 120 ? 'Something went wrong. Please try again.' : error
}

export default function SingleScreen() {
  const [jd, setJd]                     = useState('')
  const [cv, setCv]                     = useState('')
  const [cvTab, setCvTab]               = useState('paste')
  const [fileName, setFileName]         = useState(null)
  const [fileLoading, setFileLoading]   = useState(false)
  const [fileSuccess, setFileSuccess]   = useState(false)
  const [sanitized, setSanitized]       = useState(false)
  const [removedCount, setRemovedCount] = useState(0)
  const fileRef                         = useRef()
  const { status, result, error, screen, reset } = useScreening()

  const processFile = async (file) => {
    setFileName(file.name)
    setCv(''); setFileLoading(true); setFileSuccess(false); setSanitized(false)
    try {
      const raw     = await extractTextFromFile(file)
      const cleaned = sanitizeCV(raw)
      const count   = (raw.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}|https?:\/\/[^\s]+/gi) || []).length
      setCv(cleaned); setSanitized(count > 0); setRemovedCount(count); setFileSuccess(true)
    } catch (err) {
      setFileName(null); alert(err.message || 'Could not read file.')
    }
    setFileLoading(false)
  }

  const clearFile = () => {
    setFileName(null); setCv(''); setFileLoading(false); setFileSuccess(false); setSanitized(false); setRemovedCount(0)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleClear = () => { setJd(''); setCv(''); clearFile(); reset() }

  const isStreaming = status === 'streaming'
  const isDone      = status === 'done'
  const isError     = status === 'error'
  const canScreen   = jd.trim().length > 10 && cv.trim().length > 10 && !isStreaming && !fileLoading

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <style>{`
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        @keyframes slideIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:none} }
        * { box-sizing:border-box; }
        .sbtn:hover:not(:disabled){opacity:.88;transform:translateY(-1px)} .sbtn{transition:all .15s}
        .tbtn:hover{background:var(--accent-dim)!important;color:var(--accent)!important}
        textarea:focus{border-color:var(--border-hover)!important;box-shadow:0 0 0 3px rgba(200,240,96,.08);outline:none}
        .uzone:hover{background:rgba(200,240,96,.04)!important;border-color:var(--accent)!important}
        @media(max-width:768px){.igrid{grid-template-columns:1fr!important}.mpad{padding:1rem!important}}
      `}</style>

      <Header onReset={handleClear} showReset={isDone || isError} />

      <main className="mpad" style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>

        {status === 'idle' && !jd && !cv && (
          <div style={{ textAlign: 'center', padding: '2rem 0 1.5rem', animation: 'fadeIn .5s ease' }}>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10, letterSpacing: '-.03em' }}>Screen a candidate instantly</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 440, margin: '0 auto' }}>
              Paste a job description and CV — get AI-powered match score, skills analysis and interview questions.
            </p>
          </div>
        )}

        {!isDone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', marginBottom: '1rem', background: 'rgba(74,222,128,.05)', border: '1px solid rgba(74,222,128,.12)', borderRadius: 'var(--radius)', fontSize: 12, color: '#4ade80' }}>
            <ShieldCheck size={13} />
            <span><strong>Privacy mode</strong> — Phone, email and urls auto-removed before AI processing</span>
          </div>
        )}

        {!isDone && (
          <div className="igrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>

            {/* JD */}
            <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <FileText size={14} color="var(--text-muted)" />
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Job Description</span>
                {jd.length > 0 && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--accent)' }}>{jd.length} chars</span>}
              </div>
              <textarea style={{ width: '100%', height: 220, resize: 'vertical', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontFamily: 'var(--font)', fontSize: 13, lineHeight: 1.65, padding: '12px 14px', transition: 'all .15s' }}
                value={jd} onChange={e => setJd(e.target.value)}
                placeholder="Paste the full job description..." />
              {jd.length > 0 && jd.length < 50 && (
                <p style={{ fontSize: 11, color: '#fbbf24', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={11} /> Add more detail for better results</p>
              )}
            </div>

            {/* CV */}
            <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <FileText size={14} color="var(--text-muted)" />
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Candidate CV</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                  {['paste','upload'].map(t => (
                    <button key={t} onClick={() => setCvTab(t)} className="tbtn" style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, border: '1px solid var(--border)', background: cvTab===t?'var(--accent-dim)':'transparent', color: cvTab===t?'var(--accent)':'var(--text-muted)', cursor: 'pointer', transition: 'all .15s' }}>{t}</button>
                  ))}
                </div>
              </div>

              {cvTab === 'upload' && (
                fileName ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: fileSuccess?'rgba(74,222,128,.06)':'var(--bg-input)', borderRadius: 'var(--radius)', border: `1px solid ${fileSuccess?'rgba(74,222,128,.25)':'var(--border)'}` }}>
                    {fileLoading ? <Loader size={12} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={12} color="#4ade80" />}
                    <span style={{ flex: 1, fontSize: 12, color: fileSuccess?'#4ade80':'var(--text-secondary)' }}>{fileLoading?'Processing...':fileSuccess?`${fileName} — ready`:fileName}</span>
                    {!fileLoading && <button onClick={clearFile} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={13}/></button>}
                  </div>
                ) : (
                  <label className="uzone" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, border: '1px dashed var(--border-hover)', borderRadius: 'var(--radius)', padding: '18px 12px', textAlign: 'center', cursor: 'pointer', transition: 'all .15s' }}>
                    <Upload size={20} color="var(--text-muted)" />
                    <div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Click to upload CV</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>PDF, Word (.docx) or TXT</p>
                    </div>
                    <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" style={{ display: 'none' }} onChange={e => { if(e.target.files[0]) processFile(e.target.files[0]) }} />
                  </label>
                )
              )}

              <textarea style={{ width: '100%', height: cvTab==='upload'?140:220, resize: 'vertical', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontFamily: 'var(--font)', fontSize: 13, lineHeight: 1.65, padding: '12px 14px', transition: 'all .15s' }}
                value={cv} onChange={e => setCv(e.target.value)}
                onPaste={e => { const p=e.clipboardData.getData('text'); const cl=sanitizeCV(p); if(cl!==p){e.preventDefault();setCv(cl);setSanitized(true)} }}
                placeholder={cvTab==='upload'?'Extracted text will appear here...':'Paste CV — email and phone will be auto-removed...'} />

              {sanitized && cv && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'rgba(74,222,128,.06)', border: '1px solid rgba(74,222,128,.15)', borderRadius: 'var(--radius)', fontSize: 11, color: '#4ade80' }}>
                  <ShieldCheck size={11} /> {removedCount} sensitive item{removedCount>1?'s':''} removed — CV is privacy-safe
                </div>
              )}
              {fileSuccess && cv && !sanitized && (
                <p style={{ fontSize: 11, color: '#4ade80', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={11}/> {cv.length} chars extracted — no sensitive data found</p>
              )}
            </div>
          </div>
        )}

        {!isDone && (
          <div style={{ marginBottom: '1.5rem', display: 'flex', gap: 10 }}>
            <button className="sbtn" onClick={() => screen(jd, cv)} disabled={!canScreen} style={{ flex: 1, padding: '13px 24px', background: canScreen?'var(--accent)':'rgba(200,240,96,.08)', color: canScreen?'#0d0f14':'var(--text-muted)', border: 'none', borderRadius: 'var(--radius)', fontSize: 14, fontWeight: 600, cursor: canScreen?'pointer':'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'var(--font)' }}>
              {isStreaming ? <><span style={{ display:'inline-block',width:14,height:14,border:'2px solid rgba(0,0,0,.2)',borderTopColor:'#0d0f14',borderRadius:'50%',animation:'spin .7s linear infinite' }}/> Analyzing...</> : <><Zap size={15}/> Screen Candidate</>}
            </button>
            {(jd||cv) && !isStreaming && (
              <button onClick={handleClear} style={{ padding: '13px 20px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>Clear</button>
            )}
          </div>
        )}

        {isStreaming && <div style={{ marginBottom: '1.25rem', animation: 'slideIn .3s ease' }}><StreamingView /></div>}

        {isError && (
          <div style={{ padding: '1rem 1.25rem', background: 'rgba(248,113,113,.06)', border: '1px solid rgba(248,113,113,.2)', borderRadius: 'var(--radius)', marginBottom: '1rem', display: 'flex', gap: 10 }}>
            <AlertCircle size={16} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 13, color: '#f87171', margin: 0, fontWeight: 500 }}>Screening failed</p>
              <p style={{ fontSize: 12, color: 'rgba(248,113,113,.75)', margin: '4px 0 10px' }}>{getErrorMessage(error)}</p>
              <button onClick={() => screen(jd, cv)} style={{ fontSize: 12, padding: '5px 14px', background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)', borderRadius: 'var(--radius)', color: '#f87171', cursor: 'pointer', fontFamily: 'var(--font)' }}>Try again</button>
            </div>
          </div>
        )}

        {isDone && result && <ResultsPanel result={result} />}
      </main>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '1rem 2rem', textAlign: 'center', marginTop: '2rem' }}>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <ShieldCheck size={11} color="#4ade80" /> CV Screener — Sensitive data removed before AI processing
        </p>
      </footer>
    </div>
  )
}