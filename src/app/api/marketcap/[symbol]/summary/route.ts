import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function cagr(start: number, end: number, years: number): string {
  if (start <= 0 || years <= 0) return 'N/A'
  const r = (end / start) ** (1 / years) - 1
  return `${(r * 100).toFixed(1)}%`
}

function fmt(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`
  return `$${(n / 1e6).toFixed(0)}M`
}

// Find first date a market cap milestone was crossed
function firstCrossing(data: { date: string; marketCap: number }[], threshold: number) {
  const hit = data.find(d => d.marketCap >= threshold)
  return hit ? hit.date.slice(0, 7) : null // YYYY-MM
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol: raw } = await params
  const symbol = raw.toUpperCase()

  try {
    const rows = await prisma.marketCapHistory.findMany({
      where: { symbol },
      orderBy: { date: 'asc' },
      select: { date: true, marketCap: true },
    })

    if (rows.length < 2) {
      return NextResponse.json({ error: 'Insufficient data for summary' }, { status: 400 })
    }

    const data = rows.map(r => ({ date: r.date, marketCap: Number(r.marketCap) }))
    const profile = await prisma.companyProfile.findUnique({ where: { symbol } })

    const current  = data[data.length - 1]
    const oldest   = data[0]
    const ath      = data.reduce((m, d) => d.marketCap > m.marketCap ? d : m, data[0])

    const now = new Date()
    const yr1  = data.find(d => d.date >= new Date(now.getFullYear() - 1,  now.getMonth(), now.getDate()).toISOString().slice(0, 10))
    const yr5  = data.find(d => d.date >= new Date(now.getFullYear() - 5,  now.getMonth(), now.getDate()).toISOString().slice(0, 10))
    const yr10 = data.find(d => d.date >= new Date(now.getFullYear() - 10, now.getMonth(), now.getDate()).toISOString().slice(0, 10))

    const milestones = [100e9, 500e9, 1e12, 2e12, 3e12]
      .map(t => ({ threshold: fmt(t), date: firstCrossing(data, t) }))
      .filter(m => m.date !== null)

    const prompt = `You are a financial analyst writing a concise market capitalisation narrative.

Company: ${profile?.name ?? symbol} (${symbol})
Sector: ${profile?.sector ?? 'Unknown'}

Market Cap Data:
- Current: ${fmt(current.marketCap)} (${current.date})
- All-Time High: ${fmt(ath.marketCap)} (${ath.date})
- Earliest Record: ${fmt(oldest.marketCap)} (${oldest.date})
- 1-Year CAGR: ${yr1 ? cagr(yr1.marketCap, current.marketCap, 1) : 'N/A'}
- 5-Year CAGR: ${yr5 ? cagr(yr5.marketCap, current.marketCap, 5) : 'N/A'}
- 10-Year CAGR: ${yr10 ? cagr(yr10.marketCap, current.marketCap, 10) : 'N/A'}
- All-Time CAGR: ${cagr(oldest.marketCap, current.marketCap, (now.getTime() - new Date(oldest.date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))}
${milestones.length > 0 ? `- Milestone crossings:\n${milestones.map(m => `  • ${m.threshold}: ${m.date}`).join('\n')}` : ''}

Write 3–4 sentences summarising the market cap trajectory. Cover: overall growth arc, key milestones or inflection points, and what the CAGR implies about long-term value creation. Be direct and factual. No markdown, no headers — plain prose only.`

    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
        controller.close()
      },
    })

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
