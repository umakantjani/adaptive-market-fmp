/**
 * On-demand ticker ingestion pipeline.
 *
 * When a ticker is searched for the first time, fetchAndStoreTicker() fetches
 * all available FMP data and stores it in PostgreSQL. Subsequent searches
 * serve from the database.
 *
 * S&P 500 market cap bulk seeding is handled separately via seedSp500MarketCap().
 */

import { prisma } from '@/lib/prisma'
import {
  fetchProfile,
  fetchIncomeStatements,
  fetchBalanceSheet,
  fetchCashFlowStatements,
  fetchMarketCapHistory,
  fetchFullOHLCV,
  fetchSp500Constituents,
  type FMPIncomeStatement,
  type FMPBalanceSheet,
  type FMPCashFlowStatement,
} from '@/lib/fmp'

// ── Full ticker ingestion (on first search) ───────────────────────────────────

export async function fetchAndStoreTicker(symbol: string): Promise<void> {
  const existing = await prisma.ticker.findUnique({ where: { symbol } })
  if (existing?.fullyIngested) return

  // Fetch everything in parallel
  const [profile, incomeStmts, balanceSheets, cashFlows, ohlcv, marketCaps] = await Promise.allSettled([
    fetchProfile(symbol),
    fetchIncomeStatements(symbol, 50),
    fetchBalanceSheet(symbol),
    fetchCashFlowStatements(symbol, 50),
    fetchFullOHLCV(symbol),
    fetchMarketCapHistory(symbol),
  ])

  // Upsert Ticker
  const profileData = profileResult(profile)
  await prisma.ticker.upsert({
    where: { symbol },
    update: {
      name: profileData?.companyName ?? symbol,
      exchange: profileData?.exchange,
      sector: profileData?.sector,
      industry: profileData?.industry,
      fullyIngested: true,
      updatedAt: new Date(),
    },
    create: {
      symbol,
      name: profileData?.companyName ?? symbol,
      exchange: profileData?.exchange,
      sector: profileData?.sector,
      industry: profileData?.industry,
      fullyIngested: true,
    },
  })

  // Upsert CompanyProfile
  if (profileData) {
    await prisma.companyProfile.upsert({
      where: { symbol },
      update: {
        name: profileData.companyName,
        exchange: profileData.exchange ?? null,
        sector: profileData.sector ?? null,
        industry: profileData.industry ?? null,
        beta: profileData.beta ?? null,
        marketCap: profileData.marketCap ? BigInt(Math.round(profileData.marketCap)) : null,
        price: profileData.price ?? null,
        website: profileData.website ?? null,
        description: profileData.description ?? null,
        fetchedAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        symbol,
        name: profileData.companyName,
        exchange: profileData.exchange ?? null,
        sector: profileData.sector ?? null,
        industry: profileData.industry ?? null,
        beta: profileData.beta ?? null,
        marketCap: profileData.marketCap ? BigInt(Math.round(profileData.marketCap)) : null,
        price: profileData.price ?? null,
        website: profileData.website ?? null,
        description: profileData.description ?? null,
      },
    })
  }

  // Bulk upsert OHLCV bars
  if (ohlcv.status === 'fulfilled' && ohlcv.value.length > 0) {
    const bars = ohlcv.value
    // Batch in chunks of 1000 to avoid query size limits
    for (let i = 0; i < bars.length; i += 1000) {
      const chunk = bars.slice(i, i + 1000)
      await prisma.$transaction(
        chunk.map(bar =>
          prisma.oHLCVBar.upsert({
            where: { symbol_date: { symbol, date: bar.date } },
            update: { open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: BigInt(Math.round(bar.volume)) },
            create: { symbol, date: bar.date, open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: BigInt(Math.round(bar.volume)) },
          })
        )
      )
    }
  }

  // Bulk upsert market cap history
  if (marketCaps.status === 'fulfilled' && marketCaps.value.length > 0) {
    for (let i = 0; i < marketCaps.value.length; i += 1000) {
      const chunk = marketCaps.value.slice(i, i + 1000)
      await prisma.$transaction(
        chunk.map(row =>
          prisma.marketCapHistory.upsert({
            where: { symbol_date: { symbol, date: row.date } },
            update: { marketCap: BigInt(Math.round(row.marketCap)) },
            create: { symbol, date: row.date, marketCap: BigInt(Math.round(row.marketCap)) },
          })
        )
      )
    }
  }

  // Bulk upsert income statements
  if (incomeStmts.status === 'fulfilled') {
    for (const s of incomeStmts.value) {
      await prisma.incomeStatement.upsert({
        where: { symbol_date_period: { symbol, date: s.date, period: 'annual' } },
        update: incomeStatementData(s),
        create: { symbol, date: s.date, period: 'annual', ...incomeStatementData(s) },
      })
    }
  }

  // Bulk upsert balance sheets
  if (balanceSheets.status === 'fulfilled') {
    for (const s of balanceSheets.value as FMPBalanceSheet[]) {
      await prisma.balanceSheet.upsert({
        where: { symbol_date_period: { symbol, date: s.date, period: 'annual' } },
        update: balanceSheetData(s),
        create: { symbol, date: s.date, period: 'annual', ...balanceSheetData(s) },
      })
    }
  }

  // Bulk upsert cash flow statements
  if (cashFlows.status === 'fulfilled') {
    for (const s of cashFlows.value as FMPCashFlowStatement[]) {
      await prisma.cashFlowStatement.upsert({
        where: { symbol_date_period: { symbol, date: s.date, period: 'annual' } },
        update: cashFlowData(s),
        create: { symbol, date: s.date, period: 'annual', ...cashFlowData(s) },
      })
    }
  }
}

// ── S&P 500 bulk market cap seeding ──────────────────────────────────────────

export async function seedSp500MarketCap(
  onProgress?: (done: number, total: number, symbol: string) => void
): Promise<{ succeeded: string[]; failed: string[] }> {
  const constituents = await fetchSp500Constituents()
  const succeeded: string[] = []
  const failed: string[] = []

  // Upsert S&P 500 constituent list
  for (const c of constituents) {
    await prisma.sp500Constituent.upsert({
      where: { symbol: c.symbol },
      update: { name: c.name, sector: c.sector ?? null, subSector: c.subSector ?? null, headQuarter: c.headQuarter ?? null, dateFirstAdded: c.dateFirstAdded ?? null, founded: c.founded ?? null, updatedAt: new Date() },
      create: { symbol: c.symbol, name: c.name, sector: c.sector ?? null, subSector: c.subSector ?? null, headQuarter: c.headQuarter ?? null, dateFirstAdded: c.dateFirstAdded ?? null, founded: c.founded ?? null },
    })
  }

  // Fetch market cap history for each constituent
  for (let i = 0; i < constituents.length; i++) {
    const { symbol } = constituents[i]
    onProgress?.(i, constituents.length, symbol)
    try {
      const caps = await fetchMarketCapHistory(symbol)
      for (let j = 0; j < caps.length; j += 1000) {
        const chunk = caps.slice(j, j + 1000)
        await prisma.$transaction(
          chunk.map(row =>
            prisma.marketCapHistory.upsert({
              where: { symbol_date: { symbol, date: row.date } },
              update: { marketCap: BigInt(Math.round(row.marketCap)) },
              create: { symbol, date: row.date, marketCap: BigInt(Math.round(row.marketCap)) },
            })
          )
        )
      }
      succeeded.push(symbol)
    } catch (err) {
      console.error(`Failed to fetch market cap for ${symbol}:`, err)
      failed.push(symbol)
    }
    // Respect FMP rate limits (~300 req/min on Professional)
    await sleep(200)
  }

  onProgress?.(constituents.length, constituents.length, 'done')
  return { succeeded, failed }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function profileResult(result: PromiseSettledResult<Awaited<ReturnType<typeof fetchProfile>>>) {
  return result.status === 'fulfilled' ? result.value : null
}

function bi(v: number | undefined | null): bigint | null {
  if (v == null || !isFinite(v)) return null
  return BigInt(Math.round(v))
}

function incomeStatementData(s: FMPIncomeStatement) {
  return {
    fiscalYear: null as string | null,
    reportedCurrency: null as string | null,
    revenue: bi(s.revenue),
    costOfRevenue: null as bigint | null,
    grossProfit: null as bigint | null,
    operatingExpenses: null as bigint | null,
    operatingIncome: bi(s.operatingIncome),
    interestExpense: bi(s.interestExpense),
    interestIncome: null as bigint | null,
    ebitda: bi(s.ebitda),
    ebit: null as bigint | null,
    incomeBeforeTax: bi(s.incomeBeforeTax),
    incomeTaxExpense: bi(s.incomeTaxExpense),
    netIncome: bi(s.netIncome),
    eps: null as number | null,
    epsDiluted: null as number | null,
    weightedAverageShsOut: null as bigint | null,
    weightedAverageShsOutDil: bi(s.weightedAverageShsOutDil),
  }
}

function balanceSheetData(s: FMPBalanceSheet) {
  return {
    fiscalYear: null as string | null,
    reportedCurrency: null as string | null,
    cashAndCashEquivalents: bi(s.cashAndCashEquivalents),
    shortTermInvestments: bi(s.shortTermInvestments),
    netReceivables: null as bigint | null,
    inventory: null as bigint | null,
    totalCurrentAssets: null as bigint | null,
    totalAssets: null as bigint | null,
    totalCurrentLiabilities: null as bigint | null,
    longTermDebt: bi(s.longTermDebt),
    totalDebt: bi(s.totalDebt),
    totalLiabilities: null as bigint | null,
    totalStockholdersEquity: bi(s.totalStockholdersEquity),
    minorityInterest: bi(s.minorityInterest),
    totalEquity: null as bigint | null,
    shortTermInvestmentsProp: bi(s.shortTermInvestments),
    longTermInvestments: bi(s.longTermInvestments ?? null),
  }
}

function cashFlowData(s: FMPCashFlowStatement) {
  return {
    fiscalYear: null as string | null,
    reportedCurrency: null as string | null,
    netIncome: bi(s.netIncome),
    depreciationAndAmortization: bi(s.depreciationAndAmortization),
    operatingCashFlow: bi(s.operatingCashFlow),
    capitalExpenditure: bi(s.capitalExpenditure),
    freeCashFlow: bi(s.freeCashFlow),
    dividendsPaid: bi(s.dividendsPaid),
    commonStockRepurchased: bi(s.commonStockRepurchased),
    netCashProvidedByFinancing: bi(s.netCashProvidedByFinancing),
    netChangeInCash: bi(s.netChangeInCash),
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
