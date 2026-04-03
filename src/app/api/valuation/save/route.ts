import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { DCFInputs, DCFResults } from '@/types/valuation'

/** Guard against NaN / Infinity which SQLite rejects as Float */
function safeFloat(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v)
  return isFinite(n) ? n : fallback
}

export async function POST(req: NextRequest) {
  let body: {
    symbol: string
    name: string
    dcfInputs: DCFInputs
    dcfResults: DCFResults
    reportText: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { symbol, name, dcfInputs, dcfResults, reportText } = body

  if (!symbol?.trim()) {
    return NextResponse.json({ error: 'symbol is required' }, { status: 400 })
  }
  if (!reportText?.trim()) {
    return NextResponse.json({ error: 'reportText is required — nothing to save yet' }, { status: 400 })
  }

  // Validate floats before touching the DB
  const intrinsicValue = safeFloat(dcfResults?.intrinsicValuePerShare)
  const currentPrice   = safeFloat(dcfResults?.currentPrice)
  const marginOfSafety = safeFloat(dcfResults?.marginOfSafety)

  try {
    const ticker = await prisma.ticker.upsert({
      where: { symbol: symbol.toUpperCase() },
      update: { name },
      create: { symbol: symbol.toUpperCase(), name },
    })

    const saved = await prisma.valuationReport.create({
      data: {
        tickerId:       ticker.id,
        inputsJson:     JSON.stringify(dcfInputs ?? {}),
        resultsJson:    JSON.stringify(dcfResults ?? {}),
        reportText,
        intrinsicValue,
        currentPrice,
        marginOfSafety,
      },
      select: { id: true },
    })

    return NextResponse.json({ ok: true, id: saved.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[valuation/save]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
