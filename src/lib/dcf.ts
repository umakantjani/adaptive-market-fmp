/**
 * Damodaran FCFF DCF valuation engine
 *
 * Faithful translation of fcffsimpleginzu.xlsx:
 *  - 10-year FCFF projection (revenue → EBIT → EBIT(1-t) → FCFF)
 *  - Revenue growth tapers from user-specified rate → terminal rate (= risk-free)
 *  - Operating margin converges linearly to target by convergence year
 *  - Tax rate steps up from effective → marginal over years 6–10
 *  - Reinvestment = ΔRevenue / Sales-to-Capital ratio
 *  - CoC steps from WACC → terminal CoC over years 6–10
 *  - Terminal value = FCFF₁₁ / (terminalCoC − g), reinvestment-adjusted
 *  - Equity bridge: PV(FCFFs) + PV(TV) − Debt − MI + Cash + NonOpAssets
 */

import type { DCFInputs, DCFProjectionRow, DCFResults } from '@/types/valuation'

export function buildDefaultInputs(
  fd: {
    revenue: number; ebit: number; interestExpense: number
    bookEquity: number; bookDebt: number; cash: number
    nonOperatingAssets: number; minorityInterests: number
    sharesOutstanding: number; currentPrice: number
    effectiveTaxRate: number; revenueGrowthYoy: number
    operatingMargin: number; beta: number
  }
): DCFInputs {
  const costOfDebt = fd.bookDebt > 0
    ? Math.min(fd.interestExpense / fd.bookDebt, 0.15)
    : 0.05

  const riskFreeRate = 0.045  // ~current 10-yr US Treasury

  return {
    revenue: fd.revenue,
    ebit: fd.ebit,
    interestExpense: fd.interestExpense,
    bookEquity: fd.bookEquity,
    bookDebt: fd.bookDebt,
    cash: fd.cash,
    nonOperatingAssets: fd.nonOperatingAssets,
    minorityInterests: fd.minorityInterests,
    sharesOutstanding: fd.sharesOutstanding,
    currentPrice: fd.currentPrice,
    effectiveTaxRate: Math.max(0, Math.min(fd.effectiveTaxRate, 0.40)),

    // Growth & margins
    revenueGrowthYr1: clamp(fd.revenueGrowthYoy || 0.05, -0.5, 0.5),
    revenueCAGR: clamp(fd.revenueGrowthYoy || 0.05, -0.5, 0.5),
    targetOperatingMargin: Math.max(fd.operatingMargin, 0.01),
    marginConvergenceYear: 5,

    // Capital efficiency
    salesToCapitalRatio15: 1.5,
    salesToCapitalRatio610: 1.5,

    // Cost of capital
    riskFreeRate,
    beta: Math.max(fd.beta, 0.1),
    erp: 0.055,           // US ERP (Damodaran Jan-2025 estimate ~5.5%)
    costOfDebt,
    marginalTaxRate: 0.25,
    terminalGrowthRate: riskFreeRate, // Damodaran: terminal g = risk-free rate
  }
}

export function calculateDCF(inp: DCFInputs): DCFResults {
  // ── WACC ─────────────────────────────────────────────────────────────────────
  const equityMV = inp.sharesOutstanding * inp.currentPrice  // in millions × $
  const totalCapital = equityMV + inp.bookDebt
  const equityWeight = totalCapital > 0 ? equityMV / totalCapital : 0.8
  const debtWeight = 1 - equityWeight

  const costOfEquity = inp.riskFreeRate + inp.beta * inp.erp
  const afterTaxCostOfDebt = inp.costOfDebt * (1 - inp.marginalTaxRate)
  const wacc = equityWeight * costOfEquity + debtWeight * afterTaxCostOfDebt

  // Terminal CoC: risk-free + mature-market ERP (Damodaran uses ~8.9–9%)
  const terminalCOC = inp.riskFreeRate + inp.erp * 0.8 + 0.005 // slight step-up

  // ── 10-year projection ────────────────────────────────────────────────────────
  const baseRevenue = inp.revenue
  const baseMargin = inp.ebit / inp.revenue

  const projections: DCFProjectionRow[] = []
  let revenue = baseRevenue
  let discountFactor = 1

  for (let yr = 1; yr <= 10; yr++) {
    // Revenue growth: yr1 → yr1rate; yr2–5 → CAGR; yr6–10 taper to terminal g
    let growthRate: number
    if (yr === 1) {
      growthRate = inp.revenueGrowthYr1
    } else if (yr <= 5) {
      growthRate = inp.revenueCAGR
    } else {
      // Linear taper from CAGR → terminalGrowthRate over years 6–10
      const t = (yr - 5) / 5
      growthRate = inp.revenueCAGR * (1 - t) + inp.terminalGrowthRate * t
    }

    const prevRevenue = revenue
    revenue = revenue * (1 + growthRate)

    // Operating margin: linear convergence to target by marginConvergenceYear
    let margin: number
    if (yr <= inp.marginConvergenceYear) {
      const t = yr / inp.marginConvergenceYear
      margin = baseMargin + t * (inp.targetOperatingMargin - baseMargin)
    } else {
      margin = inp.targetOperatingMargin
    }

    const ebit = revenue * margin

    // Tax rate: effective for yrs 1–5, linearly step up to marginal by yr 10
    const taxRate = yr <= 5
      ? inp.effectiveTaxRate
      : inp.effectiveTaxRate + ((inp.marginalTaxRate - inp.effectiveTaxRate) * (yr - 5) / 5)

    const ebitAfterTax = ebit > 0 ? ebit * (1 - taxRate) : ebit

    // Reinvestment = ΔRevenue / Sales-to-Capital ratio
    const stc = yr <= 5 ? inp.salesToCapitalRatio15 : inp.salesToCapitalRatio610
    const revenueChange = revenue - prevRevenue
    const reinvestment = stc > 0 ? revenueChange / stc : 0

    const fcff = ebitAfterTax - reinvestment

    // CoC: WACC for yrs 1–5, taper toward terminalCOC by yr 10
    const coc = yr <= 5
      ? wacc
      : wacc + ((terminalCOC - wacc) * (yr - 5) / 5)

    discountFactor = discountFactor / (1 + coc)

    projections.push({
      year: yr,
      revenueGrowth: growthRate,
      revenue,
      operatingMargin: margin,
      ebit,
      taxRate,
      ebitAfterTax,
      reinvestment,
      fcff,
      coc,
      discountFactor,
      pvFCFF: fcff * discountFactor,
    })
  }

  // ── Terminal value ────────────────────────────────────────────────────────────
  // Terminal FCFF = last-year EBIT(1-t) × (1 − g/ROIC_terminal)
  // Damodaran: in stable state ROIC = CoC, so terminal reinvestment rate = g/CoC
  const lastRow = projections[9]
  const terminalReinvestmentRate = inp.terminalGrowthRate / terminalCOC
  const terminalFCFF = lastRow.ebitAfterTax * (1 + inp.terminalGrowthRate) * (1 - terminalReinvestmentRate)
  const terminalValue = terminalCOC > inp.terminalGrowthRate
    ? terminalFCFF / (terminalCOC - inp.terminalGrowthRate)
    : 0
  const pvTerminalValue = terminalValue * lastRow.discountFactor

  // ── Value bridge ──────────────────────────────────────────────────────────────
  const pvFCFFs = projections.reduce((s, r) => s + r.pvFCFF, 0)
  const valueOfOperatingAssets = pvFCFFs + pvTerminalValue
  const valueOfEquity = valueOfOperatingAssets
    - inp.bookDebt
    - inp.minorityInterests
    + inp.cash
    + inp.nonOperatingAssets

  const intrinsicValuePerShare = inp.sharesOutstanding > 0
    ? valueOfEquity / inp.sharesOutstanding
    : 0

  // marginOfSafety: positive = overvalued, negative = undervalued
  const marginOfSafety = intrinsicValuePerShare > 0
    ? (inp.currentPrice - intrinsicValuePerShare) / inp.currentPrice
    : 0

  const priceAsPercentOfValue = intrinsicValuePerShare > 0
    ? (inp.currentPrice / intrinsicValuePerShare) * 100
    : 0

  return {
    costOfEquity,
    afterTaxCostOfDebt,
    equityWeight,
    debtWeight,
    wacc,
    terminalCOC,
    projections,
    terminalFCFF,
    terminalValue,
    pvTerminalValue,
    pvFCFFs,
    valueOfOperatingAssets,
    lessDebt: inp.bookDebt,
    lessMinorityInterests: inp.minorityInterests,
    plusCash: inp.cash,
    plusNonOperatingAssets: inp.nonOperatingAssets,
    valueOfEquity,
    intrinsicValuePerShare: r2(intrinsicValuePerShare),
    currentPrice: inp.currentPrice,
    marginOfSafety: r4(marginOfSafety),
    priceAsPercentOfValue: r2(priceAsPercentOfValue),
  }
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}
function r2(v: number) { return Math.round(v * 100) / 100 }
function r4(v: number) { return Math.round(v * 10000) / 10000 }
