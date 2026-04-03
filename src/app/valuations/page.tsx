'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, TrendingUp, TrendingDown, Calculator } from 'lucide-react'

interface ValuationItem {
  id: number
  generatedAt: string
  intrinsicValue: number
  currentPrice: number
  marginOfSafety: number
  likes: number
  ticker: { symbol: string; name: string }
}

export default function ValuationsPage() {
  const [valuations, setValuations] = useState<ValuationItem[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/valuations')
      .then(r => r.json())
      .then(d => setValuations(d.valuations || []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--md-background)' }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 30,
        height: 64, padding: '0 8px 0 4px',
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--md-surface)',
        borderBottom: '1px solid var(--md-outline-variant)',
      }}>
        <button onClick={() => router.push('/')} className="md-ripple"
          style={{ padding: 12, borderRadius: 50, background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={22} color="var(--md-on-surface-variant)" />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 500, color: 'var(--md-on-surface)', margin: 0 }}>Valuations</h1>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse"
            style={{ height: 120, borderRadius: 20, background: 'var(--md-surface-container)', marginBottom: 12 }} />
        ))}

        {!loading && valuations.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 16px' }}>
            <Calculator size={44} style={{ color: 'var(--md-on-surface-variant)', opacity: 0.3, margin: '0 auto 16px', display: 'block' }} />
            <p style={{ fontSize: 14, color: 'var(--md-outline)', margin: 0 }}>
              No valuations yet. Run your first DCF from any ticker page.
            </p>
          </div>
        )}

        {valuations.map(v => {
          const isUndervalued = v.marginOfSafety < 0
          const mosAbs = Math.abs(v.marginOfSafety * 100)
          const mosColor = v.marginOfSafety > 0.2 ? '#CF6679' : v.marginOfSafety < -0.2 ? '#69F0AE' : '#FFD740'
          const mosLabel = isUndervalued
            ? `${mosAbs.toFixed(1)}% Undervalued`
            : `${mosAbs.toFixed(1)}% Overvalued`

          return (
            <button
              key={v.id}
              onClick={() => router.push(`/valuations/${v.id}`)}
              className="md-ripple"
              style={{
                width: '100%', textAlign: 'left',
                background: 'var(--md-surface-container)',
                borderRadius: 20, padding: 20, marginBottom: 12,
                border: 'none', cursor: 'pointer', display: 'block',
              }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--md-on-surface)' }}>{v.ticker.symbol}</span>
                  <span style={{ fontSize: 13, color: 'var(--md-on-surface-variant)' }}>{v.ticker.name}</span>
                </div>
                <time style={{ fontSize: 12, color: 'var(--md-outline)', flexShrink: 0 }}>
                  {new Date(v.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </time>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--md-outline)', margin: '0 0 2px' }}>Intrinsic Value</p>
                  <p className="num" style={{ fontSize: 18, fontWeight: 600, color: 'var(--md-on-surface)', margin: 0 }}>
                    ${v.intrinsicValue.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--md-outline)', margin: '0 0 2px' }}>Price at Analysis</p>
                  <p className="num" style={{ fontSize: 18, fontWeight: 600, color: 'var(--md-on-surface)', margin: 0 }}>
                    ${v.currentPrice.toFixed(2)}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                  {isUndervalued ? <TrendingUp size={16} color="#69F0AE" /> : <TrendingDown size={16} color="#CF6679" />}
                  <span style={{
                    fontSize: 13, fontWeight: 700, padding: '4px 12px', borderRadius: 12,
                    color: mosColor, background: `${mosColor}20`,
                  }}>{mosLabel}</span>
                </div>
              </div>
            </button>
          )
        })}
      </main>
    </div>
  )
}
