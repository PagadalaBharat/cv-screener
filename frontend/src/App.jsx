import React, { useState, useRef } from 'react'
import { useScreening } from './hooks/useScreening.js'
import ResultsPanel from './components/ResultsPanel.jsx'
import StreamingView from './components/StreamingView.jsx'
import { Cpu, RefreshCw, Upload, FileText, X, Zap, Loader, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react'
import { Routes, Route } from 'react-router-dom'
import SingleScreen from './pages/SingleScreen.jsx'
import MultiScreen from './pages/MultiScreen.jsx'

// ── Sanitize sensitive data from CV text ──
const sanitizeCV = (text) => {
  let cleaned = text

  // Remove email addresses
  cleaned = cleaned.replace(
    /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/gi,
    '[Email Removed]'
  )

  // Remove phone numbers (handles formats: +91 9876543210, 098-765-4321, (098) 765 4321, etc.)
  cleaned = cleaned.replace(
    /(\+?\d{1,3}[\s\-.]?)?\(?\d{2,4}\)?[\s\-.]?\d{3,4}[\s\-.]?\d{3,4}(\s?(ext|x)\s?\d{1,5})?/gi,
    '[Phone Removed]'
  )

  // Remove LinkedIn URLs
  cleaned = cleaned.replace(
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-_%]+\/?/gi,
    '[LinkedIn Removed]'
  )

  // Remove GitHub URLs
  cleaned = cleaned.replace(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9\-_%]+\/?/gi,
    '[GitHub Removed]'
  )

  // Remove general URLs
  cleaned = cleaned.replace(
    /https?:\/\/[^\s]+/gi,
    '[URL Removed]'
  )

  // Remove physical addresses (street numbers + street names)
  cleaned = cleaned.replace(
    /\d+\s+[a-zA-Z]+(?:\s+[a-zA-Z]+)*\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl|Way|Close|Crescent|Terrace)\b[^,\n]*/gi,
    '[Address Removed]'
  )

  // Remove PIN codes / ZIP codes (5-6 digit standalone numbers)
  cleaned = cleaned.replace(/\b\d{5,6}\b/g, '[PIN Removed]')

  // Remove Aadhaar-like numbers (12 digit)
  cleaned = cleaned.replace(/\b\d{4}\s?\d{4}\s?\d{4}\b/g, '[ID Removed]')

  // Remove PAN card format (India)
  cleaned = cleaned.replace(/\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g, '[PAN Removed]')

  // Remove passport numbers (generic format)
  cleaned = cleaned.replace(/\b[A-Z]{1,2}\d{6,8}\b/g, '[Passport Removed]')

  // Clean up multiple spaces/newlines left after removal
  cleaned = cleaned.replace(/[ \t]{2,}/g, ' ')
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')

  return cleaned.trim()
}

const getErrorMessage = (error) => {
  if (!error) return null
  if (error.includes('ERR_CONNECTION_REFUSED') || error.includes('fetch') || error.includes('Failed to fetch'))
    return 'Cannot connect to the server. Please check your internet connection and try again.'
  if (error.includes('Failed to parse'))
    return 'AI returned an unexpected response. Please try again.'
  if (error.includes('400'))
    return 'Invalid input. Please make sure both Job Description and CV are filled properly.'
  if (error.includes('429'))
    return 'Too many requests. Please wait a moment and try again.'
  if (error.includes('500'))
    return 'Server error. Please try again in a few minutes.'
  if (error.includes('NetworkError') || error.includes('ERR_FAILED'))
    return 'Network error. Please check your internet connection.'
  if (error.includes('CORS'))
    return 'Server configuration error. Please contact support.'
  return error.length > 120 ? 'Something went wrong. Please try again.' : error
}

export default function App() {
  const [jd, setJd]                     = useState('')
  const [cv, setCv]                     = useState('')
  const [cvTab, setCvTab]               = useState('paste')
  const [fileName, setFileName]         = useState(null)
  const [fileLoading, setFileLoading]   = useState(false)
  const [fileSuccess, setFileSuccess]   = useState(false)
  const [sanitized, setSanitized]       = useState(false)
  const [removedCount, setRemovedCount] = useState(0)
  const fileRef                         = useRef()
  const { status, result, rawTokens, error, screen, reset } = useScreening()

  // Count how many items were removed
  const countRemovals = (original, cleaned) => {
    const matches = original.match(
      /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}|(\+?\d{1,3}[\s\-.]?)?\(?\d{2,4}\)?[\s\-.]?\d{3,4}[\s\-.]?\d{3,4}|https?:\/\/[^\s]+/gi
    )
    return matches ? matches.length : 0
  }

  const processAndSanitize = (rawText) => {
    const cleaned = sanitizeCV(rawText)
    const count   = countRemovals(rawText, cleaned)
    setSanitized(count > 0)
    setRemovedCount(count)
    return cleaned
  }

   return (
    <Routes>
      <Route path="/"      element={<SingleScreen />} />
      <Route path="/multi" element={<MultiScreen />} />
    </Routes>
  )

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)
    setCv('')
    setFileLoading(true)
    setFileSuccess(false)
    setSanitized(false)
    setRemovedCount(0)

    const extension = file.name.split('.').pop().toLowerCase()

    try {
      if (extension === 'txt') {
        const text = await file.text()
        const cleaned = processAndSanitize(text)
        setCv(cleaned)
        setFileSuccess(true)
        setFileLoading(false)
        return
      }

      if (extension === 'pdf') {
        const arrayBuffer = await file.arrayBuffer()
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        let fullText = ''
        for (let i = 1; i <= pdf.numPages; i++) {
          const page    = await pdf.getPage(i)
          const content = await page.getTextContent()
          fullText += content.items.map(item => item.str).join(' ') + '\n\n'
        }
        const cleaned = processAndSanitize(fullText)
        setCv(cleaned)
        setFileSuccess(true)
        setFileLoading(false)
        return
      }

      if (extension === 'docx') {
        const arrayBuffer = await file.arrayBuffer()
        const mammoth     = await import('mammoth')
        const result      = await mammoth.extractRawText({ arrayBuffer })
        const cleaned     = processAndSanitize(result.value)
        setCv(cleaned)
        setFileSuccess(true)
        setFileLoading(false)
        return
      }

      setFileLoading(false)
      setFileName(null)
      alert('Unsupported file. Please upload PDF, Word (.docx) or TXT.')

    } catch (err) {
      setFileLoading(false)
      setFileName(null)
      setFileSuccess(false)
      if (fileRef.current) fileRef.current.value = ''
      alert('Could not read this file. Please try another file or paste the CV text directly.')
    }
  }

  // Also sanitize when CV is pasted manually
  const handleCvPaste = (e) => {
    const pasted  = e.clipboardData.getData('text')
    const cleaned = sanitizeCV(pasted)
    const count   = countRemovals(pasted, cleaned)
    if (count > 0) {
      e.preventDefault()
      setCv(prev => prev + cleaned)
      setSanitized(true)
      setRemovedCount(count)
    }
  }

  const clearFile = () => {
    setFileName(null)
    setCv('')
    setFileLoading(false)
    setFileSuccess(false)
    setSanitized(false)
    setRemovedCount(0)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleClear = () => {
    setJd('')
    setCv('')
    setSanitized(false)
    setRemovedCount(0)
    clearFile()
    reset()
  }

  const isStreaming = status === 'streaming'
  const isDone      = status === 'done'
  const isError     = status === 'error'
  const canScreen   = jd.trim().length > 10 && cv.trim().length > 10 && !isStreaming && !fileLoading




  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg) } }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        @keyframes slideIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:none} }
        * { box-sizing: border-box; }
        .screen-btn:hover:not(:disabled) { opacity:0.88; transform:translateY(-1px); }
        .screen-btn:active:not(:disabled) { transform:translateY(0); }
        .screen-btn { transition: all 0.15s ease; }
        .tab-btn:hover { background: var(--accent-dim) !important; color: var(--accent) !important; }
        textarea { transition: border-color 0.15s, box-shadow 0.15s; }
        textarea:focus { border-color: var(--border-hover) !important; box-shadow: 0 0 0 3px rgba(200,240,96,0.08); outline: none; }
        .upload-zone:hover { background: rgba(200,240,96,0.04) !important; border-color: var(--accent) !important; }
        .clear-btn:hover { background: var(--bg-card) !important; color: var(--text-primary) !important; }
        @media (max-width: 768px) {
          .input-grid { grid-template-columns: 1fr !important; }
          .main-pad   { padding: 1rem !important; }
          .header-pad { padding: 0 1rem !important; }
        }
        @media (max-width: 480px) {
          .main-pad { padding: 0.75rem !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <header className="header-pad" style={{
        borderBottom: '1px solid var(--border)',
        padding: '0 2rem', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(13,15,20,0.92)', backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, background: 'var(--accent)',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Cpu size={17} color="#0d0f14" />
          </div>
          <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            CV Screener
          </span>
          <span style={{
            fontSize: 10, padding: '2px 7px',
            background: 'var(--accent-dim)', color: 'var(--accent)',
            borderRadius: 20, border: '1px solid var(--accent-border)', fontWeight: 500,
          }}>
            AI
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Privacy badge */}
          <span style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 11, color: '#4ade80',
            background: 'rgba(74,222,128,0.08)',
            border: '1px solid rgba(74,222,128,0.15)',
            borderRadius: 20, padding: '3px 10px',
          }}>
            <ShieldCheck size={11} /> Privacy Protected
          </span>

          {(isDone || isError) && (
            <button onClick={handleClear} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, color: 'var(--text-secondary)',
              background: 'none', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '6px 14px', cursor: 'pointer',
            }}>
              <RefreshCw size={13} /> New Screening
            </button>
          )}
        </div>
      </header>

      <main className="main-pad" style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>

        {/* ── Hero ── */}
        {status === 'idle' && !jd && !cv && (
          <div style={{ textAlign: 'center', padding: '2rem 0 1.5rem', animation: 'fadeIn 0.5s ease' }}>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10, letterSpacing: '-0.03em' }}>
              Screen candidates instantly
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 460, margin: '0 auto 1.5rem' }}>
              Paste a job description and candidate CV — get an AI-powered match score, skills analysis, and tailored interview questions in seconds.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              {[
                { icon: '🎯', text: 'Match score' },
                { icon: '🛡️', text: 'Privacy protected' },
                { icon: '💡', text: 'Interview questions' },
                { icon: '✅', text: 'Shortlist decision' },
              ].map(f => (
                <span key={f.text} style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {f.icon} {f.text}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Privacy notice banner ── */}
        {!isDone && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', marginBottom: '1rem',
            background: 'rgba(74,222,128,0.05)',
            border: '1px solid rgba(74,222,128,0.12)',
            borderRadius: 'var(--radius)',
            fontSize: 12, color: '#4ade80',
          }}>
            <ShieldCheck size={13} style={{ flexShrink: 0 }} />
            <span>
              <strong>Privacy mode active</strong> — Phone numbers, email addresses and URLs are automatically removed from CV text before processing.
            </span>
          </div>
        )}

        {/* ── Input Grid ── */}
        {!isDone && (
          <div className="input-grid" style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: '1.25rem', marginBottom: '1.25rem', animation: 'fadeIn 0.3s ease',
          }}>

            {/* JD Panel */}
            <div style={{
              background: 'var(--bg-panel)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '1.25rem',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <FileText size={14} color="var(--text-muted)" />
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Job Description</span>
                {jd.length > 0 && (
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: jd.length > 50 ? 'var(--accent)' : 'var(--text-muted)' }}>
                    {jd.length} chars
                  </span>
                )}
              </div>
              <textarea
                style={{
                  width: '100%', height: 220, resize: 'vertical',
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', color: 'var(--text-primary)',
                  fontFamily: 'var(--font)', fontSize: 13, lineHeight: 1.65, padding: '12px 14px',
                }}
                value={jd}
                onChange={e => setJd(e.target.value)}
                placeholder="Paste the full job description — role title, responsibilities, required skills, experience level..."
              />
              {jd.length > 0 && jd.length < 50 && (
                <p style={{ fontSize: 11, color: '#fbbf24', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertCircle size={11} /> Add more detail for better results
                </p>
              )}
            </div>

            {/* CV Panel */}
            <div style={{
              background: 'var(--bg-panel)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '1.25rem',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <FileText size={14} color="var(--text-muted)" />
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Candidate CV</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                  {['paste', 'upload'].map(t => (
                    <button key={t} onClick={() => setCvTab(t)} className="tab-btn" style={{
                      fontSize: 11, padding: '3px 10px', borderRadius: 20,
                      border: '1px solid var(--border)',
                      background: cvTab === t ? 'var(--accent-dim)' : 'transparent',
                      color: cvTab === t ? 'var(--accent)' : 'var(--text-muted)',
                      cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s',
                    }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {cvTab === 'upload' && (
                <div>
                  {fileName ? (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px',
                      background: fileSuccess ? 'rgba(74,222,128,0.06)' : 'var(--bg-input)',
                      borderRadius: 'var(--radius)',
                      border: `1px solid ${fileSuccess ? 'rgba(74,222,128,0.25)' : 'var(--border)'}`,
                    }}>
                      {fileLoading
                        ? <Loader size={12} color="var(--accent)" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                        : fileSuccess
                          ? <CheckCircle2 size={12} color="#4ade80" style={{ flexShrink: 0 }} />
                          : <Upload size={12} style={{ flexShrink: 0 }} />
                      }
                      <span style={{ flex: 1, color: fileSuccess ? '#4ade80' : 'var(--text-secondary)', fontSize: 12 }}>
                        {fileLoading ? 'Extracting and sanitizing...' : fileSuccess ? `${fileName} — ready` : fileName}
                      </span>
                      {!fileLoading && (
                        <button onClick={clearFile} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}>
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <label className="upload-zone" style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center', gap: 6,
                      border: '1px dashed var(--border-hover)',
                      borderRadius: 'var(--radius)', padding: '18px 12px',
                      textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                      <Upload size={20} color="var(--text-muted)" />
                      <div>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Click to upload CV</p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>PDF, Word (.docx) or TXT · Sensitive data auto-removed</p>
                      </div>
                      <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" style={{ display: 'none' }} onChange={handleFile} />
                    </label>
                  )}
                </div>
              )}

              <textarea
                style={{
                  width: '100%', height: cvTab === 'upload' ? 130 : 220, resize: 'vertical',
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', color: 'var(--text-primary)',
                  fontFamily: 'var(--font)', fontSize: 13, lineHeight: 1.65, padding: '12px 14px',
                }}
                value={cv}
                onChange={e => setCv(e.target.value)}
                onPaste={handleCvPaste}
                placeholder={
                  cvTab === 'upload'
                    ? fileLoading ? 'Extracting and removing sensitive data...'
                      : fileSuccess ? 'Sanitized CV text — sensitive data removed'
                        : 'Extracted text will appear here...'
                    : 'Paste the CV — phone, email and address will be auto-removed...'
                }
              />

              {/* Sanitization status */}
              {sanitized && cv && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 10px',
                  background: 'rgba(74,222,128,0.06)',
                  border: '1px solid rgba(74,222,128,0.15)',
                  borderRadius: 'var(--radius)',
                  fontSize: 11, color: '#4ade80',
                }}>
                  <ShieldCheck size={11} />
                  <span>
                    {removedCount} sensitive item{removedCount > 1 ? 's' : ''} removed (phone, email, URLs) — CV is privacy-safe
                  </span>
                </div>
              )}

              {fileSuccess && cv && !sanitized && (
                <p style={{ fontSize: 11, color: '#4ade80', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={11} /> {cv.length} characters extracted — no sensitive data found
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Action Buttons ── */}
        {!isDone && (
          <div style={{ marginBottom: '1.5rem', display: 'flex', gap: 10 }}>
            <button
              className="screen-btn"
              onClick={() => screen(jd, cv)}
              disabled={!canScreen}
              style={{
                flex: 1, padding: '13px 24px',
                background: canScreen ? 'var(--accent)' : 'rgba(200,240,96,0.08)',
                color: canScreen ? '#0d0f14' : 'var(--text-muted)',
                border: 'none', borderRadius: 'var(--radius)',
                fontSize: 14, fontWeight: 600,
                cursor: canScreen ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontFamily: 'var(--font)',
              }}
            >
              {isStreaming ? (
                <>
                  <span style={{
                    display: 'inline-block', width: 14, height: 14,
                    border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#0d0f14',
                    borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                  }} />
                  Analyzing candidate...
                </>
              ) : fileLoading ? (
                <>
                  <span style={{
                    display: 'inline-block', width: 14, height: 14,
                    border: '2px solid rgba(200,240,96,0.2)', borderTopColor: 'var(--text-muted)',
                    borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                  }} />
                  Processing file...
                </>
              ) : (
                <><Zap size={15} /> Screen Candidate</>
              )}
            </button>

            {(jd || cv) && !isStreaming && !fileLoading && (
              <button onClick={handleClear} className="clear-btn" style={{
                padding: '13px 20px', background: 'transparent',
                color: 'var(--text-muted)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', fontSize: 13,
                cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.15s',
              }}>
                Clear
              </button>
            )}
          </div>
        )}

        {/* ── Streaming ── */}
        {isStreaming && (
          <div style={{ marginBottom: '1.25rem', animation: 'slideIn 0.3s ease' }}>
            <StreamingView />
          </div>
        )}

        {/* ── Error ── */}
        {isError && (
          <div style={{
            padding: '1rem 1.25rem',
            background: 'rgba(248,113,113,0.06)',
            border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 'var(--radius)', marginBottom: '1rem',
            animation: 'slideIn 0.3s ease',
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <AlertCircle size={16} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 13, color: '#f87171', margin: 0, fontWeight: 500 }}>Screening failed</p>
              <p style={{ fontSize: 12, color: 'rgba(248,113,113,0.75)', margin: '4px 0 10px' }}>
                {getErrorMessage(error)}
              </p>
              <button onClick={() => screen(jd, cv)} style={{
                fontSize: 12, padding: '5px 14px',
                background: 'rgba(248,113,113,0.1)',
                border: '1px solid rgba(248,113,113,0.3)',
                borderRadius: 'var(--radius)', color: '#f87171',
                cursor: 'pointer', fontFamily: 'var(--font)',
              }}>
                Try again
              </button>
            </div>
          </div>
        )}

        {/* ── Results ── */}
        {isDone && result && <ResultsPanel result={result} />}

      </main>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '1rem 2rem', textAlign: 'center', marginTop: '2rem',
      }}>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <ShieldCheck size={11} color="#4ade80" />
          CV Screener — Sensitive data is removed before AI processing · Personal use only
        </p>
      </footer>
    </div>
  )
}