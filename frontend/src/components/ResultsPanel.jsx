import React from 'react'
import ScoreRing from './ScoreRing.jsx'
import {
  CheckCircle2, XCircle, AlertCircle,
  MessageSquare, TrendingUp, BookOpen,
  Briefcase, Star, AlertTriangle,
  ThumbsUp, ThumbsDown, Minus
} from 'lucide-react'

// ── Skill Pill ──
function Pill({ text, type }) {
  const styles = {
    match:   { bg: 'rgba(74,222,128,0.1)',  color: '#4ade80', border: 'rgba(74,222,128,0.2)'  },
    miss:    { bg: 'rgba(248,113,113,0.1)', color: '#f87171', border: 'rgba(248,113,113,0.2)' },
    partial: { bg: 'rgba(251,191,36,0.1)',  color: '#fbbf24', border: 'rgba(251,191,36,0.2)'  },
  }
  const s = styles[type]
  return (
    <span style={{
      fontSize: 12, padding: '3px 10px', borderRadius: 20,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`
    }}>
      {text}
    </span>
  )
}

// ── Insight Icon ──
function InsightIcon({ type }) {
  if (type === 'positive') return <CheckCircle2 size={15} color="#4ade80" style={{ flexShrink: 0, marginTop: 2 }} />
  if (type === 'negative') return <XCircle      size={15} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />
  return <AlertCircle size={15} color="#fbbf24" style={{ flexShrink: 0, marginTop: 2 }} />
}

// ── Score Bar ──
function Bar({ val }) {
  return (
    <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${val}%`,
        background: 'var(--accent)', borderRadius: 2,
        transition: 'width 0.8s ease'
      }} />
    </div>
  )
}

// ── Section Wrapper ──
function Section({ icon, label, children }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: '0.75rem' }}>
        {icon}
        <span style={{
          fontSize: 11, fontWeight: 600,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--text-muted)'
        }}>
          {label}
        </span>
      </div>
      {children}
    </div>
  )
}

// ── Recommendation Style ──
function getRecStyle(r) {
  if (r === 'Shortlist') return { color: '#4ade80', bg: 'rgba(74,222,128,0.1)',  icon: <ThumbsUp  size={14} /> }
  if (r === 'Reject')    return { color: '#f87171', bg: 'rgba(248,113,113,0.1)', icon: <ThumbsDown size={14} /> }
  return { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', icon: <Minus size={14} /> }
}

// ── Main Export ──
export default function ResultsPanel({ result }) {
  if (!result) return null

  const rec = getRecStyle(result.recommendation)

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>

      {/* ── Score Header ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', gap: '1.5rem',
        marginBottom: '1.5rem', padding: '1.25rem',
        background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)'
      }}>
        <ScoreRing score={result.overall_score} verdict={result.verdict} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>
              {result.candidate_name}
            </span>
            <span style={{
              fontSize: 12, padding: '2px 10px', borderRadius: 20,
              background: rec.bg, color: rec.color,
              display: 'flex', alignItems: 'center', gap: 5
            }}>
              {rec.icon} {result.recommendation}
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>
            {result.verdict_summary}
          </p>
          {result.years_experience && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Briefcase size={12} />
              {result.years_experience} experience
            </span>
          )}
        </div>
      </div>

      {/* ── Score Breakdown ── */}
      <Section icon={<TrendingUp size={14} color="var(--text-muted)" />} label="Score Breakdown">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {[
            ['Skills',     result.breakdown?.skills_score],
            ['Experience', result.breakdown?.experience_score],
            ['Education',  result.breakdown?.education_score],
          ].map(([label, val]) => (
            <div key={label} style={{
              background: 'var(--bg-card)', padding: '10px 12px',
              borderRadius: 'var(--radius)', border: '1px solid var(--border)'
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>{val}%</div>
              <Bar val={val} />
            </div>
          ))}
        </div>
      </Section>

      {/* ── Skills Analysis ── */}
      <Section icon={<Star size={14} color="var(--text-muted)" />} label="Skills Analysis">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {result.matched_skills?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Matched ✅</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {result.matched_skills.map((s, i) => <Pill key={i} text={s} type="match" />)}
              </div>
            </div>
          )}
          {result.partial_skills?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Partial ⚠️</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {result.partial_skills.map((s, i) => <Pill key={i} text={s} type="partial" />)}
              </div>
            </div>
          )}
          {result.missing_skills?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Missing ❌</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {result.missing_skills.map((s, i) => <Pill key={i} text={s} type="miss" />)}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* ── Key Insights ── */}
      {result.key_insights?.length > 0 && (
        <Section icon={<BookOpen size={14} color="var(--text-muted)" />} label="Key Insights">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {result.key_insights.map((ins, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '8px 12px', background: 'var(--bg-card)',
                borderRadius: 'var(--radius)', border: '1px solid var(--border)'
              }}>
                <InsightIcon type={ins.type} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {ins.text}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Red Flags ── */}
      {result.red_flags?.filter(Boolean).length > 0 && (
        <Section icon={<AlertTriangle size={14} color="#f87171" />} label="Red Flags">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {result.red_flags.filter(Boolean).map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '8px 12px',
                background: 'rgba(248,113,113,0.06)',
                borderRadius: 'var(--radius)',
                border: '1px solid rgba(248,113,113,0.15)'
              }}>
                <XCircle size={14} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 13, color: '#f87171', lineHeight: 1.5 }}>{f}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Interview Questions ── */}
      {result.interview_questions?.length > 0 && (
        <Section icon={<MessageSquare size={14} color="var(--text-muted)" />} label="Suggested Interview Questions">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {result.interview_questions.map((q, i) => (
              <div key={i} style={{
                display: 'flex', gap: 12, padding: '10px 14px',
                background: 'var(--bg-card)', borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                borderLeft: '3px solid rgba(200,240,96,0.4)'
              }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', opacity: 0.6, minWidth: 18 }}>
                  Q{i + 1}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  {q}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

    </div>
  )
}