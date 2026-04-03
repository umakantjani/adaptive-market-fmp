-- CreateTable
CREATE TABLE "ReportComment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reportId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReportComment_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "AIReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AIReport" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tickerId" INTEGER NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "period" TEXT NOT NULL,
    "taInputJson" TEXT NOT NULL,
    "reportText" TEXT NOT NULL,
    "tokensUsed" INTEGER,
    "modelUsed" TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
    "likes" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "AIReport_tickerId_fkey" FOREIGN KEY ("tickerId") REFERENCES "Ticker" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AIReport" ("generatedAt", "id", "modelUsed", "period", "reportText", "taInputJson", "tickerId", "tokensUsed") SELECT "generatedAt", "id", "modelUsed", "period", "reportText", "taInputJson", "tickerId", "tokensUsed" FROM "AIReport";
DROP TABLE "AIReport";
ALTER TABLE "new_AIReport" RENAME TO "AIReport";
CREATE INDEX "AIReport_tickerId_generatedAt_idx" ON "AIReport"("tickerId", "generatedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ReportComment_reportId_createdAt_idx" ON "ReportComment"("reportId", "createdAt");
