import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Returns aggregate S&P 500 market cap by date (sum of all constituents).
// For the comparison overlay, both series are indexed to 100 at the start
// of the selected period — this is handled client-side.
export async function GET() {
  try {
    // Get the list of current S&P 500 symbols
    const constituents = await prisma.sp500Constituent.findMany({
      select: { symbol: true },
    })

    if (constituents.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const symbols = constituents.map(c => c.symbol)

    // Aggregate sum of market cap by date using raw SQL for performance
    const rows = await prisma.$queryRaw<{ date: string; totalMarketCap: bigint }[]>`
      SELECT date, SUM("marketCap") AS "totalMarketCap"
      FROM "MarketCapHistory"
      WHERE symbol = ANY(${symbols})
      GROUP BY date
      HAVING COUNT(DISTINCT symbol) >= 50
      ORDER BY date ASC
    `

    const data = rows.map(r => ({
      date: r.date,
      marketCap: Number(r.totalMarketCap),
    }))

    return NextResponse.json({ data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
