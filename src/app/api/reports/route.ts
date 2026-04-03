import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const symbol = searchParams.get('symbol')?.toUpperCase() ?? undefined
  const skip = (page - 1) * limit

  const where = symbol ? { ticker: { symbol } } : {}

  const [reports, total] = await Promise.all([
    prisma.aIReport.findMany({
      where,
      skip,
      take: limit,
      orderBy: { generatedAt: 'desc' },
      include: {
        ticker: { select: { symbol: true, name: true } },
        _count: { select: { comments: true } },
      },
    }),
    prisma.aIReport.count({ where }),
  ])

  return NextResponse.json({
    reports: reports.map((r) => ({
      ...r,
      excerpt: r.reportText.slice(0, 250).replace(/#+/g, '').trim() + '…',
      commentCount: r._count.comments,
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  })
}
