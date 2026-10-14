ALTER TABLE "Business" ADD COLUMN "liveStatus" TEXT, ADD COLUMN "sellerType" TEXT NOT NULL DEFAULT 'SHOPFRONT', ADD COLUMN "verificationVisitRequested" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "dealBlastEndsAt" TIMESTAMP(3);
ALTER TABLE "ServiceRequest" ADD COLUMN "category" TEXT, ADD COLUMN "contactConsent" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "closedAt" TIMESTAMP(3), ADD COLUMN "manageTokenHash" TEXT;
CREATE TABLE "VerificationProof" ("id" TEXT NOT NULL, "sessionHash" TEXT NOT NULL, "businessId" TEXT, "content" BYTEA NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "VerificationProof_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "VerificationProof_businessId_key" ON "VerificationProof"("businessId");
CREATE INDEX "VerificationProof_sessionHash_idx" ON "VerificationProof"("sessionHash");
CREATE TABLE "BusinessEvent" ("id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "type" TEXT NOT NULL, "zone" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "BusinessEvent_pkey" PRIMARY KEY ("id"));
CREATE INDEX "BusinessEvent_businessId_createdAt_idx" ON "BusinessEvent"("businessId", "createdAt");

ALTER TABLE "Business" ADD COLUMN "requestAlertsEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "PaymentRecord" ADD COLUMN "submittedReceipt" TEXT;
