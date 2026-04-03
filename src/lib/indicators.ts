import {
  SMA,
  EMA,
  RSI,
  MACD,
  BollingerBands,
  ATR,
  Stochastic,
  ADX,
  OBV,
} from 'technicalindicators'
import type { OHLCVBar, TAResult, SRLevel } from '@/types/market'

function padStart<T>(arr: (T | undefined)[], totalLen: number, fill: T | null = null): (T | null)[] {
  const padding = new Array(Math.max(0, totalLen - arr.length)).fill(fill)
  return [...padding, ...arr.map((v) => (v === undefined ? null : v))]
}

export function computeSignalScore(ta: Omit<TAResult, 'signalScore' | 'overallSignal' | 'supportLevels' | 'resistanceLevels' | 'history'>, price: number): number {
  let score = 0

  if (ta.sma200 && price > ta.sma200) score += 10
  if (ta.sma50 && price > ta.sma50) score += 10
  if (ta.sma20 && price > ta.sma20) score += 10

  if (ta.macdHist !== null && ta.macdHist !== undefined) {
    if (ta.macdHist > 0) score += 8
    if (ta.macdLine !== null && ta.macdSignal !== null && ta.macdLine > ta.macdSignal) score += 7
  }

  if (ta.rsi14 !== null) {
    if (ta.rsi14 > 50 && ta.rsi14 < 70) score += 15
    else if (ta.rsi14 >= 70) score -= 5
    else if (ta.rsi14 < 30) score -= 15
  }

  if (ta.adx14 !== null && ta.diPlus !== null && ta.diMinus !== null) {
    if (ta.adx14 > 25 && ta.diPlus > ta.diMinus) score += 10
    else if (ta.adx14 > 25 && ta.diMinus > ta.diPlus) score -= 10
  }

  if (ta.stochK !== null) {
    if (ta.stochK > 50 && ta.stochK < 80) score += 10
    else if (ta.stochK >= 80) score -= 5
    else if (ta.stochK < 20) score -= 10
  }

  if (ta.volumeRatio !== null && ta.volumeRatio !== undefined) {
    if (ta.volumeRatio > 1.5 && score > 0) score += 10
    else if (ta.volumeRatio > 1.5 && score < 0) score -= 10
  }

  if (ta.bbUpper !== null && ta.bbLower !== null && ta.bbUpper && ta.bbLower) {
    const pbPos = (price - ta.bbLower) / (ta.bbUpper - ta.bbLower)
    if (pbPos > 0.5 && pbPos < 0.8) score += 10
    else if (pbPos >= 0.8) score -= 5
    else if (pbPos < 0.2) score -= 10
  }

  return Math.max(-100, Math.min(100, score))
}

function scoreToSignal(score: number): string {
  if (score >= 60) return 'STRONG_BUY'
  if (score >= 20) return 'BUY'
  if (score > -20) return 'NEUTRAL'
  if (score > -60) return 'SELL'
  return 'STRONG_SELL'
}

function calculateSupportResistance(bars: OHLCVBar[]): { support: SRLevel[]; resistance: SRLevel[] } {
  const recent = bars.slice(-100)
  const closes = recent.map((b) => b.close)
  const highs = recent.map((b) => b.high)
  const lows = recent.map((b) => b.low)
  const last = closes[closes.length - 1]

  const pivots: { price: number; type: 'support' | 'resistance' }[] = []

  for (let i = 2; i < recent.length - 2; i++) {
    if (highs[i] > highs[i - 1] && highs[i] > highs[i - 2] && highs[i] > highs[i + 1] && highs[i] > highs[i + 2]) {
      pivots.push({ price: highs[i], type: 'resistance' })
    }
    if (lows[i] < lows[i - 1] && lows[i] < lows[i - 2] && lows[i] < lows[i + 1] && lows[i] < lows[i + 2]) {
      pivots.push({ price: lows[i], type: 'support' })
    }
  }

  const cluster = (prices: number[], threshold = 0.005): SRLevel[] => {
    const levels: { price: number; touches: number }[] = []
    for (const p of prices) {
      const existing = levels.find((l) => Math.abs(l.price - p) / p < threshold)
      if (existing) {
        existing.price = (existing.price + p) / 2
        existing.touches++
      } else {
        levels.push({ price: p, touches: 1 })
      }
    }
    return levels
      .map((l) => ({ price: l.price, touches: l.touches, strength: Math.min(5, l.touches) }))
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 5)
  }

  const resistancePrices = pivots.filter((p) => p.type === 'resistance' && p.price > last).map((p) => p.price)
  const supportPrices = pivots.filter((p) => p.type === 'support' && p.price < last).map((p) => p.price)

  return {
    resistance: cluster(resistancePrices).sort((a, b) => a.price - b.price).slice(0, 3),
    support: cluster(supportPrices).sort((a, b) => b.price - a.price).slice(0, 3),
  }
}

export function calculateAll(bars: OHLCVBar[]): TAResult {
  const closes = bars.map((b) => b.close)
  const highs = bars.map((b) => b.high)
  const lows = bars.map((b) => b.low)
  const volumes = bars.map((b) => b.volume)
  const n = bars.length

  const sma20Arr = SMA.calculate({ period: 20, values: closes })
  const sma50Arr = SMA.calculate({ period: 50, values: closes })
  const sma100Arr = SMA.calculate({ period: 100, values: closes })
  const sma200Arr = SMA.calculate({ period: 200, values: closes })
  const ema12Arr = EMA.calculate({ period: 12, values: closes })
  const ema26Arr = EMA.calculate({ period: 26, values: closes })
  const rsiArr = RSI.calculate({ period: 14, values: closes })
  const stochArr = Stochastic.calculate({ high: highs, low: lows, close: closes, period: 14, signalPeriod: 3 })
  const adxArr = ADX.calculate({ high: highs, low: lows, close: closes, period: 14 })
  const macdArr = MACD.calculate({ values: closes, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false })
  const bbArr = BollingerBands.calculate({ period: 20, values: closes, stdDev: 2 })
  const atrArr = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 })
  const obvArr = OBV.calculate({ close: closes, volume: volumes })
  const volSMA20Arr = SMA.calculate({ period: 20, values: volumes })

  const currentPrice = closes[closes.length - 1]
  const currentVolume = volumes[volumes.length - 1]
  const currentVolSMA20 = volSMA20Arr.at(-1) ?? null

  const sma20 = sma20Arr.at(-1) ?? null
  const sma50 = sma50Arr.at(-1) ?? null
  const sma100 = sma100Arr.at(-1) ?? null
  const sma200 = sma200Arr.at(-1) ?? null
  const ema12 = ema12Arr.at(-1) ?? null
  const ema26 = ema26Arr.at(-1) ?? null
  const rsi14 = rsiArr.at(-1) ?? null
  const stochLast = stochArr.at(-1)
  const stochK = stochLast?.k ?? null
  const stochD = stochLast?.d ?? null
  const adxLast = adxArr.at(-1)
  const adx14 = adxLast?.adx ?? null
  const diPlus = adxLast?.pdi ?? null
  const diMinus = adxLast?.mdi ?? null
  const macdLast = macdArr.at(-1)
  const macdLine = macdLast?.MACD ?? null
  const macdSignal = macdLast?.signal ?? null
  const macdHist = macdLast?.histogram ?? null
  const bbLast = bbArr.at(-1)
  const bbUpper = bbLast?.upper ?? null
  const bbMiddle = bbLast?.middle ?? null
  const bbLower = bbLast?.lower ?? null
  const bbWidth = bbLast && bbLast.middle ? ((bbLast.upper - bbLast.lower) / bbLast.middle) * 100 : null
  const atr14 = atrArr.at(-1) ?? null
  const obv = obvArr.at(-1) ?? null
  const volumeSMA20 = currentVolSMA20
  const volumeRatio = currentVolSMA20 && currentVolSMA20 > 0 ? currentVolume / currentVolSMA20 : null

  const taPartial = { sma20, sma50, sma100, sma200, ema12, ema26, rsi14, stochK, stochD, adx14, diPlus, diMinus, macdLine, macdSignal, macdHist, bbUpper, bbMiddle, bbLower, bbWidth, atr14, obv, volumeSMA20, volumeRatio }
  const signalScore = computeSignalScore(taPartial, currentPrice)
  const overallSignal = scoreToSignal(signalScore)
  const { support: supportLevels, resistance: resistanceLevels } = calculateSupportResistance(bars)

  const HIST = 100
  const histBars = bars.slice(-HIST)

  const rsiHistory = padStart(RSI.calculate({ period: 14, values: closes }), n)
  const macdHistory = MACD.calculate({ values: closes, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false })
  const bbHistory = BollingerBands.calculate({ period: 20, values: closes, stdDev: 2 })
  const stochHistory = Stochastic.calculate({ high: highs, low: lows, close: closes, period: 14, signalPeriod: 3 })
  const adxHistory = ADX.calculate({ high: highs, low: lows, close: closes, period: 14 })
  const sma20History = padStart(SMA.calculate({ period: 20, values: closes }), n)
  const sma50History = padStart(SMA.calculate({ period: 50, values: closes }), n)
  const sma100History = padStart(SMA.calculate({ period: 100, values: closes }), n)
  const sma200History = padStart(SMA.calculate({ period: 200, values: closes }), n)

  const slice = (arr: (number | null)[], from: number) => arr.slice(from)
  const start = n - HIST

  return {
    ...taPartial,
    signalScore,
    overallSignal,
    supportLevels,
    resistanceLevels,
    history: {
      dates: histBars.map((b) => b.date),
      closes: histBars.map((b) => b.close),
      highs: histBars.map((b) => b.high),
      lows: histBars.map((b) => b.low),
      opens: histBars.map((b) => b.open),
      volumes: histBars.map((b) => b.volume),
      rsi: slice(rsiHistory, start),
      macdLine: padStart(macdHistory.map((m) => m.MACD ?? null), n).slice(start),
      macdSignal: padStart(macdHistory.map((m) => m.signal ?? null), n).slice(start),
      macdHist: padStart(macdHistory.map((m) => m.histogram ?? null), n).slice(start),
      bbUpper: padStart(bbHistory.map((b) => b.upper), n).slice(start),
      bbMiddle: padStart(bbHistory.map((b) => b.middle), n).slice(start),
      bbLower: padStart(bbHistory.map((b) => b.lower), n).slice(start),
      stochK: padStart(stochHistory.map((s) => s.k), n).slice(start),
      stochD: padStart(stochHistory.map((s) => s.d), n).slice(start),
      adx: padStart(adxHistory.map((a) => a.adx), n).slice(start),
      diPlus: padStart(adxHistory.map((a) => a.pdi), n).slice(start),
      diMinus: padStart(adxHistory.map((a) => a.mdi), n).slice(start),
      obv: OBV.calculate({ close: closes, volume: volumes }).slice(start),
      sma20: slice(sma20History, start),
      sma50: slice(sma50History, start),
      sma100: slice(sma100History, start),
      sma200: slice(sma200History, start),
    },
  }
}
