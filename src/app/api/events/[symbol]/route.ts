import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchStockSplits, fetchDividends } from '@/lib/fmp'

export const dynamic = 'force-dynamic'

export interface CorporateEventPoint {
  date: string
  type: 'split' | 'dividend'
  label: string
  value: number | null
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol: raw } = await params
  const symbol = raw.toUpperCase()

  try {
    // Check if we already have events stored
    const count = await prisma.corporateEvent.count({ where: { symbol } })

    if (count === 0) {
      // Fetch from FMP and store
      const [splits, dividends] = await Promise.all([
        fetchStockSplits(symbol).catch(() => []),
        fetchDividends(symbol).catch(() => []),
      ])

      const rows: { symbol: string; date: string; type: string; label: string; value: number | null }[] = []

      for (const s of splits) {
        if (!s.date || !s.numerator || !s.denominator) continue
        rows.push({
          symbol,
          date: s.date,
          type: 'split',
          label: `${s.numerator}:${s.denominator}`,
          value: s.numerator / s.denominator,
        })
      }

      for (const d of dividends) {
        if (!d.date || !d.dividend) continue
        rows.push({
          symbol,
          date: d.date,
          type: 'dividend',
          label: `$${d.dividend.toFixed(2)}`,
          value: d.dividend,
        })
      }

      if (rows.length > 0) {
        await prisma.$transaction(
          rows.map(r =>
            prisma.corporateEvent.upsert({
              where: { symbol_date_type: { symbol: r.symbol, date: r.date, type: r.type } },
              update: { label: r.label, value: r.value },
              create: r,
            })
          )
        )
      }
    }

    const events = await prisma.corporateEvent.findMany({
      where: { symbol },
      orderBy: { date: 'asc' },
      select: { date: true, type: true, label: true, value: true },
    })

    const data: CorporateEventPoint[] = events.map((e: { date: string; type: string; label: string; value: number | null }) => ({
      date: e.date,
      type: e.type as 'split' | 'dividend',
      label: e.label,
      value: e.value,
    }))

    return NextResponse.json({ symbol, data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
