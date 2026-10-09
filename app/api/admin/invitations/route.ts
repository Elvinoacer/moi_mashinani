import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { apiError, ApiError, assertSameOrigin, jsonBody, textField } from '@/lib/api';
import { Store } from '@/lib/store';
import { inviteAccount } from '@/lib/invitations';
import { rateLimit } from '@/lib/rate-limit';
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req); await requireAdmin(req);
    const body = await jsonBody(req);
    const business = await Store.getBusinessById(textField(body.businessId,'Business ID',100,true));
    if (!business?.ownerId) throw new ApiError(404,'Business owner account not found');
    await rateLimit(req,'invite',5,900,business.id);
    const invitation = await inviteAccount(business.ownerId,business.id);
    return NextResponse.json({business:await Store.getBusinessById(business.id),invitation});
  } catch(error) { return apiError(error); }
}
