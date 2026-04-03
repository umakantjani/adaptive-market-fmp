import type { OHLCVBar, TickerInfo, TickerSearchResult } from '@/types/market'

const BASE = 'https://financialmodelingprep.com/api/v3'

function apiKey(): string {
  const key = process.env.FMP_API_KEY
  if (!key) throw new Error('FMP_API_KEY environment variable is not set')
  return key
}

async function fmpGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE}${path}`)
  url.searchParams.set('apikey', apiKey())
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  const res = await fetch(url.toString(), { next: { revalidate: 60 } })
  if (!res.ok) throw new Error(`FMP ${path} → HTTP ${res.status}`)
  return res.json() as Promise<T>
}

// ── OHLCV ─────────────────────────────────────────────────────────────────────
interface FMPBar {
  date: string; open: number; high: number; low: number; close: number; volume: number
}
interface FMPHistoricalResponse {
  symbol: string
  historical: FMPBar[]
}

export async function fetchOHLCV(symbol: string, bars = 250): Promise<OHLCVBar[]> {
  const to = new Date()
  const from = new Date()
  from.setFullYear(from.getFullYear() - 2)

  const data = await fmpGet<FMPHistoricalResponse>(`/historical-price-full/${symbol}`, {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  })

  const historical = data.historical ?? []

  return historical
    .reverse()                                          // FMP returns newest-first; reverse to oldest-first
    .slice(-bars)
    .filter(r => r.close != null && r.close > 0)
    .map(r => ({
      date: r.date,
      open: r.open ?? r.close,
      high: r.high ?? r.close,
      low: r.low ?? r.close,
      close: r.close,
      volume: r.volume ?? 0,
    }))
}

// ── Quote ─────────────────────────────────────────────────────────────────────
interface FMPQuote {
  symbol: string
  name: string
  price: number
  change: number
  changesPercentage: number
  marketCap: number
  yearHigh: number
  yearLow: number
  exchange: string
}

export async function fetchQuote(symbol: string): Promise<TickerInfo> {
  const [data] = await fmpGet<FMPQuote[]>(`/quote/${symbol}`)
  if (!data) throw new Error(`No quote found for ${symbol}`)
  return {
    symbol: data.symbol,
    name: data.name || symbol,
    exchange: data.exchange,
    currentPrice: data.price ?? 0,
    priceChange: data.change ?? 0,
    priceChangePct: (data.changesPercentage ?? 0) / 100,   // FMP returns percentage, normalize to ratio
    marketCap: data.marketCap,
    week52High: data.yearHigh,
    week52Low: data.yearLow,
  }
}

// ── Search ────────────────────────────────────────────────────────────────────
interface FMPSearchResult {
  symbol: string
  name: string
  currency: string
  stockExchange: string
  exchangeShortName: string
}

export async function searchTickers(query: string): Promise<TickerSearchResult[]> {
  const results = await fmpGet<FMPSearchResult[]>('/search', { query, limit: '10' })
  return (results ?? [])
    .filter(r => r.symbol && r.name)
    .map(r => ({
      symbol: r.symbol,
      name: r.name,
      exchange: r.exchangeShortName || r.stockExchange,
      type: 'EQUITY',
    }))
}

// ── Fundamentals helpers (used by fundamentals.ts) ────────────────────────────
export interface FMPIncomeStatement {
  date: string; symbol: string
  revenue: number; operatingIncome: number
  interestExpense: number; incomeBeforeTax: number; incomeTaxExpense: number
  netIncome: number; ebitda: number
}

export interface FMPBalanceSheet {
  date: string; symbol: string
  cashAndCashEquivalents: number; shortTermInvestments: number; longTermInvestments: number
  totalDebt: number; longTermDebt: number
  totalStockholdersEquity: number; minorityInterest: number
}

export interface FMPProfile {
  symbol: string; companyName: string
  sector: string; industry: string
  beta: number; mktCap: number
  sharesOutstanding: number; price: number
  website: string; description: string
}

export async function fetchIncomeStatements(symbol: string, limit = 2): Promise<FMPIncomeStatement[]> {
  return fmpGet<FMPIncomeStatement[]>(`/income-statement/${symbol}`, { limit: String(limit), period: 'annual' })
}

export async function fetchBalanceSheet(symbol: string): Promise<FMPBalanceSheet[]> {
  return fmpGet<FMPBalanceSheet[]>(`/balance-sheet-statement/${symbol}`, { limit: '1', period: 'annual' })
}

export async function fetchProfile(symbol: string): Promise<FMPProfile> {
  const [profile] = await fmpGet<FMPProfile[]>(`/profile/${symbol}`)
  if (!profile) throw new Error(`No profile found for ${symbol}`)
  return profile
}
