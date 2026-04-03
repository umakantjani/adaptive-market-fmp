'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { TAResult, TickerInfo } from '@/types/market'
import { indicatorInfoMap, getContextualInterpretation } from '@/lib/indicatorInfo'
import { formatNumber } from '@/lib/utils'

interface Props {
  indicatorKey: string
  value: number | null
  ta: TAResult
  ticker: TickerInfo
  onClose: () => void
}

function getSignalLabel(key: string, value: number | null): { label: string; color: string } {
  if (value === null) return { label: 'N/A', color: 'var(--md-outline)' }
  switch (key) {
    case 'RSI (14)':
      if (value > 70) return { label: 'Overbought', color: '#CF6679' }
      if (value < 30) return { label: 'Oversold', color: '#69F0AE' }
      if (value > 55) return { label: 'Bullish', color: '#69F0AE' }
      if (value < 45) return { label: 'Bearish', color: '#CF6679' }
      return { label: 'Neutral', color: '#FFD740' }
    case 'Stoch %K/%D':
      if (value > 80) return { label: 'Overbought', color: '#CF6679' }
      if (value < 20) return { label: 'Oversold', color: '#69F0AE' }
      return { label: 'Neutral', color: '#FFD740' }
    case 'ADX (14)':
      if (value > 25) return { label: 'Strong Trend', color: 'var(--md-primary)' }
      if (value > 20) return { label: 'Emerging Trend', color: '#FFD740' }
      return { label: 'Ranging', color: 'var(--md-on-surface-variant)' }
    default:
      return { label: 'Active', color: 'var(--md-primary)' }
  }
}

export default function IndicatorModal({ indicatorKey, value, ta, ticker, onClose }: Props) {
  const info = indicatorInfoMap[indicatorKey]
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  if (!info || typeof document === 'undefined') return null

  const signal = getSignalLabel(indicatorKey, value)
  const contextText = getContextualInterpretation(indicatorKey, value, ticker.symbol, {
    rsi14: ta.rsi14, adx14: ta.adx14, diPlus: ta.diPlus, diMinus: ta.diMinus,
    macdHist: ta.macdHist, stochK: ta.stochK, bbUpper: ta.bbUpper, bbLower: ta.bbLower,
    currentPrice: ticker.currentPrice,
  })

  // Build sparkline data
  let sparkData: { i: number; v: number | null; v2?: number | null }[] = []
  if (info.historyKey && info.historyKey in ta.history) {
    const arr = ta.history[info.historyKey as keyof typeof ta.history] as (number | null)[]
    const arr2 = info.historyKey2 && info.historyKey2 in ta.history
      ? ta.history[info.historyKey2 as keyof typeof ta.history] as (number | null)[]
      : null
    sparkData = arr.slice(-40).map((v, i) => ({ i, v, v2: arr2 ? arr2.slice(-40)[i] : undefined }))
  }

  const tooltipStyle = {
    background: 'var(--md-surface-container-high)',
    border: 'none',
    borderRadius: 12,
    fontSize: 12,
  }

  const modal = (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
      }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <style>{`
        @media (min-width: 768px) {
          .indicator-modal-sheet {
            border-radius: 28px !important;
            max-width: 520px !important;
            margin: auto !important;
            align-self: center !important;
          }
        }
      `}</style>
      <div
        className="indicator-modal-sheet"
        style={{
          width: '100%',
          background: 'var(--md-surface-container-high)',
          borderRadius: '28px 28px 0 0',
          padding: 24,
          maxHeight: '88vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div style={{ width: 32, height: 4, borderRadius: 2, background: 'var(--md-outline)', margin: '0 auto 20px', opacity: 0.4 }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 500, color: 'var(--md-on-surface)', margin: 0 }}>{info.name}</h2>
            <p style={{ fontSize: 13, color: 'var(--md-on-surface-variant)', margin: '4px 0 0' }}>{ticker.symbol}</p>
          </div>
          <button onClick={onClose} className="md-ripple"
            style={{ padding: 8, borderRadius: 50, background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <X size={18} color="var(--md-on-surface-variant)" />
          </button>
        </div>

        {/* Current Reading */}
        <div style={{ background: 'var(--md-surface-container)', borderRadius: 20, padding: 16, marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: 'var(--md-outline)', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Current reading</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="num" style={{ fontSize: 32, fontWeight: 400, color: 'var(--md-on-surface)', fontVariantNumeric: 'tabular-nums' }}>
              {value !== null ? (info.unit === 'price' ? `$${formatNumber(value)}` : formatNumber(value, 1)) : 'N/A'}
            </span>
            <span style={{
              fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 16,
              color: signal.color, background: `${signal.color}20`,
            }}>
              {signal.label}
            </span>
          </div>
        </div>

        {/* Sparkline */}
        {sparkData.length > 0 && (
          <div style={{ background: 'var(--md-surface-container)', borderRadius: 20, padding: 16, marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: 'var(--md-outline)', marginBottom: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>40-period trend</p>
            <div style={{ height: 80 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData}>
                  {info.overboughtLevel && <ReferenceLine y={info.overboughtLevel} stroke="#CF6679" strokeDasharray="3 3" strokeWidth={1} />}
                  {info.oversoldLevel && <ReferenceLine y={info.oversoldLevel} stroke="#69F0AE" strokeDasharray="3 3" strokeWidth={1} />}
                  <Line type="monotone" dataKey="v" stroke="var(--md-primary)" strokeWidth={1.5} dot={false} connectNulls />
                  {info.historyKey2 && <Line type="monotone" dataKey="v2" stroke="#FFD740" strokeWidth={1} dot={false} connectNulls />}
                </LineChart>
              </ResponsiveContainer>
            </div>
            {info.historyKey2 && (
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                <span style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--md-primary)' }}>
                  <span style={{ display: 'inline-block', width: 12, height: 2, borderRadius: 1, background: 'var(--md-primary)' }} />
                  {indicatorKey === 'MACD' ? 'Histogram' : '%K'}
                </span>
                <span style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, color: '#FFD740' }}>
                  <span style={{ display: 'inline-block', width: 12, height: 2, borderRadius: 1, background: '#FFD740' }} />
                  {indicatorKey === 'MACD' ? 'MACD Line' : indicatorKey === 'ADX (14)' ? '+DI' : '%D'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Context */}
        <div style={{ background: 'var(--md-surface-container)', borderRadius: 20, padding: 16, borderLeft: '3px solid var(--md-primary)', marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--md-primary)', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            What this means for {ticker.symbol}
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--md-on-surface-variant)', margin: 0 }}>{contextText}</p>
        </div>

        {/* Formula */}
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: 'var(--md-outline)', marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Formula</p>
          <p style={{ fontSize: 12, fontFamily: 'monospace', lineHeight: 1.6, color: 'var(--md-on-surface-variant)', background: 'var(--md-surface-container)', padding: '10px 14px', borderRadius: 12, margin: 0 }}>{info.formula}</p>
        </div>

        {/* How to use */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, color: 'var(--md-outline)', marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>How to use</p>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--md-on-surface-variant)', margin: 0 }}>{info.interpretation}</p>
        </div>

        {/* Bull / Bear */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ borderRadius: 16, padding: 14, background: 'rgba(105,240,174,0.08)', border: '1px solid rgba(105,240,174,0.2)' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#69F0AE', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Bullish Signal</p>
            <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--md-on-surface-variant)', margin: 0 }}>{info.bullishCondition}</p>
          </div>
          <div style={{ borderRadius: 16, padding: 14, background: 'rgba(207,102,121,0.08)', border: '1px solid rgba(207,102,121,0.2)' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#CF6679', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Bearish Signal</p>
            <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--md-on-surface-variant)', margin: 0 }}>{info.bearishCondition}</p>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
