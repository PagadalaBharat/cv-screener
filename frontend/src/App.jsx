import React, { useState, useRef } from 'react'
import { useScreening } from './hooks/useScreening.js'
import ResultsPanel from './components/ResultsPanel.jsx'
import StreamingView from './components/StreamingView.jsx'
import { Cpu, RefreshCw, Upload, FileText, X, Zap, Loader, AlertCircle, CheckCircle2 } from 'lucide-react'

const getErrorMessage = (error) => {
  if (!error) return null
  if (error.includes('fetch')) return 'Cannot connect to the server. Please check your internet connection and try again.'
  if (error.includes('Failed to parse')) return 'AI returned an unexpected response. Please try again.'
  if (error.includes('400')) return 'Invalid input. Please make sure both Job Description and CV are filled properly.'
  if (error.includes('429')) return 'Too many requests. Please wait a moment and try again.'
  if (error.includes('500')) return 'Server error. Please try again in a few minutes.'
  if (error.includes('NetworkError') || error.includes('ERR_FAILED')) return 'Network error. Please check your internet connection.'
  if (error.includes('CORS')) return 'Server configuration error. Please contact support.'
  if (error.includes('AbortError')) return 'Request was cancelled.'
  return error.length > 120 ? 'Something went wrong. Please try again.' : error
}

export default function App() {
  const [jd, setJd]                   = useState('')
  const [cv, setCv]                   = useState('')
  const [cvTab, setCvTab]             = useState('paste')
  const [fileName, setFileName]       = useState(null)
  const [fileLoading, setFileLoading] = useState(false)
  const [fileSuccess, setFileSuccess] = useState(false)
  const fileRef                       = useRef()
  const { status, result, rawTokens, error, screen, reset } = useScreening()

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)
    setCv('')
    setFileLoading(true)
    setFileSuccess(false)

    const extension = file.name.split('.').pop().toLowerCase()

    try {
      if (extension === 'txt') {
        const text = await file.text()
        setCv(text.trim())
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
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          fullText += content.items.map(item => item.str).join(' ') + '\n\n'
        }
        setCv(fullText.trim())
        setFileSuccess(true)
        setFileLoading(false)
        return
      }

      if (extension === 'docx') {
        const arrayBuffer = await file.arrayBuffer()
        const mammoth = await import('mammoth')
        const result = await mammoth.extractRawText({ arrayBuffer })
        setCv(result.value.trim())
        setFileSuccess(true)
        setFileLoading(false)
        return
      }

      setFileLoading(false)
      setFileName(null)
      alert('Unsupported file type. Please upload PDF, Word (.docx) or TXT.')

    } catch (err) {
      setFileLoading(false)
      setFileName(null)
      setFileSuccess(false)
      if (fileRef.current) fileRef.current.value = ''
      alert('Could not read this file. Please try a different file or paste the CV text directly.')
    }
  }

  const clearFile = () => {
    setFileName(null)
    setCv('')
    setFileLoading(false)
    setFileSuccess(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleClear = () => {
    setJd('')
    setCv('')
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
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:none } }
        @keyframes slideIn { from { opacity:0; transform:translateY(-4px) } to { opacity:1; transform:none } }

        * { box-sizing: border-box; }

        .screen-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .screen-btn:active:not(:disabled) { transform: translateY(0); }
        .screen-btn { transition: all 0.15s ease; }

        .tab-btn:hover { background: var(--accent-dim) !important; color: var(--accent) !important; }

        textarea:focus { border-color: var(--border-hover) !important; box-shadow: 0 0 0 3px rgba(200,240,96,0.08); }

        .upload-zone:hover { background: rgba(200,240,96,0.04) !important; border-color: var(--accent) !important; }

        @media (max-width: 768px) {
          .input-grid { grid-template-columns: 1fr !important; }
          .main-pad { padding: 1rem !important; }
          .header-pad { padding: 0 1rem !important; }
          .header-title { font-size: 14px !important; }
        }

        @media (max-width: 480px) {
          .main-pad { padding: 0.75rem !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '0 2rem',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--bg)',
        backdropFilter: 'blur(10px)',
      }} className="header-pad">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32,
            background: 'var(--accent)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Cpu size={17} color="#0d0f14" />
          </div>
          <span className="header-title" style={{
            fontWeight: 600, fontSize: 15,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em'
          }}>
            CV Screener
          </span>
          <span style={{
            fontSize: 10, padding: '2px 7px',
            background: 'var(--accent-dim)', color: 'var(--accent)',
            borderRadius: 20, border: '1px solid var(--accent-border)',
            fontWeight: 500, letterSpacing: '0.03em'
          }}>
            AI
          </span>
        </div>

        {(isDone || isError) && (
          <button onClick={handleClear} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 13, color: 'var(--text-secondary)',
            background: 'none', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '6px 14px',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
            <RefreshCw size={13} /> New Screening
          </button>
        )}
      </header>

      <main className="main-pad" style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>

        {/* ── Hero text — only when idle ── */}
        {status === 'idle' && !jd && !cv && (
          <div style={{ textAlign: 'center', padding: '2rem 0 1.5rem', animation: 'fadeIn 0.4s ease' }}>
            <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.03em' }}>
              Screen candidates instantly
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 440, margin: '0 auto' }}>
              Paste a job description and candidate CV — get an AI-powered match score, skill analysis, and interview questions in seconds.
            </p>
          </div>
        )}

        {/* ── Input Grid ── */}
        {!isDone && (
          <div className="input-grid" style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.25rem',
            marginBottom: '1.25rem',
            animation: 'fadeIn 0.3s ease'
          }}>

            {/* JD Panel */}
            <div style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              display: 'flex', flexDirection: 'column', gap: 8
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <FileText size={14} color="var(--text-muted)" />
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Job Description</span>
                {jd.length > 0 && (
                  <span style={{
                    marginLeft: 'auto', fontSize: 11,
                    color: jd.length > 50 ? 'var(--accent)' : 'var(--text-muted)'
                  }}>
                    {jd.length} chars
                  </span>
                )}
              </div>
              <textarea
                style={{
                  width: '100%', flex: 1,
                  height: 220, resize: 'vertical',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font)', fontSize: 13, lineHeight: 1.65,
                  padding: '12px 14px', outline: 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
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
              background: 'var(--bg-panel)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              display: 'flex', flexDirection: 'column', gap: 8
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
                      cursor: 'pointer', textTransform: 'capitalize',
                      transition: 'all 0.15s',
                    }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload zone */}
              {cvTab === 'upload' && (
                <div>
                  {fileName ? (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px',
                      background: fileSuccess ? 'rgba(74,222,128,0.06)' : 'var(--bg-input)',
                      borderRadius: 'var(--radius)',
                      border: `1px solid ${fileSuccess ? 'rgba(74,222,128,0.2)' : 'var(--border)'}`,
                      fontSize: 12, color: 'var(--text-secondary)',
                    }}>
                      {fileLoading
                        ? <Loader size={12} color="var(--accent)" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                        : fileSuccess
                          ? <CheckCircle2 size={12} color="#4ade80" style={{ flexShrink: 0 }} />
                          : <Upload size={12} style={{ flexShrink: 0 }} />
                      }
                      <span style={{ flex: 1, color: fileSuccess ? '#4ade80' : 'var(--text-secondary)' }}>
                        {fileLoading ? 'Reading file...' : fileSuccess ? `${fileName} — ready` : fileName}
                      </span>
                      {!fileLoading && (
                        <button onClick={clearFile} style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--text-muted)', display: 'flex', padding: 2
                        }}>
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <label className="upload-zone" style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center', gap: 6,
                      border: '1px dashed var(--border-hover)',
                      borderRadius: 'var(--radius)', padding: '16px 12px',
                      textAlign: 'center', cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}>
                      <Upload size={20} color="var(--text-muted)" />
                      <div>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                          Click to upload CV
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                          PDF, Word (.docx) or TXT supported
                        </p>
                      </div>
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".pdf,.docx,.txt"
                        style={{ display: 'none' }}
                        onChange={handleFile}
                      />
                    </label>
                  )}
                </div>
              )}

              <textarea
                style={{
                  width: '100%',
                  height: cvTab === 'upload' ? 140 : 220,
                  resize: 'vertical',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font)', fontSize: 13, lineHeight: 1.65,
                  padding: '12px 14px', outline: 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                value={cv}
                onChange={e => setCv(e.target.value)}
                placeholder={
                  cvTab === 'upload'
                    ? fileLoading ? 'Extracting text from file...'
                      : fileSuccess ? 'CV text extracted — you can edit if needed'
                        : 'Extracted CV text will appear here...'
                    : 'Paste the full CV — work experience, skills, education, certifications...'
                }
              />

              {fileSuccess && cv && (
                <p style={{ fontSize: 11, color: '#4ade80', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={11} /> {cv.length} characters extracted successfully
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
                background: canScreen ? 'var(--accent)' : 'rgba(200,240,96,0.1)',
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
                    borderRadius: '50%', animation: 'spin 0.7s linear infinite'
                  }} />
                  Analyzing candidate...
                </>
              ) : fileLoading ? (
                <>
                  <span style={{
                    display: 'inline-block', width: 14, height: 14,
                    border: '2px solid rgba(0,0,0,0.2)', borderTopColor: 'var(--text-muted)',
                    borderRadius: '50%', animation: 'spin 0.7s linear infinite'
                  }} />
                  Reading file...
                </>
              ) : (
                <><Zap size={15} /> Screen Candidate</>
              )}
            </button>

            {(jd || cv) && !isStreaming && !fileLoading && (
              <button onClick={handleClear} style={{
                padding: '13px 20px', background: 'transparent',
                color: 'var(--text-muted)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', fontSize: 13,
                cursor: 'pointer', fontFamily: 'var(--font)',
                transition: 'all 0.15s',
              }}>
                Clear
              </button>
            )}
          </div>
        )}

        {/* ── Input hints ── */}
        {!isDone && !isStreaming && !jd && !cv && (
          <div style={{
            display: 'flex', justifyContent: 'center', gap: '2rem',
            flexWrap: 'wrap', marginBottom: '1rem'
          }}>
            {[
              '✅ Real-time AI analysis',
              '✅ Skills match breakdown',
              '✅ Interview questions',
              '✅ Shortlist recommendation',
            ].map(tip => (
              <span key={tip} style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tip}</span>
            ))}
          </div>
        )}

        {/* ── Streaming View ── */}
        {isStreaming && (
          <div style={{ marginBottom: '1.25rem', animation: 'slideIn 0.3s ease' }}>
            <div style={{
              fontSize: 12, color: 'var(--text-muted)',
              marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6
            }}>
              <span style={{
                display: 'inline-block', width: 6, height: 6,
                borderRadius: '50%', background: 'var(--accent)',
                animation: 'spin 1s linear infinite'
              }} />
              AI is analyzing the candidate profile...
            </div>
            <StreamingView tokens={rawTokens} />
          </div>
        )}

        {/* ── Error ── */}
        {isError && (
          <div style={{
            padding: '1rem 1.25rem',
            background: 'rgba(248,113,113,0.06)',
            border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 'var(--radius)',
            marginBottom: '1rem',
            animation: 'slideIn 0.3s ease',
            display: 'flex', alignItems: 'flex-start', gap: 10
          }}>
            <AlertCircle size={16} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 13, color: '#f87171', margin: 0, fontWeight: 500 }}>
                Screening failed
              </p>
              <p style={{ fontSize: 12, color: 'rgba(248,113,113,0.8)', margin: '4px 0 0' }}>
                {getErrorMessage(error)}
              </p>
              <button
                onClick={() => screen(jd, cv)}
                style={{
                  marginTop: 10, fontSize: 12, padding: '5px 12px',
                  background: 'rgba(248,113,113,0.1)',
                  border: '1px solid rgba(248,113,113,0.3)',
                  borderRadius: 'var(--radius)', color: '#f87171',
                  cursor: 'pointer', fontFamily: 'var(--font)'
                }}
              >
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
        padding: '1rem 2rem',
        textAlign: 'center',
        marginTop: '2rem'
      }}>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
          CV Screener — AI-powered recruitment tool · For personal use only
        </p>
      </footer>

    </div>
  )
}