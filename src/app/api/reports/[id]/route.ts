import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const report = await prisma.aIReport.findUnique({
    where: { id: parseInt(id) },
    include: {
      ticker: true,
      comments: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(report)
}
