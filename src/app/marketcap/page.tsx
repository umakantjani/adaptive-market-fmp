'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import SearchBar from '@/components/SearchBar'
import { CircleDollarSign, TrendingUp } from 'lucide-react'
import { MenuButton } from '@/components/Sidebar'

export default function MarketCapIndexPage() {
  const router = useRouter()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--md-background)' }}>
      <header className="md:hidden" style={{
        height: 52, padding: '0 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--md-surface)',
        borderBottom: '1px solid var(--md-outline-variant)',
      }}>
        <MenuButton />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CircleDollarSign size={18} color="var(--md-primary)" />
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--md-on-surface)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Market Cap
          </span>
        </div>
        <div style={{ width: 36 }} />
      </header>

      <main style={{ maxWidth: 640, margin: '0 auto', padding: '80px 20px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <CircleDollarSign size={40} color="var(--md-primary)" style={{ margin: '0 auto 16px' }} />
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--md-on-surface)', margin: '0 0 10px' }}>
            Market Cap History
          </h1>
          <p style={{ fontSize: 14, color: 'var(--md-on-surface-variant)', margin: 0 }}>
            Search for any ticker to view its full market capitalisation history, growth trajectory, milestone crossings, and AI-powered narrative. Select a result and click <strong>Market Cap</strong> in the sidebar.
          </p>
        </div>

        <SearchBar />

        <div style={{ marginTop: 32, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'BRK-B'].map(sym => (
            <button
              key={sym}
              onClick={() => router.push(`/ticker/${sym}/marketcap`)}
              className="md-ripple"
              style={{
                padding: '6px 16px', borderRadius: 20,
                background: 'var(--md-surface-container)',
                border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 500,
                color: 'var(--md-on-surface-variant)',
              }}
            >
              {sym}
            </button>
          ))}
        </div>

        {/* S&P 500 Quarterly card */}
        <div style={{ marginTop: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--md-outline)', marginBottom: 10 }}>
            Index Analytics
          </div>
          <Link href="/marketcap/sp500-quarterly" style={{ textDecoration: 'none' }}>
            <div className="md-ripple" style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '16px 20px', borderRadius: 14,
              background: 'var(--md-surface-container)',
              border: '1px solid var(--md-outline-variant)',
              cursor: 'pointer',
            }}>
              <TrendingUp size={28} color="var(--md-primary)" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--md-on-surface)', marginBottom: 3 }}>
                  S&amp;P 500 Quarterly
                </div>
                <div style={{ fontSize: 12, color: 'var(--md-on-surface-variant)' }}>
                  Top 10 components by market cap · heatmap + bar chart · 5Q to All
                </div>
              </div>
            </div>
          </Link>
        </div>

      </main>
    </div>
  )
}
