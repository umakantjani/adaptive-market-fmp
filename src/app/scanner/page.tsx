'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ScanLine, Plus, X, Play, RefreshCw, TrendingUp, TrendingDown,
  Minus, Flame, Eye, Clock, Ban, ChevronUp, ChevronDown, Search,
  ChevronRight, CheckCheck,
} from 'lucide-react'
import { MenuButton } from '@/components/Sidebar'
import { TICKER_LISTS, type TickerList } from '@/lib/tickerLists'

// ── Types ──────────────────────────────────────────────────────────────────

interface WatchlistTicker {
  symbol: string
  name: string
  addedAt: string
  scanResults: ScanResultRow[]
}

interface ScanResultRow {
  id: number
  symbol: string
  name: string
  scannedAt: string
  price: number
  priceChangePct: number
  overallSignal: string
  signalScore: number
  sniperGrade: string
  sniperScore: number
  rsi14: number | null
  macdHist: number | null
  bbWidth: number | null
  adx14: number | null
  volumeRatio: number | null
  atr14: number | null
  aboveSma20: boolean
  aboveSma50: boolean
  aboveSma200: boolean
  macdBullish: boolean
}

type SignalFilter = 'ALL' | 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL'
type GradeFilter  = 'ALL' | 'FIRE' | 'WATCH' | 'WAIT' | 'AVOID'
type SortKey = 'signalScore' | 'sniperScore' | 'price' | 'priceChangePct' | 'rsi14' | 'symbol'

// ── Helpers ────────────────────────────────────────────────────────────────

const SIGNAL_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  STRONG_BUY:  { label: 'Strong Buy',  color: '#00E676', bg: 'rgba(0,230,118,0.12)',    icon: <TrendingUp size={11} /> },
  BUY:         { label: 'Buy',         color: '#69F0AE', bg: 'rgba(105,240,174,0.12)',  icon: <TrendingUp size={11} /> },
  NEUTRAL:     { label: 'Neutral',     color: '#FFD740', bg: 'rgba(255,215,64,0.12)',   icon: <Minus size={11} /> },
  SELL:        { label: 'Sell',        color: '#FF7043', bg: 'rgba(255,112,67,0.12)',   icon: <TrendingDown size={11} /> },
  STRONG_SELL: { label: 'Strong Sell', color: '#FF4D6A', bg: 'rgba(255,77,106,0.12)',   icon: <TrendingDown size={11} /> },
}

const GRADE_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  FIRE:  { label: 'FIRE',  color: '#FF6D00', bg: 'rgba(255,109,0,0.15)',    icon: <Flame size={11} /> },
  WATCH: { label: 'WATCH', color: '#FFD740', bg: 'rgba(255,215,64,0.12)',   icon: <Eye size={11} /> },
  WAIT:  { label: 'WAIT',  color: '#7CB9F4', bg: 'rgba(124,185,244,0.12)', icon: <Clock size={11} /> },
  AVOID: { label: 'AVOID', color: '#CF6679', bg: 'rgba(207,102,121,0.12)', icon: <Ban size={11} /> },
}

function SignalBadge({ signal }: { signal: string }) {
  const m = SIGNAL_META[signal] ?? { label: signal, color: 'var(--md-outline)', bg: 'transparent', icon: null }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
      color: m.color, background: m.bg,
      letterSpacing: '0.04em', textTransform: 'uppercase',
      fontFamily: 'Gotham SSM, sans-serif',
    }}>
      {m.icon} {m.label}
    </span>
  )
}

function GradeBadge({ grade }: { grade: string }) {
  const m = GRADE_META[grade] ?? { label: grade, color: 'var(--md-outline)', bg: 'transparent', icon: null }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
      color: m.color, background: m.bg,
      letterSpacing: '0.04em', textTransform: 'uppercase',
      fontFamily: 'Gotham SSM, sans-serif',
    }}>
      {m.icon} {m.label}
    </span>
  )
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? '#00E676' : score >= 50 ? '#FFD740' : '#FF4D6A'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 48, height: 4, background: 'var(--md-outline-variant)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 400ms ease' }} />
      </div>
      <span className="num" style={{ fontSize: 12, color: 'var(--md-on-surface)', minWidth: 24 }}>{score}</span>
    </div>
  )
}

function MaFlag({ active, label }: { active: boolean; label: string }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
      background: active ? 'rgba(77,187,255,0.12)' : 'transparent',
      color: active ? 'var(--md-primary)' : 'var(--md-outline)',
      border: `1px solid ${active ? 'rgba(77,187,255,0.3)' : 'var(--md-outline-variant)'}`,
      letterSpacing: '0.03em', fontFamily: 'Gotham SSM, sans-serif',
    }}>
      {label}
    </span>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ScannerPage() {
  const router = useRouter()

  const [watchlist, setWatchlist]   = useState<WatchlistTicker[]>([])
  const [results, setResults]       = useState<ScanResultRow[]>([])
  const [lastScanned, setLastScanned] = useState<string | null>(null)
  const [loading, setLoading]       = useState(true)
  const [scanning, setScanning]     = useState(false)
  const [addInput, setAddInput]     = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [signalFilter, setSignalFilter] = useState<SignalFilter>('ALL')
  const [gradeFilter,  setGradeFilter]  = useState<GradeFilter>('ALL')
  const [sortKey,  setSortKey]  = useState<SortKey>('signalScore')
  const [sortAsc,  setSortAsc]  = useState(false)
  const [activeTab, setActiveTab] = useState<'results' | 'watchlist' | 'lists'>('results')
  const [expandedList, setExpandedList] = useState<string | null>(null)
  const [addingListId, setAddingListId] = useState<string | null>(null)
  const [addedListIds, setAddedListIds] = useState<Set<string>>(new Set())

  const inputRef = useRef<HTMLInputElement>(null)

  async function loadData() {
    setLoading(true)
    const [wRes, rRes] = await Promise.all([
      fetch('/api/scanner/watchlist').then(r => r.json()),
      fetch('/api/scanner/results').then(r => r.json()),
    ])
    setWatchlist(wRes.tickers || [])
    setResults(rRes.results || [])
    setLastScanned(rRes.lastScannedAt)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  async function runScan() {
    setScanning(true)
    try {
      await fetch('/api/scanner/run', { method: 'POST' })
      await loadData()
    } finally {
      setScanning(false)
    }
  }

  async function addTicker() {
    const s = addInput.trim().toUpperCase()
    if (!s) return
    setAddLoading(true)
    await fetch('/api/scanner/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: s }),
    })
    setAddInput('')
    await loadData()
    setAddLoading(false)
  }

  async function removeTicker(symbol: string) {
    await fetch(`/api/scanner/watchlist/${symbol}`, { method: 'DELETE' })
    await loadData()
  }

  async function addList(list: TickerList) {
    setAddingListId(list.id)
    await fetch('/api/scanner/watchlist/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tickers: list.tickers }),
    })
    setAddedListIds(prev => new Set(prev).add(list.id))
    await loadData()
    setAddingListId(null)
  }

  // ── Filter + sort results ─────────────────────────────────────────────

  const filtered = results
    .filter(r => signalFilter === 'ALL' || r.overallSignal === signalFilter)
    .filter(r => gradeFilter  === 'ALL' || r.sniperGrade  === gradeFilter)
    .sort((a, b) => {
      const va = a[sortKey] ?? 0
      const vb = b[sortKey] ?? 0
      if (typeof va === 'string' && typeof vb === 'string') {
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va)
      }
      return sortAsc ? (va as number) - (vb as number) : (vb as number) - (va as number)
    })

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(false) }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronUp size={10} style={{ opacity: 0.3 }} />
    return sortAsc ? <ChevronUp size={10} /> : <ChevronDown size={10} />
  }

  // ── Summary stats ──────────────────────────────────────────────────────

  const statsSignal = ['STRONG_BUY', 'BUY', 'NEUTRAL', 'SELL', 'STRONG_SELL'].map(s => ({
    signal: s, count: results.filter(r => r.overallSignal === s).length,
  })).filter(s => s.count > 0)

  const statsGrade = ['FIRE', 'WATCH', 'WAIT', 'AVOID'].map(g => ({
    grade: g, count: results.filter(r => r.sniperGrade === g).length,
  })).filter(g => g.count > 0)

  const cardStyle: React.CSSProperties = {
    background: 'var(--md-surface-container)',
    border: '1px solid var(--md-outline-variant)',
    borderRadius: 10,
  }

  const thStyle: React.CSSProperties = {
    padding: '8px 12px', textAlign: 'left', whiteSpace: 'nowrap',
    fontSize: 10, fontWeight: 700, color: 'var(--md-outline)',
    letterSpacing: '0.06em', textTransform: 'uppercase',
    fontFamily: 'Gotham SSM, sans-serif',
    borderBottom: '1px solid var(--md-outline-variant)',
    background: 'var(--md-surface-container-high)',
    cursor: 'pointer', userSelect: 'none',
  }

  const tdStyle: React.CSSProperties = {
    padding: '10px 12px', fontSize: 13,
    borderBottom: '1px solid var(--md-outline-variant)',
    verticalAlign: 'middle',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--md-background)' }}>

      {/* Mobile header */}
      <header className="md:hidden" style={{
        position: 'sticky', top: 0, zIndex: 30, height: 52,
        padding: '0 16px 0 4px', display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--md-surface)', borderBottom: '1px solid var(--md-outline-variant)',
      }}>
        <MenuButton />
        <ScanLine size={15} color="var(--md-primary)" />
        <h1 style={{ fontSize: 16, fontWeight: 600, color: 'var(--md-on-surface)', margin: 0, flex: 1 }}>
          Scanner
        </h1>
        <button onClick={runScan} disabled={scanning}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 6,
            background: 'var(--md-primary)', color: '#001E30', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
          {scanning ? <RefreshCw size={13} className="spin" /> : <Play size={13} />}
          {scanning ? 'Scanning…' : 'Scan'}
        </button>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px 60px' }}>

        {/* Desktop page header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ScanLine size={18} color="var(--md-primary)" />
            <div>
              <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--md-on-surface)', margin: 0, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Ticker Scanner
              </h1>
              {lastScanned && (
                <p style={{ fontSize: 11, color: 'var(--md-outline)', margin: 0 }}>
                  Last scan: {new Date(lastScanned).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Add ticker input */}
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                ref={inputRef}
                value={addInput}
                onChange={e => setAddInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && addTicker()}
                placeholder="ADD TICKER"
                style={{
                  width: 120, height: 34, padding: '0 10px', borderRadius: 6,
                  background: 'var(--md-surface-container)', border: '1px solid var(--md-outline-variant)',
                  color: 'var(--md-on-surface)', fontSize: 12, fontWeight: 700,
                  letterSpacing: '0.08em', outline: 'none', fontFamily: 'Apercu Mono Pro, monospace',
                }}
              />
              <button onClick={addTicker} disabled={addLoading || !addInput.trim()}
                style={{ height: 34, padding: '0 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: addInput.trim() ? 'var(--md-primary)' : 'var(--md-surface-container)',
                  color: addInput.trim() ? '#001E30' : 'var(--md-outline)', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700 }}>
                <Plus size={14} /> Add
              </button>
            </div>

            {/* Run scan button */}
            <button onClick={runScan} disabled={scanning || watchlist.length === 0}
              className="md-ripple"
              style={{ height: 34, padding: '0 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: 'var(--md-primary)', color: '#001E30',
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700,
                opacity: (scanning || watchlist.length === 0) ? 0.6 : 1 }}>
              {scanning ? <RefreshCw size={14} className="spin" /> : <Play size={14} />}
              {scanning ? 'Scanning…' : `Run Scan (${watchlist.length})`}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--md-outline-variant)' }}>
          {([
            { key: 'results',   label: 'Scan Results', count: filtered.length },
            { key: 'watchlist', label: 'Watchlist',    count: watchlist.length },
            { key: 'lists',     label: 'Lists',        count: TICKER_LISTS.length },
          ] as const).map(({ key, label, count }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              style={{
                padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: 13, fontWeight: activeTab === key ? 700 : 400,
                color: activeTab === key ? 'var(--md-primary)' : 'var(--md-on-surface-variant)',
                borderBottom: `2px solid ${activeTab === key ? 'var(--md-primary)' : 'transparent'}`,
                marginBottom: -1, display: 'flex', alignItems: 'center', gap: 6,
              }}>
              {label}
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8,
                background: activeTab === key ? 'rgba(77,187,255,0.15)' : 'var(--md-surface-container)',
                color: activeTab === key ? 'var(--md-primary)' : 'var(--md-outline)', fontWeight: 700 }}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* ── RESULTS TAB ──────────────────────────────────────────────────── */}
        {activeTab === 'results' && (
          <>
            {/* Summary stats */}
            {results.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8, marginBottom: 16 }}>
                {statsSignal.map(({ signal, count }) => {
                  const m = SIGNAL_META[signal]
                  return (
                    <button key={signal} onClick={() => setSignalFilter(signalFilter === signal as SignalFilter ? 'ALL' : signal as SignalFilter)}
                      style={{ ...cardStyle, padding: '10px 12px', cursor: 'pointer', border: `1px solid ${signalFilter === signal ? m.color + '60' : 'var(--md-outline-variant)'}`, textAlign: 'left' }}>
                      <p style={{ fontSize: 10, color: 'var(--md-outline)', margin: '0 0 4px', fontFamily: 'Gotham SSM, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</p>
                      <p className="num" style={{ fontSize: 24, fontWeight: 300, color: m.color, margin: 0 }}>{count}</p>
                    </button>
                  )
                })}
                {statsGrade.map(({ grade, count }) => {
                  const m = GRADE_META[grade]
                  return (
                    <button key={grade} onClick={() => setGradeFilter(gradeFilter === grade as GradeFilter ? 'ALL' : grade as GradeFilter)}
                      style={{ ...cardStyle, padding: '10px 12px', cursor: 'pointer', border: `1px solid ${gradeFilter === grade ? m.color + '60' : 'var(--md-outline-variant)'}`, textAlign: 'left' }}>
                      <p style={{ fontSize: 10, color: 'var(--md-outline)', margin: '0 0 4px', fontFamily: 'Gotham SSM, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {m.icon} Sniper {m.label}
                      </p>
                      <p className="num" style={{ fontSize: 24, fontWeight: 300, color: m.color, margin: 0 }}>{count}</p>
                    </button>
                  )
                })}
              </div>
            )}

            {loading ? (
              <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--md-outline)' }}>
                Loading…
              </div>
            ) : results.length === 0 ? (
              <div style={{ ...cardStyle, padding: '60px 20px', textAlign: 'center' }}>
                <ScanLine size={40} style={{ color: 'var(--md-outline)', opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
                <p style={{ fontSize: 14, color: 'var(--md-outline)', margin: '0 0 8px' }}>No scan results yet.</p>
                <p style={{ fontSize: 12, color: 'var(--md-outline)', opacity: 0.7, margin: 0 }}>
                  Add tickers to your watchlist and hit Run Scan.
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ ...cardStyle, padding: '40px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: 'var(--md-outline)', margin: 0 }}>No results match the current filters.</p>
              </div>
            ) : (
              <div style={{ ...cardStyle, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr>
                        {([
                          { key: 'symbol',        label: 'Symbol' },
                          { key: 'price',         label: 'Price' },
                          { key: 'priceChangePct',label: 'Chg %' },
                          { key: 'signalScore',   label: 'Score' },
                          { key: null,            label: 'Signal' },
                          { key: null,            label: 'Sniper' },
                          { key: 'rsi14',         label: 'RSI' },
                          { key: null,            label: 'MACD' },
                          { key: null,            label: 'BB Width' },
                          { key: null,            label: 'MA' },
                          { key: null,            label: 'Vol ×' },
                        ] as { key: SortKey | null; label: string }[]).map(({ key, label }) => (
                          <th key={label} style={thStyle} onClick={() => key && toggleSort(key)}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              {label} {key && <SortIcon k={key} />}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r, i) => (
                        <tr key={r.id}
                          onClick={() => router.push(`/ticker/${r.symbol}`)}
                          style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(124,185,244,0.02)', cursor: 'pointer' }}
                          className="md-ripple"
                        >
                          {/* Symbol */}
                          <td style={tdStyle}>
                            <div style={{ fontWeight: 700, color: 'var(--md-on-surface)', fontFamily: 'Apercu Mono Pro, monospace', letterSpacing: '0.03em' }}>{r.symbol}</div>
                            <div style={{ fontSize: 11, color: 'var(--md-outline)', marginTop: 1 }}>{r.name}</div>
                          </td>

                          {/* Price */}
                          <td style={tdStyle}>
                            <span className="num" style={{ color: 'var(--md-on-surface)', fontWeight: 600 }}>
                              ${r.price.toFixed(2)}
                            </span>
                          </td>

                          {/* Chg % */}
                          <td style={tdStyle}>
                            <span className="num" style={{ color: r.priceChangePct >= 0 ? '#69F0AE' : '#FF4D6A', fontWeight: 600 }}>
                              {r.priceChangePct >= 0 ? '+' : ''}{r.priceChangePct.toFixed(2)}%
                            </span>
                          </td>

                          {/* Score bar */}
                          <td style={tdStyle}><ScoreBar score={r.signalScore} /></td>

                          {/* Signal badge */}
                          <td style={tdStyle}><SignalBadge signal={r.overallSignal} /></td>

                          {/* Sniper grade */}
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <GradeBadge grade={r.sniperGrade} />
                              <span style={{ fontSize: 10, color: 'var(--md-outline)' }}>{r.sniperScore}/5</span>
                            </div>
                          </td>

                          {/* RSI */}
                          <td style={tdStyle}>
                            {r.rsi14 != null ? (
                              <span className="num" style={{
                                color: r.rsi14 >= 70 ? '#FF4D6A' : r.rsi14 >= 50 ? '#69F0AE' : 'var(--md-outline)',
                                fontWeight: 600,
                              }}>{r.rsi14.toFixed(1)}</span>
                            ) : <span style={{ color: 'var(--md-outline)' }}>—</span>}
                          </td>

                          {/* MACD */}
                          <td style={tdStyle}>
                            {r.macdHist != null ? (
                              <span className="num" style={{ color: r.macdBullish ? '#69F0AE' : '#FF4D6A', fontWeight: 600 }}>
                                {r.macdBullish ? '▲' : '▼'} {Math.abs(r.macdHist).toFixed(2)}
                              </span>
                            ) : <span style={{ color: 'var(--md-outline)' }}>—</span>}
                          </td>

                          {/* BB Width */}
                          <td style={tdStyle}>
                            {r.bbWidth != null ? (
                              <span className="num" style={{ color: r.bbWidth < 5 ? '#FF6D00' : 'var(--md-on-surface-variant)' }}>
                                {r.bbWidth.toFixed(1)}%
                                {r.bbWidth < 5 && <span style={{ fontSize: 9, marginLeft: 4, color: '#FF6D00' }}>SQZ</span>}
                              </span>
                            ) : <span style={{ color: 'var(--md-outline)' }}>—</span>}
                          </td>

                          {/* MA flags */}
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', gap: 3 }}>
                              <MaFlag active={r.aboveSma20}  label="20" />
                              <MaFlag active={r.aboveSma50}  label="50" />
                              <MaFlag active={r.aboveSma200} label="200" />
                            </div>
                          </td>

                          {/* Volume ratio */}
                          <td style={tdStyle}>
                            {r.volumeRatio != null ? (
                              <span className="num" style={{ color: r.volumeRatio > 1.5 ? '#FFD740' : 'var(--md-on-surface-variant)' }}>
                                {r.volumeRatio.toFixed(2)}×
                              </span>
                            ) : <span style={{ color: 'var(--md-outline)' }}>—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── WATCHLIST TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'watchlist' && (
          <div>
            {/* Add ticker — mobile */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--md-outline)', pointerEvents: 'none' }} />
                <input
                  value={addInput}
                  onChange={e => setAddInput(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && addTicker()}
                  placeholder="AAPL, TSLA, NVDA…"
                  style={{
                    width: '100%', height: 38, padding: '0 10px 0 30px', borderRadius: 8,
                    background: 'var(--md-surface-container)', border: '1px solid var(--md-outline-variant)',
                    color: 'var(--md-on-surface)', fontSize: 13, fontWeight: 600,
                    letterSpacing: '0.06em', outline: 'none', fontFamily: 'Apercu Mono Pro, monospace',
                  }}
                />
              </div>
              <button onClick={addTicker} disabled={addLoading || !addInput.trim()}
                style={{ height: 38, padding: '0 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: addInput.trim() ? 'var(--md-primary)' : 'var(--md-surface-container)',
                  color: addInput.trim() ? '#001E30' : 'var(--md-outline)',
                  display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 700 }}>
                <Plus size={14} /> Add
              </button>
            </div>

            {watchlist.length === 0 ? (
              <div style={{ ...cardStyle, padding: '60px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: 'var(--md-outline)', margin: 0 }}>Your watchlist is empty.</p>
                <p style={{ fontSize: 12, color: 'var(--md-outline)', opacity: 0.7, margin: '6px 0 0' }}>Add tickers above to start scanning.</p>
              </div>
            ) : (
              <div style={{ ...cardStyle, overflow: 'hidden' }}>
                {watchlist.map((t, i) => {
                  const latest = t.scanResults[0]
                  return (
                    <div key={t.symbol} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                      borderBottom: i < watchlist.length - 1 ? '1px solid var(--md-outline-variant)' : 'none',
                    }}>
                      <button onClick={() => router.push(`/ticker/${t.symbol}`)}
                        style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--md-on-surface)', fontFamily: 'Apercu Mono Pro, monospace', letterSpacing: '0.03em' }}>{t.symbol}</span>
                          <span style={{ fontSize: 12, color: 'var(--md-on-surface-variant)' }}>{t.name}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--md-outline)', marginTop: 2 }}>
                          Added {new Date(t.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {latest && <> · Last scan: <SignalBadge signal={latest.overallSignal} /></>}
                        </div>
                      </button>

                      {latest && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <span className="num" style={{ fontSize: 14, fontWeight: 600, color: 'var(--md-on-surface)' }}>
                            ${latest.price.toFixed(2)}
                          </span>
                          <GradeBadge grade={latest.sniperGrade} />
                        </div>
                      )}

                      <button onClick={() => removeTicker(t.symbol)}
                        style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--md-outline)', flexShrink: 0 }}>
                        <X size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── LISTS TAB ─────────────────────────────────────────────────────── */}
        {activeTab === 'lists' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 12, color: 'var(--md-outline)', margin: '0 0 8px' }}>
              Click a list to preview its tickers, then add the entire list to your watchlist with one click.
            </p>

            {TICKER_LISTS.map(list => {
              const isExpanded = expandedList === list.id
              const isAdding   = addingListId === list.id
              const wasAdded   = addedListIds.has(list.id)

              return (
                <div key={list.id} style={{ ...cardStyle, overflow: 'hidden' }}>
                  {/* List header row */}
                  <button
                    onClick={() => setExpandedList(isExpanded ? null : list.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 16px', background: 'transparent', border: 'none',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    {/* Color dot */}
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: list.color, flexShrink: 0 }} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--md-on-surface)' }}>
                          {list.label}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 8,
                          background: `${list.color}18`, color: list.color,
                        }}>
                          {list.tickers.length}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--md-outline)', marginTop: 1 }}>
                        {list.description}
                      </div>
                    </div>

                    {/* Add all button */}
                    <button
                      onClick={e => { e.stopPropagation(); addList(list) }}
                      disabled={isAdding}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                        background: wasAdded ? `${list.color}18` : list.color,
                        color: wasAdded ? list.color : '#001E30',
                        fontSize: 11, fontWeight: 700, flexShrink: 0,
                        opacity: isAdding ? 0.7 : 1,
                      }}
                    >
                      {isAdding
                        ? <RefreshCw size={11} className="spin" />
                        : wasAdded
                          ? <CheckCheck size={11} />
                          : <Plus size={11} />
                      }
                      {isAdding ? 'Adding…' : wasAdded ? 'Added' : 'Add All'}
                    </button>

                    <ChevronRight size={14} color="var(--md-outline)" style={{
                      flexShrink: 0,
                      transform: isExpanded ? 'rotate(90deg)' : 'none',
                      transition: 'transform 180ms ease',
                    }} />
                  </button>

                  {/* Expanded ticker chips */}
                  {isExpanded && (
                    <div style={{
                      padding: '0 16px 14px',
                      borderTop: '1px solid var(--md-outline-variant)',
                      paddingTop: 12,
                    }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {list.tickers.map(t => (
                          <button
                            key={t.symbol}
                            onClick={() => router.push(`/ticker/${t.symbol}`)}
                            title={t.name}
                            style={{
                              padding: '3px 9px', borderRadius: 5, border: '1px solid var(--md-outline-variant)',
                              background: 'var(--md-surface-container-high)', cursor: 'pointer',
                              fontSize: 12, fontWeight: 700, color: 'var(--md-on-surface)',
                              fontFamily: 'Apercu Mono Pro, monospace', letterSpacing: '0.03em',
                            }}
                          >
                            {t.symbol}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  )
}
