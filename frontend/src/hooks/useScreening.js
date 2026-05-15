import { useState, useRef, useCallback } from 'react'

export function useScreening() {
  const [status, setStatus]       = useState('idle')
  const [result, setResult]       = useState(null)
  const [rawTokens, setRawTokens] = useState('')
  const [error, setError]         = useState(null)
  const abortRef                  = useRef(null)

  const screen = useCallback(async (jobDescription, candidateCv) => {
    setStatus('streaming')
    setResult(null)
    setRawTokens('')
    setError(null)

    abortRef.current = new AbortController()

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || ''
      const res = await fetch(`${backendUrl}/screen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_description: jobDescription,
          candidate_cv: candidateCv
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Request failed')
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let   buffer  = ''
      let   full    = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()

          if (payload === '[DONE]') {
            try {
              const clean  = full.replace(/```json|```/g, '').trim()
              const parsed = JSON.parse(clean)
              setResult(parsed)
              setStatus('done')
            } catch {
              setError('Failed to parse AI response. Please try again.')
              setStatus('error')
            }
            return
          }

          const msg = JSON.parse(payload)
          if (msg.error) { setError(msg.error); setStatus('error'); return }
          if (msg.token) {
            full += msg.token
            setRawTokens(prev => prev + msg.token)
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err.message)
      setStatus('error')
    }
  }, [])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    setStatus('idle')
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setStatus('idle')
    setResult(null)
    setRawTokens('')
    setError(null)
  }, [])

  return { status, result, rawTokens, error, screen, cancel, reset }
}