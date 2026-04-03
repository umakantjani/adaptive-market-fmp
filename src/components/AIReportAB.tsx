'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Sparkles, RefreshCw, Copy, Square, ThumbsUp, BookOpen, FlaskConical } from 'lucide-react'
import type { TAResult, TickerInfo } from '@/types/market'

interface Props {
  ticker: TickerInfo
  ta: TAResult
}

type Version = 'v1' | 'v2'

const VERSION_LABELS: Record<Version, { label: string; badge: string; description: string }> = {
  v1: {
    label: 'Report v1',
    badge: 'Classic',
    description: 'Comprehensive 9-section TA report',
  },
  v2: {
    label: 'Report v2',
    badge: 'Institutional BLUF',
    description: 'Precise 5-section actionable brief',
  },
}

const VOTE_KEY = 'ab_report_votes'

function loadVotes(): Record<Version, number> {
  if (typeof window === 'undefined') return { v1: 0, v2: 0 }
  try {
    const raw = localStorage.getItem(VOTE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { v1: 0, v2: 0 }
}

function saveVotes(votes: Record<Version, number>) {
  try { localStorage.setItem(VOTE_KEY, JSON.stringify(votes)) } catch {}
}

interface ReportPanelProps {
  version: Version
  ticker: TickerInfo
  ta: TAResult
  votes: Record<Version, number>
  userVote: Version | null
  onVote: (v: Version) => void
}

function ReportPanel({ version, ticker, ta, votes, userVote, onVote }: ReportPanelProps) {
  const [report, setReport] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const endpoint = version === 'v1' ? '/api/report' : '/api/report/v2'
  const meta = VERSION_LABELS[version]
  const totalVotes = votes.v1 + votes.v2
  const voteCount = votes[version]
  const votePct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0

  async function generateReport() {
    setLoading(true)
    setReport('')
    setError('')
    setSaved(false)
    abortRef.current = new AbortController()

    try {
      const { history: _history, ...taWithoutHistory } = ta

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, ta: taWithoutHistory, period: '1d' }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setReport((prev) => prev + decoder.decode(value, { stream: true }))
      }
      setSaved(true)
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  function stopGeneration() {
    abortRef.current?.abort()
    setLoading(false)
  }

  async function copyReport() {
    await navigator.clipboard.writeText(report)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isWinning = userVote !== null && totalVotes > 0 && voteCount === Math.max(votes.v1, votes.v2)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minWidth: 0 }}>
      {/* Version header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 18px',
        borderRadius: 8,
        background: version === 'v2'
          ? 'linear-gradient(135deg, rgba(103,80,164,0.12), rgba(103,80,164,0.04))'
          : 'var(--md-surface-container)',
        border: `1.5px solid ${version === 'v2' ? 'rgba(103,80,164,0.3)' : 'var(--md-outline-variant)'}`,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--md-on-surface)' }}>{meta.label}</span>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 8,
              background: version === 'v2' ? 'rgba(103,80,164,0.2)' : 'rgba(var(--md-primary-rgb, 103,80,164),0.1)',
              color: version === 'v2' ? '#B39DDB' : 'var(--md-primary)',
              letterSpacing: '0.02em',
            }}>{meta.badge}</span>
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--md-outline)' }}>{meta.description}</p>
        </div>

        {/* Vote badge */}
        {userVote !== null && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            padding: '6px 12px', borderRadius: 14,
            background: isWinning ? 'rgba(105,240,174,0.12)' : 'var(--md-surface-container-high)',
          }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: isWinning ? '#69F0AE' : 'var(--md-on-surface-variant)' }}>
              {votePct}%
            </span>
            <span style={{ fontSize: 10, color: 'var(--md-outline)', whiteSpace: 'nowrap' }}>
              {voteCount} vote{voteCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={generateReport}
          disabled={loading}
          className="md-ripple"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 8,
            background: 'var(--md-primary)', color: 'var(--md-on-primary)',
            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 500, opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? (
            <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</>
          ) : report ? (
            <><RefreshCw size={13} /> Regenerate</>
          ) : (
            <><Sparkles size={13} /> Generate</>
          )}
        </button>

        {loading && (
          <button onClick={stopGeneration} className="md-ripple"
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 8,
              background: 'var(--md-surface-container-high)', color: 'var(--md-on-surface-variant)',
              border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            }}>
            <Square size={12} /> Stop
          </button>
        )}

        {report && !loading && (
          <>
            <button onClick={copyReport} className="md-ripple"
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 8,
                background: 'var(--md-surface-container-high)',
                color: copied ? '#69F0AE' : 'var(--md-on-surface-variant)',
                border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              }}>
              <Copy size={12} /> {copied ? 'Copied!' : 'Copy'}
            </button>

            <button
              onClick={() => onVote(version)}
              disabled={userVote !== null}
              className="md-ripple"
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 8,
                background: userVote === version ? 'rgba(105,240,174,0.15)' : 'var(--md-surface-container-high)',
                color: userVote === version ? '#69F0AE' : 'var(--md-on-surface-variant)',
                border: userVote === version ? '1px solid rgba(105,240,174,0.4)' : '1px solid transparent',
                cursor: userVote !== null ? 'default' : 'pointer', fontSize: 13, fontWeight: 500,
              }}>
              <ThumbsUp size={12} /> {userVote === version ? 'Preferred' : 'Prefer this'}
            </button>
          </>
        )}

        {saved && (
          <a href="/reports" style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px',
            color: 'var(--md-primary)', fontSize: 13, fontWeight: 500, textDecoration: 'none',
          }}>
            <BookOpen size={12} /> Reports
          </a>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '14px 18px', borderRadius: 14, background: 'rgba(239,83,80,0.1)', color: '#EF5350', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Report */}
      {report && (
        <div style={{ background: 'var(--md-surface-container)', borderRadius: 10, padding: 20 }}>
          <div className="report-prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!report && !loading && (
        <div style={{
          background: 'var(--md-surface-container)', borderRadius: 10, padding: 32, textAlign: 'center', flex: 1,
        }}>
          <Sparkles size={24} style={{ color: 'var(--md-on-surface-variant)', opacity: 0.35, margin: '0 auto 10px', display: 'block' }} />
          <p style={{ fontSize: 13, color: 'var(--md-outline)', margin: 0 }}>
            {version === 'v1'
              ? 'Classic institutional TA report with 9 sections.'
              : 'BLUF-style report built for portfolio managers & traders.'}
          </p>
        </div>
      )}
    </div>
  )
}

export default function AIReportAB({ ticker, ta }: Props) {
  const [votes, setVotes] = useState<Record<Version, number>>({ v1: 0, v2: 0 })
  const [userVote, setUserVote] = useState<Version | null>(null)
  const [activeTab, setActiveTab] = useState<Version>('v1')

  useEffect(() => {
    const stored = loadVotes()
    setVotes(stored)
  }, [])

  function handleVote(version: Version) {
    if (userVote !== null) return
    const updated = { ...votes, [version]: votes[version] + 1 }
    setVotes(updated)
    setUserVote(version)
    saveVotes(updated)
  }

  const totalVotes = votes.v1 + votes.v2

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* A/B Banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 20px', borderRadius: 8,
        background: 'linear-gradient(135deg, rgba(103,80,164,0.08), rgba(var(--md-primary-rgb, 103,80,164),0.04))',
        border: '1px solid var(--md-outline-variant)',
      }}>
        <FlaskConical size={18} color="var(--md-primary)" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--md-on-surface)' }}>A/B Prompt Experiment</p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--md-outline)' }}>
            Generate both versions, then vote for the report you find more useful.
            {totalVotes > 0 && ` ${totalVotes} vote${totalVotes !== 1 ? 's' : ''} recorded.`}
          </p>
        </div>
        {userVote && (
          <div style={{ fontSize: 12, color: '#69F0AE', fontWeight: 600, whiteSpace: 'nowrap' }}>
            You preferred {VERSION_LABELS[userVote].label}
          </div>
        )}
      </div>

      {/* Vote bar */}
      {totalVotes > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--md-outline)' }}>
            <span>v1 — {Math.round((votes.v1 / totalVotes) * 100)}%</span>
            <span>v2 — {Math.round((votes.v2 / totalVotes) * 100)}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 4, background: 'var(--md-surface-container-high)', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.round((votes.v1 / totalVotes) * 100)}%`,
              background: 'var(--md-primary)',
              borderRadius: 4,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      )}

      {/* Mobile tab switcher — hidden on md+ */}
      <div className="md:hidden" style={{ display: 'flex', gap: 8 }}>
        {(['v1', 'v2'] as Version[]).map((v) => (
          <button key={v} onClick={() => setActiveTab(v)} className="md-ripple"
            style={{
              flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 13, fontWeight: 500,
              border: 'none', cursor: 'pointer',
              background: activeTab === v ? 'var(--md-primary)' : 'var(--md-surface-container)',
              color: activeTab === v ? 'var(--md-on-primary)' : 'var(--md-on-surface-variant)',
            }}>
            {VERSION_LABELS[v].label}
          </button>
        ))}
      </div>

      {/* Desktop: side by side | Mobile: single tab */}
      <div className="hidden md:flex" style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <ReportPanel version="v1" ticker={ticker} ta={ta} votes={votes} userVote={userVote} onVote={handleVote} />
        <div style={{ width: 1, background: 'var(--md-outline-variant)', alignSelf: 'stretch', flexShrink: 0 }} />
        <ReportPanel version="v2" ticker={ticker} ta={ta} votes={votes} userVote={userVote} onVote={handleVote} />
      </div>

      {/* Mobile: show active tab only */}
      <div className="md:hidden">
        <ReportPanel
          version={activeTab}
          ticker={ticker}
          ta={ta}
          votes={votes}
          userVote={userVote}
          onVote={handleVote}
        />
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (min-width: 768px) {
          .hidden { display: none !important; }
          .md\\:flex { display: flex !important; }
          .md\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  )
}
