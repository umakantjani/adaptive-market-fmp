import { NextResponse } from 'next/server'
import { searchTickers } from '@/lib/fmp'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()

  if (!q || q.length < 1) return NextResponse.json([])

  try {
    const results = await searchTickers(q)
    return NextResponse.json(results)
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json([], { status: 200 })
  }
}
