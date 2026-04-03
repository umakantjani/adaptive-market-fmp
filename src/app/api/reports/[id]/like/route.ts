import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const updated = await prisma.aIReport.update({
    where: { id: parseInt(id) },
    data: { likes: { increment: 1 } },
    select: { likes: true },
  })
  return NextResponse.json(updated)
}
