'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { ArrowLeft, Download, BarChart2, Grid3x3 } from 'lucide-react'
import { MenuButton } from '@/components/Sidebar'

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuarterMeta { label: string; date: string }

interface Company {
  symbol: string
  name: string
  rank: number
  currentMarketCap: number
  values: number[]
}

interface QuarterlyData {
  quarters: QuarterMeta[]
  companies: Company[]
  sp500Total: number[]
  sp500Coverage: number[]
  constituentCount: number
}

type QRange = '5Q' | '8Q' | '12Q' | 'All'
type ViewMode = 'bar' | 'heatmap'

// ── Colors ────────────────────────────────────────────────────────────────────

const COLORS = [
  '#7CB9F4', '#69F0AE', '#FFD740', '#FF9800', '#CF6679',
  '#BB86FC', '#03DAC6', '#F48FB1', '#80DEEA', '#A5D6A7', '#FFE082',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (!n) return '—'
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`
  return `$${(n / 1e6).toFixed(0)}M`
}

function fmtShort(n: number): string {
  if (!n) return '—'
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(0)}B`
  return `$${(n / 1e6).toFixed(0)}M`
}

function heatColor(pct: number | null): string {
  if (pct === null) return 'rgba(43,41,48,0.4)'
  const clamped = Math.max(-30, Math.min(30, pct))
  if (clamped >= 0) {
    const t = clamped / 30
    return `rgba(0, 230, 118, ${0.08 + t * 0.72})`
  } else {
    const t = -clamped / 30
    return `rgba(207, 102, 121, ${0.08 + t * 0.72})`
  }
}

function heatTextColor(pct: number | null): string {
  if (pct === null) return 'var(--md-on-surface-variant)'
  return Math.abs(pct) > 10 ? '#fff' : 'var(--md-on-surface)'
}

function downloadChartCSV(data: QuarterlyData) {
  const { quarters, companies, sp500Total, sp500Coverage } = data
  const headers = ['Quarter', 'Date', ...companies.map(c => `${c.symbol} ($)`), 'Top-10 Sum ($)', 'S&P 500 Total ($)', 'S&P 500 Coverage']
  const rows = quarters.map((q, i) => {
    const vals = companies.map(c => c.values[i] ?? '')
    const top10Sum = companies.reduce((s, c) => s + (c.values[i] ?? 0), 0)
    return [q.label, q.date, ...vals, top10Sum, sp500Total[i] ?? '', sp500Coverage[i] ?? ''].join(',')
  })
  download([headers.join(','), ...rows].join('\n'), `SP500_Quarterly_ChartData_${new Date().toISOString().slice(0, 10)}.csv`)
}

function download(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ── Heatmap ───────────────────────────────────────────────────────────────────

function Heatmap({ data }: { data: QuarterlyData }) {
  const { quarters, companies } = data

  // Compute QoQ % changes
  const rows = companies.map(c => ({
    ...c,
    changes: c.values.map((v, i) => {
      if (i === 0 || !c.values[i - 1]) return null
      return ((v - c.values[i - 1]) / c.values[i - 1]) * 100
    }),
  }))

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 480 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: 'var(--md-on-surface-variant)', fontWeight: 600, whiteSpace: 'nowrap' }}>
              Company
            </th>
            {quarters.map(q => (
              <th key={q.label} style={{ textAlign: 'center', padding: '8px 10px', fontSize: 11, color: 'var(--md-on-surface-variant)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {q.label.replace(' ', '\u00A0')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((c, ri) => (
            <tr key={c.symbol}>
              <td style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, color: 'var(--md-on-surface)', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: COLORS[ri], marginRight: 6, flexShrink: 0 }} />
                {c.symbol}
                <span style={{ fontSize: 10, color: 'var(--md-on-surface-variant)', marginLeft: 4 }}>#{c.rank}</span>
              </td>
              {c.values.map((v, qi) => {
                const pct = c.changes[qi]
                return (
                  <td key={qi} style={{
                    padding: '6px 10px',
                    textAlign: 'center',
                    background: heatColor(pct),
                    borderRadius: 4,
                    minWidth: 90,
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: heatTextColor(pct) }}>
                      {fmtShort(v)}
                    </div>
                    {pct !== null && (
                      <div style={{ fontSize: 10, color: heatTextColor(pct), opacity: 0.85 }}>
                        {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
                      </div>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
          {/* S&P 500 total row */}
          <tr style={{ borderTop: '1px solid var(--md-outline-variant)', marginTop: 8 }}>
            <td style={{ padding: '8px 12px', fontSize: 11, color: 'var(--md-on-surface-variant)', fontWeight: 700, whiteSpace: 'nowrap' }}>
              S&P 500 Total*
            </td>
            {data.sp500Total.map((v, qi) => {
              const prev = data.sp500Total[qi - 1]
              const pct = prev ? ((v - prev) / prev) * 100 : null
              return (
                <td key={qi} style={{
                  padding: '6px 10px', textAlign: 'center',
                  background: heatColor(pct), borderRadius: 4,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: heatTextColor(pct) }}>
                    {fmtShort(v)}
                  </div>
                  {pct !== null && (
                    <div style={{ fontSize: 10, color: heatTextColor(pct), opacity: 0.85 }}>
                      {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
                    </div>
                  )}
                </td>
              )
            })}
          </tr>
        </tbody>
      </table>
      <p style={{ fontSize: 10, color: 'var(--md-on-surface-variant)', marginTop: 8 }}>
        * S&P 500 total covers {data.sp500Coverage[data.sp500Coverage.length - 1] ?? 0} of {data.constituentCount} constituents with historical data. Cell color = quarter-over-quarter % change.
      </p>
    </div>
  )
}

// ── Bar Chart ─────────────────────────────────────────────────────────────────

const tooltipStyle = { background: '#2B2930', border: 'none', borderRadius: 12, fontSize: 12 }

function BarChartView({ data }: { data: QuarterlyData }) {
  const { quarters, companies } = data

  const chartData = quarters.map((q, i) => {
    const point: Record<string, number | string> = { quarter: q.label.replace(' ', '\u00A0') }
    for (const c of companies) {
      point[c.symbol] = c.values[i] ?? 0
    }
    return point
  })

  return (
    <div style={{ height: 420 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 16, bottom: 0, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#222029" />
          <XAxis dataKey="quarter" tick={{ fontSize: 10, fill: '#938F99' }} />
          <YAxis
            tick={{ fontSize: 10, fill: '#938F99' }}
            tickFormatter={v => v >= 1e12 ? `$${(v / 1e12).toFixed(1)}T` : `$${(v / 1e9).toFixed(0)}B`}
            width={64}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ color: '#938F99' }}
            formatter={(value, name) => [fmt(typeof value === 'number' ? value : 0), name as string]}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: '#CAC4D0' }} />
          {companies.map((c, i) => (
            <Bar
              key={c.symbol}
              dataKey={c.symbol}
              stackId="a"
              fill={COLORS[i]}
              name={c.symbol}
              isAnimationActive={false}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const RANGE_MAP: Record<QRange, number | 'all'> = { '5Q': 5, '8Q': 8, '12Q': 12, 'All': 'all' }

export default function Sp500QuarterlyPage() {
  const router = useRouter()
  const [qRange, setQRange]       = useState<QRange>('8Q')
  const [view, setView]           = useState<ViewMode>('heatmap')
  const [data, setData]           = useState<QuarterlyData | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [rawLoading, setRawLoading] = useState(false)

  const load = useCallback((range: QRange) => {
    setLoading(true)
    setError('')
    const q = RANGE_MAP[range]
    fetch(`/api/marketcap/sp500-quarterly?quarters=${q}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setData(d)
      })
      .catch(() => setError('Failed to load quarterly data'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(qRange) }, [load, qRange])

  async function downloadRaw() {
    if (!data) return
    setRawLoading(true)
    try {
      const symbols = data.companies.map(c => c.symbol).join(',')
      const res = await fetch(`/api/marketcap/sp500-quarterly/raw?symbols=${symbols}`)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `SP500_Top10_RAW_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* ignore */ } finally {
      setRawLoading(false)
    }
  }

  // Stats
  const latestQ = data?.quarters[data.quarters.length - 1]
  const latestTotals = data?.companies.reduce((s, c) => s + (c.values[c.values.length - 1] ?? 0), 0) ?? 0
  const latestSp500  = data?.sp500Total[data.sp500Total.length - 1] ?? 0
  const concentration = latestSp500 > 0 ? (latestTotals / latestSp500) * 100 : 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--md-background)' }}>

      {/* Mobile header */}
      <header className="md:hidden" style={{
        position: 'sticky', top: 0, zIndex: 40,
        height: 56, padding: '0 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'var(--md-surface)',
        borderBottom: '1px solid var(--md-outline-variant)',
      }}>
        <MenuButton />
        <button onClick={() => router.back()} style={{ padding: 4, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={20} color="var(--md-on-surface-variant)" />
        </button>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--md-on-surface)' }}>S&amp;P 500 Quarterly</span>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px 40px' }}>

        {/* Title */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <button onClick={() => router.back()} className="hidden md:flex md-ripple"
              style={{ padding: 6, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <ArrowLeft size={18} color="var(--md-on-surface-variant)" />
            </button>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--md-on-surface)' }}>
              S&amp;P 500 Quarterly Market Cap
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--md-on-surface-variant)', marginLeft: 42 }}>
            Top 10 components by market cap · {latestQ?.label ?? '…'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(239,83,80,0.1)', color: '#EF5350', fontSize: 14, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Stats strip */}
        {data && !loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Top-10 Sum', value: fmt(latestTotals), sub: latestQ?.date },
              { label: 'S&P 500 Total*', value: fmt(latestSp500), sub: `${data.sp500Coverage[data.sp500Coverage.length - 1]} / ${data.constituentCount} cos.` },
              { label: 'Concentration', value: latestSp500 > 0 ? `${concentration.toFixed(1)}%` : '—', sub: 'Top-10 % of S&P 500', color: '#FFD740' },
              { label: 'Companies Shown', value: String(data.companies.length), sub: 'includes GOOGL+GOOG if applicable' },
            ].map(m => (
              <div key={m.label} style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--md-surface-container)' }}>
                <div style={{ fontSize: 11, color: 'var(--md-on-surface-variant)', marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: m.color ?? 'var(--md-on-surface)', fontVariantNumeric: 'tabular-nums' }}>{m.value}</div>
                {m.sub && <div style={{ fontSize: 10, color: 'var(--md-on-surface-variant)', marginTop: 2 }}>{m.sub}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Chart card */}
        <div style={{ borderRadius: 16, background: 'var(--md-surface-container)', padding: '16px', marginBottom: 16 }}>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>

            {/* Quarter range */}
            <div style={{ display: 'flex', gap: 4 }}>
              {(['5Q', '8Q', '12Q', 'All'] as QRange[]).map(r => (
                <button key={r} onClick={() => setQRange(r)} disabled={loading}
                  className="md-ripple"
                  style={{
                    padding: '5px 14px', borderRadius: 20,
                    background: qRange === r ? 'var(--md-primary)' : 'var(--md-surface-container-high)',
                    color: qRange === r ? '#000' : 'var(--md-on-surface-variant)',
                    border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    opacity: loading ? 0.5 : 1,
                  }}>{r}</button>
              ))}
            </div>

            {/* View mode */}
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setView('heatmap')} className="md-ripple"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                  background: view === 'heatmap' ? '#FFD74022' : 'var(--md-surface-container-high)',
                  color: view === 'heatmap' ? '#FFD740' : 'var(--md-on-surface-variant)',
                }}>
                <Grid3x3 size={12} /> Heatmap
              </button>
              <button onClick={() => setView('bar')} className="md-ripple"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                  background: view === 'bar' ? '#7CB9F422' : 'var(--md-surface-container-high)',
                  color: view === 'bar' ? '#7CB9F4' : 'var(--md-on-surface-variant)',
                }}>
                <BarChart2 size={12} /> Bar Chart
              </button>
            </div>
          </div>

          {/* Chart body */}
          {loading ? (
            <div style={{ height: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--md-outline-variant)', borderTopColor: 'var(--md-primary)', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ fontSize: 13, color: 'var(--md-on-surface-variant)', margin: 0, textAlign: 'center', maxWidth: 340 }}>
                Loading — first run seeds S&amp;P 500 constituents and market cap history for the top 10 companies. This takes ~60s.
              </p>
            </div>
          ) : data ? (
            view === 'heatmap' ? <Heatmap data={data} /> : <BarChartView data={data} />
          ) : null}
        </div>

        {/* Download row */}
        {data && !loading && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              onClick={() => downloadChartCSV(data)}
              className="md-ripple"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8,
                background: 'var(--md-surface-container)',
                border: '1px solid var(--md-outline-variant)',
                cursor: 'pointer', fontSize: 13, fontWeight: 500,
                color: '#69F0AE',
              }}>
              <Download size={14} /> Chart View Data
            </button>
            <button
              onClick={downloadRaw}
              disabled={rawLoading}
              className="md-ripple"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8,
                background: 'var(--md-surface-container)',
                border: '1px solid var(--md-outline-variant)',
                cursor: rawLoading ? 'wait' : 'pointer', fontSize: 13, fontWeight: 500,
                color: '#FFD740',
                opacity: rawLoading ? 0.6 : 1,
              }}>
              <Download size={14} /> {rawLoading ? 'Preparing…' : 'RAW Data'}
            </button>
          </div>
        )}

      </main>
    </div>
  )
}
