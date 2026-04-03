'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SearchBar from '@/components/SearchBar'
import { TrendingUp, BookOpen, Calculator, ScrollText } from 'lucide-react'
import MobileNav from '@/components/MobileNav'
import { UserButton } from '@clerk/nextjs'

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
    <div style={{ minHeight: '100vh', background: 'var(--md-background)', display: 'flex', flexDirection: 'column', paddingBottom: 80 }}
      className="md:pb-0">
      {/* Top App Bar */}
      <header style={{
        height: 64,
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--md-surface)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <TrendingUp size={24} color="var(--md-primary)" />
          <span style={{ fontSize: 22, fontWeight: 500, color: 'var(--md-on-surface)', letterSpacing: 0 }}>
            Adaptive Market
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => router.push('/reports')}
            className="md-ripple"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', borderRadius: 20,
              background: 'var(--md-surface-container)',
              color: 'var(--md-on-surface-variant)',
              border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500,
            }}>
            <BookOpen size={16} />
            Reports
          </button>
          <button
            onClick={() => router.push('/valuations')}
            className="md-ripple"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', borderRadius: 20,
              background: 'var(--md-surface-container)',
              color: '#69F0AE',
              border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500,
            }}>
            <Calculator size={16} />
            Valuations
          </button>
          <button
            onClick={() => router.push('/logs')}
            className="md-ripple"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', borderRadius: 20,
              background: 'var(--md-surface-container)',
              color: 'var(--md-on-surface-variant)',
              border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500,
            }}>
            <ScrollText size={16} />
            Logs
          </button>
          <UserButton />
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px 24px' }}>
        <div style={{ width: '100%', maxWidth: 600 }}>
          {/* Hero */}
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h1 style={{ fontSize: 40, fontWeight: 400, color: 'var(--md-on-background)', letterSpacing: '-0.5px', marginBottom: 12, lineHeight: 1.2 }}>
              Market Intelligence
            </h1>
            <p style={{ fontSize: 16, color: 'var(--md-on-surface-variant)', fontWeight: 400 }}>
              Technical analysis and AI-powered research
            </p>
          </div>

          {/* Search */}
          <div style={{ marginBottom: 40 }}>
            <SearchBar />
          </div>

          {/* Tab Row */}
          {recents.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {(['popular', 'recent'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="md-ripple"
                  style={{
                    padding: '6px 16px',
                    borderRadius: 8,
                    border: `1px solid ${tab === t ? 'var(--md-primary)' : 'var(--md-outline-variant)'}`,
                    background: tab === t ? 'rgba(124,185,244,0.12)' : 'transparent',
                    color: tab === t ? 'var(--md-primary)' : 'var(--md-on-surface-variant)',
                    fontSize: 14, fontWeight: 500, cursor: 'pointer',
                  }}>
                  {t === 'popular' ? 'Popular' : 'Recent'}
                </button>
              ))}
            </div>
          )}

          {/* Ticker Grid */}
          <style>{`
            .ticker-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
            @media (min-width: 768px) { .ticker-grid { grid-template-columns: repeat(5, 1fr); } }
          `}</style>
          <div className="ticker-grid">
            {displayList.map(({ symbol, name }) => (
              <button
                key={symbol}
                onClick={() => router.push(`/ticker/${symbol}`)}
                className="md-ripple"
                style={{
                  textAlign: 'left',
                  padding: '16px',
                  borderRadius: 16,
                  background: 'var(--md-surface-container)',
                  border: 'none', cursor: 'pointer',
                }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--md-on-surface)', marginBottom: 4 }}>{symbol}</div>
                {name && <div style={{ fontSize: 12, color: 'var(--md-on-surface-variant)', lineHeight: 1.3 }}>{name}</div>}
              </button>
            ))}
          </div>
        </div>
      </main>

      <footer style={{ padding: '16px 24px', textAlign: 'center', borderTop: '1px solid var(--md-outline-variant)' }}>
        <p style={{ fontSize: 12, color: 'var(--md-outline)' }}>Data from Yahoo Finance · Not financial advice</p>
      </footer>
      <MobileNav active="home" />
    </div>
  )
}
