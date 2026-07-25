ALTER TABLE "Restaurant"
  ADD COLUMN "stripeConnectAccountId" TEXT,
  ADD COLUMN "stripeConnectDetailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "stripeConnectChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "stripeConnectPayoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "stripeConnectOnboardedAt" TIMESTAMP(3);

ALTER TABLE "User"
  ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "emailVerificationTokenHash" TEXT,
  ADD COLUMN "emailVerificationExpiresAt" TIMESTAMP(3),
  ADD COLUMN "passwordResetTokenHash" TEXT,
  ADD COLUMN "passwordResetExpiresAt" TIMESTAMP(3);

ALTER TABLE "PaymentTransaction"
  ADD COLUMN "connectedAccountId" TEXT;

CREATE UNIQUE INDEX "Restaurant_stripeConnectAccountId_key"
  ON "Restaurant"("stripeConnectAccountId");

CREATE UNIQUE INDEX "User_emailVerificationTokenHash_key"
  ON "User"("emailVerificationTokenHash");

CREATE UNIQUE INDEX "User_passwordResetTokenHash_key"
  ON "User"("passwordResetTokenHash");
