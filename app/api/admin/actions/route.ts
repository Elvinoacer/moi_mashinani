import { NextRequest, NextResponse } from 'next/server';
import { Store } from '@/lib/store';
import { requireAdmin } from '@/lib/auth';
import { ApiError, apiError, assertSameOrigin, jsonBody, textField } from '@/lib/api';
export async function POST(req:NextRequest) {
  try {
    assertSameOrigin(req); await requireAdmin(req);
    const body = await jsonBody(req);
    const action = textField(body.action,'Action',50,true);
    const id = textField(body.targetId,'Target ID',100,true);
    if (['resolve_report','suspend_reported'].includes(action)) {
      const success = await Store.resolveReport(id,action === 'resolve_report' ? 'RESOLVED':'SUSPENDED');
      if (!success) throw new ApiError(404,'Report not found');
      return NextResponse.json({success:true});
    }
    const business = await Store.getBusinessById(id);
    if (!business) throw new ApiError(404,'Business not found');
    const updates = action === 'approve_listing' || action === 'restore_listing' ? {status:'ACTIVE' as const, moderationReason:''}
      : action === 'reject_listing' ? {status:'REJECTED' as const,moderationReason:textField(body.reason,'Rejection reason',300,true)}
      : action === 'suspend_listing' ? {status:'SUSPENDED' as const,moderationReason:textField(body.reason,'Suspension reason',300) || 'Suspended by the administrator'}
      : action === 'toggle_verified' ? {verificationLevel:business.verificationLevel === 'L2' ? 'L1' as const:'L2' as const}:null;
    if (!updates) throw new ApiError(400,'Unknown admin action');
    return NextResponse.json({success:true,business:await Store.updateBusiness(id,updates)});
  } catch(error) { return apiError(error); }
}
