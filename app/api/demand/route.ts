import { NextRequest, NextResponse } from 'next/server';
import { Store } from '@/lib/store';
import { requireAdmin } from '@/lib/auth';
import { apiError, ApiError, assertSameOrigin, jsonBody, textField } from '@/lib/api';
import { phoneField } from '@/lib/business-input';
import { ZONES } from '@/lib/constants';
import { rateLimit } from '@/lib/rate-limit';
export async function GET(req:NextRequest) {
  try { await requireAdmin(req); return NextResponse.json(await Store.getServiceRequests(),{headers:{'Cache-Control':'no-store'}}); } catch(error) { return apiError(error); }
}
export async function POST(req:NextRequest) {
  try {
    assertSameOrigin(req); await rateLimit(req,'demand',10);
    const body = await jsonBody(req);
    const zone = textField(body.zone,'Zone',100) || 'all';
    if (zone !== 'all' && !ZONES.some(z => z.slug === zone)) throw new ApiError(400,'Unknown zone');
    return NextResponse.json(await Store.createServiceRequest({query:textField(body.query,'Service needed',500,true),zone,contactPhone:body.contactPhone ? phoneField(body.contactPhone):undefined}),{status:201});
  } catch(error) { return apiError(error); }
}
