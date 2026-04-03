-- CreateTable
CREATE TABLE "WatchlistTicker" (
    "id" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "sector" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "WatchlistTicker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanResult" (
    "id" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "price" DOUBLE PRECISION NOT NULL,
    "priceChangePct" DOUBLE PRECISION NOT NULL,
    "overallSignal" TEXT NOT NULL,
    "signalScore" INTEGER NOT NULL,
    "sniperGrade" TEXT NOT NULL,
    "sniperScore" INTEGER NOT NULL,
    "rsi14" DOUBLE PRECISION,
    "macdHist" DOUBLE PRECISION,
    "bbWidth" DOUBLE PRECISION,
    "adx14" DOUBLE PRECISION,
    "volumeRatio" DOUBLE PRECISION,
    "atr14" DOUBLE PRECISION,
    "sma20" DOUBLE PRECISION,
    "sma50" DOUBLE PRECISION,
    "sma200" DOUBLE PRECISION,
    "aboveSma20" BOOLEAN NOT NULL DEFAULT false,
    "aboveSma50" BOOLEAN NOT NULL DEFAULT false,
    "aboveSma200" BOOLEAN NOT NULL DEFAULT false,
    "macdBullish" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ScanResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistTicker_symbol_key" ON "WatchlistTicker"("symbol");

-- CreateIndex
CREATE INDEX "WatchlistTicker_symbol_idx" ON "WatchlistTicker"("symbol");

-- CreateIndex
CREATE INDEX "ScanResult_symbol_scannedAt_idx" ON "ScanResult"("symbol", "scannedAt");

-- CreateIndex
CREATE INDEX "ScanResult_scannedAt_idx" ON "ScanResult"("scannedAt");

-- CreateIndex
CREATE INDEX "ScanResult_overallSignal_idx" ON "ScanResult"("overallSignal");

-- CreateIndex
CREATE INDEX "ScanResult_sniperGrade_idx" ON "ScanResult"("sniperGrade");

-- AddForeignKey
ALTER TABLE "ScanResult" ADD CONSTRAINT "ScanResult_symbol_fkey" FOREIGN KEY ("symbol") REFERENCES "WatchlistTicker"("symbol") ON DELETE RESTRICT ON UPDATE CASCADE;
