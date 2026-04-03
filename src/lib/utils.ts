import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)
}

export function formatNumber(n: number | null | undefined, decimals = 2): string {
  if (n === null || n === undefined) return 'N/A'
  return n.toFixed(decimals)
}

export function formatLargeNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return 'N/A'
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + 'T'
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(2) + 'K'
  return n.toFixed(2)
}

export function signalColor(signal: string): string {
  switch (signal) {
    case 'STRONG_BUY': return 'text-emerald-400 bg-emerald-400/10'
    case 'BUY': return 'text-green-400 bg-green-400/10'
    case 'NEUTRAL': return 'text-yellow-400 bg-yellow-400/10'
    case 'SELL': return 'text-red-400 bg-red-400/10'
    case 'STRONG_SELL': return 'text-rose-500 bg-rose-500/10'
    default: return 'text-slate-400 bg-slate-400/10'
  }
}
