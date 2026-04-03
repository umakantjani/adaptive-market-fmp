import { type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Streams full daily MarketCapHistory as CSV for the requested symbols
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const symbolsParam = url.searchParams.get('symbols') ?? ''
  const symbols = symbolsParam
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 15) // safety cap

  if (symbols.length === 0) {
    return new Response('No symbols specified', { status: 400 })
  }

  const rows = await prisma.marketCapHistory.findMany({
    where: { symbol: { in: symbols } },
    orderBy: [{ symbol: 'asc' }, { date: 'asc' }],
    select: { symbol: true, date: true, marketCap: true },
  })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('Symbol,Date,Market Cap (USD),Market Cap ($B)\n'))
      for (const r of rows) {
        const mcap = Number(r.marketCap)
        controller.enqueue(
          encoder.encode(`${r.symbol},${r.date},${mcap},${(mcap / 1e9).toFixed(2)}\n`)
        )
      }
      controller.close()
    },
  })

  const filename = `SP500_Top10_MarketCap_RAW_${new Date().toISOString().slice(0, 10)}.csv`
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
