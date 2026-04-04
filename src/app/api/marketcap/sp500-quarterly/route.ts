import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchSp500Constituents, fetchQuote, fetchMarketCapHistory } from '@/lib/fmp'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// ── Known large-cap seed list (ranked roughly by market cap as of early 2026)
// Used as the initial candidate pool when DB has no live ranking data.
// Single /quote calls work on FMP stable; batch does not.
const SEED_CANDIDATES = [
  'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'GOOG', 'META',
  'TSLA', 'BRK-B', 'AVGO', 'LLY', 'JPM', 'V', 'XOM', 'UNH',
  'MA', 'COST', 'HD', 'PG', 'NFLX',
]

// ── Quarter math ──────────────────────────────────────────────────────────────

interface Quarter { label: string; date: string }

function quarterEndDates(count: number): Quarter[] {
  const Q_MONTHS = [2, 5, 8, 11]
  const Q_NAMES  = ['Q1', 'Q2', 'Q3', 'Q4']

  const now = new Date()
  let year = now.getFullYear()

  let qi = -1
  for (let i = Q_MONTHS.length - 1; i >= 0; i--) {
    const endDay = new Date(year, Q_MONTHS[i] + 1, 0).getDate()
    if (now >= new Date(year, Q_MONTHS[i], endDay)) { qi = i; break }
  }
  if (qi === -1) { year -= 1; qi = 3 }

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
  if (symbols.length === 0) return new Map()
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

// ── Rank candidates by current market cap using individual FMP quote calls ───
// FMP stable /quote only works per-symbol, not comma-separated batches.
async function rankByLiveQuote(
  candidates: string[]
): Promise<Array<{ symbol: string; name: string; marketCap: number }>> {
  const results: Array<{ symbol: string; name: string; marketCap: number }> = []

  await Promise.allSettled(
    candidates.map(async symbol => {
      try {
        const q = await fetchQuote(symbol)
        if (q.marketCap && q.marketCap > 0) {
          results.push({ symbol, name: q.name || symbol, marketCap: q.marketCap as number })
        }
      } catch { /* skip on error */ }
    })
  )

  return results.sort((a, b) => b.marketCap - a.marketCap)
}

// ── Ensure market cap history is in DB for a symbol ──────────────────────────

async function ensureHistory(symbol: string): Promise<void> {
  const count = await prisma.marketCapHistory.count({ where: { symbol } })
  if (count >= 50) return
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
      const fmpList = await fetchSp500Constituents()
      if (fmpList.length === 0) {
        return NextResponse.json({ error: 'Could not fetch S&P 500 constituent list' }, { status: 503 })
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

    const allSymbols = constituents.map(c => c.symbol)
    const nameMap    = new Map(constituents.map(c => [c.symbol, c.name]))

    // ── 2. Rank top-10 candidates by live market cap ─────────────────────────
    // Strategy: merge seed candidates (whose live prices we can fetch fast via
    // individual /quote calls) with any S&P 500 symbols already in our DB.
    // This avoids the broken FMP batch endpoint and the 503-call alternative.
    const symbolsInDb = await prisma.$queryRaw<{ symbol: string }[]>`
      SELECT DISTINCT symbol FROM "MarketCapHistory"
      WHERE symbol = ANY(${allSymbols}::text[])
    `
    const dbSymbolSet = new Set(symbolsInDb.map(r => r.symbol))

    // Union of seed candidates + symbols already ingested
    const candidateSet = new Set([...SEED_CANDIDATES, ...dbSymbolSet])
    // Filter to only S&P 500 constituents
    const sp500Set     = new Set(allSymbols)
    const candidates   = [...candidateSet].filter(s => sp500Set.has(s))

    const ranked = await rankByLiveQuote(candidates)
    for (const q of ranked) nameMap.set(q.symbol, q.name || nameMap.get(q.symbol) || q.symbol)

    // Top 10, extend to 11 if both GOOGL and GOOG appear
    let topRanked = ranked.slice(0, 10)
    const googleSet   = new Set(['GOOGL', 'GOOG'])
    const googleInTop = topRanked.filter(q => googleSet.has(q.symbol))
    if (googleInTop.length === 1 && ranked[10] && googleSet.has(ranked[10].symbol)) {
      topRanked = [...topRanked, ranked[10]]
    }
    const topSymbols = topRanked.map(q => q.symbol)

    // ── 3. Ingest market cap history for top companies in parallel ───────────
    await Promise.allSettled(topSymbols.map(s => ensureHistory(s)))

    // ── 4. S&P 500 total coverage (all symbols with data in DB) ──────────────
    const allWithData = await prisma.$queryRaw<{ symbol: string }[]>`
      SELECT DISTINCT symbol FROM "MarketCapHistory"
      WHERE symbol = ANY(${allSymbols}::text[])
    `
    const sp500DataSymbols = allWithData.map(r => r.symbol)

    // ── 5. Build quarterly snapshots ─────────────────────────────────────────
    const quarters = quarterEndDates(numQ)
    const companyValues: Record<string, number[]> = Object.fromEntries(topSymbols.map(s => [s, []]))
    const sp500Totals:   number[] = []
    const sp500Coverage: number[] = []

    for (const q of quarters) {
      const snap = await snapshotAt(topSymbols, q.date)
      for (const sym of topSymbols) companyValues[sym].push(snap.get(sym) ?? 0)

      const sp500Snap = await snapshotAt(sp500DataSymbols, q.date)
      let total = 0
      for (const [, v] of sp500Snap) total += v
      sp500Totals.push(total)
      sp500Coverage.push(sp500Snap.size)
    }

    // ── 6. Response ───────────────────────────────────────────────────────────
    const companies = topSymbols.map((symbol, i) => ({
      symbol,
      name:             nameMap.get(symbol) ?? symbol,
      rank:             i + 1,
      currentMarketCap: topRanked[i]?.marketCap ?? 0,
      values:           companyValues[symbol],
    }))

    return NextResponse.json({
      quarters:         quarters.map(q => ({ label: q.label, date: q.date })),
      companies,
      sp500Total:       sp500Totals,
      sp500Coverage,
      constituentCount: allSymbols.length,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
