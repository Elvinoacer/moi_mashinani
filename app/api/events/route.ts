import { NextRequest, NextResponse } from 'next/server';
import { Store } from '@/lib/store';
import { apiError, ApiError, assertSameOrigin, jsonBody, textField } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
export async function POST(req:NextRequest) {
  try {
    assertSameOrigin(req); await rateLimit(req,'events',300,60);
    const body = await jsonBody(req);
    const type = textField(body.type,'Event type',20,true);
    if (!['view','call','whatsapp','directions','impression'].includes(type)) throw new ApiError(400,'Invalid event type');
    if (type === 'impression' && Array.isArray(body.businessIds)) {
      const ids = body.businessIds.filter((x: unknown): x is string => typeof x === 'string' && x.length > 0).slice(0, 30);
      await Store.recordImpressions(ids);
      return NextResponse.json({success:true});
    }
    const id = textField(body.businessId,'Business ID',100,true);
    const business = await Store.getBusinessById(id);
    if (!business || business.status !== 'ACTIVE') throw new ApiError(404,'Business not found');
    await Store.recordEvent(id,type as 'view'|'call'|'whatsapp'|'directions'|'impression');
    return NextResponse.json({success:true});
  } catch(error) { return apiError(error); }
}
