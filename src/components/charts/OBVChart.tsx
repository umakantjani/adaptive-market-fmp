'use client'

import { ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { TAResult } from '@/types/market'
import { formatLargeNumber } from '@/lib/utils'

const tooltipStyle = {
  background: '#2B2930',
  border: 'none',
  borderRadius: 12,
  fontSize: 12,
}

export default function OBVChart({ ta }: { ta: TAResult }) {
  const data = ta.history.dates.map((date, i) => ({
    date,
    obv: ta.history.obv[i],
    volume: ta.history.volumes[i],
  }))

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs mb-1 px-1" style={{ color: '#938F99' }}>On-Balance Volume (OBV)</p>
        <div className="h-[180px] md:h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222029" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#938F99' }} tickFormatter={(v) => v.slice(5)} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#938F99' }} width={60} tickFormatter={(v) => formatLargeNumber(v)} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#938F99' }} formatter={(v) => formatLargeNumber(v as number)} />
              <Area type="monotone" dataKey="obv" stroke="#7CB9F4" fill="#7CB9F4" fillOpacity={0.1} strokeWidth={2} name="OBV" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div>
        <p className="text-xs mb-1 px-1" style={{ color: '#938F99' }}>Volume</p>
        <div className="h-[120px] md:h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222029" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#938F99' }} tickFormatter={(v) => v.slice(5)} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#938F99' }} width={60} tickFormatter={(v) => formatLargeNumber(v)} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#938F99' }} formatter={(v) => formatLargeNumber(v as number)} />
              <Bar dataKey="volume" fill="#7CB9F4" opacity={0.5} name="Volume" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
