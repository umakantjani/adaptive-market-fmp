'use client'

import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { TAResult } from '@/types/market'

const tooltipStyle = {
  background: '#2B2930',
  border: 'none',
  borderRadius: 12,
  fontSize: 12,
}

export default function StochADXChart({ ta }: { ta: TAResult }) {
  const stochData = ta.history.dates.map((date, i) => ({
    date,
    k: ta.history.stochK[i],
    d: ta.history.stochD[i],
  }))

  const adxData = ta.history.dates.map((date, i) => ({
    date,
    adx: ta.history.adx[i],
    diPlus: ta.history.diPlus[i],
    diMinus: ta.history.diMinus[i],
  }))

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs mb-1 px-1" style={{ color: '#938F99' }}>Stochastic (14,3)</p>
        <div className="h-[150px] md:h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={stochData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222029" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#938F99' }} tickFormatter={(v) => v.slice(5)} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#938F99' }} width={35} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#938F99' }} formatter={(v) => (v as number)?.toFixed(1)} />
              <ReferenceLine y={80} stroke="#CF6679" strokeDasharray="4 2" />
              <ReferenceLine y={20} stroke="#69F0AE" strokeDasharray="4 2" />
              <Line type="monotone" dataKey="k" stroke="#7CB9F4" strokeWidth={2} dot={false} name="%K" connectNulls />
              <Line type="monotone" dataKey="d" stroke="#FFD740" strokeWidth={1.5} dot={false} name="%D" connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div>
        <p className="text-xs mb-1 px-1" style={{ color: '#938F99' }}>ADX / DMI (14)</p>
        <div className="h-[150px] md:h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={adxData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222029" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#938F99' }} tickFormatter={(v) => v.slice(5)} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#938F99' }} width={35} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#938F99' }} formatter={(v) => (v as number)?.toFixed(1)} />
              <ReferenceLine y={25} stroke="#36343B" strokeDasharray="4 2" label={{ value: '25', fill: '#938F99', fontSize: 10 }} />
              <Line type="monotone" dataKey="adx" stroke="#FFD740" strokeWidth={2} dot={false} name="ADX" connectNulls />
              <Line type="monotone" dataKey="diPlus" stroke="#69F0AE" strokeWidth={1.5} dot={false} name="+DI" connectNulls />
              <Line type="monotone" dataKey="diMinus" stroke="#CF6679" strokeWidth={1.5} dot={false} name="-DI" connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
