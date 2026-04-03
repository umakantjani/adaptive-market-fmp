'use client'

import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { TAResult } from '@/types/market'

const tooltipStyle = {
  background: '#2B2930',
  border: 'none',
  borderRadius: 12,
  fontSize: 12,
}

export default function RSIMACDChart({ ta }: { ta: TAResult }) {
  const rsiData = ta.history.dates.map((date, i) => ({
    date,
    rsi: ta.history.rsi[i],
  }))

  const macdData = ta.history.dates.map((date, i) => ({
    date,
    macdLine: ta.history.macdLine[i],
    macdSignal: ta.history.macdSignal[i],
    macdHist: ta.history.macdHist[i],
  }))

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs mb-1 px-1" style={{ color: '#938F99' }}>RSI (14)</p>
        <div className="h-[150px] md:h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rsiData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222029" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#938F99' }} tickFormatter={(v) => v.slice(5)} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#938F99' }} width={35} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#938F99' }} />
              <ReferenceLine y={70} stroke="#CF6679" strokeDasharray="4 2" label={{ value: '70', fill: '#CF6679', fontSize: 10 }} />
              <ReferenceLine y={30} stroke="#69F0AE" strokeDasharray="4 2" label={{ value: '30', fill: '#69F0AE', fontSize: 10 }} />
              <ReferenceLine y={50} stroke="#36343B" strokeDasharray="2 2" />
              <Line type="monotone" dataKey="rsi" stroke="#7CB9F4" strokeWidth={2} dot={false} name="RSI" connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div>
        <p className="text-xs mb-1 px-1" style={{ color: '#938F99' }}>MACD (12,26,9)</p>
        <div className="h-[150px] md:h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={macdData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222029" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#938F99' }} tickFormatter={(v) => v.slice(5)} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#938F99' }} width={50} tickFormatter={(v) => v.toFixed(2)} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#938F99' }} formatter={(v) => (v as number)?.toFixed(4)} />
              <ReferenceLine y={0} stroke="#36343B" />
              <Bar dataKey="macdHist" name="Histogram" fill="#7CB9F4" opacity={0.7} />
              <Line type="monotone" dataKey="macdLine" stroke="#FFD740" strokeWidth={1.5} dot={false} name="MACD" connectNulls />
              <Line type="monotone" dataKey="macdSignal" stroke="#CF6679" strokeWidth={1.5} dot={false} name="Signal" connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
