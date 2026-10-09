ALTER TABLE "Business" ADD COLUMN "proStartsAt" TIMESTAMP(3), ADD COLUMN "proEndsAt" TIMESTAMP(3);
CREATE INDEX "Business_proEndsAt_idx" ON "Business"("proEndsAt");
CREATE TABLE "BusinessMedia" (
  "id" TEXT NOT NULL, "accountId" TEXT NOT NULL, "businessId" TEXT,
  "url" TEXT, "bytes" INTEGER NOT NULL, "state" TEXT NOT NULL DEFAULT 'RESERVED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BusinessMedia_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BusinessMedia_bytes_check" CHECK ("bytes" >= 0),
  CONSTRAINT "BusinessMedia_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "BusinessMedia_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "BusinessMedia_url_key" ON "BusinessMedia"("url");
CREATE INDEX "BusinessMedia_businessId_idx" ON "BusinessMedia"("businessId");
CREATE INDEX "BusinessMedia_accountId_businessId_idx" ON "BusinessMedia"("accountId", "businessId");
CREATE INDEX "BusinessMedia_state_createdAt_idx" ON "BusinessMedia"("state", "createdAt");
CREATE TABLE "PlanNotice" (
  "id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "endsAt" TIMESTAMP(3) NOT NULL,
  "daysBefore" INTEGER NOT NULL, "sentAt" TIMESTAMP(3), "claimedAt" TIMESTAMP(3), "error" TEXT,
  CONSTRAINT "PlanNotice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlanNotice_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PlanNotice_businessId_endsAt_daysBefore_key" ON "PlanNotice"("businessId", "endsAt", "daysBefore");
CREATE INDEX "PlanNotice_sentAt_idx" ON "PlanNotice"("sentAt");
