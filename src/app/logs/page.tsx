'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, BarChart2, Calculator, FileText, AlertCircle, TrendingUp } from 'lucide-react'

interface LogEntry {
  id: number
  symbol: string
  searchType: string
  searchedAt: string
  price: number | null
  result: string
  errorMsg: string | null
}
interface StatItem { searchType: string; _count: { id: number } }
interface TopSymbol { symbol: string; _count: { id: number } }

type Filter = 'all' | 'ta' | 'valuation' | 'report'

const TYPE_META: Record<string, { icon: typeof BarChart2; label: string; color: string }> = {
  ta:        { icon: BarChart2,  label: 'TA Analysis',       color: 'var(--md-primary)' },
  valuation: { icon: Calculator, label: 'DCF Valuation',     color: '#69F0AE' },
  report:    { icon: FileText,   label: 'AI Report',         color: '#FFD740' },
}

export default function LogsPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [stats, setStats] = useState<StatItem[]>([])
  const [topSymbols, setTopSymbols] = useState<TopSymbol[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    setLoading(true)
    const q = filter === 'all' ? '' : `?type=${filter}`
    fetch(`/api/logs${q}`)
      .then(r => r.json())
      .then(d => { setLogs(d.logs || []); setStats(d.stats || []); setTopSymbols(d.topSymbols || []) })
      .finally(() => setLoading(false))
  }, [filter])

  const totalSearches = stats.reduce((s, x) => s + x._count.id, 0)
  const statMap = Object.fromEntries(stats.map(s => [s.searchType, s._count.id]))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--md-background)' }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 30, height: 64,
        padding: '0 16px 0 4px', display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--md-surface)', borderBottom: '1px solid var(--md-outline-variant)',
      }}>
        <button onClick={() => router.push('/')} className="md-ripple"
          style={{ padding: 12, borderRadius: 50, background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={22} color="var(--md-on-surface-variant)" />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 500, color: 'var(--md-on-surface)', margin: 0, flex: 1 }}>Search Logs</h1>
        <span className="num" style={{ fontSize: 13, color: 'var(--md-on-surface-variant)' }}>
          {totalSearches.toLocaleString()} total
        </span>
      </header>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 16px' }}>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { key: 'ta',        label: 'TA Analyses',    icon: BarChart2,  color: 'var(--md-primary)' },
            { key: 'valuation', label: 'DCF Valuations', icon: Calculator, color: '#69F0AE' },
            { key: 'report',    label: 'AI Reports',     icon: FileText,   color: '#FFD740' },
          ].map(({ key, label, icon: Icon, color }) => (
            <div key={key} style={{ background: 'var(--md-surface-container)', borderRadius: 16, padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Icon size={16} color={color} />
                <span style={{ fontSize: 12, color: 'var(--md-on-surface-variant)' }}>{label}</span>
              </div>
              <p className="num" style={{ fontSize: 28, fontWeight: 300, color: 'var(--md-on-surface)', margin: 0 }}>
                {(statMap[key] ?? 0).toLocaleString()}
              </p>
            </div>
          ))}

          {/* Top symbol */}
          {topSymbols[0] && (
            <div style={{ background: 'var(--md-surface-container)', borderRadius: 16, padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <TrendingUp size={16} color="var(--md-primary)" />
                <span style={{ fontSize: 12, color: 'var(--md-on-surface-variant)' }}>Most Searched</span>
              </div>
              <p className="num" style={{ fontSize: 22, fontWeight: 600, color: 'var(--md-on-surface)', margin: '0 0 2px' }}>
                {topSymbols[0].symbol}
              </p>
              <p style={{ fontSize: 12, color: 'var(--md-outline)', margin: 0 }}>
                {topSymbols[0]._count.id}× searches
              </p>
            </div>
          )}
        </div>

        {/* Top symbols bar */}
        {topSymbols.length > 1 && (
          <div style={{ background: 'var(--md-surface-container)', borderRadius: 16, padding: '14px 20px', marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: 'var(--md-on-surface-variant)', margin: '0 0 10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top Symbols</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {topSymbols.map(s => (
                <button key={s.symbol} onClick={() => router.push(`/ticker/${s.symbol}`)}
                  className="md-ripple"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 12, background: 'var(--md-surface-container-high)', border: 'none', cursor: 'pointer' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--md-on-surface)' }}>{s.symbol}</span>
                  <span style={{ fontSize: 11, color: 'var(--md-outline)' }}>{s._count.id}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {(['all', 'ta', 'valuation', 'report'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)} className="md-ripple"
              style={{
                padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13,
                background: filter === f ? 'var(--md-primary)' : 'var(--md-surface-container)',
                color: filter === f ? 'var(--md-on-primary)' : 'var(--md-on-surface-variant)',
                fontWeight: filter === f ? 600 : 400,
              }}>
              {f === 'all' ? 'All' : f === 'ta' ? 'TA' : f === 'valuation' ? 'Valuation' : 'Reports'}
            </button>
          ))}
        </div>

        {/* Log table */}
        <div style={{ background: 'var(--md-surface-container)', borderRadius: 20, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--md-outline)' }}>Loading…</div>
          ) : logs.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: 'var(--md-outline)', margin: 0 }}>No logs yet — start searching!</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--md-surface-container-high)' }}>
                    {['Symbol', 'Type', 'Price at Search', 'Status', 'Time'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--md-on-surface-variant)', fontWeight: 600, whiteSpace: 'nowrap', fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => {
                    const meta = TYPE_META[log.searchType] ?? TYPE_META.ta
                    const Icon = meta.icon
                    const isError = log.result === 'error'
                    const ts = new Date(log.searchedAt)
                    const timeStr = ts.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                    const dateStr = ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

                    return (
                      <tr key={log.id}
                        style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(124,185,244,0.02)', cursor: 'pointer' }}
                        onClick={() => !isError && router.push(
                          log.searchType === 'valuation'
                            ? `/ticker/${log.symbol}/valuation`
                            : `/ticker/${log.symbol}`
                        )}>
                        <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--md-on-surface)' }}>
                          {log.symbol}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: meta.color }}>
                            <Icon size={13} />
                            <span style={{ fontSize: 12 }}>{meta.label}</span>
                          </span>
                        </td>
                        <td className="num" style={{ padding: '10px 16px', color: 'var(--md-on-surface-variant)' }}>
                          {log.price != null ? `$${log.price.toFixed(2)}` : '—'}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          {isError ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#EF5350', fontSize: 12 }}>
                              <AlertCircle size={12} /> Error
                              {log.errorMsg && (
                                <span style={{ color: 'var(--md-outline)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  · {log.errorMsg}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, color: '#69F0AE', fontWeight: 500 }}>✓ Success</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 16px', color: 'var(--md-outline)', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: 12 }}>{dateStr}</span>
                          <span style={{ fontSize: 11, display: 'block', color: 'var(--md-outline)', opacity: 0.7 }}>{timeStr}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
