import { NextRequest, NextResponse } from 'next/server';
import { Store } from '@/lib/store';
import { requireBusinessAccess } from '@/lib/auth';
import { ApiError, apiError, assertSameOrigin } from '@/lib/api';
import { withNotificationDelivery } from '@/lib/notification-response';

export async function POST(req:NextRequest,props:{params:Promise<{slug:string}>}) {
  try {
    assertSameOrigin(req);
    const {slug} = await props.params;
    const business = await Store.getBusinessBySlug(slug);
    if (!business) throw new ApiError(404,'Business not found');
    const owner = await requireBusinessAccess(req,business);
    if (business.status !== 'REJECTED' && business.status !== 'SUSPENDED')
      throw new ApiError(409, 'Only rejected or suspended listings can be resubmitted');
    const updated = await Store.updateBusiness(business.id,{status:'PENDING',moderationReason:''},undefined,{actorId:owner.id,action:'RESUBMITTED_FOR_REVIEW'});
    return withNotificationDelivery(NextResponse.json({business:updated}));
  } catch(error) { return apiError(error); }
}
