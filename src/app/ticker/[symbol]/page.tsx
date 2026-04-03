'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Bookmark, TrendingUp, TrendingDown, Sparkles, Calculator, Target, ChartArea } from 'lucide-react'
import { MenuButton } from '@/components/Sidebar'
import IndicatorGrid from '@/components/IndicatorGrid'
import PriceChart, { type ChartEvent } from '@/components/charts/PriceChart'
import RSIMACDChart from '@/components/charts/RSIMACDChart'
import StochADXChart from '@/components/charts/StochADXChart'
import OBVChart from '@/components/charts/OBVChart'
import { formatNumber } from '@/lib/utils'
import type { FullTickerData } from '@/types/market'

type ChartTab = 'price' | 'rsimacd' | 'stochadx' | 'obv'

const signalConfig: Record<string, { label: string; color: string; bg: string }> = {
  STRONG_BUY:  { label: 'Strong Buy',  color: '#00E676', bg: 'rgba(0,230,118,0.14)' },
  BUY:         { label: 'Buy',          color: '#69F0AE', bg: 'rgba(105,240,174,0.12)' },
  NEUTRAL:     { label: 'Neutral',      color: '#FFD740', bg: 'rgba(255,215,64,0.12)' },
  SELL:        { label: 'Sell',         color: '#CF6679', bg: 'rgba(207,102,121,0.12)' },
  STRONG_SELL: { label: 'Strong Sell',  color: '#EF5350', bg: 'rgba(239,83,80,0.14)' },
}

const chartTabs: { key: ChartTab; label: string }[] = [
  { key: 'price', label: 'Price' },
  { key: 'rsimacd', label: 'RSI / MACD' },
  { key: 'stochadx', label: 'Stoch / ADX' },
  { key: 'obv', label: 'OBV / Volume' },
]

export default function TickerPage() {
  const params = useParams()
  const router = useRouter()
  const symbol = (params.symbol as string).toUpperCase()
  const [data, setData] = useState<FullTickerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [chartTab, setChartTab] = useState<ChartTab>('price')
  const [events, setEvents] = useState<ChartEvent[]>([])

  useEffect(() => {
    setLoading(true); setError(''); setData(null)
    fetch(`/api/ticker/${symbol}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .catch(() => setError('Network error. Please try again.'))
      .finally(() => setLoading(false))
    // Fetch events in parallel (non-blocking — ignore errors)
    fetch(`/api/events/${symbol}`)
      .then(r => r.json())
      .then(d => setEvents(d.data ?? []))
      .catch(() => {})
    try {
      const stored = JSON.parse(localStorage.getItem('am_recent_tickers') || '[]') as string[]
      const updated = [symbol, ...stored.filter(s => s !== symbol)].slice(0, 10)
      localStorage.setItem('am_recent_tickers', JSON.stringify(updated))
    } catch {}
  }, [symbol])

  const sc = data ? (signalConfig[data.ta.overallSignal] ?? signalConfig.NEUTRAL) : null
  const isUp = data ? data.ticker.priceChange >= 0 : true

  const cardStyle = {
    background: 'var(--md-surface-container)',
    borderRadius: 10,
    border: '1px solid var(--md-outline-variant)',
    padding: 16,
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--md-background)', paddingBottom: 0 }}
     >

      {/* Top App Bar — mobile only */}
      <header className="md:hidden" style={{
        position: 'sticky', top: 0, zIndex: 30,
        height: 52, padding: '0 8px 0 4px',
        display: 'flex', alignItems: 'center', gap: 4,
        background: 'var(--md-surface)',
        borderBottom: '1px solid var(--md-outline-variant)',
      }}>
        <MenuButton />
        <button onClick={() => router.push('/')} className="md-ripple"
          style={{ padding: 8, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={20} color="var(--md-on-surface-variant)" />
        </button>

        <div style={{ flex: 1, display: 'flex', alignItems: 'baseline', gap: 10, paddingLeft: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--md-on-surface)' }}>{symbol}</span>
          {data && <>
            <span className="num" style={{ fontSize: 18, fontWeight: 600, color: 'var(--md-on-surface)', fontVariantNumeric: 'tabular-nums' }}>
              ${formatNumber(data.ticker.currentPrice)}
            </span>
            <span className="num" style={{ fontSize: 13, fontWeight: 500, color: isUp ? '#69F0AE' : '#CF6679', fontVariantNumeric: 'tabular-nums' }}>
              {isUp ? '+' : ''}{formatNumber(data.ticker.priceChangePct, 2)}%
            </span>
          </>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {sc && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
              color: sc.color, background: sc.bg,
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>{sc.label}</span>
          )}
          <button onClick={() => router.push(`/ticker/${symbol}/report`)} className="md-ripple"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 6,
              background: 'var(--md-surface-container)',
              border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 500,
              color: 'var(--md-primary)',
            }}>
            <Sparkles size={14} /> AI Report
          </button>
          <button onClick={() => router.push(`/ticker/${symbol}/valuation`)} className="md-ripple"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 6,
              background: 'var(--md-surface-container)',
              border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 500,
              color: '#69F0AE',
            }}>
            <Calculator size={14} /> Valuation
          </button>
          <button onClick={() => router.push(`/ticker/${symbol}/sniper`)} className="md-ripple"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 6,
              background: 'var(--md-surface-container)',
              border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 500,
              color: '#FF6D00',
            }}>
            <Target size={14} /> Sniper
          </button>
          <button onClick={() => router.push(`/ticker/${symbol}/marketcap`)} className="md-ripple"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 6,
              background: 'var(--md-surface-container)',
              border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 500,
              color: '#FFD740',
            }}>
            <ChartArea size={14} /> Mkt Cap
          </button>
          <button onClick={() => router.push('/reports')} className="md-ripple"
            style={{ padding: 10, borderRadius: 50, background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <Bookmark size={20} color="var(--md-on-surface-variant)" />
          </button>
        </div>
      </header>

      {/* Error */}
      {error && (
        <div style={{ margin: '16px', padding: '12px 16px', borderRadius: 8, background: 'rgba(239,83,80,0.1)', color: '#EF5350', fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '16px' }}>
          {[120, 360, 280].map((h, i) => (
            <div key={i} className="animate-pulse"
              style={{ height: h, borderRadius: 10, background: 'var(--md-surface-container)', marginBottom: 12 }} />
          ))}
        </div>
      )}

      {data && (
        <main style={{ maxWidth: 1280, margin: '0 auto', padding: '16px' }}>
          <style>{`
            .ticker-layout { display: grid; gap: 12px; }
            @media (min-width: 1024px) { .ticker-layout { grid-template-columns: 1fr 360px; } }
            .left-col { display: flex; flex-direction: column; gap: 16px; }
            .right-col { display: flex; flex-direction: column; gap: 16px; }
          `}</style>

          <div className="ticker-layout">

            {/* LEFT COLUMN */}
            <div className="left-col">

              {/* Price Card */}
              <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <h1 style={{ fontSize: 28, fontWeight: 400, color: 'var(--md-on-surface)', margin: 0, lineHeight: 1.2 }}>{symbol}</h1>
                    <p style={{ fontSize: 14, color: 'var(--md-on-surface-variant)', margin: '4px 0 0' }}>{data.ticker.name}</p>
                    {data.ticker.exchange && <p style={{ fontSize: 12, color: 'var(--md-outline)', margin: '2px 0 0' }}>{data.ticker.exchange}</p>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p className="num" style={{ fontSize: 32, fontWeight: 500, color: 'var(--md-on-surface)', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                      ${formatNumber(data.ticker.currentPrice)}
                    </p>
                    <p className="num" style={{ fontSize: 14, fontWeight: 500, margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', color: isUp ? '#69F0AE' : '#CF6679' }}>
                      {isUp ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                      {isUp ? '+' : ''}{formatNumber(data.ticker.priceChange)} ({isUp ? '+' : ''}{formatNumber(data.ticker.priceChangePct, 2)}%)
                    </p>
                  </div>
                </div>

                {/* 52W Range */}
                {data.ticker.week52High && data.ticker.week52Low && (() => {
                  const pct = ((data.ticker.currentPrice - data.ticker.week52Low) / (data.ticker.week52High - data.ticker.week52Low)) * 100
                  return (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--md-on-surface-variant)', marginBottom: 8 }}>
                        <span className="num">${formatNumber(data.ticker.week52Low)}</span>
                        <span style={{ color: 'var(--md-outline)' }}>52-week range</span>
                        <span className="num">${formatNumber(data.ticker.week52High)}</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--md-surface-container-high)', borderRadius: 2, position: 'relative', overflow: 'visible' }}>
                        <div style={{ position: 'absolute', inset: 0, borderRadius: 2,
                          background: 'linear-gradient(to right, #CF6679, #FFD740 50%, #69F0AE)' }} />
                        <div style={{
                          position: 'absolute', width: 14, height: 14, borderRadius: '50%',
                          background: 'var(--md-on-surface)', top: -5,
                          left: `calc(${Math.max(0, Math.min(100, pct))}% - 7px)`,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                        }} />
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Chart Card */}
              <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
                {/* Segmented tab bar */}
                <div style={{ display: 'flex', padding: '4px', gap: 4, borderBottom: '1px solid var(--md-outline-variant)' }}>
                  {chartTabs.map(t => (
                    <button key={t.key} onClick={() => setChartTab(t.key)} className="md-ripple"
                      style={{
                        flex: 1, padding: '7px 4px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        background: chartTab === t.key ? 'rgba(77,187,255,0.12)' : 'transparent',
                        color: chartTab === t.key ? 'var(--md-primary)' : 'var(--md-on-surface-variant)',
                        letterSpacing: '0.02em',
                      }}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <div style={{ padding: '8px 12px 12px' }}>
                  {chartTab === 'price'    && <PriceChart ta={data.ta} currentPrice={data.ticker.currentPrice} events={events} />}
                  {chartTab === 'rsimacd'  && <RSIMACDChart ta={data.ta} />}
                  {chartTab === 'stochadx' && <StochADXChart ta={data.ta} />}
                  {chartTab === 'obv'      && <OBVChart ta={data.ta} />}
                </div>
              </div>

              {/* S/R Cards */}
              {(data.ta.supportLevels.length > 0 || data.ta.resistanceLevels.length > 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'Support', color: '#69F0AE', levels: data.ta.supportLevels },
                    { label: 'Resistance', color: '#CF6679', levels: data.ta.resistanceLevels },
                  ].map(({ label, color, levels }) => (
                    <div key={label} style={{ ...cardStyle, padding: 16 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color, marginBottom: 12 }}>{label}</p>
                      {levels.map((lv, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < levels.length - 1 ? '1px solid var(--md-outline-variant)' : 'none' }}>
                          <span className="num" style={{ fontSize: 14, fontWeight: 500, color: 'var(--md-on-surface)', fontVariantNumeric: 'tabular-nums' }}>
                            ${formatNumber(lv.price)}
                          </span>
                          <div style={{ display: 'flex', gap: 3 }}>
                            {Array.from({ length: 5 }).map((_, j) => (
                              <div key={j} style={{ width: 6, height: 6, borderRadius: '50%', background: j < lv.strength ? color : 'var(--md-surface-container-high)' }} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT COLUMN */}
            <div className="right-col">

              {/* Signal Score */}
              <div style={cardStyle}>
                <p style={{ fontSize: 13, color: 'var(--md-on-surface-variant)', marginBottom: 16 }}>Overall signal</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <p className="num" style={{ fontSize: 44, fontWeight: 300, color: sc?.color, margin: 0, fontVariantNumeric: 'tabular-nums', letterSpacing: '-1px' }}>
                      {data.ta.signalScore > 0 ? '+' : ''}{data.ta.signalScore}
                    </p>
                    <p style={{ fontSize: 15, fontWeight: 600, color: sc?.color, margin: '4px 0 0' }}>{sc?.label}</p>
                  </div>
                  {/* Score arc */}
                  <div style={{ width: 80, height: 80 }}>
                    <svg viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="40" cy="40" r="30" fill="none" stroke="var(--md-surface-container-high)" strokeWidth="8" />
                      <circle cx="40" cy="40" r="30" fill="none" stroke={sc?.color ?? '#FFD740'} strokeWidth="8"
                        strokeDasharray={`${Math.abs(data.ta.signalScore) * 1.885} 188.5`}
                        strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--md-on-surface-variant)' }}>
                  <span>−100 Sell</span><span>0 Neutral</span><span>+100 Buy</span>
                </div>
              </div>

              {/* Indicators */}
              <div>
                <p style={{ fontSize: 13, color: 'var(--md-on-surface-variant)', marginBottom: 12, paddingLeft: 4 }}>
                  Indicators — tap any to learn more
                </p>
                <IndicatorGrid ta={data.ta} ticker={data.ticker} />
              </div>

            </div>
          </div>
        </main>
      )}

    </div>
  )
}
