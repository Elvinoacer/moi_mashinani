import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { uploadPhotosToR2, photoUrlsForIds } from '@/lib/r2';
import { prisma } from '@/lib/prisma';
import { MAX_UPLOAD_BYTES, MAX_STORED_IMAGE_BYTES } from '@/lib/catalog-plan';
import { reserveMedia, removeUnusedMedia } from '@/lib/media-storage';
import { requireUser } from '@/lib/auth';
import { apiError, ApiError, assertSameOrigin } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const user = await requireUser(req);
    await rateLimit(req,'photos',20,900,user.id);
    const maxRequest = 41 * 1024 * 1024;
    if (Number(req.headers.get('content-length') || 0) > maxRequest) throw new ApiError(413,'Upload at most eight photos, 5 MB each');
    if (!req.body) throw new ApiError(400,'Photos are required');
    const reader = req.body.getReader();
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > maxRequest) { await reader.cancel(); throw new ApiError(413,'Upload is too large'); }
      chunks.push(chunk.value);
    }
    const payload = Buffer.concat(chunks);
    const form = await new Request(req.url,{method:'POST',headers:{'Content-Type':req.headers.get('content-type') || ''},body:payload}).formData();
    const files = form.getAll('files');
    if (!files.length || files.length > 8) throw new ApiError(400,'Choose one to eight photos');
    const requestedBusiness = form.get('businessId');
    let businessId: string | undefined;
    if (typeof requestedBusiness === 'string' && requestedBusiness) {
      const business = await prisma.business.findUnique({where:{id:requestedBusiness}});
      if (!business || (user.role !== 'ADMIN' && business.ownerId !== user.id)) throw new ApiError(403, 'Choose your own business for these uploads');
      businessId = business.id;
    } else if (user.role !== 'ADMIN') {
      const businesses = await prisma.business.findMany({where:{ownerId:user.id},select:{id:true}});
      if (businesses.length !== 1) throw new ApiError(400, 'Choose the business receiving these photos');
      businessId = businesses[0].id;
    }
    const contents: Buffer[] = [];
    for (const file of files) {
      if (!(file instanceof File) || file.size === 0 || file.size > MAX_UPLOAD_BYTES) throw new ApiError(400,'Each photo must be less than 5 MB');
      try {
        const image = sharp(Buffer.from(await file.arrayBuffer()),{limitInputPixels:25000000,animated:false});
        const meta = await image.metadata();
        if (!['jpeg','png','webp','avif','heif'].includes(meta.format || '')) throw new Error('Unsupported format');
        // Re-encode, rotate, strip EXIF/location metadata, bound dimensions and use a safe MIME type.
        let content = await image.clone().rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer();
        if (content.length > MAX_STORED_IMAGE_BYTES) content = await image.clone().rotate().resize({width:1200,height:1200,fit:'inside',withoutEnlargement:true}).webp({quality:65}).toBuffer();
        if (content.length > MAX_STORED_IMAGE_BYTES) throw new ApiError(413, 'This image is too complex to store. Reduce its dimensions and try again.');
        contents.push(content);
      } catch (error) { if (error instanceof ApiError) throw error; throw new ApiError(400,'Use a valid JPEG, PNG, WebP or supported phone photo'); }
    }
    const reservations = await reserveMedia(user.id, businessId, contents.map(content => content.length));
    try {
      const urls = photoUrlsForIds(user.id, reservations.map(asset => asset.id));
      await prisma.$transaction(reservations.map((asset,index) => prisma.businessMedia.update({where:{id:asset.id},data:{url:urls[index]}})));
      const photos = await uploadPhotosToR2(user.id, contents, reservations.map(asset => asset.id));
      await prisma.businessMedia.updateMany({where:{id:{in:reservations.map(asset => asset.id)}},data:{state:'READY'}});
      return NextResponse.json({photos,bytes:contents.reduce((sum,content) => sum + content.length,0)},{status:201});
    } catch (error) {
      await Promise.allSettled(reservations.map(asset => removeUnusedMedia(asset.id)));
      throw error;
    }
  } catch(error) { return apiError(error); }
}

export async function DELETE(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const user = await requireUser(req);
    const url = new URL(req.url).searchParams.get('url');
    if (!url) throw new ApiError(400, 'Choose a photo to remove');
    let asset = await prisma.businessMedia.findUnique({where:{url},include:{business:{select:{ownerId:true}}}});
    if (!asset && /^\/api\/uploads\/[0-9a-f-]{36}$/.test(url)) {
      const legacy = await prisma.uploadedPhoto.findUnique({where:{id:url.split('/').pop()!}});
      if (legacy) {
        if (user.role !== 'ADMIN' && legacy.accountId !== user.id) throw new ApiError(403, 'You can only remove your own photos');
        asset = await prisma.businessMedia.upsert({where:{url},create:{url,accountId:legacy.accountId,bytes:legacy.content.length,state:'READY'},update:{},include:{business:{select:{ownerId:true}}}});
      }
    }
    if (!asset) return NextResponse.json({removed:false});
    if (user.role !== 'ADMIN' && !(asset.business ? asset.business.ownerId === user.id : asset.accountId === user.id)) throw new ApiError(403, 'You can only remove your own photos');
    try {
      if (!await removeUnusedMedia(asset.id)) throw new ApiError(409, 'Remove this photo from your products and business gallery first');
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) throw error;
      const queued = await prisma.businessMedia.findUnique({where:{id:asset.id},select:{state:true}});
      if (queued?.state !== 'DELETING') throw error;
      return NextResponse.json({removed:false,pending:true,message:'Photo removal is queued. Storage is temporarily unavailable; automatic cleanup will retry.'},{status:202});
    }
    return NextResponse.json({removed:true});
  } catch (error) { return apiError(error); }
}
