-- Informations facultatives ajoutées aux anciens boosters : les données existantes restent intactes.
ALTER TABLE "BoosterOpening"
  ADD COLUMN IF NOT EXISTS "sessionId" TEXT,
  ADD COLUMN IF NOT EXISTS "placeId" TEXT,
  ADD COLUMN IF NOT EXISTS "provenanceType" TEXT,
  ADD COLUMN IF NOT EXISTS "provenanceNote" TEXT,
  ADD COLUMN IF NOT EXISTS "paidPrice" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "priceScope" TEXT,
  ADD COLUMN IF NOT EXISTS "comment" TEXT;

CREATE TABLE IF NOT EXISTS "OpeningPlace" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "city" TEXT,
  "kind" TEXT NOT NULL DEFAULT 'store',
  "lookupKey" TEXT NOT NULL,
  "useCount" INTEGER NOT NULL DEFAULT 0,
  "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpeningPlace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OpeningSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT,
  "placeId" TEXT,
  "provenanceType" TEXT NOT NULL,
  "provenanceNote" TEXT,
  "paidPrice" DOUBLE PRECISION,
  "priceScope" TEXT NOT NULL DEFAULT 'product',
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpeningSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OpeningPlace_userId_lookupKey_key" ON "OpeningPlace"("userId", "lookupKey");
CREATE INDEX IF NOT EXISTS "OpeningPlace_userId_lastUsedAt_idx" ON "OpeningPlace"("userId", "lastUsedAt");
CREATE INDEX IF NOT EXISTS "OpeningPlace_userId_useCount_idx" ON "OpeningPlace"("userId", "useCount");
CREATE INDEX IF NOT EXISTS "OpeningSession_userId_updatedAt_idx" ON "OpeningSession"("userId", "updatedAt");
CREATE INDEX IF NOT EXISTS "OpeningSession_placeId_idx" ON "OpeningSession"("placeId");
CREATE INDEX IF NOT EXISTS "BoosterOpening_userId_createdAt_idx" ON "BoosterOpening"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "BoosterOpening_sessionId_idx" ON "BoosterOpening"("sessionId");
CREATE INDEX IF NOT EXISTS "BoosterOpening_placeId_idx" ON "BoosterOpening"("placeId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OpeningSession_placeId_fkey') THEN
    ALTER TABLE "OpeningSession" ADD CONSTRAINT "OpeningSession_placeId_fkey"
      FOREIGN KEY ("placeId") REFERENCES "OpeningPlace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BoosterOpening_sessionId_fkey') THEN
    ALTER TABLE "BoosterOpening" ADD CONSTRAINT "BoosterOpening_sessionId_fkey"
      FOREIGN KEY ("sessionId") REFERENCES "OpeningSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BoosterOpening_placeId_fkey') THEN
    ALTER TABLE "BoosterOpening" ADD CONSTRAINT "BoosterOpening_placeId_fkey"
      FOREIGN KEY ("placeId") REFERENCES "OpeningPlace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
