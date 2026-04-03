'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useClerk } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import {
  TrendingUp, Home, ScrollText, BarChart2,
  Sparkles, Calculator, Target, BookOpen, ScanLine,
  ChevronLeft, ChevronRight, LogOut, Menu, X, CircleDollarSign,
} from 'lucide-react'

const COLLAPSED_W = 56
const EXPANDED_W = 200
const LS_KEY = 'sidebar_collapsed'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  exact: boolean
}

interface Props { symbol?: string }

function NavLink({ item, collapsed, active, onClick }: { item: NavItem; collapsed: boolean; active: boolean; onClick?: () => void }) {
  const { icon: Icon } = item
  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      style={{
        display: 'flex', alignItems: 'center',
        gap: collapsed ? 0 : 10,
        padding: collapsed ? '8px 0' : '7px 10px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: 6,
        textDecoration: 'none',
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        color: active ? 'var(--md-on-surface)' : 'var(--md-on-surface-variant)',
        background: active ? 'var(--md-surface-container)' : 'transparent',
        borderLeft: collapsed ? 'none' : `2px solid ${active ? 'var(--md-primary)' : 'transparent'}`,
        transition: 'background 120ms',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}
    >
      <Icon size={15} color={active ? 'var(--md-primary)' : 'var(--md-on-surface-variant)'} style={{ flexShrink: 0 }} />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  )
}

export default function Sidebar({ symbol }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useClerk()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Restore collapse preference from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY)
      if (stored !== null) setCollapsed(stored === 'true')
    } catch {}
  }, [])

  // Sync sidebar width CSS var
  useEffect(() => {
    const w = collapsed ? `${COLLAPSED_W}px` : `${EXPANDED_W}px`
    document.documentElement.style.setProperty('--sidebar-w', w)
    try { localStorage.setItem(LS_KEY, String(collapsed)) } catch {}
  }, [collapsed])

  // Listen for open-sidebar event from mobile hamburger buttons
  useEffect(() => {
    const open = () => setMobileOpen(true)
    window.addEventListener('sidebar:open', open)
    return () => window.removeEventListener('sidebar:open', open)
  }, [])

  // Close drawer on route change (mobile)
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  const tickerBase = symbol ? `/ticker/${symbol}` : null

  const globalNav: NavItem[] = [
    { href: '/', label: 'Home', icon: Home, exact: true },
    { href: tickerBase ?? '/', label: 'Analysis', icon: BarChart2, exact: tickerBase ? true : true },
  ]

  const tickerNav: NavItem[] = tickerBase ? [
    { href: `${tickerBase}/report`,    label: 'AI Report',  icon: Sparkles,           exact: false },
    { href: `${tickerBase}/valuation`, label: 'Valuation',  icon: Calculator,         exact: false },
    { href: `${tickerBase}/sniper`,    label: 'Sniper',     icon: Target,             exact: false },
    { href: `${tickerBase}/marketcap`, label: 'Market Cap', icon: CircleDollarSign,   exact: false },
  ] : []

  const bottomNav: NavItem[] = [
    { href: '/marketcap',             label: 'Market Cap',   icon: CircleDollarSign, exact: false },
    { href: '/marketcap/sp500-quarterly', label: 'S&P 500 Q',  icon: TrendingUp,       exact: false },
    { href: '/scanner',               label: 'Scanner',      icon: ScanLine,          exact: false },
    { href: '/rituals',               label: 'Rituals',      icon: BookOpen,          exact: false },
    { href: '/logs',                  label: 'Logs',         icon: ScrollText,        exact: false },
  ]

  // On mobile, always show expanded (no collapse on small screens)
  const effectiveCollapsed = collapsed

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay${mobileOpen ? ' active' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar */}
      <nav
        className={`sidebar-nav${mobileOpen ? ' sidebar-mobile-open' : ''}`}
        style={{
          position: 'fixed',
          top: 0, left: 0, bottom: 0,
          width: effectiveCollapsed ? COLLAPSED_W : EXPANDED_W,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--md-surface)',
          borderRight: '1px solid var(--md-outline-variant)',
          zIndex: 40,
          transition: 'width 220ms ease, transform 220ms ease',
          overflow: 'hidden',
        }}
      >
        {/* Brand row */}
        <div style={{
          height: 52, flexShrink: 0,
          display: 'flex', alignItems: 'center',
          justifyContent: effectiveCollapsed ? 'center' : 'space-between',
          gap: 10, padding: effectiveCollapsed ? '0 8px' : '0 12px 0 16px',
          borderBottom: '1px solid var(--md-outline-variant)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <TrendingUp size={16} color="var(--md-primary)" strokeWidth={2.5} style={{ flexShrink: 0 }} />
            {!effectiveCollapsed && (
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--md-on-surface)', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                Adaptive
              </span>
            )}
          </div>
          {/* Mobile close button */}
          {mobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              className="md-ripple"
              style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex' }}
            >
              <X size={16} color="var(--md-on-surface-variant)" />
            </button>
          )}
        </div>

        {/* Nav items */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: effectiveCollapsed ? '10px 6px' : '10px 8px',
          display: 'flex', flexDirection: 'column', gap: 1,
        }}>
          {globalNav.map(item => (
            <NavLink key={item.href} item={item} collapsed={effectiveCollapsed} active={isActive(item.href, item.exact)} onClick={() => setMobileOpen(false)} />
          ))}

          {tickerNav.length > 0 && (
            <>
              {!effectiveCollapsed && (
                <div style={{ margin: '12px 10px 6px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--md-outline)', whiteSpace: 'nowrap' }}>
                  {symbol}
                </div>
              )}
              {effectiveCollapsed && <div style={{ height: 8 }} />}
              {tickerNav.map(item => (
                <NavLink key={item.href} item={item} collapsed={effectiveCollapsed} active={isActive(item.href, item.exact)} onClick={() => setMobileOpen(false)} />
              ))}
            </>
          )}

          <div style={{ flex: 1 }} />

          {!effectiveCollapsed && (
            <div style={{ margin: '8px 10px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--md-outline)' }}>
              Resources
            </div>
          )}
          {effectiveCollapsed && <div style={{ height: 8 }} />}
          {bottomNav.map(item => (
            <NavLink key={item.href} item={item} collapsed={effectiveCollapsed} active={isActive(item.href, item.exact)} onClick={() => setMobileOpen(false)} />
          ))}
        </div>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid var(--md-outline-variant)',
          padding: effectiveCollapsed ? '10px 6px' : '10px 8px',
          display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0,
        }}>
          <button
            onClick={() => signOut(() => router.push('/'))}
            title={effectiveCollapsed ? 'Sign Out' : undefined}
            className="md-ripple"
            style={{
              display: 'flex', alignItems: 'center',
              gap: effectiveCollapsed ? 0 : 10,
              justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
              padding: effectiveCollapsed ? '8px 0' : '7px 10px',
              borderRadius: 6, border: 'none', cursor: 'pointer',
              background: 'transparent', color: 'var(--md-on-surface-variant)',
              fontSize: 13, fontWeight: 400, width: '100%', whiteSpace: 'nowrap',
            }}
          >
            <LogOut size={14} style={{ flexShrink: 0 }} />
            {!effectiveCollapsed && 'Sign Out'}
          </button>

          {/* Collapse — desktop only */}
          <button
            onClick={() => setCollapsed(c => !c)}
            title={effectiveCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="collapse-btn md-ripple"
            style={{
              alignItems: 'center',
              gap: effectiveCollapsed ? 0 : 10,
              justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
              padding: effectiveCollapsed ? '8px 0' : '7px 10px',
              borderRadius: 6, border: 'none', cursor: 'pointer',
              background: 'transparent', color: 'var(--md-outline)',
              fontSize: 13, fontWeight: 400, width: '100%', whiteSpace: 'nowrap',
            }}
          >
            {effectiveCollapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /> Collapse</>}
          </button>
        </div>
      </nav>

    </>
  )
}

// Exported helper — any mobile header can import and use this button
export function MenuButton({ style }: { style?: React.CSSProperties }) {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event('sidebar:open'))}
      className="md-ripple md:hidden"
      style={{
        padding: 8, borderRadius: 6, border: 'none',
        background: 'transparent', cursor: 'pointer', display: 'flex',
        ...style,
      }}
    >
      <Menu size={20} color="var(--md-on-surface-variant)" />
    </button>
  )
}
