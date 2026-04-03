import { NextResponse } from 'next/server'
import { fetchOHLCV, fetchQuote } from '@/lib/fmp'
import { calculateAll } from '@/lib/indicators'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol: rawSymbol } = await params
  const symbol = rawSymbol.toUpperCase()

  try {
    const [ohlcv, quote] = await Promise.all([fetchOHLCV(symbol, 250), fetchQuote(symbol)])

    const ta = calculateAll(ohlcv)

    const priceChange = quote.priceChange
    const priceChangePct = quote.priceChangePct

    // Upsert ticker
    const ticker = await prisma.ticker.upsert({
      where: { symbol },
      update: { name: quote.name, exchange: quote.exchange },
      create: { symbol, name: quote.name, exchange: quote.exchange },
    })

    // Store TA snapshot
    await prisma.tASnapshot.create({
      data: {
        tickerId: ticker.id,
        period: '1d',
        currentPrice: quote.currentPrice,
        priceChange,
        priceChangePct,
        sma20: ta.sma20,
        sma50: ta.sma50,
        sma200: ta.sma200,
        ema12: ta.ema12,
        ema26: ta.ema26,
        rsi14: ta.rsi14,
        stochK: ta.stochK,
        stochD: ta.stochD,
        adx14: ta.adx14,
        diPlus: ta.diPlus,
        diMinus: ta.diMinus,
        macdLine: ta.macdLine,
        macdSignal: ta.macdSignal,
        macdHist: ta.macdHist,
        bbUpper: ta.bbUpper,
        bbMiddle: ta.bbMiddle,
        bbLower: ta.bbLower,
        bbWidth: ta.bbWidth,
        atr14: ta.atr14,
        obv: ta.obv,
        volumeSMA20: ta.volumeSMA20,
        volumeRatio: ta.volumeRatio,
        supportLevels: JSON.stringify(ta.supportLevels),
        resistanceLevels: JSON.stringify(ta.resistanceLevels),
        overallSignal: ta.overallSignal,
        signalScore: ta.signalScore,
      },
    })

    // Log the search
    await prisma.searchLog.create({
      data: { symbol, searchType: 'ta', price: quote.currentPrice, result: 'success' },
    }).catch(() => {})

    return NextResponse.json({ ticker: quote, ohlcv, ta })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`Error fetching ${symbol}:`, error)

    // Log the failed search
    await prisma.searchLog.create({
      data: { symbol, searchType: 'ta', result: 'error', errorMsg: msg },
    }).catch(() => {})

    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
