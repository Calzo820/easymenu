ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "clientRequestId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Order_clientRequestId_key" ON "Order"("clientRequestId");

CREATE TABLE IF NOT EXISTS "ErrorLog" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT,
  "level" TEXT NOT NULL DEFAULT 'error',
  "source" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "stack" TEXT,
  "metadata" JSONB,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "ErrorLog" ADD CONSTRAINT "ErrorLog_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "ErrorLog_restaurantId_createdAt_idx" ON "ErrorLog"("restaurantId", "createdAt");
CREATE INDEX IF NOT EXISTS "ErrorLog_level_createdAt_idx" ON "ErrorLog"("level", "createdAt");
