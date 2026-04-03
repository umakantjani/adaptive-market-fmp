import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/scanner/results?signal=STRONG_BUY&grade=FIRE&limit=100
// Returns one result per symbol — the most recent scan for each
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const signal = searchParams.get('signal')?.toUpperCase()
  const grade  = searchParams.get('grade')?.toUpperCase()

  // Get latest scannedAt per symbol using a subquery approach
  // First get all active watchlist symbols
  const watchlist = await prisma.watchlistTicker.findMany({
    where: { active: true },
    select: { symbol: true },
  })
  const symbols = watchlist.map(w => w.symbol)

  if (symbols.length === 0) {
    return NextResponse.json({ results: [], lastScannedAt: null })
  }

  // For each symbol, get the most recent scan result
  const latestResults = await Promise.all(
    symbols.map(symbol =>
      prisma.scanResult.findFirst({
        where: { symbol },
        orderBy: { scannedAt: 'desc' },
      })
    )
  )

  let results = latestResults.filter(Boolean) as NonNullable<(typeof latestResults)[number]>[]

  // Apply filters
  if (signal) results = results.filter(r => r.overallSignal === signal)
  if (grade)  results = results.filter(r => r.sniperGrade  === grade)

  // Sort by signal score descending
  results.sort((a, b) => b.signalScore - a.signalScore)

  const lastScannedAt = results.length > 0
    ? results.reduce((latest, r) => r.scannedAt > latest ? r.scannedAt : latest, results[0].scannedAt)
    : null

  return NextResponse.json({ results, lastScannedAt })
}
