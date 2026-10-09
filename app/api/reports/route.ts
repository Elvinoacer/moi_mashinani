import { NextRequest, NextResponse } from 'next/server';
import { Store } from '@/lib/store';
import { requireAdmin } from '@/lib/auth';
import { apiError, ApiError, assertSameOrigin, jsonBody, textField } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import type { ProblemReport } from '@/lib/types';
export async function GET(req:NextRequest) {
  try { await requireAdmin(req); return NextResponse.json(await Store.getReports(),{headers:{'Cache-Control':'no-store'}}); } catch(error) { return apiError(error); }
}
export async function POST(req:NextRequest) {
  try {
    assertSameOrigin(req); await rateLimit(req,'reports',10);
    const body = await jsonBody(req);
    const business = await Store.getBusinessById(textField(body.businessId,'Business ID',100,true));
    if (!business || business.status !== 'ACTIVE') throw new ApiError(404,'Business not found');
    const reason = textField(body.reason,'Reason',40,true);
    if (!['wrong_number','not_responding','closed_down','scam','inappropriate','other'].includes(reason)) throw new ApiError(400,'Invalid report reason');
    return NextResponse.json(await Store.createReport({businessId:business.id,businessName:business.name,reason:reason as ProblemReport['reason'],details:textField(body.details,'Details',2000),sessionId:textField(body.sessionId,'Session',100)}),{status:201});
  } catch(error) { return apiError(error); }
}
