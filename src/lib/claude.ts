import Anthropic from '@anthropic-ai/sdk'
import type { TAResult, TickerInfo } from '@/types/market'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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
