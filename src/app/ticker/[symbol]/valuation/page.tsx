'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Calculator, Sparkles, RefreshCw, Square,
  Copy, ChevronDown, ChevronUp, BookOpen, Save, CheckCircle,
} from 'lucide-react'
import { MenuButton } from '@/components/Sidebar'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { buildDefaultInputs, calculateDCF } from '@/lib/dcf'
import type { FundamentalData, DCFInputs, DCFResults } from '@/types/valuation'
import type { TAResult, TickerInfo } from '@/types/market'
import { formatNumber } from '@/lib/utils'

// ── formatters ───────────────────────────────────────────────────────────────
const pct = (n: number) => `${(n * 100).toFixed(1)}%`
const $M = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}M`
const $ = (n: number) => `$${formatNumber(n)}`

// ── sub-components ────────────────────────────────────────────────────────────
function InputRow({
  label, value, onChange, format = 'number', suffix = '', min, max, step,
}: {
  label: string; value: number; onChange: (v: number) => void
  format?: 'number' | 'pct' | 'dollar'; suffix?: string
  min?: number; max?: number; step?: number
}) {
  const display = format === 'pct'
    ? (value * 100).toFixed(2)
    : value.toFixed(format === 'dollar' ? 2 : 2)

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 0', borderBottom: '1px solid var(--md-outline-variant)',
    }}>
      <span style={{ fontSize: 13, color: 'var(--md-on-surface-variant)', flex: 1 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          type="number" value={display}
          onChange={e => {
            const p = parseFloat(e.target.value)
            if (!isNaN(p)) onChange(format === 'pct' ? p / 100 : p)
          }}
          min={min} max={max} step={step ?? (format === 'pct' ? 0.1 : 1)}
          style={{
            width: 90, textAlign: 'right', padding: '4px 8px',
            background: 'var(--md-surface-container-high)',
            border: '1px solid var(--md-outline-variant)', borderRadius: 8,
            color: 'var(--md-on-surface)', fontSize: 13,
            fontVariantNumeric: 'tabular-nums', outline: 'none',
          }}
        />
        {suffix && <span style={{ fontSize: 12, color: 'var(--md-outline)', width: 18 }}>{suffix}</span>}
      </div>
    </div>
  )
}

function Accordion({ title, children, defaultOpen = false }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ background: 'var(--md-surface-container)', borderRadius: 20, overflow: 'hidden', marginBottom: 8 }}>
      <button onClick={() => setOpen(!open)} className="md-ripple"
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--md-on-surface)' }}>{title}</span>
        {open
          ? <ChevronUp size={16} color="var(--md-outline)" />
          : <ChevronDown size={16} color="var(--md-outline)" />}
      </button>
      {open && <div style={{ padding: '0 20px 16px' }}>{children}</div>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ValuationPage() {
  const params = useParams()
  const router = useRouter()
  const symbol = (params.symbol as string).toUpperCase()
  const reportRef = useRef<HTMLDivElement>(null)

  const [fundamentals, setFundamentals] = useState<FundamentalData | null>(null)
  const [taData, setTaData] = useState<{ ticker: TickerInfo; ta: TAResult } | null>(null)
  const [loadingFundamentals, setLoadingFundamentals] = useState(true)
  const [fundamentalError, setFundamentalError] = useState('')

  const [inputs, setInputs] = useState<DCFInputs | null>(null)
  const [results, setResults] = useState<DCFResults | null>(null)

  const [report, setReport] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Fetch fundamentals + TA in parallel, auto-save snapshot
  useEffect(() => {
    setLoadingFundamentals(true)
    Promise.all([
      fetch(`/api/fundamentals/${symbol}`).then(r => r.json()),
      fetch(`/api/ticker/${symbol}`).then(r => r.json()),
    ]).then(([fd, tickerData]) => {
      if (fd.error) { setFundamentalError(fd.error); return }
      setFundamentals(fd as FundamentalData)
      if (!tickerData.error) setTaData(tickerData)

      const currentPrice = tickerData.ticker?.currentPrice ?? fd.currentPrice
      const defaults = buildDefaultInputs({ ...fd, currentPrice })
      const dcfResults = calculateDCF(defaults)
      setInputs(defaults)
      setResults(dcfResults)

      // Auto-save DCF snapshot (fire & forget — like TA snapshot on ticker load)
      fetch('/api/valuation/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          name: fd.name,
          dcfInputs: defaults,
          dcfResults,
        }),
      }).catch(() => { /* non-critical */ })
    }).catch(() => setFundamentalError('Network error fetching data'))
      .finally(() => setLoadingFundamentals(false))
  }, [symbol])

  // Recalculate DCF whenever inputs change
  const updateInput = useCallback(<K extends keyof DCFInputs>(key: K, value: DCFInputs[K]) => {
    setInputs(prev => {
      if (!prev) return prev
      const next = { ...prev, [key]: value }
      setResults(calculateDCF(next))
      return next
    })
  }, [])

  async function generateReport() {
    if (!inputs || !results || !taData) return
    setGenerating(true)
    setReport('')
    setGenError('')
    setSaved(false)
    setSavedId(null)   // reset so Save button reappears after regeneration
    abortRef.current = new AbortController()

    const { history: _h, ...taWithoutHistory } = taData.ta

    try {
      const res = await fetch('/api/valuation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: taData.ticker, ta: taWithoutHistory, dcfInputs: inputs }),
        signal: abortRef.current.signal,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setReport(prev => prev + decoder.decode(value, { stream: true }))
      }
        // Report is ready — user will click Save explicitly
      setSaved(true) // means generation done, show Save button

      // Scroll to report
      setTimeout(() => reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setGenError(err.message)
      }
    } finally {
      setGenerating(false)
    }
  }

  function stopGeneration() {
    abortRef.current?.abort()
    setGenerating(false)
  }

  async function saveReport() {
    if (!inputs || !results || !report || !fundamentals) return
    setSaving(true)
    try {
      const res = await fetch('/api/valuation/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          name: fundamentals.name,
          dcfInputs: inputs,
          dcfResults: results,
          reportText: report,
        }),
      })
      const data = await res.json()
      if (data.ok) setSavedId(data.id)
      else setGenError(data.error || 'Save failed')
    } catch {
      setGenError('Save failed — network error')
    } finally {
      setSaving(false)
    }
  }

  const mosColor = results
    ? results.marginOfSafety > 0.2 ? '#CF6679'
      : results.marginOfSafety < -0.2 ? '#69F0AE'
      : '#FFD740'
    : '#FFD740'

  const mosLabel = results
    ? results.marginOfSafety > 0
      ? `${(results.marginOfSafety * 100).toFixed(1)}% Overvalued`
      : `${Math.abs(results.marginOfSafety * 100).toFixed(1)}% Undervalued`
    : ''

  return (
    <div style={{ minHeight: '100vh', background: 'var(--md-background)', paddingBottom: 0 }}
     >
      {/* Top App Bar — mobile only */}
      <header className="md:hidden" style={{
        position: 'sticky', top: 0, zIndex: 30, height: 52,
        padding: '0 16px 0 4px',
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--md-surface)',
        borderBottom: '1px solid var(--md-outline-variant)',
      }}>
        <MenuButton />
        <Calculator size={15} color="var(--md-primary)" />
        <h1 style={{ fontSize: 16, fontWeight: 600, color: 'var(--md-on-surface)', margin: 0, flex: 1 }}>
          {symbol} — DCF Valuation
        </h1>
        {results && (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 10,
            color: mosColor, background: `${mosColor}20`, flexShrink: 0,
          }}>{mosLabel}</span>
        )}
      </header>

      {/* Loading */}
      {loadingFundamentals && (
        <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
          {[80, 240, 160].map((h, i) => (
            <div key={i} className="animate-pulse"
              style={{ height: h, borderRadius: 20, background: 'var(--md-surface-container)', marginBottom: 12 }} />
          ))}
        </main>
      )}

      {/* Error */}
      {!loadingFundamentals && fundamentalError && (
        <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
          <div style={{ padding: '16px 20px', borderRadius: 16, background: 'rgba(239,83,80,0.1)', color: '#EF5350', fontSize: 14 }}>
            {fundamentalError}
          </div>
        </main>
      )}

      {inputs && results && fundamentals && (
        <main style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 16px 80px' }}>

          {/* ── TOP SECTION: inputs (left) + value card (right) ─────────────── */}
          <style>{`
            .val-top { display: flex; flex-direction: column; gap: 12px; }
            @media (min-width: 1024px) { .val-top { flex-direction: row; align-items: flex-start; } }
            .val-inputs { flex: 1; display: flex; flex-direction: column; gap: 8px; }
            .val-results { flex: 0 0 400px; }
            @media (max-width: 1023px) { .val-results { flex: none; width: 100%; } }
          `}</style>

          <div className="val-top" style={{ marginBottom: 16 }}>
            {/* LEFT — fundamentals summary + editable inputs */}
            <div className="val-inputs">

              {/* Fundamentals row (read-only) */}
              <div style={{ background: 'var(--md-surface-container)', borderRadius: 20, padding: '16px 20px' }}>
                <p style={{ fontSize: 11, color: 'var(--md-on-surface-variant)', margin: '0 0 12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {fundamentals.sector} · {fundamentals.industry}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px 16px' }}>
                  {[
                    { l: 'Revenue (TTM)', v: $M(inputs.revenue) },
                    { l: 'EBIT', v: $M(inputs.ebit) },
                    { l: 'Op. Margin', v: pct(inputs.ebit / inputs.revenue) },
                    { l: 'Book Debt', v: $M(inputs.bookDebt) },
                    { l: 'Cash', v: $M(inputs.cash) },
                    { l: 'Non-Op Assets', v: $M(inputs.nonOperatingAssets) },
                    { l: 'Shares Out.', v: `${inputs.sharesOutstanding.toFixed(0)}M` },
                    { l: 'Beta', v: inputs.beta.toFixed(2) },
                    { l: 'Tax Rate (eff.)', v: pct(inputs.effectiveTaxRate) },
                  ].map(({ l, v }) => (
                    <div key={l}>
                      <p style={{ fontSize: 11, color: 'var(--md-outline)', margin: '0 0 2px' }}>{l}</p>
                      <p className="num" style={{ fontSize: 13, fontWeight: 600, color: 'var(--md-on-surface)', margin: 0 }}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Accordion title="Growth & Margin Assumptions" defaultOpen>
                <InputRow label="Revenue Growth — Year 1" value={inputs.revenueGrowthYr1} onChange={v => updateInput('revenueGrowthYr1', v)} format="pct" suffix="%" min={-50} max={100} />
                <InputRow label="Revenue CAGR — Years 2–5" value={inputs.revenueCAGR} onChange={v => updateInput('revenueCAGR', v)} format="pct" suffix="%" min={-50} max={100} />
                <InputRow label="Target Operating Margin" value={inputs.targetOperatingMargin} onChange={v => updateInput('targetOperatingMargin', v)} format="pct" suffix="%" min={0} max={100} />
                <InputRow label="Margin Convergence Year" value={inputs.marginConvergenceYear} onChange={v => updateInput('marginConvergenceYear', v)} min={1} max={10} step={1} />
              </Accordion>

              <Accordion title="Capital Efficiency">
                <InputRow label="Sales-to-Capital (Yr 1–5)" value={inputs.salesToCapitalRatio15} onChange={v => updateInput('salesToCapitalRatio15', v)} min={0.1} max={10} step={0.1} />
                <InputRow label="Sales-to-Capital (Yr 6–10)" value={inputs.salesToCapitalRatio610} onChange={v => updateInput('salesToCapitalRatio610', v)} min={0.1} max={10} step={0.1} />
              </Accordion>

              <Accordion title="Cost of Capital (WACC)">
                <InputRow label="Risk-Free Rate" value={inputs.riskFreeRate} onChange={v => updateInput('riskFreeRate', v)} format="pct" suffix="%" min={0} max={20} />
                <InputRow label="Beta" value={inputs.beta} onChange={v => updateInput('beta', v)} min={0.1} max={5} step={0.05} />
                <InputRow label="Equity Risk Premium (ERP)" value={inputs.erp} onChange={v => updateInput('erp', v)} format="pct" suffix="%" min={0} max={20} />
                <InputRow label="Cost of Debt (pre-tax)" value={inputs.costOfDebt} onChange={v => updateInput('costOfDebt', v)} format="pct" suffix="%" min={0} max={30} />
                <InputRow label="Marginal Tax Rate" value={inputs.marginalTaxRate} onChange={v => updateInput('marginalTaxRate', v)} format="pct" suffix="%" min={0} max={50} />
                <InputRow label="Terminal Growth Rate" value={inputs.terminalGrowthRate} onChange={v => updateInput('terminalGrowthRate', v)} format="pct" suffix="%" min={0} max={10} />
              </Accordion>

              {/* 10-year projection table */}
              <div style={{ background: 'var(--md-surface-container)', borderRadius: 20, overflow: 'hidden' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--md-on-surface)', margin: 0, padding: '16px 20px 12px' }}>
                  10-Year FCFF Projections
                </p>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: 'var(--md-surface-container-high)' }}>
                        {['Yr', 'Rev Gr%', 'Revenue', 'Op Margin', 'EBIT(1-t)', 'Reinvest', 'FCFF', 'PV(FCFF)'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--md-on-surface-variant)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.projections.map((p, i) => (
                        <tr key={p.year} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(124,185,244,0.03)' }}>
                          <td style={{ padding: '7px 12px', color: 'var(--md-primary)', fontWeight: 600, textAlign: 'right' }}>{p.year}</td>
                          <td className="num" style={{ padding: '7px 12px', color: 'var(--md-on-surface-variant)', textAlign: 'right' }}>{pct(p.revenueGrowth)}</td>
                          <td className="num" style={{ padding: '7px 12px', color: 'var(--md-on-surface)', textAlign: 'right' }}>{$M(p.revenue)}</td>
                          <td className="num" style={{ padding: '7px 12px', color: 'var(--md-on-surface-variant)', textAlign: 'right' }}>{pct(p.operatingMargin)}</td>
                          <td className="num" style={{ padding: '7px 12px', color: 'var(--md-on-surface)', textAlign: 'right' }}>{$M(p.ebitAfterTax)}</td>
                          <td className="num" style={{ padding: '7px 12px', color: p.reinvestment < 0 ? '#CF6679' : 'var(--md-on-surface-variant)', textAlign: 'right' }}>{$M(p.reinvestment)}</td>
                          <td className="num" style={{ padding: '7px 12px', color: p.fcff < 0 ? '#CF6679' : '#69F0AE', fontWeight: 600, textAlign: 'right' }}>{$M(p.fcff)}</td>
                          <td className="num" style={{ padding: '7px 12px', color: 'var(--md-primary)', textAlign: 'right' }}>{$M(p.pvFCFF)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* RIGHT — intrinsic value results */}
            <div className="val-results">
              <div style={{ background: 'var(--md-surface-container)', borderRadius: 20, padding: 24 }}>
                <p style={{ fontSize: 12, color: 'var(--md-on-surface-variant)', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                  Damodaran DCF
                </p>

                {/* Big value display */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
                  <div>
                    <p className="num" style={{ fontSize: 11, color: 'var(--md-outline)', margin: '0 0 4px' }}>Intrinsic Value</p>
                    <p className="num" style={{ fontSize: 44, fontWeight: 300, color: 'var(--md-on-surface)', margin: 0, letterSpacing: '-2px', lineHeight: 1 }}>
                      ${results.intrinsicValuePerShare.toFixed(2)}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p className="num" style={{ fontSize: 11, color: 'var(--md-outline)', margin: '0 0 4px' }}>Current Price</p>
                    <p className="num" style={{ fontSize: 30, fontWeight: 400, color: 'var(--md-on-surface-variant)', margin: 0, lineHeight: 1 }}>
                      ${results.currentPrice.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* MoS gradient bar */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--md-outline)', marginBottom: 6 }}>
                    <span>Deeply Undervalued</span>
                    <span>Fair Value</span>
                    <span>Overvalued</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--md-surface-container-high)', borderRadius: 4, position: 'relative', overflow: 'visible' }}>
                    <div style={{ position: 'absolute', inset: 0, borderRadius: 4, background: 'linear-gradient(to right, #69F0AE, #FFD740 50%, #CF6679)' }} />
                    {(() => {
                      const pos = Math.max(2, Math.min(98, ((results.marginOfSafety + 0.5) / 1.0) * 100))
                      return (
                        <div style={{
                          position: 'absolute', width: 16, height: 16, borderRadius: '50%',
                          background: '#fff', top: -4, left: `calc(${pos}% - 8px)`,
                          boxShadow: `0 0 0 3px ${mosColor}, 0 2px 8px rgba(0,0,0,0.5)`,
                        }} />
                      )
                    })()}
                  </div>
                  <p style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, margin: '12px 0 0', color: mosColor }}>
                    {mosLabel}
                  </p>
                </div>

                {/* Value bridge */}
                <div style={{ fontSize: 12, borderTop: '1px solid var(--md-outline-variant)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {[
                    { l: 'PV of FCFFs (Yr 1–10)', v: $M(results.pvFCFFs), c: 'var(--md-on-surface-variant)' },
                    { l: 'PV of Terminal Value', v: $M(results.pvTerminalValue), c: 'var(--md-on-surface-variant)' },
                    { l: 'Value of Operating Assets', v: $M(results.valueOfOperatingAssets), c: 'var(--md-on-surface)', bold: true },
                    { l: '− Debt', v: $M(results.lessDebt), c: '#CF6679' },
                    { l: '− Minority Interests', v: $M(results.lessMinorityInterests), c: '#CF6679' },
                    { l: '+ Cash', v: $M(results.plusCash), c: '#69F0AE' },
                    { l: '+ Non-Op Assets', v: $M(results.plusNonOperatingAssets), c: '#69F0AE' },
                    { l: 'Equity Value', v: $M(results.valueOfEquity), c: 'var(--md-on-surface)', bold: true },
                  ].map(row => (
                    <div key={row.l} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '6px 0',
                      borderBottom: row.bold ? '1px solid var(--md-outline-variant)' : 'none',
                      marginBottom: row.bold ? 4 : 0,
                    }}>
                      <span style={{ color: row.bold ? 'var(--md-on-surface)' : 'var(--md-on-surface-variant)', fontWeight: row.bold ? 600 : 400 }}>{row.l}</span>
                      <span className="num" style={{ color: row.c, fontWeight: row.bold ? 600 : 400 }}>{row.v}</span>
                    </div>
                  ))}

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 4px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--md-on-surface)', fontSize: 13 }}>WACC</span>
                    <span className="num" style={{ fontWeight: 700, color: 'var(--md-primary)', fontSize: 13 }}>{pct(results.wacc)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <span style={{ color: 'var(--md-outline)' }}>Cost of Equity / Debt</span>
                    <span className="num" style={{ color: 'var(--md-outline)' }}>{pct(results.costOfEquity)} / {pct(results.afterTaxCostOfDebt)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <span style={{ color: 'var(--md-outline)' }}>Terminal CoC</span>
                    <span className="num" style={{ color: 'var(--md-outline)' }}>{pct(results.terminalCOC)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── BOTTOM SECTION: AI Report — full width ───────────────────────── */}
          <div ref={reportRef} style={{
            background: 'var(--md-surface-container)',
            borderRadius: 20, padding: 24,
          }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--md-on-surface)', margin: '0 0 2px' }}>
                  AI Valuation Report
                </p>
                <p style={{ fontSize: 12, color: 'var(--md-outline)', margin: 0 }}>
                  Claude synthesises DCF + Technical Analysis into an institutional-grade report
                </p>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button onClick={generateReport} disabled={generating || !taData} className="md-ripple"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 22px', borderRadius: 20,
                    background: 'var(--md-primary)', color: 'var(--md-on-primary)',
                    border: 'none', cursor: generating ? 'not-allowed' : 'pointer',
                    fontSize: 14, fontWeight: 500, opacity: generating ? 0.6 : 1,
                  }}>
                  {generating
                    ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</>
                    : report
                      ? <><RefreshCw size={14} /> Regenerate</>
                      : <><Sparkles size={14} /> Generate AI Report</>}
                </button>

                {generating && (
                  <button onClick={stopGeneration} className="md-ripple"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 20, background: 'var(--md-surface-container-high)', color: 'var(--md-on-surface-variant)', border: 'none', cursor: 'pointer', fontSize: 14 }}>
                    <Square size={13} /> Stop
                  </button>
                )}

                {report && !generating && (
                  <button onClick={async () => { await navigator.clipboard.writeText(report); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                    className="md-ripple"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 20, background: 'var(--md-surface-container-high)', color: copied ? '#69F0AE' : 'var(--md-on-surface-variant)', border: 'none', cursor: 'pointer', fontSize: 14 }}>
                    <Copy size={13} /> {copied ? 'Copied!' : 'Copy'}
                  </button>
                )}

                {/* Save button — shows after generation, hides once saved */}
                {saved && !savedId && !generating && (
                  <button onClick={saveReport} disabled={saving} className="md-ripple"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '10px 20px', borderRadius: 20,
                      background: saving ? 'var(--md-surface-container-high)' : 'rgba(105,240,174,0.18)',
                      color: '#69F0AE', border: '1px solid rgba(105,240,174,0.35)',
                      cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600,
                      opacity: saving ? 0.7 : 1,
                    }}>
                    {saving
                      ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                      : <><Save size={13} /> Save Report</>}
                  </button>
                )}

                {/* Saved confirmation */}
                {savedId && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#69F0AE', fontWeight: 600 }}>
                      <CheckCircle size={15} /> Saved
                    </span>
                    <a href={`/valuations/${savedId}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 20, background: 'var(--md-surface-container-high)', color: 'var(--md-primary)', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                      <BookOpen size={13} /> View Report
                    </a>
                    <a href="/reports?tab=valuation"
                      style={{ fontSize: 13, color: 'var(--md-outline)', fontWeight: 400, textDecoration: 'none' }}>
                      All Valuations →
                    </a>
                  </div>
                )}
              </div>
            </div>

            {!taData && (
              <p style={{ fontSize: 12, color: '#FFD740', margin: '0 0 8px' }}>
                ⚠ TA data unavailable — report will rely on fundamentals only.
              </p>
            )}

            {/* Inline error — shown right below buttons so save failures are obvious */}
            {genError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: 'rgba(239,83,80,0.1)', color: '#EF5350', fontSize: 13, marginBottom: 8 }}>
                <span style={{ fontSize: 16 }}>⚠</span>
                <span>{genError}</span>
                <button onClick={() => setGenError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#EF5350', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
              </div>
            )}

            {/* Empty state */}
            {!report && !generating && (
              <div style={{ padding: '60px 16px', textAlign: 'center', borderTop: '1px solid var(--md-outline-variant)' }}>
                <Calculator size={36} style={{ color: 'var(--md-on-surface-variant)', opacity: 0.25, margin: '0 auto 12px', display: 'block' }} />
                <p style={{ fontSize: 14, color: 'var(--md-outline)', margin: '0 auto', maxWidth: 400, lineHeight: 1.6 }}>
                  Adjust the DCF inputs above, then click <strong style={{ color: 'var(--md-on-surface-variant)' }}>Generate AI Report</strong> for an institutional-grade DCF + TA synthesis.
                </p>
              </div>
            )}

            {/* Streaming / completed report */}
            {(report || generating) && (
              <div style={{ borderTop: '1px solid var(--md-outline-variant)', paddingTop: 20 }}>
                <div className="report-prose">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
                  {generating && (
                    <span style={{ display: 'inline-block', width: 8, height: 16, background: 'var(--md-primary)', borderRadius: 2, animation: 'blink 1s step-end infinite', verticalAlign: 'bottom', marginLeft: 2 }} />
                  )}
                </div>
              </div>
            )}
          </div>

          <style>{`
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
          `}</style>
        </main>
      )}
    </div>
  )
}
