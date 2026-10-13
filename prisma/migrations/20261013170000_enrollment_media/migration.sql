CREATE TABLE "EnrollmentMedia" (
  "id" TEXT NOT NULL,
  "sessionHash" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "bytes" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EnrollmentMedia_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EnrollmentMedia_url_key" ON "EnrollmentMedia"("url");
CREATE INDEX "EnrollmentMedia_sessionHash_createdAt_idx" ON "EnrollmentMedia"("sessionHash","createdAt");
CREATE INDEX "EnrollmentMedia_createdAt_idx" ON "EnrollmentMedia"("createdAt");
