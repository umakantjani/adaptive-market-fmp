import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const valuation = await prisma.valuationReport.findUnique({
    where: { id: parseInt(id) },
    include: { ticker: { select: { symbol: true, name: true } } },
  })

  if (!valuation) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(valuation)
}

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // Like toggle handled client-side; this increments server-side
  const { id } = await context.params
  const valuation = await prisma.valuationReport.update({
    where: { id: parseInt(id) },
    data: { likes: { increment: 1 } },
    select: { likes: true },
  })
  return NextResponse.json(valuation)
}
