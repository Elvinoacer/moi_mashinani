CREATE TABLE "BusinessAudit" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "details" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BusinessAudit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BusinessAudit_businessId_createdAt_idx" ON "BusinessAudit"("businessId", "createdAt");
