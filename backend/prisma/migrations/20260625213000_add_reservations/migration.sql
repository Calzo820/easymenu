CREATE TYPE "ReservationStatus" AS ENUM ('booked', 'seated', 'cancelled', 'no_show');

CREATE TABLE "Reservation" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "tableId" TEXT,
  "customerName" TEXT NOT NULL,
  "phone" TEXT,
  "date" TIMESTAMP(3) NOT NULL,
  "time" TEXT NOT NULL,
  "guests" INTEGER NOT NULL DEFAULT 2,
  "notes" TEXT,
  "status" "ReservationStatus" NOT NULL DEFAULT 'booked',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Reservation_restaurantId_date_idx" ON "Reservation"("restaurantId", "date");
CREATE INDEX "Reservation_tableId_date_idx" ON "Reservation"("tableId", "date");
CREATE INDEX "Reservation_status_idx" ON "Reservation"("status");

ALTER TABLE "Reservation"
  ADD CONSTRAINT "Reservation_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Reservation"
  ADD CONSTRAINT "Reservation_tableId_fkey"
  FOREIGN KEY ("tableId") REFERENCES "Table"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
