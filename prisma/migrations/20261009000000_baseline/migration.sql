-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."BookingIntent" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL DEFAULT 'General inquiry',
    "day" TEXT NOT NULL DEFAULT 'Today',
    "time" TEXT NOT NULL DEFAULT 'Afternoon',
    "studentName" TEXT NOT NULL DEFAULT 'Student',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Business" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "primaryCategory" TEXT NOT NULL,
    "extraCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "serviceModes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "campus" TEXT NOT NULL DEFAULT 'Moi University (Kesses Main Campus)',
    "zone" TEXT NOT NULL,
    "servesZones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "landmark" TEXT NOT NULL,
    "address" TEXT,
    "mapPin" JSONB,
    "walkTime" TEXT,
    "hours" JSONB NOT NULL,
    "services" JSONB NOT NULL,
    "priceLevel" INTEGER NOT NULL DEFAULT 1,
    "studentDiscount" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "coverPhoto" TEXT NOT NULL,
    "activeTier" TEXT NOT NULL DEFAULT 'NONE',
    "tierEndsAt" TIMESTAMP(3),
    "tierStartsAt" TIMESTAMP(3),
    "availableNowUntil" TIMESTAMP(3),
    "isTemporarilyClosed" BOOLEAN NOT NULL DEFAULT false,
    "temporarilyClosedUntil" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "verificationLevel" TEXT NOT NULL DEFAULT 'L0',
    "claimCode" TEXT,
    "isClaimed" BOOLEAN NOT NULL DEFAULT false,
    "ownerPhone" TEXT,
    "ambassadorId" TEXT,
    "profileStrength" INTEGER NOT NULL DEFAULT 0,
    "metrics" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PaymentRecord" (
    "id" TEXT NOT NULL,
    "apiRef" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "weeks" INTEGER NOT NULL DEFAULT 1,
    "amountKes" INTEGER NOT NULL DEFAULT 100,
    "phone" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "receiptNumber" TEXT,
    "method" TEXT NOT NULL DEFAULT 'STK_PUSH',
    "mpesaRef" TEXT,
    "failedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProblemReport" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "sessionId" TEXT NOT NULL DEFAULT 'session_anon',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "ProblemReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ServiceRequest" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "zone" TEXT NOT NULL DEFAULT 'all',
    "contactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Zone" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "landmarkHint" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "center" JSONB,
    "walkTimeFromGate" TEXT,
    "distanceFromGateMeters" INTEGER,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingIntent_businessId_idx" ON "public"."BookingIntent"("businessId" ASC);

-- CreateIndex
CREATE INDEX "Business_activeTier_idx" ON "public"."Business"("activeTier" ASC);

-- CreateIndex
CREATE INDEX "Business_primaryCategory_idx" ON "public"."Business"("primaryCategory" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Business_slug_key" ON "public"."Business"("slug" ASC);

-- CreateIndex
CREATE INDEX "Business_status_idx" ON "public"."Business"("status" ASC);

-- CreateIndex
CREATE INDEX "Business_zone_idx" ON "public"."Business"("zone" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "public"."Category"("slug" ASC);

-- CreateIndex
CREATE INDEX "PaymentRecord_businessId_idx" ON "public"."PaymentRecord"("businessId" ASC);

-- CreateIndex
CREATE INDEX "PaymentRecord_state_idx" ON "public"."PaymentRecord"("state" ASC);

-- CreateIndex
CREATE INDEX "ProblemReport_businessId_idx" ON "public"."ProblemReport"("businessId" ASC);

-- CreateIndex
CREATE INDEX "ProblemReport_status_idx" ON "public"."ProblemReport"("status" ASC);

-- CreateIndex
CREATE INDEX "ServiceRequest_zone_idx" ON "public"."ServiceRequest"("zone" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Zone_slug_key" ON "public"."Zone"("slug" ASC);
