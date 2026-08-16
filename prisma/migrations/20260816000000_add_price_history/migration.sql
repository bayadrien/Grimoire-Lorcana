CREATE TABLE IF NOT EXISTS "PriceHistory" (
  "id" TEXT NOT NULL,
  "cardId" TEXT NOT NULL,
  "normalEur" DOUBLE PRECISION NOT NULL,
  "foilEur" DOUBLE PRECISION NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PriceHistory_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card_new"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "PriceHistory_cardId_recordedAt_key" ON "PriceHistory"("cardId", "recordedAt");
CREATE INDEX IF NOT EXISTS "PriceHistory_cardId_recordedAt_idx" ON "PriceHistory"("cardId", "recordedAt");
