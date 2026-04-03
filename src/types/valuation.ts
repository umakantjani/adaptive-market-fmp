// ─── Fundamental data fetched from Yahoo Finance ──────────────────────────────

export interface FundamentalData {
  // Identity
  symbol: string
  name: string
  sector: string
  industry: string

  // Income statement (USD millions)
  revenue: number          // TTM revenue
  ebit: number             // TTM operating income (EBIT)
  interestExpense: number  // most-recent annual
  netIncome: number        // TTM

  // Balance sheet (USD millions)
  bookEquity: number
  bookDebt: number
  cash: number
  nonOperatingAssets: number  // investments & advances
  minorityInterests: number

  // Market / derived
  sharesOutstanding: number  // millions
  currentPrice: number
  beta: number
  effectiveTaxRate: number   // 0–1
  revenueGrowthYoy: number   // 0–1 (e.g. 0.15 = 15%)
  operatingMargin: number    // 0–1
}

// ─── DCF inputs (what the user sees / can edit) ────────────────────────────────

export interface DCFInputs {
  // Pre-filled from fundamentals
  revenue: number
  ebit: number
  interestExpense: number
  bookEquity: number
  bookDebt: number
  cash: number
  nonOperatingAssets: number
  minorityInterests: number
  sharesOutstanding: number
  currentPrice: number
  effectiveTaxRate: number

  // Growth & margins (user-editable, defaults from data)
  revenueGrowthYr1: number       // Year 1 rev growth rate
  revenueCAGR: number            // Years 2–5 CAGR
  targetOperatingMargin: number  // Terminal operating margin
  marginConvergenceYear: number  // Year margin converges to target (1–10)

  // Capital efficiency
  salesToCapitalRatio15: number  // Years 1–5
  salesToCapitalRatio610: number // Years 6–10

  // Cost of capital
  riskFreeRate: number     // e.g. 0.045
  beta: number
  erp: number              // equity risk premium, e.g. 0.055
  costOfDebt: number       // pre-tax cost of debt (e.g. 0.05)
  marginalTaxRate: number  // e.g. 0.25
  terminalGrowthRate: number // typically = riskFreeRate
}

// ─── DCF yearly projection row ─────────────────────────────────────────────────

export interface DCFProjectionRow {
  year: number
  revenueGrowth: number
  revenue: number
  operatingMargin: number
  ebit: number
  taxRate: number
  ebitAfterTax: number
  reinvestment: number
  fcff: number
  coc: number            // cost of capital this year
  discountFactor: number
  pvFCFF: number
}

// ─── DCF results ───────────────────────────────────────────────────────────────

export interface DCFResults {
  // WACC components
  costOfEquity: number
  afterTaxCostOfDebt: number
  equityWeight: number
  debtWeight: number
  wacc: number
  terminalCOC: number

  // Projections
  projections: DCFProjectionRow[]

  // Terminal value
  terminalFCFF: number
  terminalValue: number
  pvTerminalValue: number

  // Value bridge
  pvFCFFs: number              // sum PV of years 1–10
  valueOfOperatingAssets: number
  lessDebt: number
  lessMinorityInterests: number
  plusCash: number
  plusNonOperatingAssets: number
  valueOfEquity: number

  // Per share
  intrinsicValuePerShare: number
  currentPrice: number
  marginOfSafety: number        // (current - intrinsic) / current — positive = overvalued
  priceAsPercentOfValue: number // currentPrice / intrinsicValue
}

// ─── Saved valuation record from DB ───────────────────────────────────────────

export interface ValuationItem {
  id: number
  generatedAt: string
  intrinsicValue: number
  currentPrice: number
  marginOfSafety: number
  reportText: string
  inputsJson: string
  resultsJson: string
  likes: number
  ticker: { symbol: string; name: string }
}
