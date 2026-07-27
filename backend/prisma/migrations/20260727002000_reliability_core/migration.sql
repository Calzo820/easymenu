DO $$
BEGIN
  CREATE TYPE "PreparationStatus" AS ENUM ('pending', 'in_progress', 'ready', 'served');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PrintJobStatus" AS ENUM ('pending', 'processing', 'printed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "preparationStatus" "PreparationStatus" NOT NULL DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS "PrintJob" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "area" "PreparationArea" NOT NULL,
  "eventKey" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'order',
  "status" "PrintJobStatus" NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "claimedByUserId" TEXT,
  "claimedAt" TIMESTAMP(3),
  "printedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PrintJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PrintJob_eventKey_key" ON "PrintJob"("eventKey");
CREATE INDEX IF NOT EXISTS "PrintJob_restaurantId_area_status_createdAt_idx"
  ON "PrintJob"("restaurantId", "area", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "PrintJob_orderId_createdAt_idx" ON "PrintJob"("orderId", "createdAt");

DO $$
BEGIN
  ALTER TABLE "PrintJob"
    ADD CONSTRAINT "PrintJob_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "PrintJob"
    ADD CONSTRAINT "PrintJob_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "PrintJob"
    ADD CONSTRAINT "PrintJob_claimedByUserId_fkey"
    FOREIGN KEY ("claimedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
