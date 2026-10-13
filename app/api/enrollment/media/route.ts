import { randomBytes, randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { prisma } from '@/lib/prisma';
import { ApiError, apiError, assertSameOrigin } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { uploadPhotosToR2, photoUrlsForIds, deletePhotosFromR2 } from '@/lib/r2';
import { MAX_UPLOAD_BYTES, MAX_STORED_IMAGE_BYTES, FREE_STORAGE_BYTES } from '@/lib/catalog-plan';
import { ENROLLMENT_MEDIA_COOKIE, ENROLLMENT_MEDIA_MAX_FILES, ENROLLMENT_MEDIA_WINDOW_MS, enrollmentMediaHash } from '@/lib/enrollment-media';

export const runtime='nodejs';
const maxRequest=16 * 1024 * 1024;
const expiresAfter=ENROLLMENT_MEDIA_WINDOW_MS / 1000;

export async function POST(req:NextRequest) {
  try {
    assertSameOrigin(req);
    await rateLimit(req,'public-photo-staging',40,3600);
    const length=Number(req.headers.get('content-length') || 0);
    if (length>maxRequest) throw new ApiError(413,'Upload no more than three photos at once (5 MB each).');
    if(!req.body) throw new ApiError(400,'Choose photos to upload.');
    const reader=req.body.getReader();
    const chunks:Uint8Array[]=[];let total=0;
    while(true){
      const next=await reader.read();
      if(next.done) break;
      total+=next.value.byteLength;
      if(total>maxRequest){await reader.cancel();throw new ApiError(413,'Photo upload is too large');}
      chunks.push(next.value);
    }
    const bytes=Buffer.concat(chunks);
    const form=await new Request(req.url,{method:'POST',headers:{'Content-Type':req.headers.get('content-type') || ''},body:bytes}).formData();
    const files=form.getAll('files');
    if(files.length<1 || files.length>3) throw new ApiError(400,'Choose one to three photos per upload');
    const contents:Buffer[]=[];
    for(const file of files) {
      if(!(file instanceof File) || !file.size || file.size>MAX_UPLOAD_BYTES) throw new ApiError(413,'Each image must be under 5 MB');
      try {
        const image=sharp(Buffer.from(await file.arrayBuffer()),{limitInputPixels:25000000,animated:false});
        const meta=await image.metadata();
        if(!['jpeg','png','webp','avif','heif'].includes(meta.format || '')) throw new Error('Invalid format');
        let content=await image.clone().rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer();
        if(content.length>MAX_STORED_IMAGE_BYTES) content=await image.clone().rotate().resize({width:1200,height:1200,fit:'inside',withoutEnlargement:true}).webp({quality:65}).toBuffer();
        if(content.length>MAX_STORED_IMAGE_BYTES) throw new ApiError(413,'Reduce the resolution of this image.');
        contents.push(content);
      } catch(error) {
        if(error instanceof ApiError) throw error;
        throw new ApiError(400,'Choose a valid JPG, PNG or WebP photo.');
      }
    }
    const token=req.cookies.get(ENROLLMENT_MEDIA_COOKIE)?.value;
    const safeToken=enrollmentMediaHash(token) ? token! : randomBytes(32).toString('hex');
    const hash=enrollmentMediaHash(safeToken)!;
    const prefix=`staging-${hash.slice(0,24)}`;
    const ids=contents.map(()=>randomUUID());
    const urls=photoUrlsForIds(prefix,ids);
    await prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtext(${hash}))) AS guard`;
      const stored=await tx.enrollmentMedia.findMany({where:{sessionHash:hash},select:{bytes:true}});
      if(stored.length+contents.length>ENROLLMENT_MEDIA_MAX_FILES) throw new ApiError(409,'This form supports up to 8 gallery photos and 5 product photos. Remove unused images first.');
      if(stored.reduce((sum,item)=>sum+item.bytes,0)+contents.reduce((sum,item)=>sum+item.length,0)>FREE_STORAGE_BYTES) throw new ApiError(409,'The 25 MB free image allowance is full.');
      for(let i=0;i<ids.length;i++) await tx.enrollmentMedia.create({data:{id:ids[i],sessionHash:hash,url:urls[i],bytes:contents[i].length}});
    });
    try {
      await uploadPhotosToR2(prefix,contents,ids);
    } catch(error) {
      await prisma.enrollmentMedia.deleteMany({where:{id:{in:ids},sessionHash:hash}});
      throw error;
    }
    const response=NextResponse.json({photos:urls},{status:201});
    response.cookies.set(ENROLLMENT_MEDIA_COOKIE,safeToken,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:expiresAfter});
    return response;
  } catch(error) {return apiError(error);}
}

export async function DELETE(req:NextRequest) {
  try {
    assertSameOrigin(req);
    const hash=enrollmentMediaHash(req.cookies.get(ENROLLMENT_MEDIA_COOKIE)?.value);
    if(!hash) throw new ApiError(403,'Enrollment photo session has expired');
    const url=req.nextUrl.searchParams.get('url');
    if(!url) throw new ApiError(400,'Select the photo to delete');
    const asset=await prisma.enrollmentMedia.findFirst({where:{sessionHash:hash,url},select:{id:true,url:true}});
    if(!asset) throw new ApiError(404,'This photo does not belong to this enrollment');
    // Keep the ledger until R2 has confirmed removal, so failures can be retried.
    await deletePhotosFromR2([asset.url]);
    await prisma.enrollmentMedia.deleteMany({where:{id:asset.id,sessionHash:hash}});
    return NextResponse.json({removed:true});
  } catch(error) {return apiError(error);}
}
