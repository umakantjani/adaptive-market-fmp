'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Download } from 'lucide-react'
import { MenuButton } from '@/components/Sidebar'

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuarterMeta { label: string; date: string }
interface Company {
  symbol: string; name: string; rank: number
  currentMarketCap: number; values: number[]
}
interface QuarterlyData {
  quarters: QuarterMeta[]
  companies: Company[]
  sp500Total: number[]
  sp500Coverage: number[]
  constituentCount: number
}

type QRange = '5Q' | '8Q' | '12Q'

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

function pctStr(n: number) { return `${n.toFixed(2)}%` }

function downloadCSV(data: QuarterlyData) {
  const { quarters, companies, sp500Total } = data
  const hdrs = ['Quarter', 'Date', ...companies.map(c => `${c.symbol} ($)`), ...companies.map(c => `${c.symbol} (% of S&P500)`), 'S&P 500 Total ($)']
  const rows = quarters.map((q, i) => {
    const total = sp500Total[i] || 1
    const vals  = companies.map(c => c.values[i] ?? '')
    const pcts  = companies.map(c => total > 0 ? (((c.values[i] ?? 0) / total) * 100).toFixed(4) : '')
    return [q.label, q.date, ...vals, ...pcts, sp500Total[i] ?? ''].join(',')
  })
  const csv = [hdrs.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a'); a.href = url
  a.download = `SP500_Contribution_${new Date().toISOString().slice(0, 10)}.csv`
  a.click(); URL.revokeObjectURL(url)
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

interface TooltipInfo {
  symbol: string; name: string; mcap: number; pct: number
  quarter: string; color: string
  x: number; y: number
}

function Tooltip({ info }: { info: TooltipInfo }) {
  return (
    <div style={{
      position: 'fixed',
      left: info.x + 12, top: info.y - 8,
      zIndex: 100, pointerEvents: 'none',
      background: '#2B2930', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10, padding: '10px 14px', minWidth: 160,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{ width: 10, height: 10, borderRadius: 2, background: info.color, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#E6E1E5' }}>{info.symbol}</span>
      </div>
      <div style={{ fontSize: 11, color: '#938F99', marginBottom: 4 }}>{info.quarter}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#E6E1E5', fontVariantNumeric: 'tabular-nums' }}>{fmt(info.mcap)}</div>
      <div style={{ fontSize: 13, color: info.color, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
        {pctStr(info.pct)} of S&amp;P 500
      </div>
    </div>
  )
}

// ── Left Ticker Panel ─────────────────────────────────────────────────────────

function TickerPanel({
  data, hoveredSymbol, onHover,
}: {
  data: QuarterlyData
  hoveredSymbol: string | null
  onHover: (sym: string | null) => void
}) {
  const latestQi  = data.quarters.length - 1
  const total     = data.sp500Total[latestQi] || 1
  const otherPct  = Math.max(0, 100 - data.companies.reduce((s, c) => s + ((c.values[latestQi] ?? 0) / total) * 100, 0))

  return (
    <div style={{ width: 190, flexShrink: 0, paddingTop: 36 /* align with chart columns */ }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--md-outline)',
        marginBottom: 10, paddingLeft: 8,
      }}>
        Companies
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {data.companies.map((c, i) => {
          const pct      = ((c.values[latestQi] ?? 0) / total) * 100
          const isHov    = hoveredSymbol === c.symbol
          const dimmed   = hoveredSymbol !== null && !isHov
          return (
            <div
              key={c.symbol}
              onMouseEnter={() => onHover(c.symbol)}
              onMouseLeave={() => onHover(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 8px', borderRadius: 8,
                background: isHov ? 'var(--md-surface-container-high)' : 'transparent',
                opacity: dimmed ? 0.3 : 1,
                transition: 'opacity 120ms, background 120ms',
                cursor: 'default',
              }}
            >
              <div style={{ width: 11, height: 11, borderRadius: 3, background: COLORS[i], flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12, fontWeight: 600,
                  color: isHov ? 'var(--md-on-surface)' : 'var(--md-on-surface-variant)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {c.symbol}
                </div>
                <div style={{ fontSize: 10, color: isHov ? COLORS[i] : 'var(--md-on-surface-variant)', fontVariantNumeric: 'tabular-nums' }}>
                  {pctStr(pct)}
                </div>
              </div>
            </div>
          )
        })}

        {/* Other */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 8px', borderRadius: 8,
          opacity: hoveredSymbol ? 0.2 : 0.5,
          transition: 'opacity 120ms',
        }}>
          <div style={{ width: 11, height: 11, borderRadius: 3, background: '#3D3944', flexShrink: 0, border: '1px solid #555' }} />
          <div>
            <div style={{ fontSize: 11, color: 'var(--md-on-surface-variant)' }}>Other</div>
            <div style={{ fontSize: 10, color: 'var(--md-on-surface-variant)', fontVariantNumeric: 'tabular-nums' }}>
              {pctStr(otherPct)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Contribution Chart ────────────────────────────────────────────────────────

function ContributionChart({
  data, hoveredSymbol, onHover,
}: {
  data: QuarterlyData
  hoveredSymbol: string | null
  onHover: (sym: string | null) => void
}) {
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  function handleBlockEnter(
    e: React.MouseEvent,
    symbol: string, name: string, mcap: number, pct: number,
    quarter: string, color: string
  ) {
    onHover(symbol)
    setTooltip({ symbol, name, mcap, pct, quarter, color, x: e.clientX, y: e.clientY })
  }

  function handleBlockLeave() {
    onHover(null)
    setTooltip(null)
  }

  function handleBlockMove(e: React.MouseEvent) {
    if (tooltip) setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)
  }

  return (
    <div ref={containerRef} style={{ flex: 1, minWidth: 0, position: 'relative' }}>
      {tooltip && <Tooltip info={tooltip} />}

      <div style={{ display: 'flex', gap: 6, height: 520, alignItems: 'stretch' }}>
        {data.quarters.map((q, qi) => {
          const total = data.sp500Total[qi] || 1
          const named = data.companies.map((c, ci) => ({
            symbol:  c.symbol,
            name:    c.name,
            color:   COLORS[ci],
            mcap:    c.values[qi] ?? 0,
            pct:     ((c.values[qi] ?? 0) / total) * 100,
          }))
          const namedPctSum = named.reduce((s, n) => s + n.pct, 0)
          const otherPct    = Math.max(0, 100 - namedPctSum)

          return (
            <div key={q.label} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
              {/* Quarter label */}
              <div style={{
                fontSize: 10, fontWeight: 600, color: 'var(--md-on-surface-variant)',
                textAlign: 'center', marginBottom: 6, whiteSpace: 'nowrap',
                overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {q.label.replace(' ', '\u00A0')}
              </div>

              {/* Stacked blocks — flex units = percentage points */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5, borderRadius: 6, overflow: 'hidden' }}>
                {named.map(co => {
                  const isHov  = hoveredSymbol === co.symbol
                  const dimmed = hoveredSymbol !== null && !isHov
                  return (
                    <div
                      key={co.symbol}
                      onMouseEnter={e => handleBlockEnter(e, co.symbol, co.name, co.mcap, co.pct, q.label, co.color)}
                      onMouseLeave={handleBlockLeave}
                      onMouseMove={handleBlockMove}
                      style={{
                        flex: co.pct,
                        background: co.color,
                        opacity: dimmed ? 0.12 : isHov ? 1 : 0.82,
                        borderRadius: 3,
                        cursor: 'default',
                        transition: 'opacity 120ms',
                        position: 'relative',
                        overflow: 'hidden',
                        minHeight: co.pct > 0.5 ? 2 : 0,
                        boxShadow: isHov ? `0 0 0 2px ${co.color}` : 'none',
                      }}
                    >
                      {/* Inline label if block tall enough */}
                      {co.pct > 3 && (
                        <div style={{
                          position: 'absolute', bottom: 3, left: '50%',
                          transform: 'translateX(-50%)',
                          fontSize: 9, fontWeight: 700,
                          color: 'rgba(0,0,0,0.75)', whiteSpace: 'nowrap',
                        }}>
                          {co.pct.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* "Other S&P 500" block */}
                {otherPct > 0 && (
                  <div
                    style={{
                      flex: otherPct,
                      background: '#2B2930',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 3,
                      opacity: hoveredSymbol ? 0.2 : 0.6,
                      transition: 'opacity 120ms',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {otherPct > 8 && (
                      <div style={{ fontSize: 9, color: '#938F99', fontWeight: 600 }}>
                        Other {otherPct.toFixed(1)}%
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* S&P 500 total at bottom */}
              <div style={{
                fontSize: 9, color: 'var(--md-outline)', textAlign: 'center',
                marginTop: 5, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
              }}>
                {fmt(total)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const Q_COUNT: Record<QRange, number> = { '5Q': 5, '8Q': 8, '12Q': 12 }

export default function ContributionPage() {
  const router = useRouter()
  const [qRange, setQRange]           = useState<QRange>('5Q')
  const [data, setData]               = useState<QuarterlyData | null>(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [hoveredSymbol, setHovered]   = useState<string | null>(null)

  const load = useCallback((range: QRange) => {
    setLoading(true); setError('')
    fetch(`/api/marketcap/sp500-quarterly?quarters=${Q_COUNT[range]}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(qRange) }, [load, qRange])

  // Stats for latest quarter
  const latestQi     = data ? data.quarters.length - 1 : -1
  const latestTotal  = data?.sp500Total[latestQi] ?? 0
  const latestTop10  = data?.companies.reduce((s, c) => s + (c.values[latestQi] ?? 0), 0) ?? 0
  const concentration = latestTotal > 0 ? (latestTop10 / latestTotal) * 100 : 0
  const coverage     = data?.sp500Coverage[latestQi] ?? 0
  const constituentN = data?.constituentCount ?? 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--md-background)' }}>

      {/* Mobile header */}
      <header className="md:hidden" style={{
        position: 'sticky', top: 0, zIndex: 40, height: 56,
        padding: '0 16px', display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--md-surface)', borderBottom: '1px solid var(--md-outline-variant)',
      }}>
        <MenuButton />
        <button onClick={() => router.back()} style={{ padding: 4, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={20} color="var(--md-on-surface-variant)" />
        </button>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--md-on-surface)' }}>S&amp;P 500 Contribution</span>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px 48px' }}>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <button onClick={() => router.back()} className="hidden md:flex md-ripple"
            style={{ padding: 6, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <ArrowLeft size={18} color="var(--md-on-surface-variant)" />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--md-on-surface)' }}>
              S&amp;P 500 Market Cap Contribution
            </h1>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--md-on-surface-variant)' }}>
              Each block = a company&apos;s share of the S&amp;P 500 total market cap · hover a ticker to highlight
            </p>
          </div>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(239,83,80,0.1)', color: '#EF5350', fontSize: 14, margin: '12px 0' }}>
            {error}
          </div>
        )}

        {/* Stats strip */}
        {data && !loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, margin: '16px 0' }}>
            {[
              { label: 'Top-10 Concentration', value: `${concentration.toFixed(1)}%`, sub: `of ${fmt(latestTotal)} S&P 500 total`, color: '#FFD740' },
              { label: 'S&P 500 Coverage', value: `${coverage} / ${constituentN}`, sub: 'constituents with data' },
              { label: 'Top-10 Market Cap', value: fmt(latestTop10), sub: data.quarters[latestQi]?.label },
              { label: 'Companies Shown', value: String(data.companies.length), sub: 'GOOGL+GOOG if both in top 11' },
            ].map(m => (
              <div key={m.label} style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--md-surface-container)' }}>
                <div style={{ fontSize: 10, color: 'var(--md-on-surface-variant)', marginBottom: 3 }}>{m.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: m.color ?? 'var(--md-on-surface)', fontVariantNumeric: 'tabular-nums' }}>{m.value}</div>
                {m.sub && <div style={{ fontSize: 10, color: 'var(--md-on-surface-variant)', marginTop: 2 }}>{m.sub}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Chart card */}
        <div style={{ borderRadius: 16, background: 'var(--md-surface-container)', padding: '20px' }}>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['5Q', '8Q', '12Q'] as QRange[]).map(r => (
                <button key={r} onClick={() => setQRange(r)} disabled={loading}
                  className="md-ripple"
                  style={{
                    padding: '5px 16px', borderRadius: 20,
                    background: qRange === r ? 'var(--md-primary)' : 'var(--md-surface-container-high)',
                    color: qRange === r ? '#000' : 'var(--md-on-surface-variant)',
                    border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    opacity: loading ? 0.5 : 1,
                  }}>{r}</button>
              ))}
            </div>

            {data && (
              <button onClick={() => downloadCSV(data)} className="md-ripple"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: 'var(--md-surface-container-high)', fontSize: 12, fontWeight: 500, color: '#69F0AE',
                }}>
                <Download size={13} /> Export CSV
              </button>
            )}
          </div>

          {/* Chart body */}
          {loading ? (
            <div style={{ height: 380, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--md-outline-variant)', borderTopColor: 'var(--md-primary)', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ fontSize: 13, color: 'var(--md-on-surface-variant)', margin: 0, textAlign: 'center', maxWidth: 340 }}>
                Loading — first run seeds S&amp;P 500 constituents and top-10 market cap history (~60s).
              </p>
            </div>
          ) : data ? (
            <div style={{ display: 'flex', gap: 20 }}>
              {/* Left ticker panel */}
              <TickerPanel data={data} hoveredSymbol={hoveredSymbol} onHover={setHovered} />

              {/* Contribution chart */}
              <ContributionChart data={data} hoveredSymbol={hoveredSymbol} onHover={setHovered} />
            </div>
          ) : null}

          {/* Legend note */}
          {data && !loading && (
            <p style={{ fontSize: 11, color: 'var(--md-on-surface-variant)', margin: '14px 0 0', textAlign: 'right' }}>
              Block height ∝ % of S&amp;P 500 market cap · S&amp;P 500 total shown at base of each column · *Coverage: {data.sp500Coverage[latestQi]} / {constituentN} constituents
            </p>
          )}
        </div>

      </main>
    </div>
  )
}
