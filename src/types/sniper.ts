export type SniperGrade = 'FIRE' | 'WATCH' | 'WAIT' | 'AVOID'
export type RSIStatus = 'green' | 'caution' | 'overbought' | 'weak'
export type OptionsSetup = 'calls' | 'bull_spread' | 'wait' | 'avoid'

export interface SniperCondition {
  name: string
  description: string
  pass: boolean
  value: string
  threshold: string
}

export interface OptionsStrategy {
  setup: OptionsSetup
  reasoning: string
  contractType: string | null
  strikeGuidance: string | null
  expiryGuidance: string | null
  riskNote: string
}

export interface EntryLevels {
  entryZone: [number, number]
  stopLoss: number
  target1: number
  target2: number
  riskRewardRatio: number
}

export interface SniperSignal {
  grade: SniperGrade
  score: number             // 0–5 conditions met
  conditions: SniperCondition[]
  rsiStatus: RSIStatus
  entryLevels: EntryLevels | null
  options: OptionsStrategy
  summary: string
}
