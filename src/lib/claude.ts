import Anthropic from '@anthropic-ai/sdk'
import type { TAResult, TickerInfo } from '@/types/market'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export function buildReportPromptV2(ticker: TickerInfo, ta: Omit<TAResult, 'history'> & { history?: TAResult['history'] }): string {
  const fmt = (v: number | null | undefined, dec = 2) => (v !== null && v !== undefined ? v.toFixed(dec) : 'N/A')

  const obvDirection =
    ta.volumeRatio !== null
      ? ta.volumeRatio > 1.2 ? 'Rising (above-average volume accumulation)'
      : ta.volumeRatio < 0.8 ? 'Falling (below-average volume, distribution risk)'
      : 'Neutral (in-line with 20-day average)'
      : 'N/A'

  const resistance = ta.resistanceLevels.slice(0, 2)
  const support = ta.supportLevels.slice(0, 2)
  const r1 = resistance[0] ? `$${resistance[0].price.toFixed(2)} (strength ${resistance[0].strength}/5)` : 'N/A'
  const r2 = resistance[1] ? `$${resistance[1].price.toFixed(2)} (strength ${resistance[1].strength}/5)` : 'N/A'
  const s1 = support[0] ? `$${support[0].price.toFixed(2)} (strength ${support[0].strength}/5)` : 'N/A'
  const s2 = support[1] ? `$${support[1].price.toFixed(2)} (strength ${support[1].strength}/5)` : 'N/A'

  return `Here is the current technical snapshot for ${ticker.symbol} (${ticker.name}):

### MARKET DATA
- Current Price: $${fmt(ticker.currentPrice)}
- 52-Week Range: $${fmt(ticker.week52Low)} - $${fmt(ticker.week52High)}
- Volume Ratio (vs 20d SMA): ${fmt(ta.volumeRatio)}x
- OBV Trend: ${obvDirection}

### TREND & REGIME
- SMA 20: $${fmt(ta.sma20)} | SMA 50: $${fmt(ta.sma50)} | SMA 200: $${fmt(ta.sma200)}
- ADX (14): ${fmt(ta.adx14, 1)} | +DI: ${fmt(ta.diPlus, 1)} | -DI: ${fmt(ta.diMinus, 1)}
- MACD Line: ${fmt(ta.macdLine, 4)} | Signal: ${fmt(ta.macdSignal, 4)} | Histogram: ${fmt(ta.macdHist, 4)}

### MOMENTUM & VOLATILITY
- RSI (14): ${fmt(ta.rsi14, 1)}
- ATR (14): $${fmt(ta.atr14)}
- Bollinger Bands: Upper $${fmt(ta.bbUpper)} | Middle $${fmt(ta.bbMiddle)} | Lower $${fmt(ta.bbLower)}
- BB Width: ${fmt(ta.bbWidth, 1)}%

### IDENTIFIED ZONES
- Resistance Levels: ${r1}, ${r2}
- Support Levels: ${s1}, ${s2}

---
REQUIREMENTS FOR THE REPORT:

1. Tone & Style: Objective, clinical, and precise. Use institutional terminology (e.g., "accumulation," "distribution," "volatility compression," "mean reversion," "secular trend"). Avoid hyperbole (do not use words like "skyrocket" or "plummet").
2. No Hallucinations: Base all analysis STRICTLY on the data provided above.

STRUCTURE THE REPORT EXACTLY AS FOLLOWS:

## 1. Executive Summary (BLUF)
Provide a 2-3 sentence "Bottom Line Up Front" summarizing the primary trend, current momentum, and the immediate actionable bias (Long, Short, or Neutral/Wait).

## 2. Market Structure & Trend Dynamics
Analyze the alignment of the moving averages and ADX. Is the asset trending or range-bound? Who is in control of the tape? Note any proximity to the 200-day SMA.

## 3. Momentum & Volume Profile
Synthesize RSI, MACD, and Volume/OBV. Is momentum diverging from price? Does the volume profile validate the current price action, or does it suggest low-conviction/retail-driven movement?

## 4. Volatility & Risk Parameters
Analyze the Bollinger Bands and ATR. Is volatility expanding or contracting? Based on the ATR of $${fmt(ta.atr14)}, what is the expected daily noise, and where should structural stops be placed to avoid premature stop-outs?

## 5. Trading Scenarios & Actionable Levels
Map out the exact parameters for trading this asset right now. Provide specific price levels.
* Base Case Scenario: The most probable path forward over the next 1-3 weeks.
* Bull Trigger (Long Setup): The exact resistance level that, if broken with volume, triggers a long entry. Include the primary price target and the invalidation (stop-loss) level based on ATR.
* Bear Trigger (Short/Hedging Setup): The exact support level that, if lost on volume, triggers a short/hedge. Include downside targets and invalidation levels.

Format the output in clean Markdown. Be concise.`
}

export async function generateReportStreamV2(ticker: TickerInfo, ta: Omit<TAResult, 'history'> & { history?: TAResult['history'] }) {
  const prompt = buildReportPromptV2(ticker, ta)

  return anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    system: `You are a Lead Technical Analyst at a top-tier institutional equity research desk. Your objective is to synthesize the provided market data and technical indicators into a precise, highly actionable, and objective technical analysis report.

Your audience consists of portfolio managers and institutional traders. Do not explain what the indicators are (they already know); instead, interpret what the confluence of these indicators means for price action, liquidity, and risk.`,
    messages: [{ role: 'user', content: prompt }],
  })
}

export function buildReportPrompt(ticker: TickerInfo, ta: Omit<TAResult, 'history'> & { history?: TAResult['history'] }, period: string): string {
  const fmt = (v: number | null | undefined, dec = 2) => (v !== null && v !== undefined ? v.toFixed(dec) : 'N/A')
  const fmtPct = (v: number | null) => (v !== null ? v.toFixed(2) + '%' : 'N/A')
  const signalEmoji = { STRONG_BUY: '🟢', BUY: '🟩', NEUTRAL: '🟡', SELL: '🟥', STRONG_SELL: '🔴' }[ta.overallSignal] ?? '⚪'

  return `Generate an institutional-grade technical analysis report for ${ticker.symbol} (${ticker.name}).

MARKET DATA (Period: ${period.toUpperCase()}, As of: ${new Date().toLocaleDateString()})
Current Price: $${fmt(ticker.currentPrice)} | Change: ${ticker.priceChange >= 0 ? '+' : ''}$${fmt(ticker.priceChange)} (${fmtPct(ticker.priceChangePct)})
52-Week Range: $${fmt(ticker.week52Low)} - $${fmt(ticker.week52High)}

TREND INDICATORS
SMA(20): $${fmt(ta.sma20)} | SMA(50): $${fmt(ta.sma50)} | SMA(200): $${fmt(ta.sma200)}
EMA(12): $${fmt(ta.ema12)} | EMA(26): $${fmt(ta.ema26)}
Price vs SMA20: ${ta.sma20 ? ((ticker.currentPrice / ta.sma20 - 1) * 100).toFixed(2) + '%' : 'N/A'} | vs SMA50: ${ta.sma50 ? ((ticker.currentPrice / ta.sma50 - 1) * 100).toFixed(2) + '%' : 'N/A'} | vs SMA200: ${ta.sma200 ? ((ticker.currentPrice / ta.sma200 - 1) * 100).toFixed(2) + '%' : 'N/A'}

MOMENTUM INDICATORS
RSI(14): ${fmt(ta.rsi14, 1)} ${ta.rsi14 !== null ? (ta.rsi14 > 70 ? '[OVERBOUGHT]' : ta.rsi14 < 30 ? '[OVERSOLD]' : '[NEUTRAL]') : ''}
Stochastic %K: ${fmt(ta.stochK, 1)} | %D: ${fmt(ta.stochD, 1)} ${ta.stochK !== null ? (ta.stochK > 80 ? '[OVERBOUGHT]' : ta.stochK < 20 ? '[OVERSOLD]' : '') : ''}
MACD Line: ${fmt(ta.macdLine, 4)} | Signal: ${fmt(ta.macdSignal, 4)} | Histogram: ${fmt(ta.macdHist, 4)} ${ta.macdHist !== null ? (ta.macdHist > 0 ? '[BULLISH]' : '[BEARISH]') : ''}
ADX(14): ${fmt(ta.adx14, 1)} ${ta.adx14 !== null ? (ta.adx14 > 25 ? '[TRENDING]' : '[RANGING]') : ''} | +DI: ${fmt(ta.diPlus, 1)} | -DI: ${fmt(ta.diMinus, 1)}

VOLATILITY
Bollinger Bands: Upper $${fmt(ta.bbUpper)} | Middle $${fmt(ta.bbMiddle)} | Lower $${fmt(ta.bbLower)}
BB Width: ${fmtPct(ta.bbWidth)} | ATR(14): $${fmt(ta.atr14)} (${ta.atr14 && ticker.currentPrice ? ((ta.atr14 / ticker.currentPrice) * 100).toFixed(2) + '% of price' : 'N/A'})

VOLUME ANALYSIS
OBV: ${ta.obv?.toLocaleString() ?? 'N/A'} | Volume Ratio vs 20-SMA: ${fmt(ta.volumeRatio, 2)}x
Volume Trend: ${ta.volumeRatio !== null ? (ta.volumeRatio > 1.3 ? 'Above Average (Conviction)' : ta.volumeRatio < 0.7 ? 'Below Average (Low Conviction)' : 'Average') : 'N/A'}

SUPPORT & RESISTANCE
Resistance Levels: ${ta.resistanceLevels.map((r) => `$${r.price.toFixed(2)} (strength: ${r.strength}/5)`).join(' | ') || 'None identified'}
Support Levels: ${ta.supportLevels.map((s) => `$${s.price.toFixed(2)} (strength: ${s.strength}/5)`).join(' | ') || 'None identified'}

COMPOSITE SIGNAL: ${signalEmoji} ${ta.overallSignal} (Score: ${ta.signalScore}/100)

---
Generate a comprehensive institutional technical analysis report with the following sections:

## Executive Summary
## Trend Analysis
## Momentum Assessment
## Volatility & Risk Profile
## Volume Analysis
## Key Price Levels
## Trading Scenarios (Bull / Bear / Base Case)
## Risk Factors
## Outlook (Near-Term 1-2 weeks | Medium-Term 1-3 months)

Be precise, use specific price levels, and write in the style of an institutional equity research desk.`
}

export async function generateReportStream(ticker: TickerInfo, ta: Omit<TAResult, 'history'> & { history?: TAResult['history'] }, period: string) {
  const prompt = buildReportPrompt(ticker, ta, period)

  return anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    system: 'You are a senior institutional equity research analyst specializing in technical analysis. Generate precise, actionable reports with specific price targets and levels. Use markdown formatting.',
    messages: [{ role: 'user', content: prompt }],
  })
}
