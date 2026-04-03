import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchMarketCapHistory } from '@/lib/fmp'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol: raw } = await params
  const symbol = raw.toUpperCase()

  try {
    // Check how many records we have
    const count = await prisma.marketCapHistory.count({ where: { symbol } })

    // If sparse (<100 records), fetch full history from FMP and store it
    if (count < 100) {
      const caps = await fetchMarketCapHistory(symbol)
      if (caps.length > 0) {
        for (let i = 0; i < caps.length; i += 1000) {
          const chunk = caps.slice(i, i + 1000)
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
    }

    const rows = await prisma.marketCapHistory.findMany({
      where: { symbol },
      orderBy: { date: 'asc' },
      select: { date: true, marketCap: true },
    })

    // Convert BigInt to number for JSON serialisation
    const data = rows.map(r => ({
      date: r.date,
      marketCap: Number(r.marketCap),
    }))

    return NextResponse.json({ symbol, data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
