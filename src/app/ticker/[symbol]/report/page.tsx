'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import AIReport from '@/components/AIReport'
import MobileNav from '@/components/MobileNav'
import type { FullTickerData } from '@/types/market'

export default function TickerReportPage() {
  const params = useParams()
  const router = useRouter()
  const symbol = (params.symbol as string).toUpperCase()
  const [data, setData] = useState<FullTickerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/ticker/${symbol}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .catch(() => setError('Network error. Please try again.'))
      .finally(() => setLoading(false))
  }, [symbol])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--md-background)', paddingBottom: 80 }}
      className="md:pb-0">
      {/* Top App Bar */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 30,
        height: 64, padding: '0 8px 0 4px',
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--md-surface)',
        borderBottom: '1px solid var(--md-outline-variant)',
      }}>
        <button onClick={() => router.back()} className="md-ripple"
          style={{ padding: 12, borderRadius: 50, background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={22} color="var(--md-on-surface-variant)" />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 18, fontWeight: 500, color: 'var(--md-on-surface)', margin: 0 }}>
            AI Report
          </h1>
          {data && (
            <p style={{ fontSize: 12, color: 'var(--md-on-surface-variant)', margin: 0 }}>
              {symbol} · {data.ticker.name}
            </p>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px' }}>
        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[60, 400, 200].map((h, i) => (
              <div key={i} className="animate-pulse"
                style={{ height: h, borderRadius: 24, background: 'var(--md-surface-container)' }} />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding: '16px 20px', borderRadius: 16, background: 'rgba(239,83,80,0.1)', color: '#EF5350', fontSize: 14 }}>
            {error}
          </div>
        )}

        {/* Report */}
        {data && (
          <AIReport ticker={data.ticker} ta={data.ta} />
        )}
      </main>
      <MobileNav active="reports" symbol={symbol} />
    </div>
  )
}
