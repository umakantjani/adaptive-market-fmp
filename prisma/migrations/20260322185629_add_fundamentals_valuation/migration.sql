-- CreateTable
CREATE TABLE "FundamentalSnapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tickerId" INTEGER NOT NULL,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revenue" REAL,
    "ebit" REAL,
    "interestExpense" REAL,
    "netIncome" REAL,
    "taxRate" REAL,
    "bookEquity" REAL,
    "bookDebt" REAL,
    "cash" REAL,
    "nonOperatingAssets" REAL,
    "minorityInterests" REAL,
    "sharesOutstanding" REAL,
    "beta" REAL,
    "revenueGrowthYoy" REAL,
    "operatingMargin" REAL,
    "sector" TEXT,
    "industry" TEXT,
    "rawJson" TEXT,
    CONSTRAINT "FundamentalSnapshot_tickerId_fkey" FOREIGN KEY ("tickerId") REFERENCES "Ticker" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ValuationReport" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tickerId" INTEGER NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inputsJson" TEXT NOT NULL,
    "resultsJson" TEXT NOT NULL,
    "reportText" TEXT NOT NULL,
    "intrinsicValue" REAL NOT NULL,
    "currentPrice" REAL NOT NULL,
    "marginOfSafety" REAL NOT NULL,
    "modelUsed" TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
    "likes" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ValuationReport_tickerId_fkey" FOREIGN KEY ("tickerId") REFERENCES "Ticker" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "FundamentalSnapshot_tickerId_capturedAt_idx" ON "FundamentalSnapshot"("tickerId", "capturedAt");

-- CreateIndex
CREATE INDEX "ValuationReport_tickerId_generatedAt_idx" ON "ValuationReport"("tickerId", "generatedAt");
