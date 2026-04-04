import Link from 'next/link'
import { ArrowLeft, Bookmark, TrendingUp, TrendingDown, Sparkles, Calculator, Target, ChartArea } from 'lucide-react'
import { MenuButton } from '@/components/Sidebar'
import IndicatorGrid from '@/components/IndicatorGrid'
import TickerClientUI from './client'
import { getTickerDataCached, getCorporateEventsCached } from '@/lib/data'
import { formatNumber } from '@/lib/utils'

const signalConfig: Record<string, { label: string; color: string; bg: string }> = {
  // Pantone colors injected dynamically safely into CSS
  STRONG_BUY:  { label: 'Strong Buy',  color: 'var(--md-buy)', bg: 'rgba(66,214,151,0.14)' },
  BUY:         { label: 'Buy',          color: 'var(--md-buy)', bg: 'rgba(66,214,151,0.12)' },
  NEUTRAL:     { label: 'Neutral',      color: 'var(--md-neutral)', bg: 'rgba(254,202,87,0.12)' },
  SELL:        { label: 'Sell',         color: 'var(--md-sell)', bg: 'rgba(255,111,97,0.12)' },
  STRONG_SELL: { label: 'Strong Sell',  color: 'var(--md-sell)', bg: 'rgba(255,111,97,0.14)' },
}

export default async function TickerPage({
  params,
}: {
  params: Promise<{ symbol: string }>
}) {
  const { symbol: rawSymbol } = await params
  const symbol = rawSymbol.toUpperCase()

  // Pre-fetch concurrently
  let data, events;
  try {
    [data, events] = await Promise.all([
      getTickerDataCached(symbol),
      getCorporateEventsCached(symbol)
    ])
  } catch (error: any) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--md-background)' }}>
        <div style={{ margin: '16px', padding: '12px 16px', borderRadius: 8, background: 'rgba(255,111,97,0.1)', color: 'var(--md-sell)', fontSize: 14 }}>
          {error.message || `Failed to fetch data for ${symbol}`}
        </div>
      </div>
    )
  }

  if (!data) {
    return null;
  }

  const sc = signalConfig[data.ta.overallSignal] ?? signalConfig.NEUTRAL
  const isUp = data.ticker.priceChange >= 0

  const cardStyle = {
    background: 'var(--md-surface-container)',
    borderRadius: 10,
    border: '1px solid var(--md-outline-variant)',
    padding: 16,
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--md-background)', paddingBottom: 0 }}>
      {/* Top App Bar — mobile only */}
      <header className="md:hidden" style={{
        position: 'sticky', top: 0, zIndex: 30,
        height: 52, padding: '0 8px 0 4px',
        display: 'flex', alignItems: 'center', gap: 4,
        background: 'var(--md-surface)',
        borderBottom: '1px solid var(--md-outline-variant)',
      }}>
        <MenuButton />
        <Link href="/" className="md-ripple"
          style={{ padding: 8, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={20} color="var(--md-on-surface-variant)" />
        </Link>

        <div style={{ flex: 1, display: 'flex', alignItems: 'baseline', gap: 10, paddingLeft: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--md-on-surface)' }}>{symbol}</span>
          <span className="num" style={{ fontSize: 18, fontWeight: 600, color: 'var(--md-on-surface)', fontVariantNumeric: 'tabular-nums' }}>
            ${formatNumber(data.ticker.currentPrice)}
          </span>
          <span className="num" style={{ fontSize: 13, fontWeight: 500, color: isUp ? 'var(--md-buy)' : 'var(--md-sell)', fontVariantNumeric: 'tabular-nums' }}>
            {isUp ? '+' : ''}{formatNumber(data.ticker.priceChangePct, 2)}%
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {sc && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
              color: sc.color, background: sc.bg,
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>{sc.label}</span>
          )}
          
          {/* Predictive Prefetching UI navigation layer */}
          <Link href={`/ticker/${symbol}/report`} prefetch={true} className="md-ripple"
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6,
              background: 'var(--md-surface-container)', border: '1px solid var(--md-outline-variant)', 
              fontSize: 13, fontWeight: 500, color: 'var(--md-primary)',
            }}>
            <Sparkles size={14} /> AI
          </Link>
          <Link href={`/ticker/${symbol}/valuation`} prefetch={true} className="md-ripple"
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6,
              background: 'var(--md-surface-container)', border: '1px solid var(--md-outline-variant)',
              fontSize: 13, fontWeight: 500, color: 'var(--md-buy)',
            }}>
            <Calculator size={14} /> Valuation
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '16px' }}>
        <style>{`
          .ticker-layout { display: grid; gap: 16px; }
          @media (min-width: 1024px) { .ticker-layout { grid-template-columns: 1fr 380px; } }
          .left-col { display: flex; flex-direction: column; gap: 16px; }
          .right-col { display: flex; flex-direction: column; gap: 16px; }
        `}</style>

        <div className="ticker-layout">
          {/* LEFT COLUMN */}
          <div className="left-col">
            {/* Price Header / Key Metrics */}
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
                  <p className="num" style={{ fontSize: 14, fontWeight: 500, margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', color: isUp ? 'var(--md-buy)' : 'var(--md-sell)' }}>
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
                        background: 'linear-gradient(to right, var(--md-sell), var(--md-neutral) 50%, var(--md-buy))' }} />
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

            {/* Interactive Charts Client Component */}
            <TickerClientUI data={data} events={events} />

            {/* S/R Cards */}
            {(data.ta.supportLevels.length > 0 || data.ta.resistanceLevels.length > 0) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Support', color: 'var(--md-buy)', levels: data.ta.supportLevels },
                  { label: 'Resistance', color: 'var(--md-sell)', levels: data.ta.resistanceLevels },
                ].map(({ label, color, levels }) => (
                  <div key={label} style={{ ...cardStyle, padding: 16 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color, marginBottom: 12 }}>{label}</p>
                    {levels.map((lv: any, i: number) => (
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
            {/* Action Bar (Desktop mainly, predictive prefetching nodes) */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link href={`/ticker/${symbol}/report`} prefetch={true} className="t-card md-ripple"
                style={{ flex: 1, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--md-primary)', textDecoration: 'none' }}>
                <Sparkles size={18} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>AI Report</span>
              </Link>
              <Link href={`/ticker/${symbol}/valuation`} prefetch={true} className="t-card md-ripple"
                style={{ flex: 1, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--md-buy)', textDecoration: 'none' }}>
                <Calculator size={18} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Valuation</span>
              </Link>
            </div>

            {/* Signal Score */}
            <div style={cardStyle}>
              <p style={{ fontSize: 13, color: 'var(--md-on-surface-variant)', marginBottom: 16 }}>Overall signal</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <p className="num" style={{ fontSize: 44, fontWeight: 300, color: sc.color, margin: 0, fontVariantNumeric: 'tabular-nums', letterSpacing: '-1px' }}>
                    {data.ta.signalScore > 0 ? '+' : ''}{data.ta.signalScore}
                  </p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: sc.color, margin: '4px 0 0' }}>{sc.label}</p>
                </div>
                {/* Score arc */}
                <div style={{ width: 80, height: 80 }}>
                  <svg viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="40" cy="40" r="30" fill="none" stroke="var(--md-surface-container-high)" strokeWidth="8" />
                    <circle cx="40" cy="40" r="30" fill="none" stroke={sc.color ?? 'var(--md-neutral)'} strokeWidth="8"
                      strokeDasharray={`${Math.abs(data.ta.signalScore) * 1.885} 188.5`}
                      strokeLinecap="round" />
                  </svg>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--md-on-surface-variant)' }}>
                <span>−100 Sell</span><span>0 Neutral</span><span>+100 Buy</span>
              </div>
            </div>

            {/* Indicators Grid */}
            <div>
              <p style={{ fontSize: 13, color: 'var(--md-on-surface-variant)', marginBottom: 12, paddingLeft: 4 }}>
                Indicators — tap any to learn more
              </p>
              <IndicatorGrid ta={data.ta} ticker={data.ticker} />
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
