export interface OHLCVBar {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface TickerInfo {
  symbol: string
  name: string
  exchange?: string
  currentPrice: number
  priceChange: number
  priceChangePct: number
  marketCap?: number
  week52High?: number
  week52Low?: number
}

export interface SRLevel {
  price: number
  strength: number
  touches: number
}

export interface TAResult {
  sma20: number | null
  sma50: number | null
  sma100: number | null
  sma200: number | null
  ema12: number | null
  ema26: number | null
  rsi14: number | null
  stochK: number | null
  stochD: number | null
  adx14: number | null
  diPlus: number | null
  diMinus: number | null
  macdLine: number | null
  macdSignal: number | null
  macdHist: number | null
  bbUpper: number | null
  bbMiddle: number | null
  bbLower: number | null
  bbWidth: number | null
  atr14: number | null
  obv: number | null
  volumeSMA20: number | null
  volumeRatio: number | null
  overallSignal: string
  signalScore: number
  supportLevels: SRLevel[]
  resistanceLevels: SRLevel[]
  history: {
    dates: string[]
    closes: number[]
    highs: number[]
    lows: number[]
    opens: number[]
    volumes: number[]
    rsi: (number | null)[]
    macdLine: (number | null)[]
    macdSignal: (number | null)[]
    macdHist: (number | null)[]
    bbUpper: (number | null)[]
    bbMiddle: (number | null)[]
    bbLower: (number | null)[]
    stochK: (number | null)[]
    stochD: (number | null)[]
    adx: (number | null)[]
    diPlus: (number | null)[]
    diMinus: (number | null)[]
    obv: (number | null)[]
    sma20: (number | null)[]
    sma50: (number | null)[]
    sma100: (number | null)[]
    sma200: (number | null)[]
  }
}

export interface TickerSearchResult {
  symbol: string
  name: string
  exchange?: string
  type?: string
}

export interface FullTickerData {
  ticker: TickerInfo
  ohlcv: OHLCVBar[]
  ta: TAResult
}
