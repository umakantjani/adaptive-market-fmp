import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchSp500Constituents, fetchBatchQuotes, fetchMarketCapHistory } from '@/lib/fmp'

export const dynamic = 'force-dynamic'
// Allow up to 5 minutes for on-demand ingestion of top-10 history
export const maxDuration = 300

// ── Quarter math ──────────────────────────────────────────────────────────────

interface Quarter { label: string; date: string }

function quarterEndDates(count: number): Quarter[] {
  // Quarter-end months (0-indexed): Q1=Mar(2), Q2=Jun(5), Q3=Sep(8), Q4=Dec(11)
  const Q_MONTHS = [2, 5, 8, 11]
  const Q_NAMES  = ['Q1', 'Q2', 'Q3', 'Q4']

  const now = new Date()
  let year = now.getFullYear()

  // Find the most recently completed quarter
  let qi = -1
  for (let i = Q_MONTHS.length - 1; i >= 0; i--) {
    const endDay = new Date(year, Q_MONTHS[i] + 1, 0).getDate()
    if (now >= new Date(year, Q_MONTHS[i], endDay)) { qi = i; break }
  }
  if (qi === -1) { year -= 1; qi = 3 }  // before end of Q1 → use Q4 of prev year

  const result: Quarter[] = []
  for (let i = 0; i < count; i++) {
    const month = Q_MONTHS[qi]
    const day   = new Date(year, month + 1, 0).getDate()
    const date  = `${year}-${String(month + 1).padStart(2, '0')}-${day}`
    result.unshift({ label: `${year} ${Q_NAMES[qi]}`, date })
    qi -= 1
    if (qi < 0) { qi = 3; year -= 1 }
  }
  return result
}

// ── Per-quarter snapshot query ────────────────────────────────────────────────

async function snapshotAt(
  symbols: string[],
  quarterDate: string
): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<{ symbol: string; marketCap: bigint }[]>`
    SELECT DISTINCT ON (symbol) symbol, "marketCap"
    FROM "MarketCapHistory"
    WHERE symbol = ANY(${symbols}::text[])
      AND date <= ${quarterDate}
    ORDER BY symbol, date DESC
  `
  const map = new Map<string, number>()
  for (const r of rows) map.set(r.symbol, Number(r.marketCap))
  return map
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const raw = url.searchParams.get('quarters') ?? '5'
  const numQ = raw === 'all' ? 40 : Math.min(40, parseInt(raw) || 5)

  try {
    // ── 1. Ensure S&P 500 constituent list is in DB ──────────────────────────
    let constituents = await prisma.sp500Constituent.findMany({
      select: { symbol: true, name: true },
    })

    if (constituents.length < 50) {
      // Auto-seed constituent list (one FMP call)
      const fmpList = await fetchSp500Constituents()
      if (fmpList.length === 0) {
        return NextResponse.json({ error: 'Could not fetch S&P 500 constituent list from FMP' }, { status: 503 })
      }
      for (const c of fmpList) {
        await prisma.sp500Constituent.upsert({
          where: { symbol: c.symbol },
          update: { name: c.name, sector: c.sector ?? null, updatedAt: new Date() },
          create: { symbol: c.symbol, name: c.name, sector: c.sector ?? null },
        })
      }
      constituents = await prisma.sp500Constituent.findMany({ select: { symbol: true, name: true } })
    }

    const allSymbols  = constituents.map(c => c.symbol)
    const nameMap     = new Map(constituents.map(c => [c.symbol, c.name]))

    // ── 2. Rank constituents by current market cap (batch FMP quotes) ────────
    const allQuotes: Array<{ symbol: string; marketCap: number; name: string }> = []
    for (let i = 0; i < allSymbols.length; i += 100) {
      const batch = await fetchBatchQuotes(allSymbols.slice(i, i + 100))
      allQuotes.push(...batch)
    }
    allQuotes.sort((a, b) => b.marketCap - a.marketCap)

    // Update nameMap with FMP names
    for (const q of allQuotes) nameMap.set(q.symbol, q.name || nameMap.get(q.symbol) || q.symbol)

    // Top 10, extend to 11 if both GOOGL and GOOG appear consecutively
    let topRanked = allQuotes.slice(0, 10)
    const googleSet = new Set(['GOOGL', 'GOOG'])
    const googleInTop = topRanked.filter(q => googleSet.has(q.symbol))
    if (googleInTop.length === 1) {
      const rank11 = allQuotes[10]
      if (rank11 && googleSet.has(rank11.symbol)) topRanked = [...topRanked, rank11]
    }
    const topSymbols = topRanked.map(q => q.symbol)

    // ── 3. Ensure market cap history for top companies is in DB ──────────────
    for (const symbol of topSymbols) {
      const count = await prisma.marketCapHistory.count({ where: { symbol } })
      if (count < 50) {
        const history = await fetchMarketCapHistory(symbol)
        for (let j = 0; j < history.length; j += 1000) {
          const chunk = history.slice(j, j + 1000)
          await prisma.$transaction(
            chunk.map(r =>
              prisma.marketCapHistory.upsert({
                where: { symbol_date: { symbol, date: r.date } },
                update: { marketCap: BigInt(Math.round(r.marketCap)) },
                create: { symbol, date: r.date, marketCap: BigInt(Math.round(r.marketCap)) },
              })
            )
          )
        }
      }
    }

    // ── 4. Get symbols with any market cap data (for S&P 500 total) ──────────
    const symbolsWithData = await prisma.$queryRaw<{ symbol: string }[]>`
      SELECT DISTINCT symbol FROM "MarketCapHistory"
      WHERE symbol = ANY(${allSymbols}::text[])
    `
    const sp500DataSymbols = symbolsWithData.map(r => r.symbol)

    // ── 5. Build quarterly snapshots ─────────────────────────────────────────
    const quarters = quarterEndDates(numQ)
    const companyValues: Record<string, number[]> = Object.fromEntries(topSymbols.map(s => [s, []]))
    const sp500Totals: number[] = []
    const sp500Coverage: number[] = []

    for (const q of quarters) {
      // Top-10 snapshots
      const snap = await snapshotAt(topSymbols, q.date)
      for (const sym of topSymbols) companyValues[sym].push(snap.get(sym) ?? 0)

      // S&P 500 total (all symbols with data in DB)
      const sp500Snap = await snapshotAt(sp500DataSymbols, q.date)
      let total = 0
      for (const [, v] of sp500Snap) total += v
      sp500Totals.push(total)
      sp500Coverage.push(sp500Snap.size)
    }

    // ── 6. Build response ─────────────────────────────────────────────────────
    const companies = topSymbols.map((symbol, i) => ({
      symbol,
      name: nameMap.get(symbol) ?? symbol,
      rank: i + 1,
      currentMarketCap: topRanked[i]?.marketCap ?? 0,
      values: companyValues[symbol],
    }))

    return NextResponse.json({
      quarters: quarters.map(q => ({ label: q.label, date: q.date })),
      companies,
      sp500Total: sp500Totals,
      sp500Coverage,
      constituentCount: allSymbols.length,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
