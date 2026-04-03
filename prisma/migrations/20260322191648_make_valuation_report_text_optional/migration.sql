-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ValuationReport" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tickerId" INTEGER NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inputsJson" TEXT NOT NULL,
    "resultsJson" TEXT NOT NULL,
    "reportText" TEXT,
    "intrinsicValue" REAL NOT NULL,
    "currentPrice" REAL NOT NULL,
    "marginOfSafety" REAL NOT NULL,
    "modelUsed" TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
    "likes" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ValuationReport_tickerId_fkey" FOREIGN KEY ("tickerId") REFERENCES "Ticker" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ValuationReport" ("currentPrice", "generatedAt", "id", "inputsJson", "intrinsicValue", "likes", "marginOfSafety", "modelUsed", "reportText", "resultsJson", "tickerId") SELECT "currentPrice", "generatedAt", "id", "inputsJson", "intrinsicValue", "likes", "marginOfSafety", "modelUsed", "reportText", "resultsJson", "tickerId" FROM "ValuationReport";
DROP TABLE "ValuationReport";
ALTER TABLE "new_ValuationReport" RENAME TO "ValuationReport";
CREATE INDEX "ValuationReport_tickerId_generatedAt_idx" ON "ValuationReport"("tickerId", "generatedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
