import type { Prisma } from "../generated/prisma/client";

export const GUARANTEED_MIN_CONTACT_ACTIONS = 3;
export const GUARANTEE_EXTENSION_DAYS = 7;
export const GUARANTEE_CONTACT_TYPES = ["call", "whatsapp", "booking"];

type GuaranteeNotice = {
  businessId: string;
  ownerId: string | null;
  slug: string;
  name: string;
  key: string;
  contacts: number;
  extendedUntil: Date;
};

/** Caller supplies a transaction; the row lock also serializes verified renewals. */
export async function reviewPromotionGuarantee(
  tx: Prisma.TransactionClient,
  businessId: string,
  now: Date,
  notify: (notice: GuaranteeNotice) => Promise<void>,
): Promise<"extended" | "reviewed" | "skipped"> {
  await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${businessId} FOR UPDATE`;
  const business = await tx.business.findUnique({ where: { id: businessId } });
  if (!business || business.status !== "ACTIVE" ||
      !["RECOMMENDED", "FEATURED"].includes(business.activeTier) ||
      !business.tierEndsAt || business.tierEndsAt > now) return "skipped";

  const runStart = business.tierStartsAt ?? new Date(business.tierEndsAt.getTime() - 7 * 864e5);
  const payment = await tx.paymentRecord.findFirst({
    where: {
      businessId,
      state: "COMPLETE",
      method: "INTASEND_CHECKOUT",
      planId: { in: ["RECOMMENDED", "FEATURED"] },
      paidAt: { gte: runStart },
    },
    orderBy: [{ paidAt: "desc" }, { id: "desc" }],
    select: { id: true, paidAt: true },
  });
  // A renewal gets a new review and starts a new activity window. Legacy runs keep
  // their original one-extension promise without relying on synthetic payments.
  const key = payment?.id ?? "legacy";
  const contactsFrom = payment?.paidAt ?? runStart;
  const reviewed = await tx.businessAudit.findFirst({
    where: {
      businessId,
      createdAt: { gte: contactsFrom },
      OR: [
        { action: "VALUE_GUARANTEE_REVIEW", details: key },
        // Includes extensions granted before review markers were introduced.
        { action: "VALUE_GUARANTEE_EXTENSION" },
      ],
    },
  });
  if (reviewed) return "skipped";

  const contacts = await tx.businessEvent.count({
    where: {
      businessId,
      type: { in: GUARANTEE_CONTACT_TYPES },
      createdAt: { gte: contactsFrom, lte: business.tierEndsAt },
    },
  });
  await tx.businessAudit.create({ data: {
    businessId,
    actorId: null,
    action: "VALUE_GUARANTEE_REVIEW",
    details: key,
    createdAt: now,
  } });
  if (contacts >= GUARANTEED_MIN_CONTACT_ACTIONS) return "reviewed";

  // A delayed scheduler still delivers seven full days from the actual review.
  const extendedUntil = new Date(now.getTime() + GUARANTEE_EXTENSION_DAYS * 864e5);
  await tx.business.update({ where: { id: businessId }, data: { tierEndsAt: extendedUntil } });
  await tx.businessAudit.create({ data: {
    businessId,
    actorId: null,
    action: "VALUE_GUARANTEE_EXTENSION",
    details: `${key}: ${contacts} contact actions since ${contactsFrom.toISOString()}; extended until ${extendedUntil.toISOString()}`,
    createdAt: now,
  } });
  await notify({ businessId, ownerId: business.ownerId, slug: business.slug, name: business.name, key, contacts, extendedUntil });
  return "extended";
}

/** Exclude reviewed runs before LIMIT so hundreds of merchants all make progress. */
export function pendingPromotionGuarantees(
  db: Pick<Prisma.TransactionClient, "$queryRaw">,
  now: Date,
  batchSize: number,
) {
  return db.$queryRaw<Array<{ id: string }>>`
    SELECT b."id" FROM "Business" b
    LEFT JOIN LATERAL (
      SELECT p."id", p."paidAt" FROM "PaymentRecord" p
      WHERE p."businessId" = b."id" AND p."state" = 'COMPLETE'
        AND p."method" = 'INTASEND_CHECKOUT' AND p."planId" IN ('RECOMMENDED', 'FEATURED')
        AND p."paidAt" >= COALESCE(b."tierStartsAt", b."tierEndsAt" - interval '7 days')
      ORDER BY p."paidAt" DESC, p."id" DESC LIMIT 1
    ) p ON TRUE
    WHERE b."status" = 'ACTIVE' AND b."activeTier" IN ('RECOMMENDED', 'FEATURED')
      AND b."tierEndsAt" <= ${now}
      AND NOT EXISTS (
        SELECT 1 FROM "BusinessAudit" a WHERE a."businessId" = b."id"
          AND a."createdAt" >= COALESCE(p."paidAt", b."tierStartsAt", b."tierEndsAt" - interval '7 days')
          AND ((a."action" = 'VALUE_GUARANTEE_REVIEW' AND a."details" = COALESCE(p."id", 'legacy'))
            OR a."action" = 'VALUE_GUARANTEE_EXTENSION')
      )
    ORDER BY b."tierEndsAt" ASC, b."id" ASC LIMIT ${batchSize}`;
}
