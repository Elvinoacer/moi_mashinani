import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { uploadPhotosToR2 } from '@/lib/r2';
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
    const contents: Buffer[] = [];
    for (const file of files) {
      if (!(file instanceof File) || file.size === 0 || file.size > 5 * 1024 * 1024) throw new ApiError(400,'Each photo must be less than 5 MB');
      try {
        const image = sharp(Buffer.from(await file.arrayBuffer()),{limitInputPixels:25000000,animated:false});
        const meta = await image.metadata();
        if (!['jpeg','png','webp','avif','heif'].includes(meta.format || '')) throw new Error('Unsupported format');
        // Re-encode, rotate, strip EXIF/location metadata, bound dimensions and use a safe MIME type.
        contents.push(await image.rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer());
      } catch { throw new ApiError(400,'Use a valid JPEG, PNG, WebP or supported phone photo'); }
    }
    const photos = await uploadPhotosToR2(user.id, contents);
    return NextResponse.json({photos},{status:201});
  } catch(error) { return apiError(error); }
}
