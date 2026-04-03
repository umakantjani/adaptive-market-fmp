import type { OHLCVBar, TickerInfo, TickerSearchResult } from '@/types/market'

const BASE = 'https://financialmodelingprep.com/stable'

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

export async function fetchOHLCV(symbol: string, bars = 250): Promise<OHLCVBar[]> {
  const to = new Date()
  const from = new Date()
  from.setFullYear(from.getFullYear() - 2)

  // New stable API: flat array, no nested `historical` key
  const data = await fmpGet<FMPBar[]>('/historical-price-eod/full', {
    symbol,
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  })

  const historical = data ?? []

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
  changePercentage: number   // stable API: changePercentage (was changesPercentage in v3)
  marketCap: number
  yearHigh: number
  yearLow: number
  exchange: string
}

export async function fetchQuote(symbol: string): Promise<TickerInfo> {
  const [data] = await fmpGet<FMPQuote[]>('/quote', { symbol })
  if (!data) throw new Error(`No quote found for ${symbol}`)
  return {
    symbol: data.symbol,
    name: data.name || symbol,
    exchange: data.exchange,
    currentPrice: data.price ?? 0,
    priceChange: data.change ?? 0,
    priceChangePct: (data.changePercentage ?? 0) / 100,
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
  exchangeFullName: string   // stable API: exchangeFullName (was stockExchange in v3)
  exchange: string           // stable API: exchange (was exchangeShortName in v3)
}

export async function searchTickers(query: string): Promise<TickerSearchResult[]> {
  const results = await fmpGet<FMPSearchResult[]>('/search-symbol', { query, limit: '10' })
  return (results ?? [])
    .filter(r => r.symbol && r.name)
    .map(r => ({
      symbol: r.symbol,
      name: r.name,
      exchange: r.exchange || r.exchangeFullName,
      type: 'EQUITY',
    }))
}

// ── Fundamentals helpers (used by fundamentals.ts) ────────────────────────────
export interface FMPIncomeStatement {
  date: string; symbol: string
  revenue: number; operatingIncome: number
  interestExpense: number; incomeBeforeTax: number; incomeTaxExpense: number
  netIncome: number; ebitda: number
  weightedAverageShsOutDil: number   // used as proxy for shares outstanding
}

export interface FMPBalanceSheet {
  date: string; symbol: string
  cashAndCashEquivalents: number; shortTermInvestments: number; longTermInvestments: number
  totalDebt: number; longTermDebt: number
  totalStockholdersEquity: number; minorityInterest: number
}

export interface FMPProfile {
  symbol: string; companyName: string
  sector?: string; industry?: string
  beta?: number; marketCap?: number
  price?: number; exchange?: string
  website?: string; description?: string
  ceo?: string; country?: string
  fullTimeEmployees?: string; ipoDate?: string
  isEtf?: boolean
}

export async function fetchIncomeStatements(symbol: string, limit = 2): Promise<FMPIncomeStatement[]> {
  return fmpGet<FMPIncomeStatement[]>('/income-statement', { symbol, limit: String(limit), period: 'annual' })
}

export async function fetchBalanceSheet(symbol: string): Promise<FMPBalanceSheet[]> {
  return fmpGet<FMPBalanceSheet[]>('/balance-sheet-statement', { symbol, limit: '1', period: 'annual' })
}

export async function fetchProfile(symbol: string): Promise<FMPProfile> {
  const [profile] = await fmpGet<FMPProfile[]>('/profile', { symbol })
  if (!profile) throw new Error(`No profile found for ${symbol}`)
  return profile
}

// ── Cash Flow Statement ───────────────────────────────────────────────────────
export interface FMPCashFlowStatement {
  date: string; symbol: string; period: string; fiscalYear?: string; reportedCurrency?: string
  netIncome?: number
  depreciationAndAmortization?: number
  operatingCashFlow?: number
  capitalExpenditure?: number
  freeCashFlow?: number
  dividendsPaid?: number
  commonStockRepurchased?: number
  netCashProvidedByFinancing?: number
  netChangeInCash?: number
}

export async function fetchCashFlowStatements(symbol: string, limit = 40): Promise<FMPCashFlowStatement[]> {
  return fmpGet<FMPCashFlowStatement[]>('/cash-flow-statement', { symbol, limit: String(limit), period: 'annual' })
}

// ── Historical Market Cap (paginated via date range) ─────────────────────────
export interface FMPMarketCap {
  symbol: string; date: string; marketCap: number
}

export async function fetchMarketCapHistory(symbol: string): Promise<FMPMarketCap[]> {
  const allBars: FMPMarketCap[] = []
  const to = new Date().toISOString().split('T')[0]
  let fetchTo = to

  while (true) {
    const chunk = await fmpGet<FMPMarketCap[]>('/historical-market-capitalization', {
      symbol,
      from: '1980-01-01',
      to: fetchTo,
    })
    if (!chunk || chunk.length === 0) break
    allBars.push(...chunk)
    if (chunk.length < 5000) break
    // Step back one day before the oldest in this chunk
    const oldest = chunk[chunk.length - 1].date
    const prev = new Date(oldest)
    prev.setDate(prev.getDate() - 1)
    fetchTo = prev.toISOString().split('T')[0]
  }

  return allBars
}

// ── Historical OHLCV (paginated via date range) ───────────────────────────────
export async function fetchFullOHLCV(symbol: string): Promise<OHLCVBar[]> {
  const allBars: OHLCVBar[] = []
  let fetchTo = new Date().toISOString().split('T')[0]

  while (true) {
    const chunk = await fmpGet<FMPBar[]>('/historical-price-eod/full', {
      symbol,
      from: '1980-01-01',
      to: fetchTo,
    })
    if (!chunk || chunk.length === 0) break
    allBars.push(...chunk.filter(r => r.close != null && r.close > 0).map(r => ({
      date: r.date,
      open: r.open ?? r.close,
      high: r.high ?? r.close,
      low: r.low ?? r.close,
      close: r.close,
      volume: r.volume ?? 0,
    })))
    if (chunk.length < 5000) break
    const oldest = chunk[chunk.length - 1].date
    const prev = new Date(oldest)
    prev.setDate(prev.getDate() - 1)
    fetchTo = prev.toISOString().split('T')[0]
  }

  return allBars.reverse() // oldest-first
}

// ── S&P 500 Constituents ──────────────────────────────────────────────────────
export interface FMPSp500Constituent {
  symbol: string; name: string; sector?: string; subSector?: string
  headQuarter?: string; dateFirstAdded?: string; cik?: string; founded?: string
}

export async function fetchSp500Constituents(): Promise<FMPSp500Constituent[]> {
  return fmpGet<FMPSp500Constituent[]>('/sp500-constituent')
}
