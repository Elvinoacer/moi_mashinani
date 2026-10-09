import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api';
export async function GET(_req: NextRequest, props: {params:Promise<{id:string}>}) {
  try {
    const {id} = await props.params;
    if (!/^[0-9a-f-]{36}$/.test(id)) return new NextResponse(null,{status:404});
    const photo = await prisma.uploadedPhoto.findUnique({where:{id}});
    if (!photo) return new NextResponse(null,{status:404});
    return new NextResponse(new Uint8Array(photo.content),{headers:{'Content-Type':photo.mimeType,'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'}});
  } catch(error) { return apiError(error); }
}
