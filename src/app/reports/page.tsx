'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { ArrowLeft, Heart, MessageCircle, TrendingUp, TrendingDown, Calculator, BarChart2 } from 'lucide-react'
import { MenuButton } from '@/components/Sidebar'

type Tab = 'ta' | 'valuation'

interface TAReportItem {
  id: number
  generatedAt: string
  period: string
  excerpt: string
  likes: number
  commentCount: number
  ticker: { symbol: string; name: string }
}

interface ValuationItem {
  id: number
  generatedAt: string
  intrinsicValue: number
  currentPrice: number
  marginOfSafety: number
  likes: number
  ticker: { symbol: string; name: string }
}

function ReportsPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab: Tab = searchParams.get('tab') === 'valuation' ? 'valuation' : 'ta'

  const [tab, setTab] = useState<Tab>(initialTab)
  const [taReports, setTaReports] = useState<TAReportItem[]>([])
  const [valuations, setValuations] = useState<ValuationItem[]>([])
  const [loadingTA, setLoadingTA] = useState(true)
  const [loadingVal, setLoadingVal] = useState(true)

  useEffect(() => {
    fetch('/api/reports')
      .then(r => r.json())
      .then(d => setTaReports(d.reports || []))
      .finally(() => setLoadingTA(false))

    fetch('/api/valuations')
      .then(r => r.json())
      .then(d => setValuations(d.valuations || []))
      .finally(() => setLoadingVal(false))
  }, [])

  const loading = tab === 'ta' ? loadingTA : loadingVal

  return (
    <div style={{ minHeight: '100vh', background: 'var(--md-background)', paddingBottom: 0 }}
     >
      {/* Top App Bar — mobile only */}
      <header className="md:hidden" style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'var(--md-surface)',
        borderBottom: '1px solid var(--md-outline-variant)',
      }}>
        <div style={{ height: 52, padding: '0 16px 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <MenuButton />
          <h1 style={{ fontSize: 16, fontWeight: 600, color: 'var(--md-on-surface)', margin: 0, flex: 1 }}>Research</h1>
        </div>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', padding: '0 16px', gap: 4 }}>
          {([
            { key: 'ta' as Tab, label: 'TA Reports', icon: BarChart2 },
            { key: 'valuation' as Tab, label: 'Valuation Reports', icon: Calculator },
          ] as { key: Tab; label: string; icon: typeof BarChart2 }[]).map(({ key, label, icon: Icon }) => {
            const active = tab === key
            return (
              <button key={key} onClick={() => setTab(key)} className="md-ripple"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 16px',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: active ? 600 : 400,
                  color: active ? 'var(--md-primary)' : 'var(--md-on-surface-variant)',
                  borderBottom: active ? '2px solid var(--md-primary)' : '2px solid transparent',
                  borderRadius: '4px 4px 0 0',
                  marginBottom: -1,
                }}>
                <Icon size={15} />
                {label}
                {key === 'ta' && !loadingTA && (
                  <span style={{
                    fontSize: 11, padding: '1px 7px', borderRadius: 10,
                    background: active ? 'rgba(124,185,244,0.16)' : 'var(--md-surface-container)',
                    color: active ? 'var(--md-primary)' : 'var(--md-outline)',
                    fontWeight: 600,
                  }}>{taReports.length}</span>
                )}
                {key === 'valuation' && !loadingVal && (
                  <span style={{
                    fontSize: 11, padding: '1px 7px', borderRadius: 10,
                    background: active ? 'rgba(105,240,174,0.16)' : 'var(--md-surface-container)',
                    color: active ? '#69F0AE' : 'var(--md-outline)',
                    fontWeight: 600,
                  }}>{valuations.length}</span>
                )}
              </button>
            )
          })}
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px' }}>

        {/* Loading skeletons */}
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse"
            style={{ height: 100, borderRadius: 10, background: 'var(--md-surface-container)', marginBottom: 10 }} />
        ))}

        {/* ── TA Reports ──────────────────────────────────────────────────── */}
        {tab === 'ta' && !loading && (
          <>
            {taReports.length === 0 && (
              <div style={{ textAlign: 'center', padding: '80px 16px' }}>
                <TrendingUp size={44} style={{ color: 'var(--md-on-surface-variant)', opacity: 0.3, margin: '0 auto 16px', display: 'block' }} />
                <p style={{ fontSize: 14, color: 'var(--md-outline)', margin: 0 }}>
                  No TA reports yet. Generate your first AI report from any ticker page.
                </p>
              </div>
            )}

            {taReports.map(r => (
              <button key={r.id} onClick={() => router.push(`/reports/${r.id}`)}
                className="md-ripple"
                style={{
                  width: '100%', textAlign: 'left',
                  background: 'var(--md-surface-container)',
                  borderRadius: 10, padding: 16, marginBottom: 10,
                  border: '1px solid var(--md-outline-variant)', cursor: 'pointer', display: 'block',
                }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--md-on-surface)' }}>{r.ticker.symbol}</span>
                    <span style={{ fontSize: 13, color: 'var(--md-on-surface-variant)' }}>{r.ticker.name}</span>
                  </div>
                  <time style={{ fontSize: 12, color: 'var(--md-outline)', flexShrink: 0 }}>
                    {new Date(r.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </time>
                </div>
                <p style={{
                  fontSize: 14, color: 'var(--md-on-surface-variant)', lineHeight: 1.6,
                  marginTop: 8, marginBottom: 16,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {r.excerpt}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--md-outline)' }}>
                    <Heart size={14} /> {r.likes}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--md-outline)' }}>
                    <MessageCircle size={14} /> {r.commentCount}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto', fontSize: 12, padding: '3px 10px', borderRadius: 10, background: 'rgba(124,185,244,0.1)', color: 'var(--md-primary)', fontWeight: 500 }}>
                    <BarChart2 size={12} /> TA Report
                  </span>
                </div>
              </button>
            ))}
          </>
        )}

        {/* ── Valuation Reports ───────────────────────────────────────────── */}
        {tab === 'valuation' && !loading && (
          <>
            {valuations.length === 0 && (
              <div style={{ textAlign: 'center', padding: '80px 16px' }}>
                <Calculator size={44} style={{ color: 'var(--md-on-surface-variant)', opacity: 0.3, margin: '0 auto 16px', display: 'block' }} />
                <p style={{ fontSize: 14, color: 'var(--md-outline)', margin: 0 }}>
                  No valuation reports yet. Run a DCF valuation from any ticker page.
                </p>
              </div>
            )}

            {valuations.map(v => {
              const isUnder = v.marginOfSafety < 0
              const mosAbs = Math.abs(v.marginOfSafety * 100)
              const mosColor = v.marginOfSafety > 0.2 ? '#CF6679' : v.marginOfSafety < -0.2 ? '#69F0AE' : '#FFD740'
              const mosLabel = isUnder ? `${mosAbs.toFixed(1)}% Undervalued` : `${mosAbs.toFixed(1)}% Overvalued`

              return (
                <button key={v.id}
                  onClick={() => router.push(`/valuations/${v.id}`)}
                  className="md-ripple"
                  style={{
                    width: '100%', textAlign: 'left',
                    background: 'var(--md-surface-container)',
                    borderRadius: 10, padding: 16, marginBottom: 10,
                    border: '1px solid var(--md-outline-variant)', cursor: 'pointer', display: 'block',
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--md-outline)', margin: '0 0 2px' }}>Intrinsic Value</p>
                      <p className="num" style={{ fontSize: 20, fontWeight: 600, color: 'var(--md-on-surface)', margin: 0 }}>
                        ${v.intrinsicValue.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--md-outline)', margin: '0 0 2px' }}>Price at Analysis</p>
                      <p className="num" style={{ fontSize: 20, fontWeight: 600, color: 'var(--md-on-surface-variant)', margin: 0 }}>
                        ${v.currentPrice.toFixed(2)}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                      {isUnder ? <TrendingUp size={14} color="#69F0AE" /> : <TrendingDown size={14} color="#CF6679" />}
                      <span style={{
                        fontSize: 13, fontWeight: 700, padding: '3px 12px', borderRadius: 12,
                        color: mosColor, background: `${mosColor}20`,
                      }}>{mosLabel}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--md-outline)' }}>
                      <Heart size={14} /> {v.likes}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto', fontSize: 12, padding: '3px 10px', borderRadius: 10, background: 'rgba(105,240,174,0.1)', color: '#69F0AE', fontWeight: 500 }}>
                      <Calculator size={12} /> DCF Valuation
                    </span>
                  </div>
                </button>
              )
            })}
          </>
        )}
      </main>
    </div>
  )
}

export default function ReportsPage() {
  return (
    <Suspense>
      <ReportsPageInner />
    </Suspense>
  )
}
