import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { calculateDCF } from '@/lib/dcf'
import type { DCFInputs, DCFResults } from '@/types/valuation'
import type { TAResult, TickerInfo } from '@/types/market'

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    ticker: TickerInfo
    ta: Omit<TAResult, 'history'>
    dcfInputs: DCFInputs
  }

  const { ticker, ta, dcfInputs } = body
  const dcfResults: DCFResults = calculateDCF(dcfInputs)

  const prompt = buildPrompt(ticker, ta, dcfInputs, dcfResults)

  const stream = new ReadableStream({
    async start(controller) {
      let fullText = ''
      try {
        const streamResponse = anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
        })

        for await (const chunk of streamResponse) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            const text = chunk.delta.text
            fullText += text
            controller.enqueue(new TextEncoder().encode(text))
          }
        }

        // DB save is handled explicitly by the client via POST /api/valuation/save
        // after the user clicks the Save button — avoids stream-teardown race.

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Report generation failed'
        controller.enqueue(new TextEncoder().encode(`\n\n**Error:** ${msg}`))
      } finally {
        controller.close()
      }
    },
  })

  return new NextResponse(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

function fmt(n: number, decimals = 1) {
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals })
}
function pct(n: number) { return `${(n * 100).toFixed(1)}%` }
function $M(n: number) { return `$${fmt(n)}M` }

function buildPrompt(
  ticker: TickerInfo,
  ta: Omit<TAResult, 'history'>,
  inp: DCFInputs,
  res: DCFResults,
): string {
  const updown = res.marginOfSafety > 0 ? 'OVERVALUED' : 'UNDERVALUED'
  const mosAbs = Math.abs(res.marginOfSafety * 100).toFixed(1)

  const projTable = res.projections
    .map(p =>
      `  Yr ${p.year}: Rev ${$M(p.revenue)}, EBIT% ${pct(p.operatingMargin)}, FCFF ${$M(p.fcff)}, PV ${$M(p.pvFCFF)}`
    ).join('\n')

  return `You are an institutional equity research analyst. Generate a comprehensive, professional valuation report for ${ticker.symbol} (${ticker.name}).

## TECHNICAL ANALYSIS SNAPSHOT
- Current Price: $${ticker.currentPrice?.toFixed(2)}
- Overall Signal: ${ta.overallSignal} (Score: ${ta.signalScore}/100)
- RSI(14): ${ta.rsi14?.toFixed(1) ?? 'N/A'} | MACD Hist: ${ta.macdHist?.toFixed(3) ?? 'N/A'}
- ADX(14): ${ta.adx14?.toFixed(1) ?? 'N/A'} | +DI: ${ta.diPlus?.toFixed(1) ?? 'N/A'} / −DI: ${ta.diMinus?.toFixed(1) ?? 'N/A'}
- Stoch %K/%D: ${ta.stochK?.toFixed(1) ?? 'N/A'} / ${ta.stochD?.toFixed(1) ?? 'N/A'}
- BB Upper/Lower: $${ta.bbUpper?.toFixed(2) ?? 'N/A'} / $${ta.bbLower?.toFixed(2) ?? 'N/A'}
- SMA 20/50/200: $${ta.sma20?.toFixed(2) ?? 'N/A'} / $${ta.sma50?.toFixed(2) ?? 'N/A'} / $${ta.sma200?.toFixed(2) ?? 'N/A'}
- ATR(14): $${ta.atr14?.toFixed(2) ?? 'N/A'} | Volume Ratio: ${ta.volumeRatio?.toFixed(2) ?? 'N/A'}x

## FUNDAMENTAL INPUTS (All figures in USD millions unless noted)
- TTM Revenue: ${$M(inp.revenue)} | Operating Margin: ${pct(inp.ebit / inp.revenue)}
- EBIT: ${$M(inp.ebit)} | Interest Expense: ${$M(inp.interestExpense)}
- Book Equity: ${$M(inp.bookEquity)} | Book Debt: ${$M(inp.bookDebt)}
- Cash: ${$M(inp.cash)} | Non-Operating Assets: ${$M(inp.nonOperatingAssets)}
- Shares Outstanding: ${fmt(inp.sharesOutstanding)}M | Beta: ${inp.beta.toFixed(2)}
- Effective Tax Rate: ${pct(inp.effectiveTaxRate)}

## DCF ASSUMPTIONS
- Revenue Growth (Yr1 / CAGR 2-5): ${pct(inp.revenueGrowthYr1)} / ${pct(inp.revenueCAGR)}
- Target Operating Margin: ${pct(inp.targetOperatingMargin)} (converges by Year ${inp.marginConvergenceYear})
- Sales-to-Capital Ratio: ${inp.salesToCapitalRatio15.toFixed(2)}x
- Risk-Free Rate: ${pct(inp.riskFreeRate)} | ERP: ${pct(inp.erp)} | Beta: ${inp.beta.toFixed(2)}
- Cost of Equity: ${pct(res.costOfEquity)} | After-tax Cost of Debt: ${pct(res.afterTaxCostOfDebt)}
- WACC: ${pct(res.wacc)} | Terminal CoC: ${pct(res.terminalCOC)}
- Terminal Growth Rate: ${pct(inp.terminalGrowthRate)}

## 10-YEAR FCFF PROJECTIONS
${projTable}

## VALUATION SUMMARY
- PV of FCFFs (Yr 1-10): ${$M(res.pvFCFFs)}
- Terminal Value: ${$M(res.terminalValue)} | PV(TV): ${$M(res.pvTerminalValue)}
- Value of Operating Assets: ${$M(res.valueOfOperatingAssets)}
- Less: Debt (${$M(res.lessDebt)}) + MI (${$M(res.lessMinorityInterests)})
- Plus: Cash (${$M(res.plusCash)}) + Non-Op Assets (${$M(res.plusNonOperatingAssets)})
- Equity Value: ${$M(res.valueOfEquity)}
- INTRINSIC VALUE PER SHARE: $${res.intrinsicValuePerShare.toFixed(2)}
- CURRENT PRICE: $${res.currentPrice.toFixed(2)}
- VERDICT: Stock appears ${updown} by ${mosAbs}% (Price is ${res.priceAsPercentOfValue.toFixed(1)}% of intrinsic value)

---

Write a comprehensive institutional research report with the following sections:

# ${ticker.symbol} — Fundamental Valuation & Technical Analysis Report

## Executive Summary
Concise verdict: valuation assessment, key catalysts, price target range, recommendation (Buy/Hold/Sell/Strong Buy/Strong Sell).

## Business Overview & Competitive Position
Brief description, moat analysis, and sector dynamics.

## Technical Analysis Outlook
Interpret all the TA indicators above — trend, momentum, volume, support/resistance. Tie technicals to entry/exit timing.

## Fundamental Analysis
Revenue growth assumptions and justification, margin trajectory, reinvestment efficiency (Sales/Capital ratio), ROIC analysis, capital structure.

## DCF Valuation Deep Dive
Walk through the key value drivers:
- Bear / Base / Bull case assumptions and resulting intrinsic value ranges
- Sensitivity of intrinsic value to WACC and growth rate changes
- Terminal value as % of total value (and what it implies for risk)

## Risk Factors
Downside risks to the thesis (macro, competitive, execution, valuation).

## Investment Thesis & Recommendation
Clear recommendation with rationale, price target, and suggested time horizon.

Write with institutional precision. Use markdown formatting with headers, tables where appropriate, and bold key numbers.`
}
