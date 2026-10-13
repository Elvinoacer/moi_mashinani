import { withNotificationDelivery } from '@/lib/notification-response';
import { after, NextRequest, NextResponse } from 'next/server';
import { removeUnusedMedia } from '@/lib/media-storage';
import { Store } from '@/lib/store';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { ApiError, apiError, assertSameOrigin, jsonBody, textField } from '@/lib/api';
export async function POST(req:NextRequest) {
  try {
    assertSameOrigin(req); const admin = await requireAdmin(req);
    const body = await jsonBody(req);
    const action = textField(body.action,'Action',50,true);
    const id = textField(body.targetId,'Target ID',100,true);
    if (action === 'delete_listing') {
      const assets = await Store.deleteBusiness(id,textField(body.confirmationName,'Business name',200,true),admin.id);
      after(async () => { await Promise.allSettled(assets.map(id => removeUnusedMedia(id))); });
      return withNotificationDelivery(NextResponse.json({success:true}));
    }
    if (['resolve_report','suspend_reported'].includes(action)) {
      const success = await Store.resolveReport(id,action === 'resolve_report' ? 'RESOLVED':'SUSPENDED');
      if (!success) throw new ApiError(404,'Report not found');
      return withNotificationDelivery(NextResponse.json({success:true}));
    }
    const business = await Store.getBusinessById(id);
    if (!business) throw new ApiError(404,'Business not found');
    if (action === 'approve_listing') {
      const owner = business.ownerId ? await prisma.account.findUnique({where:{id:business.ownerId},select:{emailVerifiedAt:true}}) : null;
      if (!business.isClaimed || !owner?.emailVerifiedAt) throw new ApiError(409,'The owner must accept their invitation before listing approval');
    }
    const updates = action === 'approve_listing' || action === 'restore_listing' ? {status:'ACTIVE' as const, moderationReason:''}
      : action === 'reject_listing' ? {status:'REJECTED' as const,moderationReason:textField(body.reason,'Rejection reason',300,true)}
      : action === 'suspend_listing' ? {status:'SUSPENDED' as const,moderationReason:textField(body.reason,'Suspension reason',300) || 'Suspended by the administrator'}
      : action === 'toggle_verified' ? {verificationLevel:business.verificationLevel === 'L2' ? 'L1' as const:'L2' as const}:null;
    if (!updates) throw new ApiError(400,'Unknown admin action');
    return withNotificationDelivery(NextResponse.json({success:true,business:await Store.updateBusiness(id,updates,undefined,{actorId:admin.id,action:action.toUpperCase(),details:body.reason ? String(body.reason).slice(0,300) : undefined})}));
  } catch(error) { return apiError(error); }
}
