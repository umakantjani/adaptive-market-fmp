import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchQuote } from '@/lib/fmp'

export const dynamic = 'force-dynamic'

// GET — list all watchlist tickers
export async function GET() {
  const tickers = await prisma.watchlistTicker.findMany({
    orderBy: { addedAt: 'desc' },
    include: {
      scanResults: {
        orderBy: { scannedAt: 'desc' },
        take: 1,
      },
    },
  })
  return NextResponse.json({ tickers })
}

// POST — add a ticker to the watchlist
export async function POST(req: Request) {
  const { symbol } = await req.json() as { symbol: string }
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 })

  const s = symbol.toUpperCase().trim()

  // Fetch name from Yahoo if not already in DB
  let name = s
  try {
    const quote = await fetchQuote(s)
    name = quote.name || s
  } catch {}

  const ticker = await prisma.watchlistTicker.upsert({
    where: { symbol: s },
    update: { active: true, name },
    create: { symbol: s, name },
  })

  return NextResponse.json({ ticker })
}
