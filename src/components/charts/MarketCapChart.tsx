'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'

export interface McapPoint { date: string; marketCap: number }

export interface EventPoint {
  date: string
  type: 'split' | 'dividend'
  label: string
  value: number | null
}

interface Props {
  data: McapPoint[]
  sp500Data: McapPoint[]
  showSp500: boolean
  logScale: boolean
  events?: EventPoint[]
}

// Milestone thresholds in USD
const MILESTONES = [
  { value: 100e9,  label: '$100B' },
  { value: 500e9,  label: '$500B' },
  { value: 1e12,   label: '$1T'   },
  { value: 2e12,   label: '$2T'   },
  { value: 3e12,   label: '$3T'   },
]

function fmtMarketCap(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(0)}B`
  return `$${(v / 1e6).toFixed(0)}M`
}

// Index both series to 100 at the first shared date (for comparison overlay)
function indexSeries(primary: McapPoint[], secondary: McapPoint[]): {
  combined: { date: string; ticker: number; sp500: number | null }[]
} {
  if (primary.length === 0) return { combined: [] }

  const sp500Map = new Map(secondary.map(d => [d.date, d.marketCap]))
  const base    = primary[0].marketCap
  const sp500Base = sp500Map.get(primary[0].date) ?? secondary[0]?.marketCap ?? 1

  const combined = primary.map(d => ({
    date: d.date,
    ticker: base > 0 ? (d.marketCap / base) * 100 : 0,
    sp500:  sp500Map.has(d.date) && sp500Base > 0
      ? ((sp500Map.get(d.date)! / sp500Base) * 100)
      : null,
  }))

  return { combined }
}

const tooltipStyle = {
  background: '#2B2930',
  border: 'none',
  borderRadius: 12,
  fontSize: 12,
}

// Find the nearest date string in a dataset to a given target date
function nearestDate(dates: string[], target: string): string | null {
  if (dates.length === 0) return null
  return dates.reduce((best, d) => Math.abs(d.localeCompare(target)) < Math.abs(best.localeCompare(target)) ? d : best)
}

export default function MarketCapChart({ data, sp500Data, showSp500, logScale, events = [] }: Props) {
  if (data.length === 0) return null

  // Only render splits as vertical markers (dividends are too frequent)
  const splits = events.filter(e => e.type === 'split')

  if (showSp500) {
    // Indexed comparison mode
    const { combined } = indexSeries(data, sp500Data)
    const dates = combined.map(d => d.date)

    return (
      <div className="w-full h-[360px] md:h-[460px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={combined} margin={{ top: 10, right: 16, bottom: 0, left: 10 }}>
            <defs>
              <linearGradient id="tickerGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#7CB9F4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#7CB9F4" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="sp500Grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#69F0AE" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#69F0AE" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#222029" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#938F99' }}
              tickFormatter={v => v.slice(0, 7)}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#938F99' }}
              tickFormatter={v => `${v.toFixed(0)}`}
              width={50}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={{ color: '#938F99' }}
              formatter={(value, name) => [
                `${typeof value === 'number' ? value.toFixed(1) : value} (indexed)`,
                name === 'ticker' ? 'Ticker' : 'S&P 500',
              ]}
            />
            <Legend
              formatter={v => v === 'ticker' ? 'Ticker' : 'S&P 500 Aggregate'}
              wrapperStyle={{ fontSize: 12, color: '#CAC4D0' }}
            />
            {splits.map(ev => {
              const x = nearestDate(dates, ev.date)
              if (!x) return null
              return (
                <ReferenceLine key={`split-${ev.date}`} x={x} stroke="#FF9800" strokeWidth={1.5}
                  strokeDasharray="4 2" strokeOpacity={0.8}
                  label={{ value: `✂ ${ev.label}`, position: 'top', fontSize: 9, fill: '#FF9800' }} />
              )
            })}
            <Area type="monotone" dataKey="ticker" stroke="#7CB9F4" strokeWidth={2} fill="url(#tickerGrad)" dot={false} connectNulls isAnimationActive={false} />
            <Area type="monotone" dataKey="sp500"  stroke="#69F0AE" strokeWidth={1.5} fill="url(#sp500Grad)" dot={false} strokeDasharray="5 3" connectNulls isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // Raw market cap mode — show milestones that are within range
  const min = Math.min(...data.map(d => d.marketCap))
  const max = Math.max(...data.map(d => d.marketCap))
  const visibleMilestones = MILESTONES.filter(m => m.value > min * 0.5 && m.value <= max * 1.05)
  const dates = data.map(d => d.date)

  return (
    <div className="w-full h-[360px] md:h-[460px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 10 }}>
          <defs>
            <linearGradient id="mcapGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#7CB9F4" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#7CB9F4" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#222029" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#938F99' }}
            tickFormatter={v => v.slice(0, 7)}
            interval="preserveStartEnd"
          />
          <YAxis
            scale={logScale ? 'log' : 'auto'}
            domain={logScale ? ['auto', 'auto'] : [0, 'auto']}
            tick={{ fontSize: 10, fill: '#938F99' }}
            tickFormatter={fmtMarketCap}
            width={64}
            allowDataOverflow
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ color: '#938F99' }}
            formatter={(v) => [fmtMarketCap(typeof v === 'number' ? v : 0), 'Market Cap']}
          />
          {visibleMilestones.map(m => (
            <ReferenceLine
              key={m.label}
              y={m.value}
              stroke="#FFD740"
              strokeDasharray="4 3"
              strokeOpacity={0.5}
              label={{ value: m.label, position: 'insideTopRight', fontSize: 10, fill: '#FFD740', opacity: 0.8 }}
            />
          ))}
          {splits.map(ev => {
            const x = nearestDate(dates, ev.date)
            if (!x) return null
            return (
              <ReferenceLine key={`split-${ev.date}`} x={x} stroke="#FF9800" strokeWidth={1.5}
                strokeDasharray="4 2" strokeOpacity={0.8}
                label={{ value: `✂ ${ev.label}`, position: 'top', fontSize: 9, fill: '#FF9800' }} />
            )
          })}
          <Area
            type="monotone"
            dataKey="marketCap"
            stroke="#7CB9F4"
            strokeWidth={2}
            fill="url(#mcapGrad)"
            dot={false}
            name="Market Cap"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
