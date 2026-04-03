'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Heart, TrendingUp, TrendingDown, Calculator, ExternalLink } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import dynamic from 'next/dynamic'
import type { DCFResults } from '@/types/valuation'

const ExportButtons = dynamic(() => import('@/components/ExportButtons'), { ssr: false })

interface SavedValuation {
  id: number
  generatedAt: string
  intrinsicValue: number
  currentPrice: number
  marginOfSafety: number
  reportText: string | null
  resultsJson: string
  inputsJson: string
  likes: number
  ticker: { symbol: string; name: string }
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`
const $M = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}M`

export default function ValuationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [valuation, setValuation] = useState<SavedValuation | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [liked, setLiked] = useState(false)

  useEffect(() => {
    const likedIds: number[] = JSON.parse(localStorage.getItem('am_liked_valuations') || '[]')
    setLiked(likedIds.includes(parseInt(id)))

    fetch(`/api/valuations/${id}`)
      .then(r => { if (r.status === 404) { setNotFound(true); return null } return r.json() })
      .then(d => { if (d) setValuation(d) })
      .finally(() => setLoading(false))
  }, [id])

  async function toggleLike() {
    if (!valuation) return
    const likedIds: number[] = JSON.parse(localStorage.getItem('am_liked_valuations') || '[]')
    const newLiked = !liked
    setLiked(newLiked)
    if (newLiked) {
      localStorage.setItem('am_liked_valuations', JSON.stringify([...likedIds, valuation.id]))
      await fetch(`/api/valuations/${valuation.id}`, { method: 'POST' })
    } else {
      localStorage.setItem('am_liked_valuations', JSON.stringify(likedIds.filter(x => x !== valuation.id)))
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--md-background)', padding: '24px 16px' }}>
      {[64, 120, 400].map((h, i) => (
        <div key={i} className="animate-pulse" style={{ height: h, borderRadius: 20, background: 'var(--md-surface-container)', marginBottom: 12, maxWidth: 800, margin: '0 auto 12px' }} />
      ))}
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: 'var(--md-background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: 'var(--md-outline)', marginBottom: 16 }}>Valuation report not found.</p>
        <button onClick={() => router.push('/reports?tab=valuation')}
          style={{ padding: '10px 20px', borderRadius: 20, background: 'var(--md-primary)', color: 'var(--md-on-primary)', border: 'none', cursor: 'pointer' }}>
          ← All Valuations
        </button>
      </div>
    </div>
  )

  if (!valuation) return null

  const dcfResults: DCFResults | null = (() => {
    try { return JSON.parse(valuation.resultsJson) } catch { return null }
  })()

  const mosColor = valuation.marginOfSafety > 0.2 ? '#CF6679'
    : valuation.marginOfSafety < -0.2 ? '#69F0AE'
    : '#FFD740'
  const isUnder = valuation.marginOfSafety < 0
  const mosLabel = isUnder
    ? `${Math.abs(valuation.marginOfSafety * 100).toFixed(1)}% Undervalued`
    : `${(valuation.marginOfSafety * 100).toFixed(1)}% Overvalued`

  return (
    <div style={{ minHeight: '100vh', background: 'var(--md-background)' }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 30, height: 64,
        padding: '0 16px 0 4px', display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--md-surface)', borderBottom: '1px solid var(--md-outline-variant)',
      }}>
        <button onClick={() => router.push('/reports?tab=valuation')} className="md-ripple"
          style={{ padding: 12, borderRadius: 50, background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={22} color="var(--md-on-surface-variant)" />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 18, fontWeight: 500, color: 'var(--md-on-surface)', margin: 0 }}>
            {valuation.ticker.symbol} — Valuation Report
          </h1>
          <p style={{ fontSize: 12, color: 'var(--md-on-surface-variant)', margin: 0 }}>
            {new Date(valuation.generatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <button onClick={() => router.push(`/ticker/${valuation.ticker.symbol}/valuation`)}
          className="md-ripple"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 20, background: 'var(--md-surface-container)', color: 'var(--md-primary)', border: 'none', cursor: 'pointer', fontSize: 13 }}>
          <Calculator size={13} /> New Valuation
        </button>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px 60px' }}>

        {/* Key metrics strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12, marginBottom: 16 }}>
          <div style={{ background: 'var(--md-surface-container)', borderRadius: 16, padding: '16px 20px' }}>
            <p style={{ fontSize: 11, color: 'var(--md-outline)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Intrinsic Value</p>
            <p className="num" style={{ fontSize: 28, fontWeight: 300, color: 'var(--md-on-surface)', margin: 0 }}>${valuation.intrinsicValue.toFixed(2)}</p>
          </div>
          <div style={{ background: 'var(--md-surface-container)', borderRadius: 16, padding: '16px 20px' }}>
            <p style={{ fontSize: 11, color: 'var(--md-outline)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price at Analysis</p>
            <p className="num" style={{ fontSize: 28, fontWeight: 300, color: 'var(--md-on-surface-variant)', margin: 0 }}>${valuation.currentPrice.toFixed(2)}</p>
          </div>
          <div style={{ background: 'var(--md-surface-container)', borderRadius: 16, padding: '16px 20px' }}>
            <p style={{ fontSize: 11, color: 'var(--md-outline)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assessment</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              {isUnder ? <TrendingUp size={18} color="#69F0AE" /> : <TrendingDown size={18} color="#CF6679" />}
              <span className="num" style={{ fontSize: 16, fontWeight: 700, color: mosColor }}>{mosLabel}</span>
            </div>
          </div>
          {dcfResults && (
            <div style={{ background: 'var(--md-surface-container)', borderRadius: 16, padding: '16px 20px' }}>
              <p style={{ fontSize: 11, color: 'var(--md-outline)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>WACC</p>
              <p className="num" style={{ fontSize: 28, fontWeight: 300, color: 'var(--md-primary)', margin: 0 }}>{pct(dcfResults.wacc)}</p>
            </div>
          )}
        </div>

        {/* Value bridge (if DCF results available) */}
        {dcfResults && (
          <div style={{ background: 'var(--md-surface-container)', borderRadius: 20, padding: '16px 20px', marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--md-on-surface-variant)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Value Bridge</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '6px 24px', fontSize: 13 }}>
              {[
                { l: 'PV of FCFFs (Yr 1–10)', v: $M(dcfResults.pvFCFFs), c: 'var(--md-on-surface-variant)' },
                { l: 'PV of Terminal Value', v: $M(dcfResults.pvTerminalValue), c: 'var(--md-on-surface-variant)' },
                { l: 'Value of Operating Assets', v: $M(dcfResults.valueOfOperatingAssets), c: 'var(--md-on-surface)', bold: true },
                { l: '− Debt', v: $M(dcfResults.lessDebt), c: '#CF6679' },
                { l: '+ Cash', v: $M(dcfResults.plusCash), c: '#69F0AE' },
                { l: '+ Non-Op Assets', v: $M(dcfResults.plusNonOperatingAssets), c: '#69F0AE' },
                { l: 'Equity Value', v: $M(dcfResults.valueOfEquity), c: 'var(--md-on-surface)', bold: true },
              ].map(row => (
                <div key={row.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span style={{ color: row.bold ? 'var(--md-on-surface)' : 'var(--md-on-surface-variant)', fontWeight: row.bold ? 600 : 400 }}>{row.l}</span>
                  <span className="num" style={{ color: row.c, fontWeight: row.bold ? 600 : 400 }}>{row.v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Report */}
        <div style={{ background: 'var(--md-surface-container)', borderRadius: 20, padding: 24, marginBottom: 16 }}>
          {valuation.reportText ? (
            <div className="report-prose">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{valuation.reportText}</ReactMarkdown>
            </div>
          ) : (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <Calculator size={32} style={{ color: 'var(--md-outline)', opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontSize: 14, color: 'var(--md-outline)', margin: 0 }}>
                This is a DCF snapshot — no AI report was generated.
              </p>
              <a href={`/ticker/${valuation.ticker.symbol}/valuation`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, padding: '8px 18px', borderRadius: 20, background: 'var(--md-primary)', color: 'var(--md-on-primary)', textDecoration: 'none', fontSize: 14 }}>
                <ExternalLink size={13} /> Generate AI Report
              </a>
            </div>
          )}
        </div>

        {/* Export */}
        <ExportButtons
          type="valuation"
          symbol={valuation.ticker.symbol}
          companyName={valuation.ticker.name}
          generatedAt={valuation.generatedAt}
          intrinsicValue={valuation.intrinsicValue}
          currentPrice={valuation.currentPrice}
          marginOfSafety={valuation.marginOfSafety}
          reportText={valuation.reportText}
          dcfBridge={dcfResults}
        />

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={toggleLike} className="md-ripple"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 20, background: liked ? 'rgba(207,102,121,0.15)' : 'var(--md-surface-container)', color: liked ? '#CF6679' : 'var(--md-on-surface-variant)', border: liked ? '1px solid rgba(207,102,121,0.3)' : 'none', cursor: 'pointer', fontSize: 14, fontWeight: liked ? 600 : 400 }}>
            <Heart size={15} fill={liked ? '#CF6679' : 'none'} /> {liked ? 'Liked' : 'Like'}
          </button>
          <a href="/reports?tab=valuation" style={{ fontSize: 13, color: 'var(--md-outline)', textDecoration: 'none' }}>
            ← All Valuations
          </a>
        </div>
      </main>
    </div>
  )
}
