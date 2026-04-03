import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  // Only return entries that have an AI-generated report text (not DCF-only snapshots)
  const valuations = await prisma.valuationReport.findMany({
    where: { reportText: { not: null } },
    orderBy: { generatedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      generatedAt: true,
      intrinsicValue: true,
      currentPrice: true,
      marginOfSafety: true,
      likes: true,
      ticker: { select: { symbol: true, name: true } },
    },
  })

  return NextResponse.json({ valuations })
}
