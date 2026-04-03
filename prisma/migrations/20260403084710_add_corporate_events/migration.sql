-- CreateTable
CREATE TABLE "CorporateEvent" (
    "id" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" DOUBLE PRECISION,

    CONSTRAINT "CorporateEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CorporateEvent_symbol_date_idx" ON "CorporateEvent"("symbol", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CorporateEvent_symbol_date_type_key" ON "CorporateEvent"("symbol", "date", "type");
