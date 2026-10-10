import { prisma } from './prisma';
import { reminderStage } from './catalog-plan';
import { sendProPlanEmail } from './mail';
import { removeUnusedMedia } from './media-storage';

export async function runPlanMaintenance(now = new Date(), send = sendProPlanEmail, options: {batchSize?:number;budgetMs?:number;signal?:AbortSignal} = {}) {
  const started = Date.now();
  const batchSize = options.batchSize ?? 100;
  const budgetMs = options.budgetMs ?? 260000;
  const seven = new Date(now.getTime() + 7 * 864e5);
  const three = new Date(now.getTime() + 3 * 864e5);
  const one = new Date(now.getTime() + 864e5);
  const thirtyAgo = new Date(now.getTime() - 30 * 864e5);
  const candidates = await prisma.$queryRaw<Array<{id:string}>>`
    SELECT b."id" FROM "Business" b JOIN "Account" a ON a."id" = b."ownerId"
    WHERE b."proEndsAt" <= ${seven} AND b."proEndsAt" >= ${thirtyAgo} AND a."emailVerifiedAt" IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM "PlanNotice" n WHERE n."businessId" = b."id" AND n."endsAt" = b."proEndsAt"
      AND n."daysBefore" = CASE WHEN b."proEndsAt" <= ${now} THEN 0 WHEN b."proEndsAt" <= ${one} THEN 1 WHEN b."proEndsAt" <= ${three} THEN 3 ELSE 7 END
      AND n."sentAt" IS NOT NULL)
    ORDER BY b."proEndsAt" ASC LIMIT ${batchSize}`;
  const result = {sent:0,skipped:0,failed:0,cleaned:0,cleanupFailed:0};
  for (const candidate of candidates) {
    if (Date.now() - started > Math.min(200000,budgetMs) || options.signal?.aborted) break;
    const business = await prisma.business.findUnique({where:{id:candidate.id},include:{owner:true}});
    if (!business?.proEndsAt || !business.owner?.emailVerifiedAt) {result.skipped++;continue;}
    const stage = reminderStage(business.proEndsAt, now);
    if (stage === undefined) continue;
    const notice = await prisma.planNotice.upsert({
      where:{businessId_endsAt_daysBefore:{businessId:business.id,endsAt:business.proEndsAt,daysBefore:stage}},
      create:{businessId:business.id,endsAt:business.proEndsAt,daysBefore:stage},update:{},
    });
    const claimedAt = new Date();
    const claimed = await prisma.planNotice.updateMany({where:{id:notice.id,sentAt:null,OR:[{claimedAt:null},{claimedAt:{lt:new Date(claimedAt.getTime()-20*60000)}}]},data:{claimedAt,error:null}});
    if (!claimed.count) {result.skipped++;continue;}
    try {
      const current = await prisma.business.findUnique({where:{id:business.id},select:{proEndsAt:true}});
      if (current?.proEndsAt?.getTime() !== business.proEndsAt.getTime()) {
        await prisma.planNotice.update({where:{id:notice.id},data:{claimedAt:null}});result.skipped++;continue;
      }
      await send(business.owner.email,business.name,business.slug,business.proEndsAt,stage,`pro/${business.id}/${business.proEndsAt.toISOString()}/${stage}`);
      await prisma.planNotice.updateMany({where:{id:notice.id,claimedAt},data:{sentAt:new Date(),claimedAt:null,error:null}});
      result.sent++;
    } catch (error) {
      result.failed++;
      await prisma.planNotice.updateMany({where:{id:notice.id,claimedAt},data:{claimedAt:null,error:(error instanceof Error ? error.message : 'Email failed').slice(0,500)}});
    }
  }
  // Only unreferenced uploads are eligible. Expired Pro products continue to reference their photos.
  if (Date.now() - started > budgetMs || options.signal?.aborted) return result;
  const cutoff = new Date(now.getTime()-864e5);
  const unused = await prisma.$queryRaw<Array<{id:string}>>`
    SELECT m."id" FROM "BusinessMedia" m LEFT JOIN "Business" b ON b."id" = m."businessId"
    WHERE (m."state" = 'DELETING' OR m."createdAt" < ${cutoff}) AND (b."id" IS NULL OR m."url" IS NULL OR
      (NOT (m."url" = ANY(b."photos")) AND m."url" <> b."coverPhoto" AND
       NOT EXISTS (SELECT 1 FROM jsonb_array_elements(b."services") item WHERE item->>'photo' = m."url")))
    ORDER BY CASE WHEN m."state" = 'DELETING' THEN 0 ELSE 1 END, m."createdAt" ASC LIMIT ${batchSize}`;
  for (const asset of unused) {
    if (Date.now() - started > budgetMs || options.signal?.aborted) break;
    try {if (await removeUnusedMedia(asset.id,options.signal)) result.cleaned++;} catch {result.cleanupFailed++;}
  }
  return result;
}
