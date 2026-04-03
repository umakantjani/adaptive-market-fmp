export interface IndicatorInfo {
  name: string
  formula: string
  interpretation: string
  bullishCondition: string
  bearishCondition: string
  historyKey: string | null
  historyKey2?: string
  unit: 'price' | 'percent' | 'raw'
  overboughtLevel?: number
  oversoldLevel?: number
  neutralZone?: [number, number]
}

export const indicatorInfoMap: Record<string, IndicatorInfo> = {
  'RSI (14)': {
    name: 'Relative Strength Index (RSI)',
    formula: 'RSI = 100 - [100 / (1 + RS)], where RS = Avg Gain / Avg Loss over 14 periods',
    interpretation: 'RSI measures the speed and magnitude of price movements, oscillating between 0-100. Readings above 70 suggest overbought conditions where a reversal or pullback may be imminent. Readings below 30 suggest oversold conditions where a bounce may follow. The 50 level acts as a bull/bear dividing line.',
    bullishCondition: 'RSI crosses above 30 from below (oversold reversal), or holds above 50 in an uptrend, or shows bullish divergence (price makes lower low but RSI makes higher low)',
    bearishCondition: 'RSI crosses below 70 from above (overbought reversal), or drops below 50, or shows bearish divergence (price makes higher high but RSI makes lower high)',
    historyKey: 'rsi',
    unit: 'raw',
    overboughtLevel: 70,
    oversoldLevel: 30,
    neutralZone: [45, 55],
  },
  'MACD': {
    name: 'Moving Average Convergence Divergence',
    formula: 'MACD Line = EMA(12) - EMA(26) | Signal = EMA(9) of MACD | Histogram = MACD - Signal',
    interpretation: 'MACD tracks the relationship between two exponential moving averages. When the MACD line crosses above the signal line, it generates a bullish signal. The histogram shows the distance between MACD and signal lines — expanding histogram indicates strengthening momentum.',
    bullishCondition: 'MACD line crosses above signal line (golden cross), histogram turns positive and expanding, MACD crosses above zero line',
    bearishCondition: 'MACD line crosses below signal line (death cross), histogram turns negative and expanding, MACD crosses below zero line',
    historyKey: 'macdHist',
    historyKey2: 'macdLine',
    unit: 'raw',
  },
  'Stoch %K/%D': {
    name: 'Stochastic Oscillator (14,3)',
    formula: '%K = (Close - Lowest Low) / (Highest High - Lowest Low) × 100 | %D = 3-period SMA of %K',
    interpretation: 'The Stochastic Oscillator compares a closing price to its price range over 14 periods. Values above 80 indicate overbought conditions; below 20 is oversold. The %D line (signal) smooths %K. Crossovers between %K and %D generate trade signals.',
    bullishCondition: '%K crosses above %D in oversold territory (below 20), or crossover occurs with both lines rising through 50',
    bearishCondition: '%K crosses below %D in overbought territory (above 80), or both lines fall below 50 after failing to hold gains',
    historyKey: 'stochK',
    historyKey2: 'stochD',
    unit: 'raw',
    overboughtLevel: 80,
    oversoldLevel: 20,
  },
  'ADX (14)': {
    name: 'Average Directional Index (ADX)',
    formula: 'ADX = EMA of DX | DX = |+DI - -DI| / (+DI + -DI) × 100 | Period: 14',
    interpretation: 'ADX measures trend strength, not direction (0-100 scale). Values below 20 indicate a weak or ranging market. 20-25 is an emerging trend. Above 25 confirms a strong trend. The +DI and -DI lines indicate trend direction — when +DI > -DI the trend is bullish.',
    bullishCondition: 'ADX > 25 with +DI above -DI and ADX rising — confirms a strong bullish trend with increasing momentum',
    bearishCondition: 'ADX > 25 with -DI above +DI — confirms a strong bearish trend. ADX rising from below 20 while -DI leads signals a new downtrend',
    historyKey: 'adx',
    historyKey2: 'diPlus',
    unit: 'raw',
  },
  'SMA 20': {
    name: 'Simple Moving Average (20-period)',
    formula: 'SMA(20) = Sum of closing prices over 20 periods / 20',
    interpretation: 'The 20-day SMA is a short-term trend indicator widely used to identify near-term support and resistance. Price above SMA20 is generally bullish short-term; price below is bearish. It reacts quickly to price changes and is used by short to medium-term traders.',
    bullishCondition: 'Price closes above SMA20 after being below it — short-term trend reversal. SMA20 slope is rising and acts as support',
    bearishCondition: 'Price closes below SMA20 — short-term momentum has turned negative. SMA20 acting as resistance on bounces',
    historyKey: 'sma20',
    unit: 'price',
  },
  'SMA 50': {
    name: 'Simple Moving Average (50-period)',
    formula: 'SMA(50) = Sum of closing prices over 50 periods / 50',
    interpretation: 'The 50-day SMA is the most-watched medium-term trend indicator. Professional traders and institutions use it to gauge intermediate trend direction. A price above the 50-day SMA signals medium-term bullish conditions; below signals bearish.',
    bullishCondition: 'Price reclaims SMA50 from below with volume, or the SMA20 crosses above SMA50 (Golden Cross on shorter time frame)',
    bearishCondition: 'Price breaks below SMA50 on increased volume, or SMA20 crosses below SMA50',
    historyKey: 'sma50',
    unit: 'price',
  },
  'SMA 200': {
    name: 'Simple Moving Average (200-period)',
    formula: 'SMA(200) = Sum of closing prices over 200 periods / 200',
    interpretation: 'The 200-day SMA is the most important long-term trend indicator used by institutional investors. Price above SMA200 defines a secular bull market; below it defines a bear market. The Golden Cross (SMA50 > SMA200) and Death Cross (SMA50 < SMA200) are major market signals.',
    bullishCondition: 'Price above SMA200 — stock is in a long-term uptrend. A Golden Cross (SMA50 crossing above SMA200) is a major bullish signal used by institutions',
    bearishCondition: 'Price below SMA200 — stock is in a long-term downtrend. A Death Cross (SMA50 crossing below SMA200) is a significant institutional sell signal',
    historyKey: 'sma200',
    unit: 'price',
  },
  'EMA 12/26': {
    name: 'Exponential Moving Averages (12 & 26-period)',
    formula: 'EMA = Price × (2/(n+1)) + Previous EMA × (1 - 2/(n+1))',
    interpretation: 'EMAs weight recent prices more heavily than older prices, making them more responsive to current price action than SMAs. The 12 and 26 EMAs are the building blocks of MACD. When EMA12 > EMA26, short-term momentum is positive.',
    bullishCondition: 'EMA12 crosses above EMA26 and both are sloping upward — short to medium-term momentum is building positively',
    bearishCondition: 'EMA12 crosses below EMA26 — short-term momentum has turned negative relative to medium-term trend',
    historyKey: 'closes',
    unit: 'price',
  },
  'BB Upper': {
    name: 'Bollinger Band — Upper Band',
    formula: 'Upper BB = SMA(20) + 2 × Standard Deviation(20)',
    interpretation: 'The upper Bollinger Band is a dynamic resistance level set 2 standard deviations above the 20-period SMA. Price touching or exceeding the upper band signals potential overbought conditions, though in strong uptrends price can "walk the band" for extended periods.',
    bullishCondition: 'Price "walking" the upper band during a strong uptrend — sustained momentum. A squeeze (BB width contracting) followed by breakout above upper band signals powerful new move',
    bearishCondition: 'Price tags upper band and reverses — classic mean reversion sell setup. More reliable when RSI is simultaneously overbought',
    historyKey: 'bbUpper',
    unit: 'price',
  },
  'BB Lower': {
    name: 'Bollinger Band — Lower Band',
    formula: 'Lower BB = SMA(20) - 2 × Standard Deviation(20)',
    interpretation: 'The lower Bollinger Band is a dynamic support level set 2 standard deviations below the 20-period SMA. Price touching or breaching the lower band signals potential oversold conditions and may indicate a mean reversion opportunity back to the middle band.',
    bullishCondition: 'Price touches lower band and bounces with volume — classic mean reversion buy. A "W" pattern (double touch of lower band) is a high-probability reversal signal',
    bearishCondition: 'Price closes below lower band multiple days in a row — indicates extreme selling pressure and breakdown. Wait for confirmation before buying',
    historyKey: 'bbLower',
    unit: 'price',
  },
  'ATR (14)': {
    name: 'Average True Range (14-period)',
    formula: 'ATR = EMA(14) of True Range | True Range = max(H-L, |H-Close_prev|, |L-Close_prev|)',
    interpretation: 'ATR measures market volatility by calculating the average range of price movement over 14 periods. High ATR indicates high volatility and wider stops are needed. Low ATR indicates consolidation. ATR is used to set stop-loss levels and position size — typically stops are placed 1.5-2× ATR from entry.',
    bullishCondition: 'ATR expanding after a period of low volatility (squeeze) combined with upside breakout — volatility expansion confirms the new trend. Use ATR to set trailing stops',
    bearishCondition: 'Extremely elevated ATR during a sharp decline indicates panic selling. Very high ATR on red candles suggests capitulation which can precede a reversal',
    historyKey: null,
    unit: 'price',
  },
  'Volume Ratio': {
    name: 'Volume Ratio (vs 20-day Average)',
    formula: 'Volume Ratio = Current Day Volume / 20-period SMA of Volume',
    interpretation: 'Volume Ratio compares current volume to the 20-day average. A ratio above 1.5 means volume is 50% above average — indicating strong institutional participation. Volume confirms price moves: high volume breakouts are more reliable; low volume moves are suspect.',
    bullishCondition: 'Volume Ratio > 1.5 on an up day — institutional buying confirmed. High volume at support levels indicates accumulation by smart money',
    bearishCondition: 'Volume Ratio > 1.5 on a down day — institutional selling confirmed. A breakout on low volume (< 0.7) suggests a false breakout likely to fail',
    historyKey: 'volumes',
    unit: 'raw',
  },
}

export function getContextualInterpretation(
  key: string,
  value: number | null,
  symbol: string,
  ta: { rsi14?: number | null; adx14?: number | null; diPlus?: number | null; diMinus?: number | null; macdHist?: number | null; stochK?: number | null; bbUpper?: number | null; bbLower?: number | null; currentPrice?: number }
): string {
  if (value === null || value === undefined) return `Insufficient data to calculate ${key} for ${symbol}.`

  switch (key) {
    case 'RSI (14)':
      if (value > 75) return `RSI at ${value.toFixed(1)} is strongly overbought for ${symbol}. The stock has likely moved too far too fast. Watch for momentum divergence or a candlestick reversal pattern as a shorting/profit-taking signal.`
      if (value > 65) return `RSI at ${value.toFixed(1)} is approaching overbought territory for ${symbol}. Momentum remains positive but risk of a pullback is increasing. Consider tightening stop-losses on long positions.`
      if (value < 25) return `RSI at ${value.toFixed(1)} is deeply oversold for ${symbol}. While selling pressure has been intense, mean reversion setups often form at these levels. Look for a bullish candlestick reversal with volume confirmation.`
      if (value < 35) return `RSI at ${value.toFixed(1)} is in oversold territory for ${symbol}. Selling pressure is easing. A move back above 35-40 would signal early momentum recovery.`
      if (value > 50) return `RSI at ${value.toFixed(1)} — ${symbol} is showing positive momentum with bulls in control. Holding above 50 in a pullback is constructive.`
      return `RSI at ${value.toFixed(1)} — ${symbol} is in neutral momentum territory. Watch for a decisive break above 55 (bullish) or below 45 (bearish) to determine directional bias.`

    case 'MACD':
      if ((ta.macdHist ?? 0) > 0) return `Positive MACD histogram for ${symbol} confirms bullish momentum. The gap between MACD and signal line is widening, suggesting upward acceleration.`
      return `Negative MACD histogram for ${symbol} indicates bearish momentum. Watch for the histogram to start contracting (bars getting smaller) as an early sign of momentum exhaustion.`

    case 'Stoch %K/%D':
      if (value > 80) return `Stochastic at ${value.toFixed(1)} is overbought for ${symbol}. Wait for %K to cross below %D from above 80 as a confirmation of a reversal before acting.`
      if (value < 20) return `Stochastic at ${value.toFixed(1)} is oversold for ${symbol}. A %K crossing above %D while below 20 is a classic buy signal. Confirm with RSI and price action.`
      return `Stochastic at ${value.toFixed(1)} for ${symbol} is in neutral territory. The indicator is not generating a strong directional signal — combine with trend indicators (ADX, SMA) for better context.`

    case 'ADX (14)':
      if (value > 40) return `ADX at ${value.toFixed(1)} confirms a very strong trend in ${symbol}. ${(ta.diPlus ?? 0) > (ta.diMinus ?? 0) ? 'With +DI above -DI, the trend is strongly bullish — trend-following strategies are favored.' : 'With -DI above +DI, the trend is strongly bearish — avoid counter-trend trades.'}`
      if (value > 25) return `ADX at ${value.toFixed(1)} confirms a trending environment for ${symbol}. ${(ta.diPlus ?? 0) > (ta.diMinus ?? 0) ? 'Bullish trend is confirmed. Pullbacks to key SMAs are buying opportunities.' : 'Bearish trend confirmed. Rallies are likely selling opportunities.'}`
      if (value < 20) return `ADX at ${value.toFixed(1)} indicates ${symbol} is in a ranging/consolidating phase. Momentum-based strategies are less effective here. Consider range-bound strategies (buy support, sell resistance).`
      return `ADX at ${value.toFixed(1)} for ${symbol} suggests a weakly trending market. The trend may be building — watch for ADX to cross above 25 for confirmation.`

    case 'Volume Ratio':
      if (value > 2.0) return `Volume is ${value.toFixed(1)}× its 20-day average for ${symbol} — extremely elevated institutional activity. This volume spike is significant and likely marks an inflection point in price direction.`
      if (value > 1.3) return `Above-average volume at ${value.toFixed(1)}× the 20-day average for ${symbol} confirms the current price move has institutional backing. High-conviction directional trade.`
      if (value < 0.6) return `Volume is only ${value.toFixed(1)}× average for ${symbol} — very low conviction. Current price moves should be treated with skepticism; breakouts on this volume often fail.`
      return `Volume at ${value.toFixed(1)}× average for ${symbol} — in line with normal activity. No unusual institutional positioning detected.`

    default:
      return `Current reading for ${key} is ${value.toFixed(2)} for ${symbol}.`
  }
}
