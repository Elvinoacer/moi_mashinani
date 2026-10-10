import { prisma } from './prisma';
import type { Prisma } from '../generated/prisma/client';
import { ApiError } from './api';
import { FREE_STORAGE_BYTES, MAX_UPLOAD_BYTES, hasPro } from './catalog-plan';
import { deletePhotosFromR2 } from './r2';

export function mediaReferences(record: { photos: string[]; coverPhoto: string; services: unknown }): string[] {
  const products = Array.isArray(record.services) ? record.services as Array<{photo?: string}> : [];
  return [...new Set([...record.photos, record.coverPhoto, ...products.map(item => item.photo || '')].filter(Boolean))];
}

export function hostedMediaUrl(url: string): boolean {
  if (/^\/api\/uploads\/[0-9a-f-]{36}$/.test(url)) return true;
  const base = process.env.R2_PUBLIC_URL?.replace(/\/+$/, '');
  const prefix = (process.env.R2_KEY_PREFIX || 'moimashinani').replace(/^\/+|\/+$/g, '');
  return Boolean(base && url.startsWith(`${base}/${prefix}/photos/`));
}

export function storageUsage(assets: Array<{url: string | null; bytes: number}>, references: string[]) {
  const tracked = new Set(assets.map(asset => asset.url));
  const legacyUrls = references.filter(url => hostedMediaUrl(url) && !tracked.has(url));
  // Existing uploads predate byte accounting. Reserve the old maximum per image rather than undercount them.
  const legacyBytes = legacyUrls.length * MAX_UPLOAD_BYTES;
  return { usedBytes: assets.reduce((sum, asset) => sum + asset.bytes, 0) + legacyBytes, legacyBytes };
}

export async function getStorageUsage(businessId: string) {
  const [business, assets] = await Promise.all([
    prisma.business.findUniqueOrThrow({where:{id:businessId}}),
    prisma.businessMedia.findMany({where:{businessId},select:{url:true,bytes:true}}),
  ]);
  return storageUsage(assets, mediaReferences(business));
}

export async function reserveMedia(accountId: string, businessId: string | undefined, bytes: number[]) {
  return prisma.$transaction(async tx => {
    let unlimited = false;
    let references: string[] = [];
    if (businessId) {
      await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${businessId} FOR UPDATE`;
      const business = await tx.business.findUniqueOrThrow({where:{id:businessId}});
      unlimited = hasPro({proEndsAt:business.proEndsAt?.toISOString()});
      references = mediaReferences(business);
    } else await tx.$queryRaw`SELECT "id" FROM "Account" WHERE "id" = ${accountId} FOR UPDATE`;
    const assets = await tx.businessMedia.findMany({where: businessId ? {businessId} : {accountId,businessId:null},select:{url:true,bytes:true}});
    const { usedBytes } = storageUsage(assets, references);
    if (!unlimited && usedBytes + bytes.reduce((sum, size) => sum + size, 0) > FREE_STORAGE_BYTES) {
      throw new ApiError(409, 'Free image storage is full (25 MB). Remove unused photos or renew Pro for unlimited storage.');
    }
    const reservations = [];
    for (const size of bytes) reservations.push(await tx.businessMedia.create({data:{accountId,businessId,bytes:size}}));
    return reservations;
  }, {maxWait:20000,timeout:30000});
}

/** Called under the business lock, before saving references; other businesses' assets cannot be reused. */
export async function attachMedia(tx: Prisma.TransactionClient, businessId: string, previous: string[], next: string[], accountId?: string) {
  const added = next.filter(url => hostedMediaUrl(url) && !previous.includes(url));
  if (!added.length) return;
  if (accountId) await tx.$queryRaw`SELECT "id" FROM "Account" WHERE "id" = ${accountId} FOR UPDATE`;
  for (const url of added) {
    const asset = await tx.businessMedia.findUnique({where:{url}});
    if (!asset || asset.state !== 'READY' || (asset.businessId !== businessId && !(asset.businessId === null && asset.accountId === accountId))) {
      throw new ApiError(403, 'Upload new photos through this business dashboard before attaching them.');
    }
    await tx.businessMedia.update({where:{id:asset.id},data:{businessId}});
  }
  const business = await tx.business.findUniqueOrThrow({where:{id:businessId}});
  const assets = await tx.businessMedia.findMany({where:{businessId},select:{url:true,bytes:true}});
  if (!hasPro({proEndsAt:business.proEndsAt?.toISOString()}) && storageUsage(assets, next).usedBytes > FREE_STORAGE_BYTES) {
    throw new ApiError(409, 'These photos exceed the Free plan’s 25 MB allocation.');
  }
}

/** Persist cleanup in the same transaction as the edit, including uploads made before the ledger existed. */
export async function queueRemovedMedia(tx: Prisma.TransactionClient, businessId: string, previous: string[], next: string[], accountId?: string) {
  for (const url of previous.filter(url => hostedMediaUrl(url) && !next.includes(url))) {
    const existing = await tx.businessMedia.findUnique({where:{url}});
    if (existing) await tx.businessMedia.update({where:{id:existing.id},data:{state:'DELETING'}});
    else {
      const business = await tx.business.findUniqueOrThrow({where:{id:businessId},select:{ownerId:true}});
      const uploader = business.ownerId || accountId;
      if (!uploader) throw new ApiError(409, 'An administrator must remove this older photo.');
      const legacy = url.startsWith('/api/uploads/') ? await tx.uploadedPhoto.findUnique({where:{id:url.split('/').pop()!}}) : null;
      await tx.businessMedia.create({data:{url,businessId,accountId:legacy?.accountId || uploader,bytes:legacy?.content.length || MAX_UPLOAD_BYTES,state:'DELETING'}});
    }
  }
}

/** DELETING prevents reattachment; check all businesses to protect older shared photos. */
export async function removeUnusedMedia(id: string, signal?: AbortSignal): Promise<boolean> {
  signal?.throwIfAborted();
  const asset = await prisma.$transaction(async tx => {
    const initial = await tx.businessMedia.findUnique({where:{id}});
    if (!initial) return null;
    if (initial.businessId) await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${initial.businessId} FOR UPDATE`;
    else await tx.$queryRaw`SELECT "id" FROM "Account" WHERE "id" = ${initial.accountId} FOR UPDATE`;
    const current = await tx.businessMedia.findUnique({where:{id}});
    if (!current) return null;
    if (current.url) {
      const references = await tx.$queryRaw<Array<{id:string}>>`
        SELECT "id" FROM "Business" WHERE ${current.url} = ANY("photos") OR "coverPhoto" = ${current.url}
        OR EXISTS (SELECT 1 FROM jsonb_array_elements("services") item WHERE item->>'photo' = ${current.url}) LIMIT 1`;
      if (references.length) return null;
    }
    return tx.businessMedia.update({where:{id},data:{state:'DELETING'}});
  }, {maxWait:signal ? 5000 : 20000,timeout:signal ? 5000 : 30000});
  if (!asset) return false;
  // Retain the ledger and quota until storage confirms deletion. Missing objects are safe to retry.
  if (asset.url?.startsWith('/api/uploads/')) await prisma.uploadedPhoto.deleteMany({where:{id:asset.url.split('/').pop()!}});
  else if (asset.url) await deletePhotosFromR2([asset.url],signal ?? AbortSignal.timeout(10000));
  await prisma.businessMedia.deleteMany({where:{id:asset.id,state:'DELETING'}});
  return true;
}

export async function cleanRemovedMedia(businessId: string) {
  const assets = await prisma.businessMedia.findMany({where:{businessId,state:'DELETING'},select:{id:true}});
  const results = await Promise.allSettled(assets.map(asset => removeUnusedMedia(asset.id)));
  const summary = {deleted:0,pending:0,retained:0};
  for (const result of results) {
    if (result.status === 'rejected') {
      summary.pending++;
      console.error('Deferred photo cleanup:', result.reason instanceof Error ? result.reason.message : 'Storage deletion failed');
    } else if (result.value) summary.deleted++;
    else summary.retained++;
  }
  return summary;
}
