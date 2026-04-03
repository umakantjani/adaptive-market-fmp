'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import { indicatorInfoMap } from '@/lib/indicatorInfo'
import type { TAResult, TickerInfo } from '@/types/market'
import dynamic from 'next/dynamic'

const IndicatorModal = dynamic(() => import('./IndicatorModal'), { ssr: false })

interface Props { ta: TAResult; ticker: TickerInfo }

interface IndicatorItem {
  label: string; value: number | null
  displayValue: string; signal: string; signalColor: string; subvalue?: string
}

function getSignal(label: string, ta: TAResult): { text: string; color: string } {
  if (label === 'RSI (14)') {
    const v = ta.rsi14
    if (v === null) return { text: '', color: 'var(--md-on-surface-variant)' }
    if (v > 70) return { text: 'Overbought', color: '#CF6679' }
    if (v < 30) return { text: 'Oversold', color: '#69F0AE' }
    if (v > 55) return { text: 'Bullish', color: '#69F0AE' }
    if (v < 45) return { text: 'Bearish', color: '#CF6679' }
    return { text: 'Neutral', color: '#FFD740' }
  }
  if (label === 'MACD') return (ta.macdHist ?? 0) > 0
    ? { text: 'Bullish', color: '#69F0AE' }
    : { text: 'Bearish', color: '#CF6679' }
  if (label === 'ADX (14)') {
    const v = ta.adx14 ?? 0
    if (v > 25) return (ta.diPlus ?? 0) > (ta.diMinus ?? 0)
      ? { text: 'Bullish trend', color: '#69F0AE' }
      : { text: 'Bearish trend', color: '#CF6679' }
    return { text: 'Ranging', color: '#CAC4D0' }
  }
  if (label === 'Stoch %K/%D') {
    const v = ta.stochK ?? 50
    if (v > 80) return { text: 'Overbought', color: '#CF6679' }
    if (v < 20) return { text: 'Oversold', color: '#69F0AE' }
    return { text: 'Neutral', color: '#FFD740' }
  }
  return { text: '', color: 'var(--md-on-surface-variant)' }
}

export default function IndicatorGrid({ ta, ticker }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const price = ticker.currentPrice

  const items: IndicatorItem[] = [
    { label: 'RSI (14)', value: ta.rsi14, displayValue: formatNumber(ta.rsi14, 1), ...(() => { const s = getSignal('RSI (14)', ta); return { signal: s.text, signalColor: s.color } })() },
    { label: 'MACD', value: ta.macdLine, displayValue: formatNumber(ta.macdLine, 3), ...(() => { const s = getSignal('MACD', ta); return { signal: s.text, signalColor: s.color } })(), subvalue: `Hist: ${formatNumber(ta.macdHist, 3)}` },
    { label: 'Stoch %K/%D', value: ta.stochK, displayValue: `${formatNumber(ta.stochK, 1)} / ${formatNumber(ta.stochD, 1)}`, ...(() => { const s = getSignal('Stoch %K/%D', ta); return { signal: s.text, signalColor: s.color } })() },
    { label: 'ADX (14)', value: ta.adx14, displayValue: formatNumber(ta.adx14, 1), ...(() => { const s = getSignal('ADX (14)', ta); return { signal: s.text, signalColor: s.color } })(), subvalue: `+DI ${formatNumber(ta.diPlus, 1)} / −DI ${formatNumber(ta.diMinus, 1)}` },
    { label: 'SMA 20', value: ta.sma20, displayValue: `$${formatNumber(ta.sma20)}`, signal: '', signalColor: '', subvalue: ta.sma20 ? `${((price / ta.sma20 - 1) * 100).toFixed(2)}% from price` : '' },
    { label: 'SMA 50', value: ta.sma50, displayValue: `$${formatNumber(ta.sma50)}`, signal: '', signalColor: '', subvalue: ta.sma50 ? `${((price / ta.sma50 - 1) * 100).toFixed(2)}% from price` : '' },
    { label: 'SMA 200', value: ta.sma200, displayValue: `$${formatNumber(ta.sma200)}`, signal: '', signalColor: '', subvalue: ta.sma200 ? `${((price / ta.sma200 - 1) * 100).toFixed(2)}% from price` : '' },
    { label: 'EMA 12/26', value: ta.ema12, displayValue: `${formatNumber(ta.ema12)} / ${formatNumber(ta.ema26)}`, signal: '', signalColor: '' },
    { label: 'BB Upper', value: ta.bbUpper, displayValue: `$${formatNumber(ta.bbUpper)}`, signal: '', signalColor: '' },
    { label: 'BB Lower', value: ta.bbLower, displayValue: `$${formatNumber(ta.bbLower)}`, signal: '', signalColor: '' },
    { label: 'ATR (14)', value: ta.atr14, displayValue: `$${formatNumber(ta.atr14)}`, signal: '', signalColor: '', subvalue: ta.atr14 && price ? `${((ta.atr14 / price) * 100).toFixed(2)}% of price` : '' },
    { label: 'Volume Ratio', value: ta.volumeRatio, displayValue: `${formatNumber(ta.volumeRatio, 2)}×`, signal: ta.volumeRatio ? (ta.volumeRatio > 1.3 ? 'Above avg' : ta.volumeRatio < 0.7 ? 'Below avg' : 'Average') : '', signalColor: ta.volumeRatio ? (ta.volumeRatio > 1.3 ? '#69F0AE' : ta.volumeRatio < 0.7 ? '#CF6679' : '#CAC4D0') : '' },
  ]

  const hasModal = (label: string) => !!indicatorInfoMap[label]

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {items.map((item) => (
          <button
            key={item.label}
            onClick={() => hasModal(item.label) ? setSelected(item.label) : undefined}
            className="md-ripple"
            style={{
              textAlign: 'left',
              padding: '10px 12px',
              borderRadius: 8,
              background: 'var(--md-surface-container)',
              border: '1px solid var(--md-outline-variant)',
              cursor: hasModal(item.label) ? 'pointer' : 'default',
            }}>
            {/* Label + value inline */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 11, color: 'var(--md-on-surface-variant)', margin: 0, fontWeight: 400 }}>{item.label}</p>
              {hasModal(item.label) && (
                <ChevronRight size={11} color="var(--md-outline)" style={{ flexShrink: 0 }} />
              )}
            </div>
            <p className="num" style={{ fontSize: 14, fontWeight: 600, color: 'var(--md-on-surface)', margin: '3px 0 0', fontVariantNumeric: 'tabular-nums' }}>
              {item.displayValue}
            </p>
            {/* Signal + subvalue row */}
            {(item.signal || item.subvalue) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 }}>
                {item.signal && (
                  <span className="t-badge" style={{ color: item.signalColor, background: `${item.signalColor}20` }}>
                    {item.signal}
                  </span>
                )}
                {item.subvalue && (
                  <span style={{ fontSize: 10, color: 'var(--md-outline)', marginLeft: 'auto' }}>{item.subvalue}</span>
                )}
              </div>
            )}
          </button>
        ))}
      </div>

      {selected && (
        <IndicatorModal
          indicatorKey={selected}
          value={items.find(i => i.label === selected)?.value ?? null}
          ta={ta} ticker={ticker}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}
