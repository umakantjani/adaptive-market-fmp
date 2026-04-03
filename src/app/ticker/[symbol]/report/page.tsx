'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, History, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import AIReportAB from '@/components/AIReportAB'
import { MenuButton } from '@/components/Sidebar'
import type { FullTickerData } from '@/types/market'

interface HistoricalReport {
  id: number
  generatedAt: string
  period: string
  excerpt: string
  modelUsed: string
  likes: number
}

export default function TickerReportPage() {
  const params = useParams()
  const router = useRouter()
  const symbol = (params.symbol as string).toUpperCase()
  const [data, setData] = useState<FullTickerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<HistoricalReport[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/ticker/${symbol}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .catch(() => setError('Network error. Please try again.'))
      .finally(() => setLoading(false))
  }, [symbol])

  function toggleHistory() {
    if (!showHistory && history.length === 0) {
      setHistoryLoading(true)
      fetch(`/api/reports?symbol=${symbol}&limit=20`)
        .then(r => r.json())
        .then(d => setHistory(d.reports || []))
        .catch(() => {})
        .finally(() => setHistoryLoading(false))
    }
    setShowHistory(v => !v)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--md-background)' }}>

      {/* Mobile header */}
      <header className="md:hidden" style={{
        position: 'sticky', top: 0, zIndex: 30,
        height: 52, padding: '0 8px 0 4px',
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--md-surface)',
        borderBottom: '1px solid var(--md-outline-variant)',
      }}>
        <MenuButton />
        <button onClick={() => router.back()} className="md-ripple"
          style={{ padding: 8, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={20} color="var(--md-on-surface-variant)" />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 16, fontWeight: 600, color: 'var(--md-on-surface)', margin: 0 }}>AI Report</h1>
          {data && <p style={{ fontSize: 11, color: 'var(--md-on-surface-variant)', margin: 0 }}>{symbol} · {data.ticker.name}</p>}
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px 40px' }}>

        {/* Desktop page title row */}
        <div className="hidden md:flex" style={{ alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 14, fontWeight: 700, color: 'var(--md-on-surface)', margin: '0 0 2px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              AI Report — {symbol}
            </h1>
            {data && <p style={{ fontSize: 12, color: 'var(--md-on-surface-variant)', margin: 0 }}>{data.ticker.name}</p>}
          </div>

          {/* Historical Reports button */}
          <button
            onClick={toggleHistory}
            className="md-ripple"
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '7px 14px', borderRadius: 6,
              background: showHistory ? 'var(--md-surface-container)' : 'transparent',
              border: '1px solid var(--md-outline-variant)',
              cursor: 'pointer', fontSize: 12, fontWeight: 600,
              color: showHistory ? 'var(--md-on-surface)' : 'var(--md-on-surface-variant)',
            }}
          >
            <History size={13} />
            Historical Reports
            {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>

        {/* Historical Reports panel */}
        {showHistory && (
          <div style={{
            background: 'var(--md-surface-container)',
            border: '1px solid var(--md-outline-variant)',
            borderRadius: 10, marginBottom: 20, overflow: 'hidden',
          }}>
            <div style={{
              padding: '10px 16px',
              borderBottom: '1px solid var(--md-outline-variant)',
              fontSize: 11, fontWeight: 700, color: 'var(--md-on-surface-variant)',
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              Past reports for {symbol}
            </div>

            {historyLoading && (
              <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 12, color: 'var(--md-outline)' }}>
                Loading…
              </div>
            )}

            {!historyLoading && history.length === 0 && (
              <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 12, color: 'var(--md-outline)' }}>
                No historical reports for {symbol} yet.
              </div>
            )}

            {!historyLoading && history.map((r, i) => (
              <div
                key={r.id}
                style={{
                  padding: '12px 16px',
                  borderBottom: i < history.length - 1 ? '1px solid var(--md-outline-variant)' : 'none',
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  cursor: 'pointer',
                }}
                onClick={() => router.push(`/reports/${r.id}`)}
                className="md-ripple"
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                      background: r.modelUsed.includes('v2') ? 'rgba(103,80,164,0.2)' : 'rgba(77,187,255,0.12)',
                      color: r.modelUsed.includes('v2') ? '#B39DDB' : 'var(--md-primary)',
                      letterSpacing: '0.04em', textTransform: 'uppercase',
                    }}>
                      {r.modelUsed.includes('v2') ? 'v2 · BLUF' : 'v1 · Classic'}
                    </span>
                    <time style={{ fontSize: 11, color: 'var(--md-outline)' }}>
                      {new Date(r.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </time>
                  </div>
                  <p style={{
                    fontSize: 12, color: 'var(--md-on-surface-variant)', lineHeight: 1.5, margin: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {r.excerpt}
                  </p>
                </div>
                <ExternalLink size={13} color="var(--md-outline)" style={{ flexShrink: 0, marginTop: 2 }} />
              </div>
            ))}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[52, 380, 180].map((h, i) => (
              <div key={i} className="animate-pulse"
                style={{ height: h, borderRadius: 10, background: 'var(--md-surface-container)' }} />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(239,83,80,0.1)', color: '#EF5350', fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Mobile: historical reports toggle */}
        {data && (
          <div className="md:hidden" style={{ marginBottom: 16 }}>
            <button onClick={toggleHistory} className="md-ripple"
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '7px 14px', borderRadius: 6,
                background: 'transparent', border: '1px solid var(--md-outline-variant)',
                cursor: 'pointer', fontSize: 12, fontWeight: 600,
                color: 'var(--md-on-surface-variant)',
              }}>
              <History size={13} />
              Historical Reports
              {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
        )}

        {/* Report */}
        {data && <AIReportAB ticker={data.ticker} ta={data.ta} />}
      </main>
    </div>
  )
}
