'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import type { TickerSearchResult } from '@/types/market'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TickerSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    clearTimeout(timeoutRef.current)
    if (!query.trim()) { setResults([]); setOpen(false); return }
    setLoading(true)
    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data)
        setOpen(data.length > 0)
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 300)
  }, [query])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function select(symbol: string) {
    setOpen(false)
    setQuery('')
    try {
      const stored = JSON.parse(localStorage.getItem('am_recent_tickers') || '[]') as string[]
      const updated = [symbol, ...stored.filter((s: string) => s !== symbol)].slice(0, 10)
      localStorage.setItem('am_recent_tickers', JSON.stringify(updated))
    } catch {}
    router.push(`/ticker/${symbol}`)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* MD3 Search Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 14px',
        height: 42,
        borderRadius: 8,
        background: 'var(--md-surface-container)',
        border: '1px solid var(--md-outline-variant)',
      }}>
        <Search size={20} color="var(--md-on-surface-variant)" style={{ flexShrink: 0 }} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search stocks, ETFs, crypto…"
          onKeyDown={e => {
            if (e.key === 'Enter' && query.trim()) {
              select(query.trim().toUpperCase())
            }
          }}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: 16,
            color: 'var(--md-on-surface)',
            fontFamily: 'inherit',
          }}
        />
        {loading && <span style={{ fontSize: 12, color: 'var(--md-on-surface-variant)' }}>…</span>}
      </div>

      {/* Results Dropdown */}
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--md-surface-container)',
          border: '1px solid var(--md-outline-variant)',
          borderRadius: 8, overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          zIndex: 50,
        }}>
          {results.map((r, idx) => (
            <button
              key={r.symbol}
              onClick={() => select(r.symbol)}
              className="md-ripple"
              style={{
                width: '100%', textAlign: 'left',
                padding: '12px 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'transparent', border: 'none', cursor: 'pointer',
                borderBottom: idx < results.length - 1 ? '1px solid var(--md-outline-variant)' : 'none',
              }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--md-on-surface)', marginBottom: 2 }}>{r.symbol}</div>
                <div style={{ fontSize: 13, color: 'var(--md-on-surface-variant)' }}>{r.name}</div>
              </div>
              {r.exchange && (
                <span style={{
                  fontSize: 11, fontWeight: 500,
                  padding: '3px 8px', borderRadius: 12,
                  background: 'var(--md-surface-container)',
                  color: 'var(--md-on-surface-variant)',
                }}>{r.exchange}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
