import { createHash } from 'node:crypto';
import { ApiError } from './api';
import type { Prisma } from '../../src/generated/prisma/client';
import { hostedMediaUrl } from './media-storage';

export const ENROLLMENT_MEDIA_COOKIE = 'mm_enrollment_media';
export const ENROLLMENT_MEDIA_MAX_FILES = 16;
export const ENROLLMENT_MEDIA_WINDOW_MS = 24 * 3600 * 1000;
export function enrollmentMediaHash(token?:string|null):string|null {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return createHash('sha256').update(token).digest('hex');
}

/** Called in the enrollment transaction so business and image ownership commit together. */
export async function claimEnrollmentMedia(tx: Prisma.TransactionClient, sessionToken:string|undefined, urls:string[], accountId:string, businessId:string) {
  if (!urls.length) return;
  const pending: string[] = [];
  const hash=enrollmentMediaHash(sessionToken);
  for (const url of [...new Set(urls)]) {
    if (!hostedMediaUrl(url)) throw new ApiError(400,'Choose a photo uploaded on this platform.');
    const existing=await tx.businessMedia.findUnique({where:{url},select:{id:true}});
    if (existing) continue; // Admin-owned preuploads are checked separately by attachMedia.
    if (!hash) throw new ApiError(403,'Your upload session expired. Reupload these photos before submitting.');
    pending.push(url);
  }
  if (!pending.length) return;
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${hash}))`;
  const staged=await tx.enrollmentMedia.findMany({where:{sessionHash:hash,url:{in:pending},createdAt:{gte:new Date(Date.now()-ENROLLMENT_MEDIA_WINDOW_MS)}}});
  if(staged.length!==pending.length) throw new ApiError(403,'One or more photos were not uploaded in this enrollment session. Please reupload them.');
  for(const item of staged) {
    await tx.businessMedia.create({data:{accountId,businessId,bytes:item.bytes,url:item.url,state:'READY'}});
    await tx.enrollmentMedia.delete({where:{id:item.id}});
  }
}
