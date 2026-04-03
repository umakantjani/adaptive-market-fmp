import { NextRequest, NextResponse } from 'next/server'
import { fetchFundamentals } from '@/lib/fundamentals'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await context.params
  const sym = symbol.toUpperCase()

  try {
    const fundamentals = await fetchFundamentals(sym)

    // Upsert Ticker, then save FundamentalSnapshot
    await prisma.ticker.upsert({
      where: { symbol: sym },
      update: { name: fundamentals.name, sector: fundamentals.sector },
      create: { symbol: sym, name: fundamentals.name, sector: fundamentals.sector },
    })

    // Log the valuation search
    await prisma.searchLog.create({
      data: { symbol: sym, searchType: 'valuation', price: fundamentals.currentPrice, result: 'success' },
    }).catch(() => {})

    return NextResponse.json(fundamentals)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch fundamentals'

    await prisma.searchLog.create({
      data: { symbol: sym, searchType: 'valuation', result: 'error', errorMsg: msg },
    }).catch(() => {})

    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
