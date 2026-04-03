'use client'

import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { TAResult } from '@/types/market'

export interface ChartEvent {
  date: string
  type: 'split' | 'dividend'
  label: string
  value: number | null
}

interface Props {
  ta: TAResult
  currentPrice: number
  events?: ChartEvent[]
}

interface CandleData {
  date: string
  open: number
  close: number
  high: number
  low: number
  volume: number
  bullish: boolean
  sma20: number | null
  sma50: number | null
  sma200: number | null
  bbUpper: number | null
  bbLower: number | null
}

export default function PriceChart({ ta, events = [] }: Props) {
  const data: CandleData[] = ta.history.dates.map((date, i) => {
    const open = ta.history.opens[i]
    const close = ta.history.closes[i]
    const high = ta.history.highs[i]
    const low = ta.history.lows[i]
    const bullish = close >= open
    return {
      date,
      open,
      close,
      high,
      low,
      volume: ta.history.volumes[i],
      bullish,
      sma20: ta.history.sma20[i],
      sma50: ta.history.sma50[i],
      sma200: ta.history.sma200[i],
      bbUpper: ta.history.bbUpper[i],
      bbLower: ta.history.bbLower[i],
    }
  })

  const prices = data.flatMap((d) => [d.high, d.low]).filter(Boolean)
  const minPrice = Math.min(...prices) * 0.995
  const maxPrice = Math.max(...prices) * 1.005

  const tooltipStyle = {
    background: '#2B2930',
    border: 'none',
    borderRadius: 12,
    fontSize: 12,
  }

  const dates = data.map(d => d.date)
  // Only show splits (dividends too frequent for price chart)
  const splits = events.filter(e => e.type === 'split' && e.date >= dates[0] && e.date <= dates[dates.length - 1])

  function nearestDate(target: string): string | null {
    if (dates.length === 0) return null
    return dates.reduce((best, d) => Math.abs(d.localeCompare(target)) < Math.abs(best.localeCompare(target)) ? d : best)
  }

  return (
    <div className="w-full h-[320px] md:h-[420px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#222029" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#938F99' }} tickFormatter={(v) => v.slice(5)} interval="preserveStartEnd" />
          <YAxis domain={[minPrice, maxPrice]} tick={{ fontSize: 10, fill: '#938F99' }} tickFormatter={(v) => `$${v.toFixed(0)}`} width={55} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value, name) => [`$${typeof value === 'number' ? value.toFixed(2) : value}`, name as string]}
            labelStyle={{ color: '#938F99' }}
          />
          {/* BB Bands */}
          <Line type="monotone" dataKey="bbUpper" stroke="#7CB9F4" strokeWidth={1} dot={false} strokeDasharray="4 2" name="BB Upper" connectNulls isAnimationActive={false} />
          <Line type="monotone" dataKey="bbLower" stroke="#7CB9F4" strokeWidth={1} dot={false} strokeDasharray="4 2" name="BB Lower" connectNulls isAnimationActive={false} />
          {/* SMAs */}
          <Line type="monotone" dataKey="sma20" stroke="#FFD740" strokeWidth={1.5} dot={false} name="SMA20" connectNulls isAnimationActive={false} />
          <Line type="monotone" dataKey="sma50" stroke="#7CB9F4" strokeWidth={1.5} dot={false} name="SMA50" connectNulls isAnimationActive={false} />
          <Line type="monotone" dataKey="sma200" stroke="#CF6679" strokeWidth={1.5} dot={false} name="SMA200" connectNulls isAnimationActive={false} />
          {/* Price line (close) */}
          <Line type="monotone" dataKey="close" stroke="#E6E1E5" strokeWidth={2} dot={false} name="Price" isAnimationActive={false} />
          {/* Stock split markers */}
          {splits.map(ev => {
            const x = nearestDate(ev.date)
            if (!x) return null
            return (
              <ReferenceLine key={`split-${ev.date}`} x={x} stroke="#FF9800" strokeWidth={1.5}
                strokeDasharray="4 2" strokeOpacity={0.85}
                label={{ value: `✂ ${ev.label}`, position: 'top', fontSize: 9, fill: '#FF9800' }} />
            )
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
