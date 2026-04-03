import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// DELETE — remove a ticker from the watchlist
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params
  const s = symbol.toUpperCase()

  await prisma.watchlistTicker.update({
    where: { symbol: s },
    data: { active: false },
  })

  return NextResponse.json({ ok: true })
}
