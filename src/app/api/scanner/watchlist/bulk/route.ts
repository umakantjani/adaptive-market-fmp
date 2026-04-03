import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST — bulk upsert a list of tickers into the watchlist
export async function POST(req: Request) {
  const { tickers } = await req.json() as { tickers: { symbol: string; name: string }[] }
  if (!Array.isArray(tickers) || tickers.length === 0) {
    return NextResponse.json({ error: 'tickers array required' }, { status: 400 })
  }

  await Promise.all(
    tickers.map(({ symbol, name }) =>
      prisma.watchlistTicker.upsert({
        where: { symbol: symbol.toUpperCase() },
        update: { active: true, name },
        create: { symbol: symbol.toUpperCase(), name },
      })
    )
  )

  return NextResponse.json({ added: tickers.length })
}
