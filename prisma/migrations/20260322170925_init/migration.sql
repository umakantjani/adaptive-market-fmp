-- CreateTable
CREATE TABLE "Ticker" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "exchange" TEXT,
    "sector" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OHLCVSnapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tickerId" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "barsJson" TEXT NOT NULL,
    CONSTRAINT "OHLCVSnapshot_tickerId_fkey" FOREIGN KEY ("tickerId") REFERENCES "Ticker" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TASnapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tickerId" INTEGER NOT NULL,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "period" TEXT NOT NULL,
    "currentPrice" REAL NOT NULL,
    "priceChange" REAL NOT NULL,
    "priceChangePct" REAL NOT NULL,
    "sma20" REAL,
    "sma50" REAL,
    "sma200" REAL,
    "ema12" REAL,
    "ema26" REAL,
    "rsi14" REAL,
    "stochK" REAL,
    "stochD" REAL,
    "adx14" REAL,
    "diPlus" REAL,
    "diMinus" REAL,
    "macdLine" REAL,
    "macdSignal" REAL,
    "macdHist" REAL,
    "bbUpper" REAL,
    "bbMiddle" REAL,
    "bbLower" REAL,
    "bbWidth" REAL,
    "atr14" REAL,
    "obv" REAL,
    "volumeSMA20" REAL,
    "volumeRatio" REAL,
    "supportLevels" TEXT,
    "resistanceLevels" TEXT,
    "overallSignal" TEXT,
    "signalScore" INTEGER,
    CONSTRAINT "TASnapshot_tickerId_fkey" FOREIGN KEY ("tickerId") REFERENCES "Ticker" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIReport" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tickerId" INTEGER NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "period" TEXT NOT NULL,
    "taInputJson" TEXT NOT NULL,
    "reportText" TEXT NOT NULL,
    "tokensUsed" INTEGER,
    "modelUsed" TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
    CONSTRAINT "AIReport_tickerId_fkey" FOREIGN KEY ("tickerId") REFERENCES "Ticker" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Ticker_symbol_key" ON "Ticker"("symbol");

-- CreateIndex
CREATE INDEX "Ticker_symbol_idx" ON "Ticker"("symbol");

-- CreateIndex
CREATE INDEX "OHLCVSnapshot_tickerId_period_capturedAt_idx" ON "OHLCVSnapshot"("tickerId", "period", "capturedAt");

-- CreateIndex
CREATE INDEX "TASnapshot_tickerId_period_capturedAt_idx" ON "TASnapshot"("tickerId", "period", "capturedAt");

-- CreateIndex
CREATE INDEX "AIReport_tickerId_generatedAt_idx" ON "AIReport"("tickerId", "generatedAt");
