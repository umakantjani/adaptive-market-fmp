'use client'

import { useRouter } from 'next/navigation'
import { Home, BarChart2, FileText, Calculator, Target } from 'lucide-react'

export type NavKey = 'home' | 'indicators' | 'reports' | 'valuation' | 'sniper'

interface Props {
  active: NavKey
  symbol?: string  // optional — needed only for Indicators and Sniper tabs
}

const tabs: { key: NavKey; icon: typeof Home; label: string; activeColor: string }[] = [
  { key: 'home',       icon: Home,       label: 'Home',       activeColor: 'var(--md-primary)' },
  { key: 'indicators', icon: BarChart2,  label: 'Indicators', activeColor: 'var(--md-primary)' },
  { key: 'reports',    icon: FileText,   label: 'AI Reports', activeColor: 'var(--md-primary)' },
  { key: 'valuation',  icon: Calculator, label: 'Valuation',  activeColor: '#69F0AE' },
  { key: 'sniper',     icon: Target,     label: 'Sniper',     activeColor: '#FF6D00' },
]

export default function MobileNav({ active, symbol }: Props) {
  const router = useRouter()

  function handleTab(key: NavKey) {
    switch (key) {
      case 'home':
        router.push('/')
        break
      case 'indicators':
        if (symbol) router.push(`/ticker/${symbol}`)
        else router.push('/')
        break
      case 'reports':
        router.push('/reports')
        break
      case 'valuation':
        router.push('/reports?tab=valuation')
        break
      case 'sniper':
        if (symbol) router.push(`/ticker/${symbol}/sniper`)
        else router.push('/')
        break
    }
  }

  return (
    <div
      className="md:hidden"
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--md-surface)',
        borderTop: '1px solid var(--md-outline-variant)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: 40,
        display: 'flex',
        backdropFilter: 'blur(12px)',
      }}>
      {tabs.map(({ key, icon: Icon, label, activeColor }) => {
        const isActive = active === key
        return (
          <button
            key={key}
            onClick={() => handleTab(key)}
            className="md-ripple"
            style={{
              flex: 1, padding: '8px 2px 12px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              background: 'transparent', border: 'none', cursor: 'pointer',
            }}>
            <div style={{
              padding: '4px 12px', borderRadius: 16,
              background: isActive ? `${activeColor}22` : 'transparent',
              marginBottom: 1,
            }}>
              <Icon size={20} color={isActive ? activeColor : 'var(--md-on-surface-variant)'}
                strokeWidth={isActive ? 2 : 1.5} />
            </div>
            <span style={{
              fontSize: 10, fontWeight: isActive ? 600 : 400,
              color: isActive ? activeColor : 'var(--md-on-surface-variant)',
              letterSpacing: '-0.2px',
            }}>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
