import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100'), 500)
  const type = searchParams.get('type') // 'ta' | 'valuation' | 'report' | null = all

  const logs = await prisma.searchLog.findMany({
    where: type ? { searchType: type } : undefined,
    orderBy: { searchedAt: 'desc' },
    take: limit,
  })

  // Summary stats
  const stats = await prisma.searchLog.groupBy({
    by: ['searchType'],
    _count: { id: true },
  })

  const topSymbols = await prisma.searchLog.groupBy({
    by: ['symbol'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  })

  return NextResponse.json({ logs, stats, topSymbols })
}
