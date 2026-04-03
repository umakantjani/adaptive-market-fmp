import type { TAResult } from '@/types/market'
import type { SniperSignal, SniperCondition, SniperGrade, RSIStatus, EntryLevels, OptionsStrategy } from '@/types/sniper'

function getRSIStatus(rsi: number | null): RSIStatus {
  if (rsi === null) return 'weak'
  if (rsi >= 75) return 'overbought'
  if (rsi >= 65) return 'caution'
  if (rsi >= 50) return 'green'
  return 'weak'
}

function buildEntryLevels(ta: TAResult, price: number): EntryLevels | null {
  if (!ta.bbUpper || !ta.bbMiddle || !ta.atr14) return null

  const stop = ta.bbMiddle
  const atr = ta.atr14
  const entryZone: [number, number] = [ta.bbUpper, ta.bbUpper + atr * 0.5]
  const target1 = price + atr * 2
  const target2 = price + atr * 3.5
  const risk = price - stop
  const rr = risk > 0 ? (target1 - price) / risk : 0

  return { entryZone, stopLoss: stop, target1, target2, riskRewardRatio: rr }
}

function buildOptionsStrategy(grade: SniperGrade, rsiStatus: RSIStatus, ta: TAResult, price: number): OptionsStrategy {
  const atr = ta.atr14 ?? price * 0.02
  const nearStrike = Math.round(price / (price < 10 ? 0.5 : price < 50 ? 1 : price < 200 ? 5 : 10)) * (price < 10 ? 0.5 : price < 50 ? 1 : price < 200 ? 5 : 10)
  const spreadUpperStrike = nearStrike + atr * 2

  if (grade === 'AVOID') {
    return {
      setup: 'avoid',
      reasoning: 'Price is in a downtrend (below SMA 200). Avoid directional long plays.',
      contractType: null,
      strikeGuidance: null,
      expiryGuidance: null,
      riskNote: 'No entry. Wait for price to reclaim the 200-day SMA.',
    }
  }

  if (grade === 'WAIT') {
    return {
      setup: 'wait',
      reasoning: 'Conditions are not fully aligned. Monitor for breakout above Upper Bollinger Band.',
      contractType: null,
      strikeGuidance: null,
      expiryGuidance: null,
      riskNote: 'Set a price alert at the Upper BB. Re-evaluate when a candle closes above it.',
    }
  }

  if (rsiStatus === 'overbought') {
    return {
      setup: 'wait',
      reasoning: 'RSI > 75 signals an overextended move. High risk of pullback or consolidation.',
      contractType: null,
      strikeGuidance: null,
      expiryGuidance: null,
      riskNote: 'Pause entry. Wait for RSI to cool below 70 before entering.',
    }
  }

  if (rsiStatus === 'caution' || !ta.sma100 || !ta.sma50 || ta.sma50 <= ta.sma100) {
    // WATCH — use bull call spread to reduce premium cost
    return {
      setup: 'bull_spread',
      reasoning: 'Breakout confirmed but lacking maximum conviction (SMA 50 ≤ SMA 100 or RSI 65–75). A spread reduces risk.',
      contractType: 'Bull Call Spread',
      strikeGuidance: `Buy $${nearStrike.toFixed(0)} call, sell $${Math.round(spreadUpperStrike).toFixed(0)} call`,
      expiryGuidance: '30–45 DTE (one to two monthly expirations out)',
      riskNote: 'Max loss is the net debit paid. Profit capped at the short strike.',
    }
  }

  // FIRE — full calls
  return {
    setup: 'calls',
    reasoning: 'All 5 conditions met. Maximum conviction setup. Outright calls offer full upside participation.',
    contractType: 'Call Options (ATM or 1 strike OTM)',
    strikeGuidance: `$${nearStrike.toFixed(0)}–$${(nearStrike + (price < 50 ? 2.5 : price < 200 ? 5 : 10)).toFixed(0)} strike range`,
    expiryGuidance: '30–60 DTE — avoid weekly options to reduce theta decay risk',
    riskNote: 'Size position so that max loss (premium paid) is ≤ 1–2% of portfolio.',
  }
}

export function evaluateSniper(ta: TAResult, price: number): SniperSignal {
  const rsiStatus = getRSIStatus(ta.rsi14)

  const c1: SniperCondition = {
    name: 'Bull Market Filter',
    description: 'Price above 200-Day SMA — ensures we\'re in an uptrend',
    pass: !!(ta.sma200 && price > ta.sma200),
    value: ta.sma200 ? `$${price.toFixed(2)} vs SMA200 $${ta.sma200.toFixed(2)}` : 'SMA200 unavailable',
    threshold: 'Price > SMA 200',
  }

  const c2: SniperCondition = {
    name: 'Bollinger Squeeze',
    description: 'BB Width < 5% — energy loading phase before explosive move',
    pass: !!(ta.bbWidth !== null && ta.bbWidth < 5),
    value: ta.bbWidth !== null ? `BB Width ${ta.bbWidth.toFixed(2)}%` : 'BB Width unavailable',
    threshold: 'BB Width < 5%',
  }

  const c3: SniperCondition = {
    name: 'Upper Band Breakout',
    description: 'Price closed above Upper Bollinger Band — actual entry trigger',
    pass: !!(ta.bbUpper && price > ta.bbUpper),
    value: ta.bbUpper ? `$${price.toFixed(2)} vs Upper BB $${ta.bbUpper.toFixed(2)}` : 'BB Upper unavailable',
    threshold: 'Price > Upper BB',
  }

  const c4: SniperCondition = {
    name: 'RSI Safety Filter',
    description: 'RSI 50–65 = Green Light. RSI > 75 = pause entry',
    pass: !!(ta.rsi14 !== null && ta.rsi14 >= 50 && ta.rsi14 < 75),
    value: ta.rsi14 !== null ? `RSI ${ta.rsi14.toFixed(1)}` : 'RSI unavailable',
    threshold: '50 ≤ RSI < 75',
  }

  const c5: SniperCondition = {
    name: 'Trend Conviction',
    description: 'SMA 50 > SMA 100 — medium-term momentum confirms the breakout',
    pass: !!(ta.sma50 && ta.sma100 && ta.sma50 > ta.sma100),
    value: ta.sma50 && ta.sma100
      ? `SMA50 $${ta.sma50.toFixed(2)} vs SMA100 $${ta.sma100.toFixed(2)}`
      : 'SMA data unavailable',
    threshold: 'SMA 50 > SMA 100',
  }

  const conditions = [c1, c2, c3, c4, c5]
  const score = conditions.filter(c => c.pass).length

  let grade: SniperGrade
  if (!c1.pass) {
    grade = 'AVOID'
  } else if (rsiStatus === 'overbought') {
    grade = 'WAIT'
  } else if (score === 5) {
    grade = 'FIRE'
  } else if (score >= 3 && c3.pass) {
    grade = 'WATCH'
  } else {
    grade = 'WAIT'
  }

  const summaryMap: Record<SniperGrade, string> = {
    FIRE: 'All 5 conditions aligned. High-conviction breakout setup — consider entering now.',
    WATCH: 'Breakout triggered with partial conviction. Monitor closely; consider a smaller position.',
    WAIT: 'Setup is not yet triggered or RSI is overextended. Stay on the sidelines.',
    AVOID: 'Price below 200-Day SMA. Trend is against you — no long setups.',
  }

  const entryLevels = (grade === 'FIRE' || grade === 'WATCH') ? buildEntryLevels(ta, price) : null
  const options = buildOptionsStrategy(grade, rsiStatus, ta, price)

  return {
    grade,
    score,
    conditions,
    rsiStatus,
    entryLevels,
    options,
    summary: summaryMap[grade],
  }
}
