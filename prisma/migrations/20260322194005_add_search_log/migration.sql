-- CreateTable
CREATE TABLE "SearchLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "symbol" TEXT NOT NULL,
    "searchType" TEXT NOT NULL,
    "searchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "price" REAL,
    "result" TEXT NOT NULL DEFAULT 'success',
    "errorMsg" TEXT
);

-- CreateIndex
CREATE INDEX "SearchLog_symbol_searchedAt_idx" ON "SearchLog"("symbol", "searchedAt");

-- CreateIndex
CREATE INDEX "SearchLog_searchedAt_idx" ON "SearchLog"("searchedAt");
