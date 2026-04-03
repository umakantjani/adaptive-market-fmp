'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Download, Sparkles, TrendingUp, BarChart2, RefreshCw } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { McapPoint, EventPoint } from '@/components/charts/MarketCapChart'

const MarketCapChart = dynamic(() => import('@/components/charts/MarketCapChart'), { ssr: false })

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (!n || !isFinite(n)) return '—'
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`
  return `$${(n / 1e6).toFixed(0)}M`
}

function pct(a: number, b: number): string {
  if (!a || !b) return '—'
  const p = ((b - a) / a) * 100
  return `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`
}

function cagr(start: number, end: number, years: number): string {
  if (!start || !end || years <= 0) return '—'
  const r = (end / start) ** (1 / years) - 1
  return `${r >= 0 ? '+' : ''}${(r * 100).toFixed(1)}%`
}

function cagrColor(s: string): string {
  if (s.startsWith('+')) return '#69F0AE'
  if (s.startsWith('-')) return '#CF6679'
  return 'var(--md-on-surface-variant)'
}

type Range = '1Y' | '3Y' | '5Y' | '10Y' | 'MAX'

// Max data points to send to Recharts per range
const RANGE_MAX_PTS: Record<Range, number> = {
  '1Y': 260,   // daily — ~252 trading days, keep all
  '3Y': 180,   // ~weekly
  '5Y': 260,   // ~weekly
  '10Y': 130,  // ~monthly
  'MAX': 400,  // sampled
}

function downsample(data: McapPoint[], maxPts: number): McapPoint[] {
  if (data.length <= maxPts) return data
  const step = Math.ceil(data.length / maxPts)
  const result: McapPoint[] = []
  for (let i = 0; i < data.length; i += step) result.push(data[i])
  // Always include the last point
  if (result[result.length - 1] !== data[data.length - 1]) result.push(data[data.length - 1])
  return result
}

function filterByRange(data: McapPoint[], range: Range): McapPoint[] {
  let filtered = data
  if (range !== 'MAX') {
    const years = { '1Y': 1, '3Y': 3, '5Y': 5, '10Y': 10 }[range]
    const cutoff = new Date()
    cutoff.setFullYear(cutoff.getFullYear() - years)
    const cutStr = cutoff.toISOString().slice(0, 10)
    filtered = data.filter(d => d.date >= cutStr)
  }
  return downsample(filtered, RANGE_MAX_PTS[range])
}

function downloadCSV(symbol: string, data: McapPoint[]) {
  const rows = ['Date,Market Cap (USD),Market Cap ($B),Day Change (%)']
  data.forEach((d, i) => {
    const prev = i > 0 ? data[i - 1].marketCap : d.marketCap
    const dayChg = prev > 0 ? (((d.marketCap - prev) / prev) * 100).toFixed(2) : '0.00'
    rows.push(`${d.date},${d.marketCap},${(d.marketCap / 1e9).toFixed(2)},${dayChg}`)
  })
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${symbol}_MarketCap.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MarketCapPage() {
  const { symbol: rawSymbol } = useParams<{ symbol: string }>()
  const symbol = rawSymbol.toUpperCase()
  const router = useRouter()

  const [allData, setAllData]       = useState<McapPoint[]>([])
  const [sp500Data, setSp500Data]   = useState<McapPoint[]>([])
  const [events, setEvents]         = useState<EventPoint[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [range, setRange]           = useState<Range>('MAX')
  const [logScale, setLogScale]     = useState(true)
  const [showSp500, setShowSp500]   = useState(false)
  const [sp500Loading, setSp500Loading] = useState(false)
  const [summary, setSummary]       = useState('')
  const [summaryLoading, setSummaryLoading] = useState(false)
  const summaryRef = useRef<AbortController | null>(null)

  // Fetch market cap history and events in parallel
  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/marketcap/${symbol}`).then(r => r.json()),
      fetch(`/api/events/${symbol}`).then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([mcap, evts]) => {
      if (mcap.error) setError(mcap.error)
      else setAllData(mcap.data ?? [])
      setEvents(evts.data ?? [])
    })
      .catch(() => setError('Failed to load market cap data'))
      .finally(() => setLoading(false))
  }, [symbol])

  // Fetch S&P 500 aggregate when toggled on
  useEffect(() => {
    if (!showSp500 || sp500Data.length > 0) return
    setSp500Loading(true)
    fetch('/api/marketcap/sp500')
      .then(r => r.json())
      .then(d => setSp500Data(d.data ?? []))
      .catch(() => {})
      .finally(() => setSp500Loading(false))
  }, [showSp500, sp500Data.length])

  const generateSummary = useCallback(async () => {
    summaryRef.current?.abort()
    const ctrl = new AbortController()
    summaryRef.current = ctrl
    setSummary('')
    setSummaryLoading(true)

    try {
      const res = await fetch(`/api/marketcap/${symbol}/summary`, { signal: ctrl.signal })
      if (!res.body) return
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setSummary(prev => prev + dec.decode(value))
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setSummary('Failed to generate summary.')
    } finally {
      setSummaryLoading(false)
    }
  }, [symbol])

  const filtered = filterByRange(allData, range)
  const filteredEvents = filtered.length > 0
    ? events.filter(e => e.date >= filtered[0].date && e.date <= filtered[filtered.length - 1].date)
    : []
  const current  = filtered[filtered.length - 1]
  const start    = filtered[0]
  const ath      = allData.length > 0 ? allData.reduce((m, d) => d.marketCap > m.marketCap ? d : m, allData[0]) : null

  const now = new Date()
  const ago = (y: number) => new Date(now.getFullYear() - y, now.getMonth(), now.getDate()).toISOString().slice(0, 10)
  const atYr  = (y: number) => allData.find(d => d.date >= ago(y))
  const pChange = start && current ? pct(start.marketCap, current.marketCap) : '—'

  const metrics = [
    { label: '1Y CAGR',    value: atYr(1)  ? cagr(atYr(1)!.marketCap, current?.marketCap ?? 0, 1)  : '—' },
    { label: '3Y CAGR',    value: atYr(3)  ? cagr(atYr(3)!.marketCap, current?.marketCap ?? 0, 3)  : '—' },
    { label: '5Y CAGR',    value: atYr(5)  ? cagr(atYr(5)!.marketCap, current?.marketCap ?? 0, 5)  : '—' },
    { label: '10Y CAGR',   value: atYr(10) ? cagr(atYr(10)!.marketCap, current?.marketCap ?? 0, 10) : '—' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--md-background)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        height: 56, padding: '0 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--md-surface)',
        borderBottom: '1px solid var(--md-outline-variant)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} className="md-ripple"
            style={{ padding: 8, borderRadius: 50, background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <ArrowLeft size={20} color="var(--md-on-surface)" />
          </button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--md-on-surface)', lineHeight: 1.2 }}>
              {symbol} — Market Cap
            </div>
            {current && (
              <div style={{ fontSize: 12, color: 'var(--md-on-surface-variant)' }}>
                {fmt(current.marketCap)} · {current.date}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => allData.length > 0 && downloadCSV(symbol, filtered)}
          disabled={allData.length === 0}
          className="md-ripple"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 8,
            background: 'var(--md-surface-container)',
            border: 'none', cursor: allData.length > 0 ? 'pointer' : 'not-allowed',
            fontSize: 13, fontWeight: 500, color: '#69F0AE',
            opacity: allData.length > 0 ? 1 : 0.4,
          }}>
          <Download size={14} /> Download CSV
        </button>
      </header>

      <main style={{ flex: 1, padding: '20px 16px', maxWidth: 960, margin: '0 auto', width: '100%' }}>

        {/* Error */}
        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(239,83,80,0.1)', color: '#EF5350', fontSize: 14, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Top metrics strip */}
        {!loading && allData.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Current Market Cap', value: fmt(current?.marketCap ?? 0), sub: current?.date },
              { label: 'All-Time High',       value: fmt(ath?.marketCap ?? 0),     sub: ath?.date, color: '#FFD740' },
              { label: `${range} Change`,     value: pChange,                       color: pChange.startsWith('+') ? '#69F0AE' : '#CF6679' },
              { label: 'Data Points',         value: filtered.length.toLocaleString(), sub: `${allData[0]?.date.slice(0, 7)} – now` },
            ].map(m => (
              <div key={m.label} style={{
                padding: '14px 16px', borderRadius: 12,
                background: 'var(--md-surface-container)',
              }}>
                <div style={{ fontSize: 11, color: 'var(--md-on-surface-variant)', marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: m.color ?? 'var(--md-on-surface)', fontVariantNumeric: 'tabular-nums' }}>
                  {m.value}
                </div>
                {m.sub && <div style={{ fontSize: 11, color: 'var(--md-on-surface-variant)', marginTop: 2 }}>{m.sub}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Chart card */}
        <div style={{ borderRadius: 16, background: 'var(--md-surface-container)', padding: '16px', marginBottom: 16 }}>

          {/* Controls row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>

            {/* Range tabs */}
            <div style={{ display: 'flex', gap: 4 }}>
              {(['1Y', '3Y', '5Y', '10Y', 'MAX'] as Range[]).map(r => (
                <button key={r} onClick={() => setRange(r)} className="md-ripple"
                  style={{
                    padding: '5px 12px', borderRadius: 20,
                    background: range === r ? 'var(--md-primary)' : 'var(--md-surface-container-high)',
                    color: range === r ? '#000' : 'var(--md-on-surface-variant)',
                    border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  }}>{r}</button>
              ))}
            </div>

            {/* Toggles */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setLogScale(l => !l)} className="md-ripple"
                style={{
                  padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 500,
                  background: logScale ? '#FFD74022' : 'var(--md-surface-container-high)',
                  color: logScale ? '#FFD740' : 'var(--md-on-surface-variant)',
                  opacity: showSp500 ? 0.4 : 1,
                }}
                disabled={showSp500}
              >
                <BarChart2 size={12} style={{ display: 'inline', marginRight: 4 }} />
                {logScale ? 'Log' : 'Linear'}
              </button>

              <button onClick={() => setShowSp500(s => !s)} className="md-ripple"
                style={{
                  padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 500,
                  background: showSp500 ? '#69F0AE22' : 'var(--md-surface-container-high)',
                  color: showSp500 ? '#69F0AE' : 'var(--md-on-surface-variant)',
                }}>
                <TrendingUp size={12} style={{ display: 'inline', marginRight: 4 }} />
                vs S&P 500
              </button>
            </div>
          </div>

          {/* Chart */}
          {loading ? (
            <div style={{ height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--md-outline-variant)', borderTopColor: 'var(--md-primary)', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : sp500Loading && showSp500 ? (
            <div style={{ height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--md-on-surface-variant)', fontSize: 14 }}>
              Loading S&P 500 data…
            </div>
          ) : (
            <MarketCapChart
              data={filtered}
              sp500Data={sp500Data}
              showSp500={showSp500}
              logScale={logScale && !showSp500}
              events={filteredEvents}
            />
          )}

          {showSp500 && (
            <p style={{ fontSize: 11, color: 'var(--md-on-surface-variant)', textAlign: 'center', marginTop: 8 }}>
              Both series indexed to 100 at the start of the selected period. S&P 500 shown as aggregate market cap of current constituents.
            </p>
          )}
        </div>

        {/* CAGR metrics */}
        {!loading && allData.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
            {metrics.map(m => (
              <div key={m.label} style={{
                padding: '14px 16px', borderRadius: 12,
                background: 'var(--md-surface-container)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 11, color: 'var(--md-on-surface-variant)', marginBottom: 6 }}>{m.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: cagrColor(m.value), fontVariantNumeric: 'tabular-nums' }}>
                  {m.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI Summary */}
        <div style={{ borderRadius: 16, background: 'var(--md-surface-container)', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} color="var(--md-primary)" />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--md-on-surface)' }}>AI Summary</span>
            </div>
            <button
              onClick={generateSummary}
              disabled={summaryLoading || loading || allData.length === 0}
              className="md-ripple"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8,
                background: summaryLoading ? 'var(--md-surface-container-high)' : 'var(--md-primary)',
                color: summaryLoading ? 'var(--md-on-surface-variant)' : '#000',
                border: 'none', cursor: (summaryLoading || loading || allData.length === 0) ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 500,
                opacity: (loading || allData.length === 0) ? 0.4 : 1,
              }}>
              {summaryLoading
                ? <><RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Generating…</>
                : <><Sparkles size={13} /> {summary ? 'Regenerate' : 'Generate Summary'}</>
              }
            </button>
          </div>

          {summary ? (
            <p style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--md-on-surface)', margin: 0 }}>
              {summary}
            </p>
          ) : (
            <p style={{ fontSize: 14, color: 'var(--md-on-surface-variant)', margin: 0, fontStyle: 'italic' }}>
              Click &ldquo;Generate Summary&rdquo; to get a Claude-powered narrative of {symbol}&apos;s market cap trajectory — including growth rate, key milestones, and what it implies for long-term value creation.
            </p>
          )}
        </div>

      </main>
    </div>
  )
}
