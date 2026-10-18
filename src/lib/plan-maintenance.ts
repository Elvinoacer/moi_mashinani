import { queueNotice } from "./notifications";
import { prisma } from "./prisma";
import { reminderStage } from "./catalog-plan";
import { sendProPlanEmail } from "./mail";
import { removeUnusedMedia } from "./media-storage";
import { deletePhotosFromR2 } from "./r2";
import { ENROLLMENT_MEDIA_WINDOW_MS } from "./enrollment-media";
import { pendingPromotionGuarantees, reviewPromotionGuarantee } from "./promotion-guarantee";

export async function runPlanMaintenance(
  now = new Date(),
  send = sendProPlanEmail,
  options: { batchSize?: number; budgetMs?: number; signal?: AbortSignal } = {},
) {
  const started = Date.now();
  const batchSize = options.batchSize ?? 100;
  const budgetMs = options.budgetMs ?? 260000;
  const seven = new Date(now.getTime() + 7 * 864e5);
  const three = new Date(now.getTime() + 3 * 864e5);
  const one = new Date(now.getTime() + 864e5);
  const thirtyAgo = new Date(now.getTime() - 30 * 864e5);

  const result = {
    sent: 0,
    skipped: 0,
    failed: 0,
    cleaned: 0,
    cleanupFailed: 0,
    guaranteesReviewed: 0,
    guaranteesExtended: 0,
  };
  // Deliver owed boost time before potentially slow reminder emails. Persisted
  // reviews let the next invocation resume past every completed batch.
  const expiringBoosts = await pendingPromotionGuarantees(prisma, now, batchSize);
  for (const { id } of expiringBoosts) {
    if (Date.now() - started > budgetMs / 2 || options.signal?.aborted) break;
    try {
      const outcome = await prisma.$transaction((tx) => reviewPromotionGuarantee(tx, id, now, async (notice) => {
        await queueNotice(tx, notice.ownerId, `guarantee/${id}/${notice.key}`, {
          kind: "PLAN_EXPIRY",
          title: "Your boost has 7 extra days, on us",
          body: `${notice.name} recorded ${notice.contacts} Call or WhatsApp taps and booking requests during this boost activity window. Your Value Guarantee adds seven free days. Contact actions indicate interest and do not confirm sales.`,
          path: `/dashboard/${notice.slug}?tab=billing`,
          button: "View my active boost",
        }, ["EMAIL", "PUSH"], id);
      }), { maxWait: 3000, timeout: 5000 });
      if (outcome === "skipped") result.skipped++;
      else result.guaranteesReviewed++;
      if (outcome === "extended") result.guaranteesExtended++;
    } catch {
      result.failed++;
    }
  }
  if (Date.now() - started > budgetMs || options.signal?.aborted) return result;

  const candidates = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT b."id" FROM "Business" b JOIN "Account" a ON a."id" = b."ownerId"
    WHERE b."proEndsAt" <= ${seven} AND b."proEndsAt" >= ${thirtyAgo} AND a."emailVerifiedAt" IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM "PlanNotice" n WHERE n."businessId" = b."id" AND n."endsAt" = b."proEndsAt"
      AND n."daysBefore" = CASE WHEN b."proEndsAt" <= ${now} THEN 0 WHEN b."proEndsAt" <= ${one} THEN 1 WHEN b."proEndsAt" <= ${three} THEN 3 ELSE 7 END
      AND n."sentAt" IS NOT NULL)
    ORDER BY b."proEndsAt" ASC LIMIT ${batchSize}`;

  for (const candidate of candidates) {
    if (
      Date.now() - started > Math.min(200000, budgetMs) ||
      options.signal?.aborted
    )
      break;
    const business = await prisma.business.findUnique({
      where: { id: candidate.id },
      include: { owner: true },
    });
    if (!business?.proEndsAt || !business.owner?.emailVerifiedAt) {
      result.skipped++;
      continue;
    }
    const stage = reminderStage(business.proEndsAt, now);
    if (stage === undefined) continue;
    const notice = await prisma.planNotice.upsert({
      where: {
        businessId_endsAt_daysBefore: {
          businessId: business.id,
          endsAt: business.proEndsAt,
          daysBefore: stage,
        },
      },
      create: {
        businessId: business.id,
        endsAt: business.proEndsAt,
        daysBefore: stage,
      },
      update: {},
    });
    const claimedAt = new Date();
    const claimed = await prisma.planNotice.updateMany({
      where: {
        id: notice.id,
        sentAt: null,
        OR: [
          { claimedAt: null },
          { claimedAt: { lt: new Date(claimedAt.getTime() - 20 * 60000) } },
        ],
      },
      data: { claimedAt, error: null },
    });
    if (!claimed.count) {
      result.skipped++;
      continue;
    }
    try {
      const current = await prisma.business.findUnique({
        where: { id: business.id },
        select: { proEndsAt: true, metrics: true },
      });
      if (current?.proEndsAt?.getTime() !== business.proEndsAt.getTime()) {
        await prisma.planNotice.update({
          where: { id: notice.id },
          data: { claimedAt: null },
        });
        result.skipped++;
        continue;
      }
      const metricsObj =
        (current?.metrics as Record<string, number> | null) || {};
      const totalLeads =
        (metricsObj.calls || 0) +
        (metricsObj.whatsapp || 0) +
        (metricsObj.bookingRequests || 0);
      const totalViews = metricsObj.views || 0;
      const roiSnippet =
        totalLeads > 0 || totalViews > 0
          ? ` Your profile has generated ${totalLeads} direct student contacts and ${totalViews} profile views.`
          : "";

      await prisma.$transaction((tx) =>
        queueNotice(
          tx,
          business.ownerId,
          `plan/${notice.id}`,
          {
            kind: "PLAN_EXPIRY",
            title:
              stage === 0
                ? "Your Pro plan has ended"
                : `Your Pro plan ends in ${stage} days`,
            body: `${business.name}:${roiSnippet} ${stage === 0 ? "Your listing has returned to Free and your content remains saved." : "Renew to keep Pro visibility and unlimited student lead alerts without interruption."} Renew manually from your dashboard; you will not be charged automatically.`,
            path: `/pro/${business.slug}`,
            button: "Review & renew Pro",
          },
          ["PUSH"],
          business.id,
        ),
      );
      if (business.owner.emailVerifiedAt)
        await send(
          business.owner.email,
          business.name,
          business.slug,
          business.proEndsAt,
          stage,
          `pro/${business.id}/${business.proEndsAt.toISOString()}/${stage}`,
        );
      await prisma.planNotice.updateMany({
        where: { id: notice.id, claimedAt },
        data: { sentAt: new Date(), claimedAt: null, error: null },
      });
      result.sent++;
    } catch (error) {
      result.failed++;
      await prisma.planNotice.updateMany({
        where: { id: notice.id, claimedAt },
        data: {
          claimedAt: null,
          error: (error instanceof Error
            ? error.message
            : "Email failed"
          ).slice(0, 500),
        },
      });
    }
  }
  // Only unreferenced uploads are eligible. Expired Pro products continue to reference their photos.
  if (Date.now() - started > budgetMs || options.signal?.aborted) return result;

  const cutoff = new Date(now.getTime() - 864e5);
  const unused = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT m."id" FROM "BusinessMedia" m LEFT JOIN "Business" b ON b."id" = m."businessId"
    WHERE (m."state" = 'DELETING' OR m."createdAt" < ${cutoff}) AND (b."id" IS NULL OR m."url" IS NULL OR
      (NOT (m."url" = ANY(b."photos")) AND m."url" <> b."coverPhoto" AND
       NOT EXISTS (SELECT 1 FROM jsonb_array_elements(b."services") item WHERE item->>'photo' = m."url")))
    ORDER BY CASE WHEN m."state" = 'DELETING' THEN 0 ELSE 1 END, m."createdAt" ASC LIMIT ${batchSize}`;
  for (const asset of unused) {
    if (Date.now() - started > budgetMs || options.signal?.aborted) break;
    try {
      if (await removeUnusedMedia(asset.id, options.signal)) result.cleaned++;
    } catch {
      result.cleanupFailed++;
    }
  }
  // Remove uploads abandoned before the owner submits, after the 24-hour claim window.
  const expiredStaged = await prisma.enrollmentMedia.findMany({
    where: {
      createdAt: { lt: new Date(now.getTime() - ENROLLMENT_MEDIA_WINDOW_MS) },
    },
    select: { id: true, url: true },
    take: batchSize,
  });
  for (const media of expiredStaged) {
    if (Date.now() - started > budgetMs || options.signal?.aborted) break;
    try {
      await deletePhotosFromR2([media.url], options.signal);
      await prisma.enrollmentMedia.deleteMany({
        where: {
          id: media.id,
          createdAt: {
            lt: new Date(now.getTime() - ENROLLMENT_MEDIA_WINDOW_MS),
          },
        },
      });
      result.cleaned++;
    } catch {
      result.cleanupFailed++;
    }
  }
  // Private ID uploads abandoned before enrollment expire with the staging cookie.
  if (Date.now() - started <= budgetMs && !options.signal?.aborted) {
    const proofs = await prisma.verificationProof.findMany({
      where: { businessId: null, createdAt: { lt: cutoff } },
      select: { id: true },
      take: batchSize,
    });
    if (proofs.length) {
      const removed = await prisma.verificationProof.deleteMany({
        where: {
          id: { in: proofs.map((p) => p.id) },
          businessId: null,
          createdAt: { lt: cutoff },
        },
      });
      result.cleaned += removed.count;
    }
  }
  return result;
}
