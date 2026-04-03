'use client'

import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Sparkles, RefreshCw, Copy, Square, BookOpen } from 'lucide-react'
import type { TAResult, TickerInfo } from '@/types/market'

interface Props {
  ticker: TickerInfo
  ta: TAResult
}

export default function AIReport({ ticker, ta }: Props) {
  const [report, setReport] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  async function generateReport() {
    setLoading(true)
    setReport('')
    setError('')
    setSaved(false)
    abortRef.current = new AbortController()

    try {
      const { history: _history, ...taWithoutHistory } = ta

      const res = await fetch('/api/report', {
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={generateReport}
          disabled={loading}
          className="md-ripple"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 24px',
            borderRadius: 20,
            background: 'var(--md-primary)',
            color: 'var(--md-on-primary)',
            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: 14, fontWeight: 500,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? (
            <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</>
          ) : report ? (
            <><RefreshCw size={14} /> Regenerate</>
          ) : (
            <><Sparkles size={14} /> Generate AI Report</>
          )}
        </button>

        {loading && (
          <button onClick={stopGeneration} className="md-ripple"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 16px',
              borderRadius: 20,
              background: 'var(--md-surface-container-high)',
              color: 'var(--md-on-surface-variant)',
              border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500,
            }}>
            <Square size={13} /> Stop
          </button>
        )}

        {report && !loading && (
          <button onClick={copyReport} className="md-ripple"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 16px',
              borderRadius: 20,
              background: 'var(--md-surface-container-high)',
              color: copied ? '#69F0AE' : 'var(--md-on-surface-variant)',
              border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500,
            }}>
            <Copy size={13} /> {copied ? 'Copied!' : 'Copy'}
          </button>
        )}

        {saved && (
          <a href="/reports"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 16px',
              color: 'var(--md-primary)',
              fontSize: 14, fontWeight: 500,
              textDecoration: 'none',
            }}>
            <BookOpen size={13} /> View all reports
          </a>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '16px 20px', borderRadius: 16, background: 'rgba(239,83,80,0.1)', color: '#EF5350', fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Report content */}
      {report && (
        <div style={{ background: 'var(--md-surface-container)', borderRadius: 28, padding: 24 }}>
          <div className="report-prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!report && !loading && (
        <div style={{ background: 'var(--md-surface-container)', borderRadius: 28, padding: 40, textAlign: 'center' }}>
          <Sparkles size={28} style={{ color: 'var(--md-on-surface-variant)', opacity: 0.4, margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontSize: 14, color: 'var(--md-outline)', margin: 0 }}>
            Generate an institutional-grade technical analysis report powered by Claude AI.
          </p>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
