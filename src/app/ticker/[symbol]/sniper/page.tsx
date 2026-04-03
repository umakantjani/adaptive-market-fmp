'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Target, CheckCircle2, XCircle, AlertCircle, TrendingUp, Zap } from 'lucide-react'
import { MenuButton } from '@/components/Sidebar'
import { evaluateSniper } from '@/lib/sniper'
import type { FullTickerData } from '@/types/market'
import type { SniperSignal, SniperGrade } from '@/types/sniper'
import { formatNumber } from '@/lib/utils'

const gradeConfig: Record<SniperGrade, { label: string; color: string; bg: string; border: string; icon: string }> = {
  FIRE:  { label: 'FIRE 🔥',  color: '#FF6D00', bg: 'rgba(255,109,0,0.12)',   border: 'rgba(255,109,0,0.35)',   icon: '🔥' },
  WATCH: { label: 'WATCH 👀', color: '#FFD740', bg: 'rgba(255,215,64,0.12)',  border: 'rgba(255,215,64,0.35)',  icon: '👀' },
  WAIT:  { label: 'WAIT ⏳',  color: '#7CB9F4', bg: 'rgba(124,185,244,0.10)', border: 'rgba(124,185,244,0.3)', icon: '⏳' },
  AVOID: { label: 'AVOID 🚫', color: '#CF6679', bg: 'rgba(207,102,121,0.12)', border: 'rgba(207,102,121,0.35)', icon: '🚫' },
}

const rsiColors: Record<string, string> = {
  green: '#69F0AE',
  caution: '#FFD740',
  overbought: '#CF6679',
  weak: 'var(--md-outline)',
}
const rsiLabels: Record<string, string> = {
  green: 'Green Light (50–65)',
  caution: 'Caution (65–75)',
  overbought: 'Overextended (>75)',
  weak: 'Weak (<50)',
}

export default function SniperPage() {
  const params = useParams()
  const router = useRouter()
  const symbol = (params.symbol as string).toUpperCase()

  const [data, setData] = useState<FullTickerData | null>(null)
  const [signal, setSignal] = useState<SniperSignal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/ticker/${symbol}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setData(d)
        setSignal(evaluateSniper(d.ta, d.ticker.currentPrice))
      })
      .catch(() => setError('Network error. Please try again.'))
      .finally(() => setLoading(false))
  }, [symbol])

  const gc = signal ? gradeConfig[signal.grade] : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--md-background)', paddingBottom: 0 }}
     >
      {/* Header — mobile only */}
      <header className="md:hidden" style={{
        position: 'sticky', top: 0, zIndex: 30,
        height: 52, padding: '0 16px 0 4px',
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--md-surface)',
        borderBottom: '1px solid var(--md-outline-variant)',
      }}>
        <MenuButton />
        <Target size={15} color="var(--md-primary)" />
        <h1 style={{ fontSize: 16, fontWeight: 600, color: 'var(--md-on-surface)', margin: 0, flex: 1 }}>
          {symbol} — Sniper
        </h1>
        {data && (
          <span style={{ fontSize: 13, color: 'var(--md-on-surface-variant)' }}>
            ${formatNumber(data.ticker.currentPrice)}
          </span>
        )}
      </header>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '20px 16px 60px' }}>

        {/* Loading */}
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse"
            style={{ height: i === 0 ? 140 : 80, borderRadius: 20, background: 'var(--md-surface-container)', marginBottom: 12 }} />
        ))}

        {error && (
          <div style={{ padding: '16px 20px', borderRadius: 16, background: 'rgba(239,83,80,0.1)', color: '#EF5350', fontSize: 14 }}>
            {error}
          </div>
        )}

        {signal && gc && (
          <>
            {/* Hero — Grade Card */}
            <div style={{
              background: gc.bg,
              border: `1.5px solid ${gc.border}`,
              borderRadius: 24, padding: '24px 24px 20px',
              marginBottom: 16,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 8 }}>{gc.icon}</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: gc.color, letterSpacing: 4, marginBottom: 8 }}>
                {signal.grade}
              </div>
              <div style={{
                display: 'inline-flex', gap: 6, alignItems: 'center',
                background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: '4px 14px',
                marginBottom: 16,
              }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{
                    width: 12, height: 12, borderRadius: '50%',
                    background: i < signal.score ? gc.color : 'rgba(255,255,255,0.12)',
                    transition: 'background 0.3s',
                  }} />
                ))}
                <span style={{ fontSize: 13, color: gc.color, fontWeight: 600, marginLeft: 4 }}>
                  {signal.score}/5
                </span>
              </div>
              <p style={{ fontSize: 15, color: 'var(--md-on-surface)', margin: 0, lineHeight: 1.5 }}>
                {signal.summary}
              </p>
            </div>

            {/* 5 Conditions */}
            <div style={{
              background: 'var(--md-surface-container)',
              borderRadius: 20, padding: '16px 20px',
              marginBottom: 16,
            }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--md-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 14px' }}>
                Strategy Conditions
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {signal.conditions.map((c, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '12px 14px', borderRadius: 14,
                    background: c.pass
                      ? 'rgba(105,240,174,0.07)'
                      : 'rgba(207,102,121,0.07)',
                  }}>
                    <div style={{ flexShrink: 0, marginTop: 1 }}>
                      {c.pass
                        ? <CheckCircle2 size={20} color="#69F0AE" />
                        : <XCircle size={20} color="#CF6679" />
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--md-on-surface)' }}>
                          {c.name}
                        </span>
                        <span style={{
                          fontSize: 12, fontVariantNumeric: 'tabular-nums',
                          color: c.pass ? '#69F0AE' : '#CF6679', fontWeight: 600,
                        }}>
                          {c.value}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--md-on-surface-variant)', margin: '3px 0 0', lineHeight: 1.4 }}>
                        {c.description} — <span style={{ color: 'var(--md-outline)' }}>threshold: {c.threshold}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RSI Status */}
            <div style={{
              background: 'var(--md-surface-container)',
              borderRadius: 20, padding: '16px 20px',
              marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <AlertCircle size={20} color={rsiColors[signal.rsiStatus]} />
              <div>
                <p style={{ fontSize: 12, color: 'var(--md-outline)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>RSI Status</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: rsiColors[signal.rsiStatus], margin: 0 }}>
                  {rsiLabels[signal.rsiStatus]}
                </p>
                <p style={{ fontSize: 12, color: 'var(--md-on-surface-variant)', margin: '3px 0 0' }}>
                  {signal.rsiStatus === 'green' && 'Momentum is healthy — ideal entry window.'}
                  {signal.rsiStatus === 'caution' && 'RSI elevated. Consider smaller size or wait for a minor pullback.'}
                  {signal.rsiStatus === 'overbought' && 'RSI > 75 — overextended. Pause entry and wait for cooling.'}
                  {signal.rsiStatus === 'weak' && 'RSI below 50 — buying momentum is absent. No entry.'}
                </p>
              </div>
            </div>

            {/* Entry / Exit Levels */}
            {signal.entryLevels && (
              <div style={{
                background: 'var(--md-surface-container)',
                borderRadius: 20, padding: '16px 20px',
                marginBottom: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <TrendingUp size={16} color="var(--md-primary)" />
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--md-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>
                    Entry / Exit Levels
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                  {[
                    { label: 'Entry Zone', value: `$${signal.entryLevels.entryZone[0].toFixed(2)} – $${signal.entryLevels.entryZone[1].toFixed(2)}`, color: '#7CB9F4' },
                    { label: 'Stop Loss', value: `$${signal.entryLevels.stopLoss.toFixed(2)}`, color: '#CF6679' },
                    { label: 'Target 1', value: `$${signal.entryLevels.target1.toFixed(2)}`, color: '#69F0AE' },
                    { label: 'Target 2', value: `$${signal.entryLevels.target2.toFixed(2)}`, color: '#00E676' },
                    { label: 'Risk / Reward', value: `1 : ${signal.entryLevels.riskRewardRatio.toFixed(1)}`, color: 'var(--md-on-surface)' },
                  ].map(row => (
                    <div key={row.label} style={{ background: 'var(--md-surface-container-high)', borderRadius: 14, padding: '12px 14px' }}>
                      <p style={{ fontSize: 11, color: 'var(--md-outline)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{row.label}</p>
                      <p className="num" style={{ fontSize: 16, fontWeight: 600, color: row.color, margin: 0 }}>{row.value}</p>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: 'var(--md-outline)', margin: '12px 0 0', lineHeight: 1.5 }}>
                  Stop Loss = BB Middle (mean-reversion level). Targets based on 2× and 3.5× ATR from entry. Levels are indicative, not financial advice.
                </p>
              </div>
            )}

            {/* Options Strategy */}
            <div style={{
              background: 'var(--md-surface-container)',
              borderRadius: 20, padding: '16px 20px',
              marginBottom: 16,
              border: signal.options.setup === 'calls'
                ? '1.5px solid rgba(105,240,174,0.25)'
                : signal.options.setup === 'bull_spread'
                  ? '1.5px solid rgba(255,215,64,0.25)'
                  : '1px solid var(--md-outline-variant)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Zap size={16} color={signal.options.setup === 'calls' ? '#69F0AE' : signal.options.setup === 'bull_spread' ? '#FFD740' : 'var(--md-outline)'} />
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--md-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>
                  Options Strategy
                </p>
                {signal.options.contractType && (
                  <span style={{
                    marginLeft: 'auto', fontSize: 12, fontWeight: 700,
                    padding: '3px 12px', borderRadius: 10,
                    background: signal.options.setup === 'calls' ? 'rgba(105,240,174,0.12)' : 'rgba(255,215,64,0.12)',
                    color: signal.options.setup === 'calls' ? '#69F0AE' : '#FFD740',
                  }}>
                    {signal.options.contractType}
                  </span>
                )}
              </div>

              <p style={{ fontSize: 14, color: 'var(--md-on-surface)', margin: '0 0 12px', lineHeight: 1.5 }}>
                {signal.options.reasoning}
              </p>

              {signal.options.strikeGuidance && (
                <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--md-outline)', minWidth: 90 }}>Strike</span>
                    <span style={{ fontSize: 13, color: 'var(--md-on-surface)', fontWeight: 500 }}>{signal.options.strikeGuidance}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--md-outline)', minWidth: 90 }}>Expiry</span>
                    <span style={{ fontSize: 13, color: 'var(--md-on-surface)', fontWeight: 500 }}>{signal.options.expiryGuidance}</span>
                  </div>
                </div>
              )}

              <div style={{
                padding: '10px 14px', borderRadius: 12,
                background: 'rgba(255,215,64,0.08)', borderLeft: '3px solid #FFD740',
                fontSize: 12, color: 'var(--md-on-surface-variant)', lineHeight: 1.5,
              }}>
                ⚠ {signal.options.riskNote}
              </div>
            </div>

            {/* Disclaimer */}
            <p style={{ fontSize: 11, color: 'var(--md-outline)', lineHeight: 1.6, padding: '0 4px', textAlign: 'center' }}>
              This strategy output is for educational purposes only and does not constitute financial advice. Options trading involves significant risk and is not suitable for all investors. Always conduct your own research and consult a licensed financial advisor before trading.
            </p>
          </>
        )}
      </main>
    </div>
  )
}
