import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { apiError, ApiError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
export async function GET(req:NextRequest) {
  try {
    await requireAdmin(req);
    const businessId=req.nextUrl.searchParams.get('businessId');
    if(!businessId || businessId.length>100) throw new ApiError(400,'Business ID is required');
    const events=await prisma.businessAudit.findMany({where:{businessId},orderBy:{createdAt:'desc'},take:100});
    return NextResponse.json({events},{headers:{'Cache-Control':'no-store'}});
  } catch(error) {return apiError(error);}
}
