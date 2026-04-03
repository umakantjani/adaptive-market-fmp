import { fetchIncomeStatements, fetchBalanceSheet, fetchProfile, fetchQuote } from '@/lib/fmp'
import type { FundamentalData } from '@/types/valuation'

const M = 1_000_000

export async function fetchFundamentals(symbol: string): Promise<FundamentalData> {
  // Fetch all FMP endpoints in parallel
  const [incomeStatements, balanceSheets, profile, quote] = await Promise.all([
    fetchIncomeStatements(symbol, 2).catch(() => []),
    fetchBalanceSheet(symbol).catch(() => []),
    fetchProfile(symbol).catch(() => null),
    fetchQuote(symbol).catch(() => null),
  ])

  const income = incomeStatements[0] ?? null     // most recent annual
  const prevIncome = incomeStatements[1] ?? null  // prior year for growth calc
  const balance = balanceSheets[0] ?? null

  // ── Income statement ──────────────────────────────────────────────────────
  const revenue = num(income?.revenue) / M
  const operatingIncome = num(income?.operatingIncome) / M
  const operatingMargin = revenue > 0 ? operatingIncome / revenue : 0
  const ebit = operatingIncome
  const interestExpense = num(income?.interestExpense) / M
  const incomeTaxExpense = num(income?.incomeTaxExpense)
  const incomeBeforeTax = num(income?.incomeBeforeTax)
  const taxRate = incomeBeforeTax > 0 ? incomeTaxExpense / incomeBeforeTax : 0.21

  // YoY revenue growth: (current - prior) / prior
  const prevRevenue = num(prevIncome?.revenue)
  const revenueGrowthYoy = prevRevenue > 0
    ? (num(income?.revenue) - prevRevenue) / prevRevenue
    : 0

  // ── Balance sheet ─────────────────────────────────────────────────────────
  const cash = num(balance?.cashAndCashEquivalents) / M
  const totalDebt = num(balance?.totalDebt) / M
  const bookEquity = num(balance?.totalStockholdersEquity) / M
    || (num(profile?.mktCap) / M * 0.3) // fallback: 30% of mktCap estimate
  const minorityInterests = num(balance?.minorityInterest) / M
  const nonOperatingAssets =
    (num(balance?.shortTermInvestments) + num(balance?.longTermInvestments)) / M

  // ── Profile ───────────────────────────────────────────────────────────────
  const beta = num(profile?.beta) || 1.0
  // FMP sharesOutstanding is in absolute shares (e.g. 15,500,000,000 for AAPL)
  const sharesOutstanding = num(profile?.sharesOutstanding) / M
  const sector = profile?.sector ?? 'Unknown'
  const industry = profile?.industry ?? 'Unknown'
  const name = profile?.companyName ?? quote?.name ?? symbol

  // ── Current price ─────────────────────────────────────────────────────────
  const currentPrice = quote?.currentPrice ?? num(profile?.price)

  // ── Interest expense fallback ─────────────────────────────────────────────
  const finalInterestExpense = interestExpense > 0
    ? interestExpense
    : totalDebt * 0.05 // 5% assumed cost of debt

  return {
    symbol,
    name,
    sector,
    industry,
    revenue: round(revenue),
    ebit: round(ebit),
    interestExpense: round(finalInterestExpense),
    netIncome: round(num(income?.netIncome) / M),
    bookEquity: round(bookEquity),
    bookDebt: round(totalDebt),
    cash: round(cash),
    nonOperatingAssets: round(nonOperatingAssets),
    minorityInterests: round(minorityInterests),
    sharesOutstanding: round(sharesOutstanding, 2),
    currentPrice,
    beta: round(beta, 3),
    effectiveTaxRate: round(Math.min(taxRate, 0.45), 3), // cap at 45%
    revenueGrowthYoy: round(revenueGrowthYoy, 4),
    operatingMargin: round(operatingMargin, 4),
  }
}

function num(v: unknown): number {
  if (typeof v === 'number') return isFinite(v) ? v : 0
  return 0
}

function round(v: number, decimals = 0): number {
  const f = Math.pow(10, decimals)
  return Math.round(v * f) / f
}
