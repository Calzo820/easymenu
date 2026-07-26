DO $$
BEGIN
  CREATE TYPE "OrderItemStatus" AS ENUM ('active', 'voided');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "CashClosureStatus" AS ENUM ('closed', 'reopened');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "StockMovementType" AS ENUM ('adjustment', 'sale', 'restock', 'waste', 'restore');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "pinHash" TEXT,
  ADD COLUMN IF NOT EXISTS "pinEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isPinOnly" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

ALTER TABLE "MenuItem"
  ADD COLUMN IF NOT EXISTS "costPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "trackStock" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "stockQuantity" DECIMAL(10,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lowStockThreshold" DECIMAL(10,3) NOT NULL DEFAULT 0;

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "reopenedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reopenedByUserId" TEXT;

ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "costSnapshot" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "status" "OrderItemStatus" NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS "voidReason" TEXT,
  ADD COLUMN IF NOT EXISTS "voidedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "voidedByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "isComplimentary" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "complimentaryReason" TEXT;

ALTER TABLE "PaymentTransaction"
  ADD COLUMN IF NOT EXISTS "method" "PaymentMethod",
  ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT;

CREATE TABLE IF NOT EXISTS "CashClosure" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "businessDate" TIMESTAMP(3) NOT NULL,
  "grossTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "expectedCash" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "declaredCash" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "difference" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "cardTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "onlineTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "otherTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "orderCount" INTEGER NOT NULL DEFAULT 0,
  "paymentCount" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "status" "CashClosureStatus" NOT NULL DEFAULT 'closed',
  "closedByUserId" TEXT,
  "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reopenedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CashClosure_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "reason" TEXT,
  "metadata" JSONB,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StockMovement" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "menuItemId" TEXT NOT NULL,
  "userId" TEXT,
  "orderItemId" TEXT,
  "type" "StockMovementType" NOT NULL,
  "quantityBefore" DECIMAL(10,3) NOT NULL,
  "quantityChange" DECIMAL(10,3) NOT NULL,
  "quantityAfter" DECIMAL(10,3) NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CashClosure_restaurantId_businessDate_key"
  ON "CashClosure"("restaurantId", "businessDate");
CREATE INDEX IF NOT EXISTS "CashClosure_restaurantId_businessDate_idx"
  ON "CashClosure"("restaurantId", "businessDate");
CREATE INDEX IF NOT EXISTS "AuditLog_restaurantId_createdAt_idx"
  ON "AuditLog"("restaurantId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_idx"
  ON "AuditLog"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "StockMovement_restaurantId_createdAt_idx"
  ON "StockMovement"("restaurantId", "createdAt");
CREATE INDEX IF NOT EXISTS "StockMovement_menuItemId_createdAt_idx"
  ON "StockMovement"("menuItemId", "createdAt");

DO $$
BEGIN
  ALTER TABLE "Order" ADD CONSTRAINT "Order_reopenedByUserId_fkey"
    FOREIGN KEY ("reopenedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_voidedByUserId_fkey"
    FOREIGN KEY ("voidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "CashClosure" ADD CONSTRAINT "CashClosure_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  ALTER TABLE "CashClosure" ADD CONSTRAINT "CashClosure_closedByUserId_fkey"
    FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_menuItemId_fkey"
    FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
