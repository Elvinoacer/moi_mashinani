-- Reconcile the expiry index declared in the existing Prisma schema.
CREATE INDEX IF NOT EXISTS "Business_tierEndsAt_idx" ON "Business"("tierEndsAt");
