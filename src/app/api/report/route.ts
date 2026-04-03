import { NextResponse } from 'next/server'
import { generateReportStream } from '@/lib/claude'
import { prisma } from '@/lib/prisma'
import type { Ticker } from '@prisma/client'
import type { TAResult, TickerInfo } from '@/types/market'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const body = await request.json() as { ticker: TickerInfo; ta: Omit<TAResult, 'history'>; period: string }
  const { ticker, ta, period } = body

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not set in .env.local' }, { status: 500 })
  }

  let stream: Awaited<ReturnType<typeof generateReportStream>>
  try {
    stream = await generateReportStream(ticker, ta, period)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Stream init error:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  const encoder = new TextEncoder()
  let fullText = ''

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const chunk = event.delta.text
            fullText += chunk
            controller.enqueue(encoder.encode(chunk))
          }
        }
        controller.close()

        // Log the report generation
        prisma.searchLog.create({
          data: { symbol: ticker.symbol.toUpperCase(), searchType: 'report', price: ticker.currentPrice, result: 'success' },
        }).catch(() => {})

        // Save report after stream completes (fire and forget)
        prisma.ticker.findUnique({ where: { symbol: ticker.symbol } })
          .then((dbTicker: Ticker | null) => {
            if (dbTicker) {
              return prisma.aIReport.create({
                data: {
                  tickerId: dbTicker.id,
                  period,
                  taInputJson: JSON.stringify({ ...ta, history: undefined }),
                  reportText: fullText,
                  modelUsed: 'claude-sonnet-4-6',
                },
              })
            }
          })
          .catch(console.error)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Stream error'
        console.error('Stream read error:', err)
        controller.enqueue(encoder.encode(`\n\n> ⚠️ Error: ${msg}`))
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
