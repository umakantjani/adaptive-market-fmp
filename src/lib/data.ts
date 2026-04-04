import { unstable_cache } from 'next/cache'
import { fetchOHLCV, fetchQuote, fetchStockSplits, fetchDividends } from '@/lib/fmp'
import { calculateAll } from '@/lib/indicators'
import { prisma } from '@/lib/prisma'
import type { CorporateEventPoint } from '@/app/api/events/[symbol]/route'

// The 'Cold' Historical Cache - Data gets cached to prevent redundant compute/DB hits.
// We set a revalidate time (e.g., 3600 seconds) so it updates throughout the day 
// or once a day, depending on how "live" we want it.
export const getTickerDataCached = unstable_cache(
  async (symbol: string) => {
    symbol = symbol.toUpperCase()

    const [ohlcv, quote] = await Promise.all([fetchOHLCV(symbol, 250), fetchQuote(symbol)])
    const ta = calculateAll(ohlcv)

    const priceChange = quote.priceChange
    const priceChangePct = quote.priceChangePct

    // Ensure ticker exists in DB
    const ticker = await prisma.ticker.upsert({
      where: { symbol },
      update: { name: quote.name, exchange: quote.exchange },
      create: { symbol, name: quote.name, exchange: quote.exchange },
    })

    // TA Snapshot async trigger (fire and forget, don't await)
    prisma.tASnapshot.create({
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
    }).catch(console.error)

    // Log the search (fire and forget)
    prisma.searchLog.create({
      data: { symbol, searchType: 'ta', price: quote.currentPrice, result: 'success' },
    }).catch(console.error)

    return { ticker: quote, ohlcv, ta }
  },
  ['ticker-data-cache'],
  { revalidate: 3600 } // Cache for 1 hour to heavily reduce redundant load
)

export const getCorporateEventsCached = unstable_cache(
  async (symbol: string) => {
    symbol = symbol.toUpperCase()

    const count = await prisma.corporateEvent.count({ where: { symbol } })

    if (count === 0) {
      const [splits, dividends] = await Promise.all([
        fetchStockSplits(symbol).catch(() => []),
        fetchDividends(symbol).catch(() => []),
      ])

      const rows: { symbol: string; date: string; type: string; label: string; value: number | null }[] = []

      for (const s of splits) {
        if (!s.date || !s.numerator || !s.denominator) continue
        rows.push({
          symbol,
          date: s.date,
          type: 'split',
          label: `${s.numerator}:${s.denominator}`,
          value: s.numerator / s.denominator,
        })
      }

      for (const d of dividends) {
        if (!d.date || !d.dividend) continue
        rows.push({
          symbol,
          date: d.date,
          type: 'dividend',
          label: `$${d.dividend.toFixed(2)}`,
          value: d.dividend,
        })
      }

      if (rows.length > 0) {
        await prisma.$transaction(
          rows.map(r =>
            prisma.corporateEvent.upsert({
              where: { symbol_date_type: { symbol: r.symbol, date: r.date, type: r.type } },
              update: { label: r.label, value: r.value },
              create: r,
            })
          )
        )
      }
    }

    const events = await prisma.corporateEvent.findMany({
      where: { symbol },
      orderBy: { date: 'asc' },
      select: { date: true, type: true, label: true, value: true },
    })

    const data: CorporateEventPoint[] = events.map((e) => ({
      date: e.date,
      type: e.type as 'split' | 'dividend',
      label: e.label,
      value: e.value,
    }))

    return data
  },
  ['corporate-events-cache'],
  { revalidate: 86400 } // Cache for 24 hours (corporate events rarely change intraday)
)
