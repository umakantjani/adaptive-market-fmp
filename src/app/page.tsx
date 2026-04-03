'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SearchBar from '@/components/SearchBar'
import { TrendingUp } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { MenuButton } from '@/components/Sidebar'

const POPULAR = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'TSLA', name: 'Tesla, Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.' },
  { symbol: 'SPY', name: 'S&P 500 ETF' },
  { symbol: 'QQQ', name: 'Nasdaq-100 ETF' },
  { symbol: 'MSFT', name: 'Microsoft Corp.' },
  { symbol: 'AMZN', name: 'Amazon.com' },
  { symbol: 'META', name: 'Meta Platforms' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'BTC-USD', name: 'Bitcoin' },
  { symbol: 'SOXL', name: 'Semiconductor Bull 3X' },
]

export default function HomePage() {
  const [recents, setRecents] = useState<string[]>([])
  const [tab, setTab] = useState<'popular' | 'recent'>('popular')
  const router = useRouter()

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('am_recent_tickers') || '[]') as string[]
      setRecents(stored)
      if (stored.length > 0) setTab('recent')
    } catch {}
  }, [])

  const displayList = tab === 'recent'
    ? recents.map(s => ({ symbol: s, name: '' }))
    : POPULAR

  return (
    <div style={{ minHeight: '100vh', background: 'var(--md-background)', paddingBottom: 0 }}
     >

      {/* Mobile top bar only */}
      <header className="md:hidden" style={{
        height: 52, padding: '0 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--md-surface)',
        borderBottom: '1px solid var(--md-outline-variant)',
      }}>
        <MenuButton />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <TrendingUp size={18} color="var(--md-primary)" />
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--md-on-surface)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Adaptive
          </span>
        </div>
        <UserButton />
      </header>

      {/* Main content */}
      <main style={{ maxWidth: 680, margin: '0 auto', padding: '40px 20px 24px' }}>

        {/* Hero */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--md-on-surface)', letterSpacing: '-0.3px', margin: '0 0 6px', lineHeight: 1.2 }}>
            Market Intelligence
          </h1>
          <p style={{ fontSize: 13, color: 'var(--md-on-surface-variant)', margin: 0 }}>
            Institutional technical analysis · AI-powered research · DCF valuation
          </p>
        </div>

        {/* Search */}
        <div style={{ marginBottom: 28 }}>
          <SearchBar />
        </div>

        {/* Tab row */}
        {recents.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {(['popular', 'recent'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="md-ripple"
                style={{
                  padding: '5px 12px', borderRadius: 5,
                  border: `1px solid ${tab === t ? 'var(--md-primary)' : 'var(--md-outline-variant)'}`,
                  background: tab === t ? 'rgba(77,187,255,0.1)' : 'transparent',
                  color: tab === t ? 'var(--md-primary)' : 'var(--md-on-surface-variant)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  letterSpacing: '0.03em', textTransform: 'uppercase',
                }}>
                {t === 'popular' ? 'Popular' : 'Recent'}
              </button>
            ))}
          </div>
        )}

        {/* Ticker grid */}
        <style>{`
          .ticker-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
          @media (min-width: 480px) { .ticker-grid { grid-template-columns: repeat(3, 1fr); } }
          @media (min-width: 768px) { .ticker-grid { grid-template-columns: repeat(4, 1fr); } }
        `}</style>
        <div className="ticker-grid">
          {displayList.map(({ symbol, name }) => (
            <button
              key={symbol}
              onClick={() => router.push(`/ticker/${symbol}`)}
              className="md-ripple"
              style={{
                textAlign: 'left',
                padding: '12px 14px',
                borderRadius: 8,
                background: 'var(--md-surface-container)',
                border: '1px solid var(--md-outline-variant)',
                cursor: 'pointer',
                transition: 'border-color 120ms',
              }}>
              <div style={{
                fontSize: 13, fontWeight: 700, color: 'var(--md-on-surface)',
                fontVariantNumeric: 'tabular-nums', letterSpacing: '0.03em', marginBottom: 2,
              }}>{symbol}</div>
              {name && <div style={{ fontSize: 11, color: 'var(--md-on-surface-variant)', lineHeight: 1.3 }}>{name}</div>}
            </button>
          ))}
        </div>
      </main>

      <footer style={{ padding: '12px 20px', borderTop: '1px solid var(--md-outline-variant)', textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: 'var(--md-outline)', margin: 0, letterSpacing: '0.02em' }}>
          Data from Yahoo Finance · Not financial advice
        </p>
      </footer>

    </div>
  )
}
