-- CreateTable
CREATE TABLE "Ticker" (
    "id" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "exchange" TEXT,
    "sector" TEXT,
    "industry" TEXT,
    "fullyIngested" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OHLCVBar" (
    "id" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" BIGINT NOT NULL,

    CONSTRAINT "OHLCVBar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketCapHistory" (
    "id" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "marketCap" BIGINT NOT NULL,

    CONSTRAINT "MarketCapHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomeStatement" (
    "id" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "fiscalYear" TEXT,
    "reportedCurrency" TEXT,
    "revenue" BIGINT,
    "costOfRevenue" BIGINT,
    "grossProfit" BIGINT,
    "operatingExpenses" BIGINT,
    "operatingIncome" BIGINT,
    "interestExpense" BIGINT,
    "interestIncome" BIGINT,
    "ebitda" BIGINT,
    "ebit" BIGINT,
    "incomeBeforeTax" BIGINT,
    "incomeTaxExpense" BIGINT,
    "netIncome" BIGINT,
    "eps" DOUBLE PRECISION,
    "epsDiluted" DOUBLE PRECISION,
    "weightedAverageShsOut" BIGINT,
    "weightedAverageShsOutDil" BIGINT,

    CONSTRAINT "IncomeStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BalanceSheet" (
    "id" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "fiscalYear" TEXT,
    "reportedCurrency" TEXT,
    "cashAndCashEquivalents" BIGINT,
    "shortTermInvestments" BIGINT,
    "netReceivables" BIGINT,
    "inventory" BIGINT,
    "totalCurrentAssets" BIGINT,
    "totalAssets" BIGINT,
    "totalCurrentLiabilities" BIGINT,
    "longTermDebt" BIGINT,
    "totalDebt" BIGINT,
    "totalLiabilities" BIGINT,
    "totalStockholdersEquity" BIGINT,
    "minorityInterest" BIGINT,
    "totalEquity" BIGINT,
    "shortTermInvestmentsProp" BIGINT,
    "longTermInvestments" BIGINT,

    CONSTRAINT "BalanceSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashFlowStatement" (
    "id" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "fiscalYear" TEXT,
    "reportedCurrency" TEXT,
    "netIncome" BIGINT,
    "depreciationAndAmortization" BIGINT,
    "operatingCashFlow" BIGINT,
    "capitalExpenditure" BIGINT,
    "freeCashFlow" BIGINT,
    "dividendsPaid" BIGINT,
    "commonStockRepurchased" BIGINT,
    "netCashProvidedByFinancing" BIGINT,
    "netChangeInCash" BIGINT,

    CONSTRAINT "CashFlowStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyProfile" (
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "exchange" TEXT,
    "sector" TEXT,
    "industry" TEXT,
    "beta" DOUBLE PRECISION,
    "marketCap" BIGINT,
    "price" DOUBLE PRECISION,
    "website" TEXT,
    "description" TEXT,
    "ceo" TEXT,
    "country" TEXT,
    "fullTimeEmployees" TEXT,
    "ipoDate" TEXT,
    "isEtf" BOOLEAN NOT NULL DEFAULT false,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("symbol")
);

-- CreateTable
CREATE TABLE "Sp500Constituent" (
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT,
    "subSector" TEXT,
    "headQuarter" TEXT,
    "dateFirstAdded" TEXT,
    "founded" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sp500Constituent_pkey" PRIMARY KEY ("symbol")
);

-- CreateTable
CREATE TABLE "TASnapshot" (
    "id" SERIAL NOT NULL,
    "tickerId" INTEGER NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "period" TEXT NOT NULL,
    "currentPrice" DOUBLE PRECISION NOT NULL,
    "priceChange" DOUBLE PRECISION NOT NULL,
    "priceChangePct" DOUBLE PRECISION NOT NULL,
    "sma20" DOUBLE PRECISION,
    "sma50" DOUBLE PRECISION,
    "sma200" DOUBLE PRECISION,
    "ema12" DOUBLE PRECISION,
    "ema26" DOUBLE PRECISION,
    "rsi14" DOUBLE PRECISION,
    "stochK" DOUBLE PRECISION,
    "stochD" DOUBLE PRECISION,
    "adx14" DOUBLE PRECISION,
    "diPlus" DOUBLE PRECISION,
    "diMinus" DOUBLE PRECISION,
    "macdLine" DOUBLE PRECISION,
    "macdSignal" DOUBLE PRECISION,
    "macdHist" DOUBLE PRECISION,
    "bbUpper" DOUBLE PRECISION,
    "bbMiddle" DOUBLE PRECISION,
    "bbLower" DOUBLE PRECISION,
    "bbWidth" DOUBLE PRECISION,
    "atr14" DOUBLE PRECISION,
    "obv" DOUBLE PRECISION,
    "volumeSMA20" DOUBLE PRECISION,
    "volumeRatio" DOUBLE PRECISION,
    "supportLevels" TEXT,
    "resistanceLevels" TEXT,
    "overallSignal" TEXT,
    "signalScore" INTEGER,

    CONSTRAINT "TASnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIReport" (
    "id" SERIAL NOT NULL,
    "tickerId" INTEGER NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "period" TEXT NOT NULL,
    "taInputJson" TEXT NOT NULL,
    "reportText" TEXT NOT NULL,
    "tokensUsed" INTEGER,
    "modelUsed" TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
    "likes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AIReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportComment" (
    "id" SERIAL NOT NULL,
    "reportId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValuationReport" (
    "id" SERIAL NOT NULL,
    "tickerId" INTEGER NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inputsJson" TEXT NOT NULL,
    "resultsJson" TEXT NOT NULL,
    "reportText" TEXT,
    "intrinsicValue" DOUBLE PRECISION NOT NULL,
    "currentPrice" DOUBLE PRECISION NOT NULL,
    "marginOfSafety" DOUBLE PRECISION NOT NULL,
    "modelUsed" TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
    "likes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ValuationReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchLog" (
    "id" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "searchType" TEXT NOT NULL,
    "searchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "price" DOUBLE PRECISION,
    "result" TEXT NOT NULL DEFAULT 'success',
    "errorMsg" TEXT,

    CONSTRAINT "SearchLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ticker_symbol_key" ON "Ticker"("symbol");

-- CreateIndex
CREATE INDEX "Ticker_symbol_idx" ON "Ticker"("symbol");

-- CreateIndex
CREATE INDEX "OHLCVBar_symbol_date_idx" ON "OHLCVBar"("symbol", "date");

-- CreateIndex
CREATE UNIQUE INDEX "OHLCVBar_symbol_date_key" ON "OHLCVBar"("symbol", "date");

-- CreateIndex
CREATE INDEX "MarketCapHistory_symbol_idx" ON "MarketCapHistory"("symbol");

-- CreateIndex
CREATE INDEX "MarketCapHistory_date_idx" ON "MarketCapHistory"("date");

-- CreateIndex
CREATE UNIQUE INDEX "MarketCapHistory_symbol_date_key" ON "MarketCapHistory"("symbol", "date");

-- CreateIndex
CREATE INDEX "IncomeStatement_symbol_period_date_idx" ON "IncomeStatement"("symbol", "period", "date");

-- CreateIndex
CREATE UNIQUE INDEX "IncomeStatement_symbol_date_period_key" ON "IncomeStatement"("symbol", "date", "period");

-- CreateIndex
CREATE INDEX "BalanceSheet_symbol_period_date_idx" ON "BalanceSheet"("symbol", "period", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BalanceSheet_symbol_date_period_key" ON "BalanceSheet"("symbol", "date", "period");

-- CreateIndex
CREATE INDEX "CashFlowStatement_symbol_period_date_idx" ON "CashFlowStatement"("symbol", "period", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CashFlowStatement_symbol_date_period_key" ON "CashFlowStatement"("symbol", "date", "period");

-- CreateIndex
CREATE INDEX "TASnapshot_tickerId_period_capturedAt_idx" ON "TASnapshot"("tickerId", "period", "capturedAt");

-- CreateIndex
CREATE INDEX "AIReport_tickerId_generatedAt_idx" ON "AIReport"("tickerId", "generatedAt");

-- CreateIndex
CREATE INDEX "ReportComment_reportId_createdAt_idx" ON "ReportComment"("reportId", "createdAt");

-- CreateIndex
CREATE INDEX "ValuationReport_tickerId_generatedAt_idx" ON "ValuationReport"("tickerId", "generatedAt");

-- CreateIndex
CREATE INDEX "SearchLog_symbol_searchedAt_idx" ON "SearchLog"("symbol", "searchedAt");

-- CreateIndex
CREATE INDEX "SearchLog_searchedAt_idx" ON "SearchLog"("searchedAt");

-- AddForeignKey
ALTER TABLE "TASnapshot" ADD CONSTRAINT "TASnapshot_tickerId_fkey" FOREIGN KEY ("tickerId") REFERENCES "Ticker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIReport" ADD CONSTRAINT "AIReport_tickerId_fkey" FOREIGN KEY ("tickerId") REFERENCES "Ticker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportComment" ADD CONSTRAINT "ReportComment_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "AIReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValuationReport" ADD CONSTRAINT "ValuationReport_tickerId_fkey" FOREIGN KEY ("tickerId") REFERENCES "Ticker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
