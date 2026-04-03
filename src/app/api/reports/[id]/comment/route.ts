import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { content } = await request.json()
  if (!content?.trim() || content.trim().length > 1000) {
    return NextResponse.json({ error: 'Invalid comment' }, { status: 400 })
  }
  const comment = await prisma.reportComment.create({
    data: { reportId: parseInt(id), content: content.trim() },
  })
  return NextResponse.json(comment)
}
