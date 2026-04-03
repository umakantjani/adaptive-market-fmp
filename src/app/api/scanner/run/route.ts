import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchOHLCV, fetchQuote } from '@/lib/fmp'
import { calculateAll } from '@/lib/indicators'
import { evaluateSniper } from '@/lib/sniper'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

interface ScanSummary {
  symbol: string
  name: string
  status: 'success' | 'error'
  error?: string
  overallSignal?: string
  signalScore?: number
  sniperGrade?: string
}

async function scanTicker(symbol: string, name: string): Promise<ScanSummary> {
  try {
    const [ohlcv, quote] = await Promise.all([
      fetchOHLCV(symbol, 250),
      fetchQuote(symbol),
    ])

    const ta = calculateAll(ohlcv)
    const price = quote.currentPrice
    const sniper = evaluateSniper(ta, price)

    await prisma.scanResult.create({
      data: {
        symbol,
        name: quote.name || name,
        price,
        priceChangePct: quote.priceChangePct,
        overallSignal: ta.overallSignal,
        signalScore: ta.signalScore,
        sniperGrade: sniper.grade,
        sniperScore: sniper.score,
        rsi14: ta.rsi14 ?? undefined,
        macdHist: ta.macdHist ?? undefined,
        bbWidth: ta.bbWidth ?? undefined,
        adx14: ta.adx14 ?? undefined,
        volumeRatio: ta.volumeRatio ?? undefined,
        atr14: ta.atr14 ?? undefined,
        sma20: ta.sma20 ?? undefined,
        sma50: ta.sma50 ?? undefined,
        sma200: ta.sma200 ?? undefined,
        aboveSma20:  !!(ta.sma20  && price > ta.sma20),
        aboveSma50:  !!(ta.sma50  && price > ta.sma50),
        aboveSma200: !!(ta.sma200 && price > ta.sma200),
        macdBullish: !!(ta.macdHist && ta.macdHist > 0),
      },
    })

    return { symbol, name, status: 'success', overallSignal: ta.overallSignal, signalScore: ta.signalScore, sniperGrade: sniper.grade }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { symbol, name, status: 'error', error: msg }
  }
}

export async function POST() {
  const watchlist = await prisma.watchlistTicker.findMany({ where: { active: true } })

  if (watchlist.length === 0) {
    return NextResponse.json({ scanned: 0, results: [] })
  }

  // Batch of 5 to respect FMP rate limits
  const BATCH = 5
  const results: ScanSummary[] = []

  for (let i = 0; i < watchlist.length; i += BATCH) {
    const batch = watchlist.slice(i, i + BATCH)
    const batchResults = await Promise.all(
      batch.map(t => scanTicker(t.symbol, t.name))
    )
    results.push(...batchResults)
    if (i + BATCH < watchlist.length) {
      await new Promise(r => setTimeout(r, 300))
    }
  }

  const succeeded = results.filter(r => r.status === 'success').length
  const failed    = results.filter(r => r.status === 'error').length

  return NextResponse.json({ scanned: succeeded, failed, results })
}
