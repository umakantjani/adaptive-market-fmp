'use client'

import { useState } from 'react'
import PriceChart, { type ChartEvent } from '@/components/charts/PriceChart'
import RSIMACDChart from '@/components/charts/RSIMACDChart'
import StochADXChart from '@/components/charts/StochADXChart'
import OBVChart from '@/components/charts/OBVChart'
import type { FullTickerData } from '@/types/market'

type ChartTab = 'price' | 'rsimacd' | 'stochadx' | 'obv'

const chartTabs: { key: ChartTab; label: string }[] = [
  { key: 'price', label: 'Price' },
  { key: 'rsimacd', label: 'RSI / MACD' },
  { key: 'stochadx', label: 'Stoch / ADX' },
  { key: 'obv', label: 'OBV / Volume' },
]

export default function TickerClientUI({
  data,
  events,
}: {
  data: FullTickerData
  events: ChartEvent[]
}) {
  const [chartTab, setChartTab] = useState<ChartTab>('price')

  return (
    <div style={{ background: 'var(--md-surface-container)', borderRadius: 10, border: '1px solid var(--md-outline-variant)', overflow: 'hidden' }}>
      {/* Segmented tab bar */}
      <div style={{ display: 'flex', padding: '4px', gap: 4, borderBottom: '1px solid var(--md-outline-variant)' }}>
        {chartTabs.map(t => (
          <button key={t.key} onClick={() => setChartTab(t.key)} className="md-ripple"
            style={{
              flex: 1, padding: '7px 4px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: chartTab === t.key ? 'rgba(56,189,248,0.12)' : 'transparent',
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
  )
}
